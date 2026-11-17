from datetime import datetime, time, timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Case, Count, F, IntegerField, Value, When
from django.db.models.functions import Coalesce, TruncDate
from django.shortcuts import get_object_or_404
from django.utils import timezone
from fsrs import Card, Rating, Scheduler
from rest_framework.exceptions import APIException

from .models import Vocabulary, VocabularyReview

User = get_user_model()
SCHEDULER = Scheduler(desired_retention=0.9)


class ReviewConflict(APIException):
    status_code = 409
    default_detail = "This sense was updated elsewhere. Load a new batch to continue."


def _upsert(user: User, sense_ids: set[int], already_known: bool, needs_review: bool, *, preserve_review: bool = False):
    """Create rows for any sense_ids the user doesn't have yet (with the given
    field values baked in at creation), and update only the sense_ids that
    already had a row, preserving their review preference when requested.
    """
    if not sense_ids:
        return Vocabulary.objects.none()

    existing_ids = set(
        Vocabulary.objects.filter(user=user, sense_id__in=sense_ids).values_list(
            "sense_id", flat=True
        )
    )
    new_ids = sense_ids - existing_ids

    if new_ids:
        Vocabulary.objects.bulk_create(
            [
                Vocabulary(
                    user=user,
                    sense_id=sid,
                    already_known=already_known,
                    needs_review=needs_review,
                    learned_at=None if already_known else timezone.now(),
                )
                for sid in new_ids
            ]
        )

    if existing_ids:
        if not preserve_review:
            _update_existing(user, existing_ids, needs_review=needs_review)
        _update_existing(user, existing_ids, already_known=already_known)

    return Vocabulary.objects.filter(user=user, sense_id__in=sense_ids).select_related(
        "sense__entry"
    )


def _update_existing(user: User, sense_ids: set[int], **fields):
    """Update only rows that already exist for the user among sense_ids.
    Never creates new rows — used for actions that only make sense against
    a sense the user has already saved (the /my-vocabulary lists).
    """
    if not sense_ids:
        return Vocabulary.objects.none()

    rows = Vocabulary.objects.filter(user=user, sense_id__in=sense_ids)
    if "needs_review" in fields:
        enabled = fields["needs_review"]
        updates = {"needs_review": enabled, "review_version": F("review_version") + 1}
        if enabled:
            updates["review_due_at"] = timezone.now()
        rows.filter(needs_review=not enabled).update(**updates)
    else:
        if "already_known" in fields:
            fields["learned_at"] = (
                None if fields["already_known"] else Coalesce("learned_at", timezone.now())
            )
        rows.update(**fields)

    return Vocabulary.objects.filter(user=user, sense_id__in=sense_ids).select_related(
        "sense__entry"
    )


def _delete(user: User, sense_ids: set[int]) -> set[int]:
    """Delete any existing rows for the user among sense_ids. Returns the
    set of sense_ids that actually had a row removed.
    """
    if not sense_ids:
        return set()

    queryset = Vocabulary.objects.filter(user=user, sense_id__in=sense_ids)
    deleted_sense_ids = set(queryset.values_list("sense_id", flat=True))
    queryset.delete()
    return deleted_sense_ids


ACTIONS = {
    "set_already_known": lambda user, ids: _upsert(user, ids, True, False, preserve_review=True),
    "unset_already_known": lambda user, ids: _update_existing(
        user, ids, already_known=False
    ),
    "set_learned": lambda user, ids: _upsert(user, ids, False, True),
    "unset_learned": _delete,
    "set_needs_review": lambda user, ids: _update_existing(
        user, ids, needs_review=True
    ),
    "unset_needs_review": lambda user, ids: _update_existing(
        user, ids, needs_review=False
    ),
}


