from datetime import timedelta
from unittest.mock import patch

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.dictionary.models import Entry, Sense
from apps.my_vocabulary.admin import VocabularyAdmin
from apps.my_vocabulary.models import Vocabulary
from apps.my_vocabulary.services import apply_bulk_action


class VocabularyServiceTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email="learner@example.com", password="password123"
        )
        entry = Entry.objects.create(word="book", part_of_speech="noun")
        self.sense_1 = Sense.objects.create(
            entry=entry, sense_number="1", title="book_n_1", definition="printed pages"
        )
        self.sense_2 = Sense.objects.create(
            entry=entry, sense_number="9", title="book_n_9", definition="part of a book"
        )

    # apply_bulk_action expects an iterable of Sense *instances*
    # (it does `{sense.id for sense in senses}` internally), not raw ids.

    def test_set_already_known_creates_and_sets_fields(self):
        apply_bulk_action(self.user, "set_already_known", {self.sense_1})
        vocab = Vocabulary.objects.get(user=self.user, sense=self.sense_1)
        self.assertTrue(vocab.already_known)
        self.assertFalse(vocab.needs_review)
        self.assertIsNone(vocab.learned_at)

    def test_set_learned_only_affects_given_senses(self):
        apply_bulk_action(self.user, "set_learned", {self.sense_1})
        self.assertIsNotNone(Vocabulary.objects.get(user=self.user, sense=self.sense_1).learned_at)
        self.assertFalse(
            Vocabulary.objects.filter(user=self.user, sense=self.sense_2).exists()
        )

    def test_already_known_actions_preserve_each_senses_review_preference(self):
        Vocabulary.objects.create(user=self.user, sense=self.sense_1, needs_review=True)
        Vocabulary.objects.create(user=self.user, sense=self.sense_2, needs_review=False)
        for action, expected_known in [("set_already_known", True), ("unset_already_known", False)]:
            with self.subTest(action=action):
                apply_bulk_action(self.user, action, {self.sense_1, self.sense_2})
                for sense, expected_review in [(self.sense_1, True), (self.sense_2, False)]:
                    vocab = Vocabulary.objects.get(user=self.user, sense=sense)
                    self.assertEqual(vocab.already_known, expected_known)
                    self.assertEqual(vocab.needs_review, expected_review)
                    if expected_known:
                        self.assertIsNone(vocab.learned_at)
                    else:
                        self.assertIsNotNone(vocab.learned_at)

    def test_known_to_learned_records_transition_date_for_both_actions(self):
        created_at = timezone.now() - timedelta(days=17)
        learned_at = timezone.now()
        for action, sense in [("set_learned", self.sense_1), ("unset_already_known", self.sense_2)]:
            with self.subTest(action=action):
                with patch("apps.my_vocabulary.services.timezone.now", return_value=created_at):
                    apply_bulk_action(self.user, "set_already_known", [sense])
                with patch("apps.my_vocabulary.services.timezone.now", return_value=learned_at):
                    apply_bulk_action(self.user, action, [sense])
                vocab = Vocabulary.objects.get(user=self.user, sense=sense)
                self.assertEqual(vocab.created_at, created_at)
                self.assertEqual(vocab.learned_at, learned_at)
                self.assertFalse(vocab.already_known)

    def test_repeated_learning_and_review_preferences_preserve_learning_date(self):
        learned_at = timezone.now() - timedelta(days=1)
        with patch("apps.my_vocabulary.services.timezone.now", return_value=learned_at):
            apply_bulk_action(self.user, "set_learned", [self.sense_1])
        for action in ("set_learned", "unset_already_known", "unset_needs_review", "set_needs_review"):
            with self.subTest(action=action):
                apply_bulk_action(self.user, action, [self.sense_1])
                vocab = Vocabulary.objects.get(user=self.user, sense=self.sense_1)
                self.assertEqual(vocab.learned_at, learned_at)
        apply_bulk_action(self.user, "set_already_known", [self.sense_1])
        self.assertIsNone(Vocabulary.objects.get(user=self.user, sense=self.sense_1).learned_at)

    def test_unlearn_then_learn_records_a_new_date(self):
        original_date = timezone.now() - timedelta(days=1)
        new_date = timezone.now()
        with patch("apps.my_vocabulary.services.timezone.now", return_value=original_date):
            apply_bulk_action(self.user, "set_learned", [self.sense_1])
        apply_bulk_action(self.user, "unset_learned", [self.sense_1])
        with patch("apps.my_vocabulary.services.timezone.now", return_value=new_date):
            apply_bulk_action(self.user, "set_learned", [self.sense_1])
        vocab = Vocabulary.objects.get(user=self.user, sense=self.sense_1)
        self.assertEqual(vocab.learned_at, new_date)
        self.assertEqual(vocab.created_at, new_date)

    def test_admin_saves_maintain_learning_date(self):
        model_admin = VocabularyAdmin(Vocabulary, admin.site)
        vocab = Vocabulary(user=self.user, sense=self.sense_1, already_known=True)
        model_admin.save_model(None, vocab, None, change=False)
        self.assertIsNone(vocab.learned_at)
        vocab.already_known = False
        learned_at = timezone.now() - timedelta(days=1)
        with patch("apps.my_vocabulary.admin.timezone.now", return_value=learned_at):
            model_admin.save_model(None, vocab, None, change=True)
        model_admin.save_model(None, vocab, None, change=True)
        vocab.refresh_from_db()
        self.assertEqual(vocab.learned_at, learned_at)
        vocab.already_known = True
        model_admin.save_model(None, vocab, None, change=True)
        vocab.refresh_from_db()
        self.assertIsNone(vocab.learned_at)

    def test_unset_already_known_never_creates_rows(self):
        apply_bulk_action(self.user, "unset_already_known", {self.sense_1})
        self.assertFalse(Vocabulary.objects.filter(user=self.user).exists())

    def test_unset_learned_deletes_and_returns_deleted_ids(self):
        Vocabulary.objects.create(user=self.user, sense=self.sense_1)
        deleted = apply_bulk_action(
            self.user, "unset_learned", {self.sense_1, self.sense_2}
        )
        self.assertEqual(deleted, {self.sense_1.id})
        self.assertFalse(Vocabulary.objects.filter(user=self.user).exists())
