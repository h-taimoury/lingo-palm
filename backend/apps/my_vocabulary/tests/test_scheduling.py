from datetime import timedelta
from unittest.mock import patch
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.dictionary.models import Entry, Sense
from apps.my_vocabulary.models import Vocabulary, VocabularyReview
from apps.my_vocabulary.services import apply_bulk_action


class SchedulingTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create(email="review@example.com")
        self.other_user = get_user_model().objects.create(email="other-review@example.com")
        self.client.force_authenticate(self.user)
        self.entry = Entry.objects.create(word="book", part_of_speech="noun")
        self.now = timezone.now()
        self.clock = patch("apps.my_vocabulary.services.timezone.now", return_value=self.now)
        self.mock_now = self.clock.start()
        self.addCleanup(self.clock.stop)
        self.card = self.make_card()

    def make_card(self, **fields):
        sense = Sense.objects.create(
            entry=self.entry, title=f"sense-{uuid4()}", definition="Printed pages",
        )
        fields.setdefault("review_due_at", self.now)
        return Vocabulary.objects.create(user=self.user, sense=sense, **fields)

    def answer(self, card=None, rating=3, version=0, submission=None, review_id=None):
        card = card or self.card
        payload = {"rating": rating, "version": version, "submission_id": str(submission or uuid4())}
        if review_id is not None:
            payload["review_id"] = review_id
        return self.client.post(
            f"/api/my-vocabulary/vocabulary/{card.pk}/review/",
            payload,
            format="json",
        )

    def batch(self):
        return self.client.get("/api/my-vocabulary/vocabulary/review-batch/")

    def test_remembered_schedules_followup_without_removing_enrollment(self):
        learned_at = self.now - timedelta(days=1)
        self.card.learned_at = learned_at
        self.card.save(update_fields=["learned_at"])
        response = self.answer()
        self.assertEqual(response.status_code, 200, response.data)
        self.card.refresh_from_db()
        self.assertEqual(self.card.review_due_at, self.now + timedelta(minutes=10))
        self.assertEqual(self.card.reviewed_at, self.now)
        self.assertTrue(self.card.needs_review)
        self.assertFalse(self.card.already_known)
        self.assertEqual(self.card.learned_at, learned_at)
        self.assertEqual(self.card.review_state["last_review"], self.now.isoformat())
        log = self.card.reviews.get()
        self.assertEqual((log.rating, log.reviewed_at, log.due_at), (3, self.now, self.card.review_due_at))
        batch = self.batch().data
        self.assertEqual(batch["results"], [])
        self.assertEqual(batch["due_count"], 0)
        self.assertEqual(batch["next_due_at"], self.card.review_due_at)

    def test_forgotten_first_review_is_due_in_one_minute(self):
        self.assertEqual(self.answer(rating=1).status_code, 200)
        self.card.refresh_from_db()
        self.assertEqual(self.card.review_due_at, self.now + timedelta(minutes=1))
        self.assertEqual(self.card.reviews.get().rating, 1)

    def test_followups_restore_memory_state_and_use_actual_review_time(self):
        self.assertEqual(self.answer().status_code, 200)
        later = self.now + timedelta(days=3)
        self.mock_now.return_value = later
        self.assertEqual(self.answer(version=1).status_code, 200)
        self.card.refresh_from_db()
        self.assertEqual(self.card.review_state["state"], 2)
        self.assertGreater(self.card.review_due_at, later + timedelta(hours=12))
        missed_review = self.card.review_due_at + timedelta(days=20)
        self.mock_now.return_value = missed_review
        self.assertEqual(self.answer(version=2, rating=1).status_code, 200)
        self.card.refresh_from_db()
        self.assertEqual(self.card.review_state["state"], 3)
        self.assertEqual(self.card.reviewed_at, missed_review)
        self.assertEqual(self.card.review_due_at, missed_review + timedelta(minutes=10))
        self.assertEqual(self.card.reviews.count(), 3)

    def test_repeat_answer_is_idempotent_and_stale_or_changed_answers_conflict(self):
        submission = uuid4()
        first = self.answer(submission=submission)
        repeated = self.answer(submission=submission)
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.data, repeated.data)
        self.assertEqual(self.card.reviews.count(), 1)
        self.assertEqual(self.answer(submission=submission, rating=1).status_code, 409)
        self.assertEqual(self.answer().status_code, 409)
        self.assertEqual(self.answer(version=1).status_code, 409)
        self.assertEqual(self.card.reviews.count(), 1)

    def test_only_due_owned_enrolled_cards_can_be_answered(self):
        self.card.user = self.other_user
        self.card.save(update_fields=["user"])
        self.assertEqual(self.answer().status_code, 404)
        paused = self.make_card(needs_review=False)
        self.assertEqual(self.answer(paused).status_code, 409)
        future = self.make_card(review_due_at=self.now + timedelta(days=1))
        self.assertEqual(self.answer(future).status_code, 409)
        self.assertFalse(VocabularyReview.objects.exists())

    def test_answer_validation_and_authentication(self):
        url = f"/api/my-vocabulary/vocabulary/{self.card.pk}/review/"
        for payload in (
            {}, {"rating": 2, "version": 0, "submission_id": str(uuid4())},
            {"rating": 3, "version": -1, "submission_id": str(uuid4())},
            {"rating": 3, "version": 0, "submission_id": "invalid"},
        ):
            self.assertEqual(self.client.post(url, payload, format="json").status_code, 400)
        self.client.force_authenticate(None)
        self.assertEqual(self.batch().status_code, 401)
        self.assertEqual(self.answer().status_code, 401)
        self.assertFalse(VocabularyReview.objects.exists())

    def test_batch_mixes_eight_due_reviews_with_two_first_reviews(self):
        new_cards = [self.card] + [self.make_card() for _ in range(11)]
        scheduled = [
            self.make_card(
                reviewed_at=self.now - timedelta(days=3),
                review_due_at=self.now - timedelta(days=1),
                review_state={"state": 2},
            ) for _ in range(12)
        ]
        relearning = self.make_card(
            reviewed_at=self.now - timedelta(minutes=20),
            review_due_at=self.now - timedelta(minutes=10), review_state={"state": 3},
        )
        self.make_card(needs_review=False)
        self.make_card(review_due_at=self.now + timedelta(days=1))
        other = self.make_card()
        other.user = self.other_user
        other.save(update_fields=["user"])

        data = self.batch().data
        self.assertEqual(data["due_count"], 25)
        ids = [row["id"] for row in data["results"]]
        self.assertEqual(len(ids), 10)
        self.assertEqual(len(set(ids)), 10)
        self.assertEqual(ids[0], relearning.pk)
        self.assertEqual(set(ids) & {row.pk for row in new_cards}, {row.pk for row in new_cards[:2]})
        self.assertEqual(len(set(ids) & {row.pk for row in scheduled}), 7)

    def test_batch_fills_unused_review_slots_with_new_senses(self):
        for _ in range(11):
            self.make_card()
        data = self.batch().data
        self.assertEqual(len(data["results"]), 10)
        self.assertEqual(data["due_count"], 12)

    def test_learning_again_preserves_schedule_and_reenrollment_keeps_history(self):
        self.answer()
        self.card.refresh_from_db()
        state = self.card.review_state
        due = self.card.review_due_at
        apply_bulk_action(self.user, "set_learned", [self.card.sense])
        self.card.refresh_from_db()
        self.assertEqual(self.card.review_due_at, due)
        self.assertEqual(self.card.review_version, 1)
        apply_bulk_action(self.user, "unset_needs_review", [self.card.sense])
        self.card.refresh_from_db()
        self.assertFalse(self.card.needs_review)
        self.assertEqual(self.card.review_version, 2)
        apply_bulk_action(self.user, "set_needs_review", [self.card.sense])
        self.card.refresh_from_db()
        self.assertTrue(self.card.needs_review)
        self.assertEqual(self.card.review_due_at, self.now)
        self.assertEqual(self.card.review_state, state)
        self.assertEqual(self.card.review_version, 3)
        self.assertEqual(self.card.reviews.count(), 1)

    def test_review_and_history_roll_back_together_on_write_failure(self):
        with patch("apps.my_vocabulary.services.VocabularyReview.objects.create", side_effect=RuntimeError):
            with self.assertRaises(RuntimeError):
                self.answer()
        self.card.refresh_from_db()
        self.assertEqual(self.card.review_version, 0)
        self.assertIsNone(self.card.reviewed_at)
        self.assertFalse(self.card.review_state)
        self.assertFalse(self.card.reviews.exists())

    def test_correct_clear_and_reselect_replace_one_repetition_at_its_original_time(self):
        first = self.answer().data
        self.mock_now.return_value = self.now + timedelta(hours=2)
        changed = self.answer(rating=1, version=1, review_id=first["id"])
        self.assertEqual(changed.status_code, 200, changed.data)
        self.card.refresh_from_db()
        self.assertEqual(self.card.review_due_at, self.now + timedelta(minutes=1))
        self.assertEqual(self.card.reviewed_at, self.now)
        self.assertEqual(changed.data["id"], first["id"])

        cleared = self.answer(rating=None, version=2, review_id=first["id"])
        self.assertEqual(cleared.status_code, 200, cleared.data)
        self.card.refresh_from_db()
        self.assertEqual(self.card.review_due_at, self.now)
        self.assertIsNone(self.card.reviewed_at)
        self.assertIsNone(cleared.data["reviewed_at"])
        self.assertEqual(self.card.review_state, {})
        self.assertTrue(self.card.needs_review)
        self.assertEqual(self.card.reviews.filter(rating__isnull=False).count(), 0)
        self.assertIn(self.card.pk, [row["id"] for row in self.batch().data["results"]])

        restored = self.answer(version=3, review_id=first["id"])
        self.assertEqual(restored.status_code, 200, restored.data)
        self.card.refresh_from_db()
        self.assertEqual(self.card.review_due_at, self.now + timedelta(minutes=10))
        self.assertEqual(self.card.review_state["last_review"], self.now.isoformat())
        self.assertEqual(self.card.review_version, 4)
        self.assertEqual(self.card.reviews.count(), 1)
        self.assertEqual(self.card.reviews.get().previous_state, {})

    def test_clearing_a_followup_restores_the_exact_previous_memory_state(self):
        self.answer()
        self.card.refresh_from_db()
        before = (self.card.review_state, self.card.review_due_at, self.card.reviewed_at)
        self.mock_now.return_value = self.now + timedelta(days=3)
        followup = self.answer(version=1).data
        cleared = self.answer(rating=None, version=2, review_id=followup["id"])
        self.assertEqual(cleared.status_code, 200, cleared.data)
        self.card.refresh_from_db()
        self.assertEqual((self.card.review_state, self.card.review_due_at, self.card.reviewed_at), before)
        self.assertEqual(self.card.reviews.filter(rating__isnull=False).count(), 1)
        self.assertEqual(self.card.review_version, 3)

    def test_corrections_and_clear_retries_are_idempotent(self):
        first = self.answer().data
        submission = uuid4()
        change = dict(rating=1, version=1, review_id=first["id"], submission=submission)
        response = self.answer(**change)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["submission_id"], str(submission))
        self.assertEqual(self.answer(**change).data, response.data)
        self.assertEqual(self.answer(**{**change, "rating": 3}).status_code, 409)
        clear = dict(rating=None, version=2, review_id=first["id"], submission=uuid4())
        cleared = self.answer(**clear)
        self.assertEqual(cleared.status_code, 200)
        self.assertEqual(self.answer(**clear).data, cleared.data)
        self.assertEqual(self.answer(**change).status_code, 409)
        self.card.refresh_from_db()
        self.assertEqual(self.card.review_version, 3)
        self.assertEqual(self.card.reviews.count(), 1)

    def test_only_the_latest_owned_unchanged_review_can_be_corrected(self):
        first = self.answer().data
        other = self.make_card()
        other_review = self.answer(other).data
        self.assertEqual(self.answer(version=1, review_id=other_review["id"]).status_code, 404)
        self.assertEqual(self.answer(version=0, review_id=first["id"]).status_code, 409)
        other.user = self.other_user
        other.save(update_fields=["user"])
        self.assertEqual(self.answer(other, version=1, review_id=other_review["id"]).status_code, 404)
        self.mock_now.return_value = self.now + timedelta(days=3)
        latest = self.answer(version=1).data
        self.assertEqual(self.answer(version=2, review_id=first["id"]).status_code, 409)
        apply_bulk_action(self.user, "unset_needs_review", [self.card.sense])
        self.assertEqual(self.answer(version=3, review_id=latest["id"]).status_code, 409)
        self.assertEqual(self.card.reviews.count(), 2)

    def test_correction_validation_and_legacy_reviews(self):
        self.assertEqual(self.answer(rating=None).status_code, 400)
        self.assertEqual(self.answer(review_id=0).status_code, 400)
        first = self.answer().data
        self.card.reviews.update(previous_state=None, previous_due_at=None)
        self.assertEqual(self.answer(version=1, review_id=first["id"]).status_code, 409)
        self.card.refresh_from_db()
        self.assertEqual(self.card.review_version, 1)

    def test_correction_schedule_and_answer_roll_back_together(self):
        first = self.answer().data
        with patch.object(VocabularyReview, "save", side_effect=RuntimeError):
            with self.assertRaises(RuntimeError):
                self.answer(rating=None, version=1, review_id=first["id"])
        self.card.refresh_from_db()
        self.assertEqual(self.card.review_due_at, self.now + timedelta(minutes=10))
        self.assertEqual(self.card.review_version, 1)
        self.assertEqual(self.card.reviews.get().rating, 3)
        self.assertEqual(self.card.reviews.get().version, 1)