@transaction.atomic
def apply_bulk_action(user: User, action: str, senses):
    """Applies one of the fixed vocabulary actions to a set of Sense instances
    for the given user. Returns a Vocabulary queryset for every action except
    unset_learned, which instead returns the set of sense IDs that were
    actually deleted (since the rows no longer exist to query).
    """
    # Serialize vocabulary mutations for the same learner, including initial creation.
    User.objects.select_for_update().get(pk=user.pk)
    sense_ids = {sense.id for sense in senses}
    return ACTIONS[action](user, sense_ids)


def get_review_batch(user):
    now = timezone.now()
    enrolled = Vocabulary.objects.filter(user=user, needs_review=True)
    due = enrolled.filter(review_due_at__lte=now).select_related("sense__entry")
    scheduled = list(due.filter(reviewed_at__isnull=False).order_by(
        Case(
            When(review_state__state__in=[1, 3], then=Value(0)),
            default=Value(1), output_field=IntegerField(),
        ),
        "review_due_at", "id",
    )[:10])
    new = list(due.filter(reviewed_at__isnull=True).order_by("review_due_at", "id")[
        :max(2, 10 - len(scheduled))
    ])
    scheduled = scheduled[:10 - len(new)]
    cards = scheduled[:4] + new[:1] + scheduled[4:] + new[1:]
    next_due = enrolled.filter(review_due_at__gt=now).order_by("review_due_at").values_list(
        "review_due_at", flat=True
    ).first()
    return cards, due.count(), next_due


def get_progress(user, *, days, tz):
    now = timezone.now()
    end_date = now.astimezone(tz).date()
    start_date = end_date - timedelta(days=days - 1)
    start = datetime.combine(start_date, time.min, tzinfo=tz)
    vocabulary = Vocabulary.objects.filter(user=user)
    learned = vocabulary.filter(already_known=False, learned_at__lte=now)
    counts = dict(
        learned.filter(learned_at__gte=start)
        .annotate(day=TruncDate("learned_at", tzinfo=tz))
        .values("day").annotate(count=Count("id")).order_by("day")
        .values_list("day", "count")
    )
    return {
        "days": days,
        "timezone": str(tz),
        "start_date": start_date,
        "end_date": end_date,
        "total_learned": learned.count(),
        "period_learned": sum(counts.values()),
        "learning_days": len(counts),
        "daily_counts": [
            {"date": day, "count": counts.get(day, 0)}
            for day in (start_date + timedelta(days=index) for index in range(days))
        ],
        "recently_learned": learned.select_related("sense__entry").order_by("-learned_at", "-id")[:5],
        "review_due_count": vocabulary.filter(needs_review=True, review_due_at__lte=now).count(),
    }


@transaction.atomic
def record_review(user, vocabulary_id, *, submission_id, rating, version):
    User.objects.select_for_update().get(pk=user.pk)
    vocabulary = get_object_or_404(Vocabulary, user=user, pk=vocabulary_id)
    previous = vocabulary.reviews.filter(submission_id=submission_id).first()
    if previous:
        if previous.rating != rating or previous.version != version + 1:
            raise ReviewConflict("This review submission was already used with a different answer.")
        return previous
    if not vocabulary.needs_review or vocabulary.review_version != version:
        raise ReviewConflict()

    now = timezone.now()
    if vocabulary.review_due_at > now:
        raise ReviewConflict("This sense is scheduled for later. Load a new batch to continue.")
    card = Card.from_dict(vocabulary.review_state) if vocabulary.review_state else Card(
        card_id=vocabulary.pk, due=vocabulary.review_due_at
    )
    card, _ = SCHEDULER.review_card(card, Rating(rating), review_datetime=now)
    updated = Vocabulary.objects.filter(pk=vocabulary.pk, review_version=version).update(
        review_due_at=card.due, reviewed_at=now,
        review_state=card.to_dict(), review_version=version + 1,
    )
    if not updated:
        raise ReviewConflict()
    return VocabularyReview.objects.create(
        vocabulary=vocabulary, submission_id=submission_id, rating=rating,
        reviewed_at=now, due_at=card.due, version=version + 1,
    )
