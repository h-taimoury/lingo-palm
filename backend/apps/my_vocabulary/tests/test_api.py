from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.dictionary.models import Entry, Sense
from apps.my_vocabulary.models import Vocabulary


class VocabularyBulkActionApiTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(username="learner", password="password")

        self.entry = Entry.objects.create(word="head", part_of_speech="noun")
        self.sense_1 = Sense.objects.create(
            entry=self.entry, sense_number="1", title="head_n_1", definition="body part"
        )
        self.sense_2 = Sense.objects.create(
            entry=self.entry, sense_number="2", title="head_n_2", definition="a leader"
        )

        self.other_entry = Entry.objects.create(word="head", part_of_speech="verb")
        self.other_sense = Sense.objects.create(
            entry=self.other_entry, sense_number="1", title="head_v_1", definition="to move toward"
        )

        self.client.force_authenticate(self.user)

    def _bulk(self, payload):
        return self.client.post(
            "/api/my-vocabulary/vocabulary/bulk-action/", payload, format="json"
        )

    def test_set_already_known_by_sense_ids_creates_rows(self):
        response = self._bulk({"action": "set_already_known", "sense_ids": [self.sense_1.id]})
        self.assertEqual(response.status_code, 200, response.data)
        vocab = Vocabulary.objects.get(user=self.user, sense=self.sense_1)
        self.assertTrue(vocab.already_known)
        self.assertFalse(vocab.needs_review)


    def test_unset_already_known_only_updates_existing_rows(self):
        Vocabulary.objects.create(
            user=self.user, sense=self.sense_1, already_known=True, needs_review=False
        )
        response = self._bulk(
            {"action": "unset_already_known", "sense_ids": [self.sense_1.id, self.sense_2.id]}
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertFalse(
            Vocabulary.objects.filter(user=self.user, sense=self.sense_2).exists()
        )
        vocab = Vocabulary.objects.get(user=self.user, sense=self.sense_1)
        self.assertFalse(vocab.already_known)
        self.assertTrue(vocab.needs_review)

    def test_set_needs_review_and_unset_needs_review(self):
        Vocabulary.objects.create(
            user=self.user, sense=self.sense_1, already_known=False, needs_review=False
        )
        response = self._bulk({"action": "set_needs_review", "sense_ids": [self.sense_1.id]})
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(
            Vocabulary.objects.get(user=self.user, sense=self.sense_1).needs_review
        )

        response = self._bulk({"action": "unset_needs_review", "sense_ids": [self.sense_1.id]})
        self.assertEqual(response.status_code, 200, response.data)
        self.assertFalse(
            Vocabulary.objects.get(user=self.user, sense=self.sense_1).needs_review
        )

    def test_unset_learned_deletes_rows_and_reports_deleted_sense_ids(self):
        Vocabulary.objects.create(user=self.user, sense=self.sense_1)
        response = self._bulk(
            {"action": "unset_learned", "sense_ids": [self.sense_1.id, self.sense_2.id]}
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["deleted_sense_ids"], [self.sense_1.id])
        self.assertFalse(Vocabulary.objects.filter(user=self.user).exists())

    def test_sense_ids_required_and_non_empty(self):
        response = self._bulk({"action": "set_learned", "sense_ids": []})
        self.assertEqual(response.status_code, 400)

    def test_list_filters_by_needs_review(self):
        Vocabulary.objects.create(user=self.user, sense=self.sense_1, needs_review=True)
        Vocabulary.objects.create(user=self.user, sense=self.sense_2, needs_review=False)
        response = self.client.get("/api/my-vocabulary/vocabulary/?needs_review=true")
        self.assertEqual(response.status_code, 200)
        results = response.data["results"] if "results" in response.data else response.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["sense"]["id"], self.sense_1.id)

    def test_user_only_sees_own_vocabulary(self):
        other_user = get_user_model().objects.create_user(username="other", password="password")
        Vocabulary.objects.create(user=other_user, sense=self.sense_1)
        response = self.client.get("/api/my-vocabulary/vocabulary/")
        self.assertEqual(response.status_code, 200)
        results = response.data["results"] if "results" in response.data else response.data
        self.assertEqual(results, [])