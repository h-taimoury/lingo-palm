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

    def test_full_word_includes_all_exact_entries_and_senses(self):
        noun = Entry.objects.create(word="run", part_of_speech="noun", homonym_num=1)
        other_noun = Entry.objects.create(word="run", part_of_speech="noun", homonym_num=2)
        Entry.objects.create(word="runner", part_of_speech="noun")
        sense = Sense.objects.create(
            entry=self.entry, title="run_verb_1", sense_number=1,
            definition="move quickly", lex_unit="run away", register="informal",
            geo="British English", synonyms=["sprint"], opposites=["walk"],
            examples=[{"text": "Run home.", "usage": "spoken"}],
        )
        Sense.objects.create(entry=self.entry, title="run_verb_2", sense_number=2, definition="operate")
        self.client.force_authenticate(self.learner)
        response = self.client.get(f"/api/dictionary/entries/{self.entry.id}/full-word/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Cache-Control"], "private, max-age=86400")
        self.assertIn("Cookie", response["Vary"])
        self.assertEqual([row["id"] for row in response.data], [noun.id, other_noun.id, self.entry.id])
        senses = response.data[2]["senses"]
        self.assertEqual(len(senses), 2)
        self.assertEqual(senses[0]["id"], sense.id)
        for field in ("examples", "lex_unit", "register", "geo", "synonyms", "opposites"):
            self.assertEqual(senses[0][field], getattr(sense, field))

    def test_full_word_requires_authentication(self):
        response = self.client.get(f"/api/dictionary/entries/{self.entry.id}/full-word/")
        self.assertEqual(response.status_code, 401)
        self.assertNotIn("max-age=86400", response.get("Cache-Control", ""))

    def test_full_word_missing_entry(self):
        self.client.force_authenticate(self.learner)
        response = self.client.get("/api/dictionary/entries/999999/full-word/")
        self.assertEqual(response.status_code, 404)
        self.assertNotIn("max-age=86400", response.get("Cache-Control", ""))


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


class SenseTranslationFilterTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.staff = get_user_model().objects.create_user(
            email="translator@example.com", password=None, is_staff=True
        )
        entry = Entry.objects.create(word="run", part_of_speech="verb")
        cls.untranslated = Sense.objects.create(
            entry=entry, title="run_v_1", definition="move quickly"
        )
        cls.blank = Sense.objects.create(
            entry=entry, title="run_v_2", definition="operate", translation=""
        )
        cls.translated = Sense.objects.create(
            entry=entry, title="run_v_3", definition="manage", translation="اداره کردن"
        )
        cls.unused = Sense.objects.create(
            entry=entry, title="run_v_4", definition="continue"
        )
        section = _make_published_section()
        mapping = WordSenseMapping.objects.create(section=section)
        mapping.senses.set([cls.untranslated, cls.translated])
        draft = Section.objects.create(
            course=section.course, title="Draft", order=2,
            video_url="https://example.com/draft.mp4",
            subtitle_file="section_subtitles/draft.vtt",
        )
        mapping = WordSenseMapping.objects.create(section=draft)
        mapping.senses.set([cls.untranslated, cls.blank])

    def setUp(self):
        self.client.force_authenticate(self.staff)

    def test_filter_includes_used_untranslated_senses_once_including_drafts(self):
        response = self.client.get("/api/dictionary/senses/?needs_translation=true")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)
        self.assertEqual(
            [sense["id"] for sense in response.data["results"]],
            [self.untranslated.id, self.blank.id],
        )

    def test_omitted_or_false_filter_keeps_all_senses(self):
        for params in ({}, {"needs_translation": "false"}):
            with self.subTest(params=params):
                response = self.client.get("/api/dictionary/senses/", params)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.data["count"], 4)

    def test_saved_translation_removes_sense_from_queue(self):
        response = self.client.patch(
            f"/api/dictionary/senses/{self.untranslated.id}/",
            {"translation": "دویدن"}, format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.untranslated.refresh_from_db()
        self.assertEqual(self.untranslated.translation, "دویدن")
        response = self.client.get("/api/dictionary/senses/?needs_translation=true")
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], self.blank.id)


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
