from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.dictionary.models import Entry, Sense
from apps.courses.models import Course, Section, WordSenseMapping


class TranslationReviewTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email="review@example.com", password="password123", is_staff=True
        )
        self.client.force_authenticate(self.user)
        entry = Entry.objects.create(word="test", part_of_speech="noun")
        self.first = Sense.objects.create(entry=entry, title="one", definition="one")
        self.second = Sense.objects.create(
            entry=entry, title="two", definition="two", translation="existing",
            short_translation="",
        )

    def row(self, sense, translation="full", short_translation="short"):
        return dict(
            id=sense.pk, expected_translation=sense.translation,
            expected_short_translation=sense.short_translation,
            translation=translation, short_translation=short_translation,
        )

    def test_export_eligibility_and_staff_only(self):
        course = Course.objects.create(title="Used senses")
        section = Section.objects.create(course=course, title="One")
        WordSenseMapping.objects.create(section=section).senses.add(self.first, self.second)
        Sense.objects.create(entry=self.first.entry, title="unused", definition="unused")
        url = "/api/dictionary/senses/translation-review/"
        response = self.client.get(url)
        self.assertEqual([row["id"] for row in response.data], [self.first.pk])
        self.second.translation = ""
        self.second.save()
        self.assertEqual(len(self.client.get(url).data), 2)
        self.assertEqual(self.client.get(url, {"count_only": "true"}).data, {"remaining": 2})
        self.user.is_staff = False
        self.user.save()
        self.assertEqual(self.client.get(url).status_code, 403)

    def test_conflict_does_not_partially_save(self):
        rows = [self.row(self.first), self.row(self.second)]
        self.second.translation = "changed"
        self.second.save()
        response = self.client.post("/api/dictionary/senses/translation-review-save/", rows, format="json")
        self.assertEqual(response.status_code, 409)
        self.first.refresh_from_db()
        self.assertIsNone(self.first.translation)

    def test_export_section_filter_deduplicates_mappings(self):
        Sense.objects.create(entry=self.first.entry, title="unused", definition="unused")
        course = Course.objects.create(title="Test")
        section = Section.objects.create(course=course, title="One")
        other = Section.objects.create(course=course, title="Two")
        for _ in range(2):
            WordSenseMapping.objects.create(section=section).senses.add(self.first)
        self.second.short_translation = None
        self.second.save()
        WordSenseMapping.objects.create(section=other).senses.add(self.second)
        url = "/api/dictionary/senses/translation-review/"
        response = self.client.get(url, {"section_id": section.pk})
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row["id"] for row in response.data], [self.first.pk])
        self.assertEqual(len(self.client.get(url).data), 2)
        self.assertEqual(self.client.get(url, {"count_only": "true"}).data, {"remaining": 2})
        self.assertEqual(self.client.get(url, {"count_only": "true", "section_id": section.pk}).data, {"remaining": 1})
        self.first.translation = "done"
        self.first.short_translation = ""
        self.first.save()
        self.assertEqual(self.client.get(url, {"count_only": "true", "section_id": section.pk}).data, {"remaining": 0})
        for invalid in ("abc", "-1", "1.5"):
            self.assertEqual(self.client.get(url, {"section_id": invalid}).status_code, 400)

    def test_skips_and_retries(self):
        rows = [self.row(self.first, short_translation="")]
        url = "/api/dictionary/senses/translation-review-save/"
        self.assertEqual(self.client.post(url, rows, format="json").status_code, 200)
        self.assertEqual(self.client.post(url, rows, format="json").status_code, 200)
        self.first.refresh_from_db()
        self.assertEqual(self.first.short_translation, "")
        self.assertEqual(self.first.translation, "full")

    def test_duplicate_ids_rejected(self):
        row = self.row(self.first)
        response = self.client.post(
            "/api/dictionary/senses/translation-review-save/", [row, row], format="json"
        )
        self.assertEqual(response.status_code, 400)
