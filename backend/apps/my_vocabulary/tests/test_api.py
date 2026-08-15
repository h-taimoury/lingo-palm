from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.dictionary.models import Entry, Sense
from apps.vocabulary.models import Vocabulary


class VocabularyApiTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            username="learner", password="password"
        )

        self.entry = Entry.objects.create(word="head", part_of_speech="noun")
        self.sense_1 = Sense.objects.create(
            entry=self.entry, sense_number="1", title="head_n_1", definition="body part"
        )
        self.sense_2 = Sense.objects.create(
            entry=self.entry, sense_number="2", title="head_n_2", definition="a leader"
        )

        self.other_entry = Entry.objects.create(word="head", part_of_speech="verb")
        self.other_sense = Sense.objects.create(
            entry=self.other_entry,
            sense_number="1",
            title="head_v_1",
            definition="to move toward",
        )

        self.client.force_authenticate(self.user)

    def test_create_single_sense(self):
        response = self.client.post(
            "/api/vocabulary/vocabulary/",
            {"sense_id": self.sense_1.id, "already_known": True},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(response.data["already_known"])
        self.assertEqual(Vocabulary.objects.count(), 1)

    def test_duplicate_create_updates_instead_of_erroring(self):
        Vocabulary.objects.create(
            user=self.user, sense=self.sense_1, already_known=False
        )
        response = self.client.post(
            "/api/vocabulary/vocabulary/",
            {"sense_id": self.sense_1.id, "already_known": True},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Vocabulary.objects.count(), 1)
        self.assertTrue(Vocabulary.objects.get().already_known)

    def test_mark_entry_learned_covers_all_senses_of_that_entry_only(self):
        response = self.client.post(
            "/api/vocabulary/vocabulary/mark-entry-learned/",
            {"entry_id": self.entry.id, "already_known": True},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Vocabulary.objects.filter(user=self.user).count(), 2)
        self.assertFalse(
            Vocabulary.objects.filter(user=self.user, sense=self.other_sense).exists()
        )

    def test_mark_word_learned_covers_all_entries_of_that_word(self):
        response = self.client.post(
            "/api/vocabulary/vocabulary/mark-word-learned/",
            {"word": "HEAD"},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Vocabulary.objects.filter(user=self.user).count(), 3)

    def test_mark_word_learned_does_not_duplicate_existing_rows(self):
        Vocabulary.objects.create(
            user=self.user, sense=self.sense_1, already_known=True
        )
        response = self.client.post(
            "/api/vocabulary/vocabulary/mark-word-learned/",
            {"word": "head"},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Vocabulary.objects.filter(user=self.user).count(), 3)
        # the pre-existing row's already_known=True must not be overwritten
        self.assertTrue(
            Vocabulary.objects.get(user=self.user, sense=self.sense_1).already_known
        )

    def test_user_only_sees_own_vocabulary(self):
        other_user = get_user_model().objects.create_user(
            username="other", password="password"
        )
        Vocabulary.objects.create(user=other_user, sense=self.sense_1)
        response = self.client.get("/api/vocabulary/vocabulary/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["results"], [] if "results" in response.data else []
        )

    def test_patch_mastered(self):
        vocab = Vocabulary.objects.create(user=self.user, sense=self.sense_1)
        response = self.client.patch(
            f"/api/vocabulary/vocabulary/{vocab.id}/", {"mastered": True}, format="json"
        )
        self.assertEqual(response.status_code, 200, response.data)
        vocab.refresh_from_db()
        self.assertTrue(vocab.mastered)
