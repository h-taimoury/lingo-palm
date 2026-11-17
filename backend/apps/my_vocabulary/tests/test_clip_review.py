from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.courses.models import Course, Section, SubtitleWord, WordSenseMapping
from apps.dictionary.models import Entry, Sense
from apps.my_vocabulary.models import Vocabulary


class ClipReviewTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create(email="learner@example.com")
        self.client.force_authenticate(self.user)
        entry = Entry.objects.create(word="head", part_of_speech="noun")
        self.sense = Sense.objects.create(
            entry=entry, sense_number="1", title="head_n_1", definition="body part"
        )
        self.other_sense = Sense.objects.create(
            entry=entry, sense_number="2", title="head_n_2", definition="leader"
        )
        self.card = Vocabulary.objects.create(user=self.user, sense=self.sense)
        self.url = reverse("vocabulary-clips", args=[self.card.pk])

    def make_section(self, **course_fields):
        course = Course.objects.create(
            title="Course", is_published=True, **course_fields
        )
        section = Section.objects.create(course=course, title="Lesson", is_published=True)
        section.hosted_video_url = f"https://media.example/sections/{section.pk}/master.m3u8"
        section.save(update_fields=["hosted_video_url"])
        return section

    def add_cue(self, section, cue_id, start, end, *, sense=None, position=0, **neighbors):
        mapping = WordSenseMapping.objects.create(section=section)
        mapping.senses.add(sense or self.sense)
        SubtitleWord.objects.create(
            mapping=mapping, word="head", position_in_cue=position, cue_id=cue_id,
            cue_start_time=start, cue_end_time=end, **neighbors,
        )

    @override_settings(CLIP_REVIEW_ENABLED=False)
    def test_unreleased_review_returns_no_clip_data(self):
        self.add_cue(self.make_section(is_free=True), 1, 2, 3)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"available": False})

    @override_settings(CLIP_REVIEW_ENABLED=True, COURSE_SUBSCRIPTIONS_ENABLED=True, DEBUG=False)
    def test_returns_unique_accessible_cues_and_applies_context_rules(self):
        section = self.make_section(is_free=True)
        self.add_cue(section, 1, 2, 3)
        self.add_cue(section, 1, 2, 3, position=1)
        self.add_cue(section, 2, 20, 22, previous_cue_start_time=9, previous_cue_end_time=15,
                     next_cue_start_time=27, next_cue_end_time=32)
        self.add_cue(section, 3, 40, 41, previous_cue_start_time=27, previous_cue_end_time=32,
                     next_cue_start_time=51, next_cue_end_time=53)
        self.add_cue(section, 4, 60, 61, sense=self.other_sense)
        self.add_cue(self.make_section(is_free=False), 1, 4, 5)
        draft = self.make_section(is_free=True)
        self.add_cue(draft, 1, 4, 5)
        draft.is_published = False
        draft.save(update_fields=["is_published"])

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data["available"])
        clips = response.data["clips"]
        self.assertEqual(
            [(clip["section"]["id"], clip["cue_id"], clip["start"], clip["end"]) for clip in clips],
            [(section.pk, 1, 0, 8), (section.pk, 2, 9, 32), (section.pk, 3, 35, 46)],
        )
        self.assertEqual(clips[0]["section"]["hosted_video_url"], "")
        self.assertTrue(clips[0]["section"]["playback_url"].endswith("/_main.m3u8"))

        stranger = get_user_model().objects.create(email="stranger@example.com")
        self.client.force_authenticate(stranger)
        self.assertEqual(self.client.get(self.url).status_code, 404)
