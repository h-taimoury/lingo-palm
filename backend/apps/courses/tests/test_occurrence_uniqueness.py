from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, connection, transaction
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase
from rest_framework.test import APITestCase

from apps.courses.models import Course, Section, SubtitleWord, WordSenseMapping
from apps.dictionary.models import Entry, Sense


class SubtitleOccurrenceUniquenessTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.staff = get_user_model().objects.create_user(
            email="occurrence@example.com", password="password123", is_staff=True,
        )
        course = Course.objects.create(title="Occurrence test")
        cls.section = Section.objects.create(course=course, title="First")
        cls.other_section = Section.objects.create(course=course, title="Second")
        entry = Entry.objects.create(word="figure", part_of_speech="verb")
        cls.sense = Sense.objects.create(entry=entry, sense_number=1, definition="understand")

    def setUp(self):
        self.client.force_authenticate(self.staff)
        self.mapping = WordSenseMapping.objects.create(section=self.section)
        self.mapping.senses.add(self.sense)
        self.word = SubtitleWord.objects.create(mapping=self.mapping, **self.word_data())

    def word_data(self, **changes):
        return {"word": "figure", "cue_id": 2, "position_in_cue": 1,
                "cue_start_time": 7.04, "cue_end_time": 9.392, **changes}

    def create_mapping(self, words, section=None):
        return self.client.post("/api/courses/word-sense-mappings/", {
            "section": (section or self.section).pk, "senses": [self.sense.pk],
            "subtitle_words": words,
        }, format="json")

    def test_overlapping_phrase_is_rejected_without_partial_mapping(self):
        response = self.create_mapping([self.word_data(word="out,"), self.word_data()])
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("already mapped", str(response.data))
        self.assertEqual(WordSenseMapping.objects.count(), 1)
        self.assertEqual(SubtitleWord.objects.count(), 1)

    def test_duplicate_tokens_inside_one_request_are_rejected(self):
        response = self.create_mapping([self.word_data(cue_id=3)] * 2)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(WordSenseMapping.objects.count(), 1)

    def test_other_cues_sections_and_occurrence_numbers_are_allowed(self):
        for word, section in [
            (self.word_data(cue_id=3), self.section),
            (self.word_data(position_in_cue=2), self.section),
            (self.word_data(), self.other_section),
        ]:
            response = self.create_mapping([word], section)
            self.assertEqual(response.status_code, 201, response.data)

    def test_direct_word_api_cannot_create_or_patch_overlap(self):
        other = WordSenseMapping.objects.create(section=self.section)
        response = self.client.post("/api/courses/subtitle-words/", {
            "mapping": other.pk, **self.word_data(),
        }, format="json")
        self.assertEqual(response.status_code, 400, response.data)
        word = SubtitleWord.objects.create(mapping=other, **self.word_data(word="out,"))
        response = self.client.patch(f"/api/courses/subtitle-words/{word.pk}/", {
            "word": "figure",
        }, format="json")
        self.assertEqual(response.status_code, 400, response.data)
        word.refresh_from_db()
        self.assertEqual(word.word, "out,")
        response = self.client.patch(f"/api/courses/subtitle-words/{self.word.pk}/", {
            "cue_end_time": 10,
        }, format="json")
        self.assertEqual(response.status_code, 200, response.data)

    def test_api_translates_database_conflict_even_if_precheck_misses_it(self):
        with patch("apps.courses.serializers.validate_subtitle_occurrences"):
            response = self.create_mapping([self.word_data()])
        self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(WordSenseMapping.objects.count(), 1)

    def test_database_rejects_create_bulk_create_and_update(self):
        other = WordSenseMapping.objects.create(section=self.section)
        with self.assertRaises(IntegrityError), transaction.atomic():
            SubtitleWord.objects.create(mapping=other, **self.word_data())
        with self.assertRaises(IntegrityError), transaction.atomic():
            SubtitleWord.objects.bulk_create([SubtitleWord(mapping=other, **self.word_data())])
        word = SubtitleWord.objects.create(mapping=other, **self.word_data(cue_id=3))
        with self.assertRaises(IntegrityError), transaction.atomic():
            SubtitleWord.objects.filter(pk=word.pk).update(cue_id=2)

    def test_database_cannot_be_bypassed_with_wrong_section(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            SubtitleWord.objects.filter(pk=self.word.pk).update(section=self.other_section)
        with self.assertRaises(IntegrityError), transaction.atomic():
            WordSenseMapping.objects.filter(pk=self.mapping.pk).update(section=self.other_section)

    def test_moving_word_between_sections_updates_internal_section(self):
        other = WordSenseMapping.objects.create(section=self.other_section)
        response = self.client.patch(f"/api/courses/subtitle-words/{self.word.pk}/", {
            "mapping": other.pk,
        }, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.word.refresh_from_db()
        self.assertEqual(self.word.section_id, self.other_section.pk)

    def test_model_validation_reports_overlap(self):
        other = WordSenseMapping.objects.create(section=self.section)
        with self.assertRaises(ValidationError):
            SubtitleWord(mapping=other, **self.word_data()).full_clean()

    def test_bulk_create_derives_section(self):
        word = SubtitleWord(mapping=self.mapping, **self.word_data(cue_id=3))
        SubtitleWord.objects.bulk_create([word])
        word.refresh_from_db()
        self.assertEqual(word.section_id, self.section.pk)


class OccurrenceMigrationTests(TransactionTestCase):
    def test_backfill_preserves_data_and_refuses_existing_conflicts(self):
        old_target = [("courses", "0002_course_subtitle_folder_alter_section_subtitle_file")]
        new_target = [("courses", "0003_subtitle_occurrence_uniqueness")]
        executor = MigrationExecutor(connection)
        executor.migrate(old_target)
        old_apps = executor.loader.project_state(old_target).apps
        CourseModel = old_apps.get_model("courses", "Course")
        SectionModel = old_apps.get_model("courses", "Section")
        MappingModel = old_apps.get_model("courses", "WordSenseMapping")
        WordModel = old_apps.get_model("courses", "SubtitleWord")
        duplicate = None
        try:
            course = CourseModel.objects.create(title="Migration")
            section = SectionModel.objects.create(course=course, title="Section")
            first = MappingModel.objects.create(section=section)
            second = MappingModel.objects.create(section=section)
            fields = dict(word="figure", cue_id=2, position_in_cue=1,
                          cue_start_time=7.04, cue_end_time=9.392)
            original = WordModel.objects.create(mapping=first, **fields)
            duplicate = WordModel.objects.create(mapping=second, **fields)
            with self.assertRaisesRegex(RuntimeError, "Resolve overlapping"):
                MigrationExecutor(connection).migrate(new_target)
            self.assertEqual(WordModel.objects.count(), 2)
            duplicate.delete()
            duplicate = None
            MigrationExecutor(connection).migrate(new_target)
            updated = SubtitleWord.objects.get(pk=original.pk)
            self.assertEqual(updated.section_id, section.pk)
            self.assertEqual(updated.mapping_id, first.pk)
            for name, value in fields.items():
                self.assertEqual(getattr(updated, name), value)
            with self.assertRaises(IntegrityError), transaction.atomic():
                SubtitleWord.objects.create(mapping_id=second.pk, **fields)
        finally:
            if duplicate is not None:
                duplicate.delete()
            MigrationExecutor(connection).migrate(new_target)
