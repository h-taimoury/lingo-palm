from django.contrib.auth import get_user_model
from datetime import timedelta
from pathlib import Path
from django.conf import settings
from django.utils import timezone
from tempfile import TemporaryDirectory
from django.test import override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from apps.courses.models import Course, Section, WordSenseMapping
from apps.dictionary.models import Entry, Sense


class CourseApiTests(APITestCase):
    def setUp(self):
        media = TemporaryDirectory()
        self.addCleanup(media.cleanup)
        settings = override_settings(MEDIA_ROOT=media.name)
        settings.enable()
        self.addCleanup(settings.disable)
        user_model = get_user_model()
        self.staff = user_model.objects.create_user(
            email="admin@example.com",
            password="password123",
            is_staff=True,
        )
        self.learner = user_model.objects.create_user(
            email="learner@example.com",
            password="password123",
        )
        self.entry = Entry.objects.create(word="look", part_of_speech="verb")
        self.sense = Sense.objects.create(
            entry=self.entry,
            sense_number="1",
            title="look_v_1",
            definition="to direct your eyes",
        )
        self.course = Course.objects.create(
            title="Demo Course",
            is_published=True,
        )
        self.section = Section.objects.create(
            course=self.course,
            title="Demo Section",
            order=1,
            local_video_url="https://example.com/video.mp4",
            subtitle_file=SimpleUploadedFile(
                "demo.vtt",
                b"WEBVTT\n\n1\n00:00:00.000 --> 00:00:02.000\nLook it up.\n",
                content_type="text/vtt",
            ),
            is_published=True,
        )

    @override_settings(COURSE_SUBSCRIPTIONS_ENABLED=True)
    def test_guest_catalog_can_order_free_courses_before_pagination(self):
        Course.objects.bulk_create([
            Course(title=f"A paid course {index:02}", is_published=True)
            for index in range(20)
        ])
        free = Course.objects.create(title="Z free course", is_published=True, is_free=True)
        Course.objects.create(title="Z unpublished course", is_free=True)
        response = self.client.get("/api/courses/courses/", {
            "search": "course",
            "ordering": "-is_free,title,id",
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 22)
        self.assertEqual(response.data["results"][0]["id"], free.id)
        self.assertEqual(response.data["results"][1]["title"], "A paid course 00")

    @override_settings(COURSE_SUBSCRIPTIONS_ENABLED=True)
    def test_guest_catalog_and_lesson_access(self):
        section_path = f"/api/courses/sections/{self.section.pk}/"
        catalog = self.client.get("/api/courses/courses/").data["results"]
        self.assertEqual(len(catalog), 1)
        self.assertFalse(catalog[0]["has_access"])
        self.assertEqual(self.client.get(section_path).status_code, 404)
        self.assertEqual(self.client.get(section_path + "taught-senses/").status_code, 404)
        self.course.is_free = True
        self.course.save(update_fields=["is_free"])
        self.assertEqual(self.client.get(section_path).status_code, 200)
        self.assertEqual(self.client.get(section_path + "taught-senses/").status_code, 200)
        self.assertNotEqual(self.client.post("/api/courses/courses/", {"title": "Guest"}).status_code, 201)
        self.course.is_published = False
        self.course.save(update_fields=["is_published"])
        self.assertEqual(self.client.get(section_path).status_code, 404)

    @override_settings(COURSE_SUBSCRIPTIONS_ENABLED=True)
    def test_paid_lesson_relocks_at_expiry(self):
        section_path = f"/api/courses/sections/{self.section.pk}/"
        self.client.force_authenticate(self.learner)
        self.learner.subscription_ends_at = timezone.now() + timedelta(days=1)
        self.assertEqual(self.client.get(section_path).status_code, 200)
        self.learner.subscription_ends_at = timezone.now()
        self.assertEqual(self.client.get(section_path).status_code, 404)

    @override_settings(COURSE_SUBSCRIPTIONS_ENABLED=True, DEBUG=True)
    def test_direct_media_requires_access_and_video_has_byte_ranges(self):
        sample = Path(settings.MEDIA_ROOT) / "sample-courses" / "sample.mp4"
        sample.parent.mkdir()
        sample.write_bytes(b"sample video data")
        self.section.local_video_url = "http://localhost:3000/sample-courses/sample.mp4"
        self.section.save(update_fields=["local_video_url"])
        section_path = f"/api/courses/sections/{self.section.pk}/"
        for name in ("subtitle/", "video/"):
            self.assertEqual(self.client.get(section_path + name).status_code, 404)
        self.course.is_free = True
        self.course.save(update_fields=["is_free"])
        subtitle = self.client.get(section_path + "subtitle/")
        self.assertIn(b"WEBVTT", b"".join(subtitle.streaming_content))
        self.assertEqual(subtitle["Cache-Control"], "private, no-store")
        video = self.client.get(section_path + "video/", HTTP_RANGE="bytes=7-11")
        self.assertEqual(video.status_code, 206)
        self.assertEqual(video["Content-Range"], "bytes 7-11/17")
        self.assertEqual(b"".join(video.streaming_content), b"video")
        self.course.is_free = False
        self.course.save(update_fields=["is_free"])
        self.assertEqual(self.client.get(section_path + "video/").status_code, 404)

    def test_section_video_urls_are_optional_on_create(self):
        self.client.force_authenticate(self.staff)
        response = self.client.post("/api/courses/sections/", {
            "course": self.course.pk,
            "title": "No video yet",
            "subtitle_file": SimpleUploadedFile("empty.vtt", b"WEBVTT\n\n", content_type="text/vtt"),
        }, format="multipart")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["local_video_url"], "")
        self.assertEqual(response.data["hosted_video_url"], "")

    def test_section_video_urls_can_be_updated_read_and_cleared(self):
        self.client.force_authenticate(self.staff)
        url = f"/api/courses/sections/{self.section.pk}/"
        values = {
            "local_video_url": "http://localhost:3000/videos/demo.mp4",
            "hosted_video_url": "https://cdn.example.com/demo.mp4",
        }
        response = self.client.patch(url, values, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        detail = self.client.get(url).data
        for field, value in values.items():
            self.assertEqual(detail[field], value)
        self.assertNotIn("video_url", detail)
        response = self.client.patch(url, dict.fromkeys(values, ""), format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.section.refresh_from_db()
        self.assertEqual(self.section.local_video_url, "")
        self.assertEqual(self.section.hosted_video_url, "")

    def _mapping_payload(self):
        # NOTE: the create serializer's fields are "section" and "senses"
        # (matching the model's own field names). "section_id"/"sense_ids"
        # is only used on the update (PATCH) serializer — see README.
        return {
            "section": self.section.id,
            "senses": [self.sense.id],
            "subtitle_words": [
                {
                    "word": "look",
                    "cue_id": 1,
                    "cue_start_time": 0.0,
                    "cue_end_time": 2.0,
                    "previous_cue_start_time": None,
                    "previous_cue_end_time": None,
                    "next_cue_start_time": None,
                    "next_cue_end_time": None,
                    "position_in_cue": 0,
                },
                {
                    "word": "up",
                    "cue_id": 1,
                    "cue_start_time": 0.0,
                    "cue_end_time": 2.0,
                    "previous_cue_start_time": None,
                    "previous_cue_end_time": None,
                    "next_cue_start_time": None,
                    "next_cue_end_time": None,
                    "position_in_cue": 2,
                },
            ],
        }

    def test_staff_can_create_multiword_mapping_atomically(self):
        self.client.force_authenticate(self.staff)
        response = self.client.post(
            "/api/courses/word-sense-mappings/",
            self._mapping_payload(),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(len(response.data["subtitle_words"]), 2)
        self.assertIsNone(response.data["translation"])

        self.client.force_authenticate(self.learner)
        section_response = self.client.get(f"/api/courses/sections/{self.section.id}/")
        self.assertEqual(section_response.status_code, 200)
        mappings = section_response.data["word_sense_mappings"]
        self.assertEqual(len(mappings), 1)
        self.assertEqual(
            [word["word"] for word in mappings[0]["subtitle_words"]],
            ["look", "up"],
        )

    def test_mapping_translation_can_be_created_edited_and_cleared(self):
        self.client.force_authenticate(self.staff)
        response = self.client.post(
            "/api/courses/word-sense-mappings/",
            {**self._mapping_payload(), "translation": "Look upward"},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["translation"], "Look upward")
        url = f"/api/courses/word-sense-mappings/{response.data['id']}/"
        response = self.client.patch(url, {"translation": "Search for"}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual([sense["id"] for sense in response.data["senses"]], [self.sense.id])

        self.client.force_authenticate(self.learner)
        section = self.client.get(f"/api/courses/sections/{self.section.id}/")
        self.assertEqual(section.data["word_sense_mappings"][0]["translation"], "Search for")
        self.assertEqual(self.client.patch(url, {"translation": None}, format="json").status_code, 403)

        self.client.force_authenticate(self.staff)
        response = self.client.patch(url, {"translation": None}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIsNone(response.data["translation"])

    def test_learner_cannot_read_unpublished_section(self):
        self.section.is_published = False
        self.section.save(update_fields=["is_published"])
        self.client.force_authenticate(self.learner)
        response = self.client.get(f"/api/courses/sections/{self.section.id}/")
        self.assertEqual(response.status_code, 404)

    def test_learner_cannot_create_mapping(self):
        self.client.force_authenticate(self.learner)
        response = self.client.post(
            "/api/courses/word-sense-mappings/",
            self._mapping_payload(),
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_deleting_section_removes_orphaned_mapping(self):
        self.client.force_authenticate(self.staff)
        response = self.client.post(
            "/api/courses/word-sense-mappings/",
            self._mapping_payload(),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        mapping_id = response.data["id"]

        self.section.delete()

        self.assertFalse(WordSenseMapping.objects.filter(pk=mapping_id).exists())

    def test_taught_senses_endpoint_reports_learning_state(self):
        self.sense.lex_unit = "look at"
        self.sense.examples = [
            {"text": "Look at the sky.", "usage": None},
            {"text": "Look at this.", "usage": "spoken"},
        ]
        self.sense.save()
        self.client.force_authenticate(self.staff)
        create_response = self.client.post(
            "/api/courses/word-sense-mappings/",
            self._mapping_payload(),
            format="json",
        )
        self.assertEqual(create_response.status_code, 201, create_response.data)

        self.client.force_authenticate(self.learner)
        response = self.client.get(
            f"/api/courses/sections/{self.section.id}/taught-senses/"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["sense"]["id"], self.sense.id)
        self.assertFalse(response.data[0]["is_learned"])
        self.assertEqual(response.data[0]["sense"]["lex_unit"], "look at")
        self.assertEqual(response.data[0]["sense"]["examples"], self.sense.examples)
        self.assertIn("pronunciation", response.data[0]["sense"]["entry"])
