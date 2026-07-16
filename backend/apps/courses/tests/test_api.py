from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from apps.courses.models import Course, Section
from apps.dictionary.models import Entry, Sense


class CourseApiTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.staff = user_model.objects.create_user(
            username="admin",
            password="password",
            is_staff=True,
        )
        self.learner = user_model.objects.create_user(
            username="learner",
            password="password",
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

    def test_staff_can_create_multiword_mapping_atomically(self):
        self.client.force_authenticate(self.staff)
        response = self.client.post(
            "/api/courses/word-sense-mappings/",
            {
                "section_id": self.section.id,
                "sense_ids": [self.sense.id],
                "subtitle_words": [
                    {
                        "word": "look",
                        "cue_id": "1",
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
                        "cue_id": "1",
                        "cue_start_time": 0.0,
                        "cue_end_time": 2.0,
                        "previous_cue_start_time": None,
                        "previous_cue_end_time": None,
                        "next_cue_start_time": None,
                        "next_cue_end_time": None,
                        "position_in_cue": 2,
                    },
                ],
            },
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

    def test_deleting_section_removes_orphaned_mapping(self):
        self.client.force_authenticate(self.staff)
        response = self.client.post(
            "/api/courses/word-sense-mappings/",
            {
                "section_id": self.section.id,
                "sense_ids": [self.sense.id],
                "subtitle_words": [
                    {
                        "word": "look",
                        "cue_id": "1",
                        "cue_start_time": 0.0,
                        "cue_end_time": 2.0,
                        "previous_cue_start_time": None,
                        "previous_cue_end_time": None,
                        "next_cue_start_time": None,
                        "next_cue_end_time": None,
                        "position_in_cue": 0,
                    }
                ],
            },
            format="json",
        )
        mapping_id = response.data["id"]
        self.section.delete()
        from apps.courses.models import WordSenseMapping

        self.assertFalse(WordSenseMapping.objects.filter(pk=mapping_id).exists())
