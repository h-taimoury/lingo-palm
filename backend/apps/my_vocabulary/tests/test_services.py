from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.dictionary.models import Entry, Sense
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

    def test_set_learned_only_affects_given_senses(self):
        apply_bulk_action(self.user, "set_learned", {self.sense_1})
        self.assertFalse(
            Vocabulary.objects.filter(user=self.user, sense=self.sense_2).exists()
        )

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
