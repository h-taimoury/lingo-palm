from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import override_settings
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.test import APITestCase

from apps.courses.models import Course, Section, WordSenseMapping
from apps.dictionary.models import Entry, Sense
from apps.scraper_admin.services import (
    DuplicateScrapeError,
    MissingEntriesError,
    MixedScrapeEntriesError,
)


class ScrapeWordViewPermissionTests(APITestCase):
    def setUp(self):
        self.learner = get_user_model().objects.create_user(
            email="learner@example.com", password="password123"
        )

    def test_anonymous_cannot_scrape(self):
        response = self.client.post("/api/scraper/scrape/", {"word": "book"})
        self.assertEqual(response.status_code, 401)

    def test_non_staff_cannot_scrape(self):
        self.client.force_authenticate(self.learner)
        response = self.client.post("/api/scraper/scrape/", {"word": "book"})
        self.assertEqual(response.status_code, 403)


class ScrapeWordViewTests(APITestCase):
    def setUp(self):
        self.staff = get_user_model().objects.create_user(
            email="staff@example.com", password="password123", is_staff=True
        )
        self.client.force_authenticate(self.staff)

    def test_blank_word_is_rejected(self):
        response = self.client.post("/api/scraper/scrape/", {"word": ""})
        self.assertEqual(response.status_code, 400)

    @patch("apps.scraper_admin.views.scrape_and_save_word")
    def test_successful_scrape_returns_created_entries(self, scrape_mock):
        entry = Entry.objects.create(word="book", part_of_speech="noun")
        scrape_mock.return_value = [entry]

        response = self.client.post("/api/scraper/scrape/", {"word": "book"})

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["entry_ids"], [entry.id])
        scrape_mock.assert_called_once_with("book")

    @patch("apps.scraper_admin.views.scrape_and_save_word")
    def test_duplicate_word_returns_409(self, scrape_mock):
        scrape_mock.side_effect = DuplicateScrapeError("book")
        response = self.client.post("/api/scraper/scrape/", {"word": "book"})
        self.assertEqual(response.status_code, 409)

    @patch("apps.scraper_admin.views.scrape_and_save_word")
    def test_integrity_error_returns_409(self, scrape_mock):
        scrape_mock.side_effect = IntegrityError("duplicate title")
        response = self.client.post("/api/scraper/scrape/", {"word": "book"})
        self.assertEqual(response.status_code, 409)

    @patch("apps.scraper_admin.views.scrape_and_save_word")
    def test_validation_error_returns_422(self, scrape_mock):
        scrape_mock.side_effect = DRFValidationError({"word": ["bad shape"]})
        response = self.client.post("/api/scraper/scrape/", {"word": "book"})
        self.assertEqual(response.status_code, 422)
        self.assertIn("errors", response.data)

    @patch("apps.scraper_admin.views.scrape_and_save_word")
    def test_word_not_found_returns_404(self, scrape_mock):
        from longman_scraper import WordNotFoundError

        scrape_mock.side_effect = WordNotFoundError(
            "asdkjasd", "https://example.com/asdkjasd"
        )
        response = self.client.post("/api/scraper/scrape/", {"word": "asdkjasd"})
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["code"], "word_not_found")

    @patch("apps.scraper_admin.views.scrape_and_save_word")
    def test_page_load_error_returns_502(self, scrape_mock):
        from longman_scraper import PageLoadError

        scrape_mock.side_effect = PageLoadError(
            "https://example.com/book", Exception("timeout")
        )
        response = self.client.post("/api/scraper/scrape/", {"word": "book"})
        self.assertEqual(response.status_code, 502)
        self.assertTrue(response.data["retryable"])

    @patch("apps.scraper_admin.views.scrape_and_save_word")
    def test_audio_download_error_returns_502(self, scrape_mock):
        from longman_scraper import AudioDownloadError

        scrape_mock.side_effect = AudioDownloadError(
            "https://example.com/book.mp3", Exception("network")
        )
        response = self.client.post("/api/scraper/scrape/", {"word": "book"})
        self.assertEqual(response.status_code, 502)
        self.assertTrue(response.data["retryable"])

    @patch("apps.scraper_admin.views.scrape_and_save_word")
    def test_unexpected_error_returns_500(self, scrape_mock):
        scrape_mock.side_effect = RuntimeError("boom")
        response = self.client.post("/api/scraper/scrape/", {"word": "book"})
        self.assertEqual(response.status_code, 500)


