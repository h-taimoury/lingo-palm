from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from apps.courses.models import Course, Section, WordSenseMapping
from apps.dictionary.models import Entry, Sense


class CourseApiTests(APITestCase):
    def setUp(self):
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
            video_url="https://example.com/video.mp4",
            subtitle_file=SimpleUploadedFile(
                "demo.vtt",
                b"WEBVTT\n\n1\n00:00:00.000 --> 00:00:02.000\nLook it up.\n",
                content_type="text/vtt",
            ),
            is_published=True,
        )

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

        self.client.force_authenticate(self.learner)
        section_response = self.client.get(f"/api/courses/sections/{self.section.id}/")
        self.assertEqual(section_response.status_code, 200)
        mappings = section_response.data["word_sense_mappings"]
        self.assertEqual(len(mappings), 1)
        self.assertEqual(
            [word["word"] for word in mappings[0]["subtitle_words"]],
            ["look", "up"],
        )

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
