from django.contrib.auth import get_user_model

from .models import Vocabulary

User = get_user_model()


def _upsert(user: User, sense_ids: set[int], already_known: bool, needs_review: bool):
    """Create rows for any sense_ids the user doesn't have yet, and force
    already_known/needs_review to the given values on every row for
    sense_ids (whether just-created or pre-existing).
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
                )
                for sid in new_ids
            ]
        )

    Vocabulary.objects.filter(user=user, sense_id__in=sense_ids).update(
        already_known=already_known, needs_review=needs_review
    )

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

    Vocabulary.objects.filter(user=user, sense_id__in=sense_ids).update(**fields)

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
    "set_already_known": lambda user, ids: _upsert(user, ids, True, False),
    "unset_already_known": lambda user, ids: _update_existing(
        user, ids, already_known=False, needs_review=True
    ),
    "set_learned": lambda user, ids: _upsert(user, ids, False, True),
    "unset_learned": _delete,
    "set_needs_review": lambda user, ids: _update_existing(user, ids, needs_review=True),
    "unset_needs_review": lambda user, ids: _update_existing(
        user, ids, needs_review=False
    ),
}


def apply_bulk_action(user: User, action: str, sense_ids: set[int]):
    """Applies one of the fixed vocabulary actions to a set of sense IDs for
    the given user. Returns a Vocabulary queryset for every action except
    unset_learned, which instead returns the set of sense IDs that were
    actually deleted (since the rows no longer exist to query).
    """
    return ACTIONS[action](user, sense_ids)