class RejectScrapeViewTests(APITestCase):
    def setUp(self):
        self.staff = get_user_model().objects.create_user(
            email="staff2@example.com", password="password123", is_staff=True
        )
        self.client.force_authenticate(self.staff)

    def test_anonymous_cannot_reject(self):
        self.client.force_authenticate(None)
        response = self.client.delete(
            "/api/scraper/reject/", {"entry_ids": [1]}, format="json"
        )
        self.assertEqual(response.status_code, 401)

    def test_empty_entry_ids_rejected(self):
        response = self.client.delete(
            "/api/scraper/reject/", {"entry_ids": []}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_reject_removes_entries_and_only_unreferenced_audio(self):
        rejected = Entry.objects.create(
            word="book",
            part_of_speech="noun",
            pronunciation={"br_audio": "shared.mp3", "am_audio": "unreferenced.mp3"},
        )
        sense = Sense.objects.create(entry=rejected, title="book_n_1", definition="Pages")
        kept = Entry.objects.create(
            word="booking", part_of_speech="noun", pronunciation={"am_audio": "shared.mp3"}
        )

        with TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            audio = Path(media_root) / "pronunciation_audios"
            audio.mkdir()
            shared = audio / "shared.mp3"
            unreferenced = audio / "unreferenced.mp3"
            shared.write_bytes(b"shared pronunciation")
            unreferenced.write_bytes(b"unreferenced pronunciation")

            response = self.client.delete(
                "/api/scraper/reject/", {"entry_ids": [rejected.pk]}, format="json"
            )

            self.assertEqual(shared.read_bytes(), b"shared pronunciation")
            self.assertFalse(unreferenced.exists())

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["deleted_entry_ids"], [rejected.pk])
        self.assertFalse(Entry.objects.filter(pk=rejected.pk).exists())
        self.assertFalse(Sense.objects.filter(pk=sense.pk).exists())
        self.assertTrue(Entry.objects.filter(pk=kept.pk).exists())

    @patch("apps.scraper_admin.views.reject_scraped_entries")
    def test_missing_entries_returns_404(self, reject_mock):
        reject_mock.side_effect = MissingEntriesError([99])
        response = self.client.delete(
            "/api/scraper/reject/", {"entry_ids": [99]}, format="json"
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["missing_entry_ids"], [99])

    @patch("apps.scraper_admin.views.reject_scraped_entries")
    def test_mixed_entries_returns_400(self, reject_mock):
        reject_mock.side_effect = MixedScrapeEntriesError()
        response = self.client.delete(
            "/api/scraper/reject/", {"entry_ids": [1, 2]}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_reject_keeps_the_entire_batch_when_one_sense_is_mapped(self):
        unmapped = Entry.objects.create(word="book", part_of_speech="verb")
        mapped = Entry.objects.create(word="book", part_of_speech="noun")
        sense = Sense.objects.create(entry=mapped, title="book_n_1", definition="Pages")
        course = Course.objects.create(title="Lesson course")
        section = Section.objects.create(course=course, title="Lesson")
        mapping = WordSenseMapping.objects.create(section=section)
        mapping.senses.add(sense)
        ids = [unmapped.pk, mapped.pk]

        response = self.client.delete(
            "/api/scraper/reject/", {"entry_ids": ids}, format="json"
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(Entry.objects.filter(pk__in=ids).count(), 2)
        self.assertTrue(mapping.senses.filter(pk=sense.pk).exists())
