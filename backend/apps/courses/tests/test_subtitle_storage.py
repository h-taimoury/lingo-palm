from tempfile import TemporaryDirectory

from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import transaction
from django.test import TestCase, override_settings

from apps.courses.models import Course, Section


class SubtitleStorageTests(TestCase):
    def setUp(self):
        media = TemporaryDirectory()
        self.addCleanup(media.cleanup)
        settings = override_settings(MEDIA_ROOT=media.name)
        settings.enable()
        self.addCleanup(settings.disable)
        self.course = Course.objects.create(title="Kung Fu Panda 4")
        self.section = self.create_section(self.course)

    def create_section(self, course):
        return Section.objects.create(course=course, title="Section", subtitle_file=self.upload())

    def upload(self):
        return SimpleUploadedFile("original.vtt", b"WEBVTT\n\n1\n00:00:01.000 --> 00:00:02.000\nHello\n")

    def test_new_upload_uses_section_id_and_short_generated_name(self):
        self.assertRegex(self.section.subtitle_file.name,
                         rf"^section_subtitles/kung-fu-panda-4/section-{self.section.pk}-[a-f0-9]{{12}}\.vtt$")
        self.assertTrue(self.section.subtitle_file.storage.exists(self.section.subtitle_file.name))

    def test_replacement_deletes_old_file_only_after_commit(self):
        old = self.section.subtitle_file.name
        with self.captureOnCommitCallbacks(execute=True):
            self.section.subtitle_file = self.upload()
            self.section.save()
            self.assertTrue(self.section.subtitle_file.storage.exists(old))
        self.assertFalse(self.section.subtitle_file.storage.exists(old))
        self.assertNotEqual(old, self.section.subtitle_file.name)

    def test_rollback_keeps_active_file(self):
        old = self.section.subtitle_file.name
        with self.captureOnCommitCallbacks(execute=True):
            with self.assertRaises(ValueError):
                with transaction.atomic():
                    self.section.subtitle_file = self.upload()
                    self.section.save()
                    raise ValueError("rollback")
        self.section.refresh_from_db()
        self.assertEqual(self.section.subtitle_file.name, old)
        self.assertTrue(self.section.subtitle_file.storage.exists(old))

    def test_shared_file_survives_until_last_section_deleted(self):
        old = self.section.subtitle_file.name
        storage = self.section.subtitle_file.storage
        other = Section.objects.create(course=self.course, title="Other", subtitle_file=old)
        with self.captureOnCommitCallbacks(execute=True):
            self.section.delete()
        self.assertTrue(storage.exists(old))
        with self.captureOnCommitCallbacks(execute=True):
            other.delete()
        self.assertFalse(storage.exists(old))

    def test_course_deletion_removes_subtitle(self):
        old = self.section.subtitle_file.name
        storage = self.section.subtitle_file.storage
        with self.captureOnCommitCallbacks(execute=True):
            self.course.delete()
        self.assertFalse(storage.exists(old))

    def test_folder_survives_rename_and_duplicate_titles_are_separate(self):
        self.course.refresh_from_db()
        folder = self.course.subtitle_folder
        self.course.title = "Renamed"
        self.course.save()
        self.assertIn(f"/{folder}/", self.create_section(self.course).subtitle_file.name)
        duplicate = Course.objects.create(title="Kung Fu Panda 4")
        self.create_section(duplicate)
        duplicate.refresh_from_db()
        self.assertEqual(duplicate.subtitle_folder, f"kung-fu-panda-4-{duplicate.pk}")
