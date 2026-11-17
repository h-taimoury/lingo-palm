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

    def answer(self, card=None, rating=3, version=0, submission=None):
        card = card or self.card
        return self.client.post(
            f"/api/my-vocabulary/vocabulary/{card.pk}/review/",
            {"rating": rating, "version": version, "submission_id": str(submission or uuid4())},
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
