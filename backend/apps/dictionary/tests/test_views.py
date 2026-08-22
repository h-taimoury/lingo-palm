from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.courses.models import Course, Section, WordSenseMapping
from apps.dictionary.models import Entry, Sense


class EntryViewSetPermissionTests(APITestCase):
    def setUp(self):
        self.entry = Entry.objects.create(word="run", part_of_speech="verb")
        self.staff = get_user_model().objects.create_user(
            email="staff@example.com", password="password123", is_staff=True
        )
        self.learner = get_user_model().objects.create_user(
            email="learner@example.com", password="password123"
        )

    def test_anonymous_cannot_read(self):
        response = self.client.get("/api/dictionary/entries/")
        self.assertEqual(response.status_code, 401)

    def test_authenticated_non_staff_can_read(self):
        self.client.force_authenticate(self.learner)
        response = self.client.get("/api/dictionary/entries/")
        self.assertEqual(response.status_code, 200)

    def test_authenticated_non_staff_cannot_write(self):
        self.client.force_authenticate(self.learner)
        response = self.client.post(
            "/api/dictionary/entries/", {"word": "eat", "part_of_speech": "verb"}
        )
        self.assertEqual(response.status_code, 403)

    def test_staff_can_write(self):
        self.client.force_authenticate(self.staff)
        response = self.client.post(
            "/api/dictionary/entries/", {"word": "eat", "part_of_speech": "verb"}
        )
        self.assertEqual(response.status_code, 201, response.data)


def _make_published_section():
    course = Course.objects.create(title="Course", is_published=True)
    return Section.objects.create(
        course=course,
        title="Section",
        order=1,
        video_url="https://example.com/v.mp4",
        subtitle_file="section_subtitles/demo.vtt",
        is_published=True,
    )


class EntryDeletionGuardTests(APITestCase):
    def setUp(self):
        self.staff = get_user_model().objects.create_user(
            email="staff@example.com", password="password123", is_staff=True
        )
        self.client.force_authenticate(self.staff)

        self.entry = Entry.objects.create(word="book", part_of_speech="noun")
        self.sense = Sense.objects.create(
            entry=self.entry,
            sense_number="1",
            title="book_n_1",
            definition="printed pages",
        )

    def test_entry_deletable_when_unused(self):
        response = self.client.delete(f"/api/dictionary/entries/{self.entry.id}/")
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Entry.objects.filter(id=self.entry.id).exists())

    def test_entry_deletion_blocked_when_sense_is_mapped(self):
        section = _make_published_section()
        mapping = WordSenseMapping.objects.create(section=section)
        mapping.senses.set([self.sense])

        response = self.client.delete(f"/api/dictionary/entries/{self.entry.id}/")

        self.assertEqual(response.status_code, 409)
        self.assertTrue(Entry.objects.filter(id=self.entry.id).exists())
        self.assertTrue(Sense.objects.filter(id=self.sense.id).exists())

    def test_entry_deletion_allowed_after_mapping_removed(self):
        section = _make_published_section()
        mapping = WordSenseMapping.objects.create(section=section)
        mapping.senses.set([self.sense])
        mapping.delete()

        response = self.client.delete(f"/api/dictionary/entries/{self.entry.id}/")
        self.assertEqual(response.status_code, 204)


class SenseDeletionGuardTests(APITestCase):
    def setUp(self):
        self.staff = get_user_model().objects.create_user(
            email="staff2@example.com", password="password123", is_staff=True
        )
        self.client.force_authenticate(self.staff)

        entry = Entry.objects.create(word="run", part_of_speech="verb")
        self.sense = Sense.objects.create(
            entry=entry, sense_number="1", title="run_v_1", definition="to move fast"
        )

    def test_sense_deletable_when_unused(self):
        response = self.client.delete(f"/api/dictionary/senses/{self.sense.id}/")
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Sense.objects.filter(id=self.sense.id).exists())

    def test_sense_deletion_blocked_when_mapped(self):
        section = _make_published_section()
        mapping = WordSenseMapping.objects.create(section=section)
        mapping.senses.set([self.sense])

        response = self.client.delete(f"/api/dictionary/senses/{self.sense.id}/")

        self.assertEqual(response.status_code, 409)
        self.assertTrue(Sense.objects.filter(id=self.sense.id).exists())

    def test_sense_deletion_allowed_after_mapping_removed(self):
        section = _make_published_section()
        mapping = WordSenseMapping.objects.create(section=section)
        mapping.senses.set([self.sense])
        mapping.delete()

        response = self.client.delete(f"/api/dictionary/senses/{self.sense.id}/")
        self.assertEqual(response.status_code, 204)
