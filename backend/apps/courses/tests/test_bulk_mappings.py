import copy
import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from apps.courses.models import Course, Section, SubtitleWord, WordSenseMapping
from apps.dictionary.models import Entry, Sense


class BulkMappingsTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.staff = get_user_model().objects.create_user(email="guide@example.com", password="password", is_staff=True)
        cls.learner = get_user_model().objects.create_user(email="reader@example.com", password="password")
        cls.course = Course.objects.create(title="Demo")
        cls.entry = Entry.objects.create(word="take off", part_of_speech="phrasal verb")
        cls.sense = Sense.objects.create(entry=cls.entry, title="leave", definition="Leave the ground")

    def setUp(self):
        self.media = tempfile.mkdtemp()
        settings = override_settings(MEDIA_ROOT=self.media)
        settings.enable()
        self.addCleanup(settings.disable)
        self.addCleanup(shutil.rmtree, self.media)
        self.section = Section.objects.create(course=self.course, title="Section", local_video_url="https://example.com/video",
            subtitle_file=SimpleUploadedFile("test.vtt", b"WEBVTT\n\n1\n00:00:01.000 --> 00:00:04.000\nWe take off, then take off.\n\n2\n00:00:05.000 --> 00:00:06.000\nAway!\n"))
        self.client.force_authenticate(self.staff)
        self.base = f"/api/courses/sections/{self.section.id}/bulk-mappings"
        context = self.client.get(f"{self.base}/context/").data
        self.suggestion = {"id": "take-off-1", "subtitle_sha256": context["subtitle_sha256"], "subtitle_word": "take off,",
            "cue_id": 1, "cue_text": "We take off, then take off.", "start_time": 1, "end_time": 4, "token_indices": [1, 2],
            "dictionary_word": "take off", "scrape_term": "take-off", "longman_url": "https://www.ldoceonline.com/dictionary/take-off"}

    def post(self, operation, payload):
        return self.client.post(f"{self.base}/{operation}/", payload, format="json")

    def export(self, suggestions=None):
        suggestions = suggestions or [self.suggestion]
        response = self.post("export", {"suggestions": suggestions, "entry_ids": {item["id"]: [self.entry.id] for item in suggestions}})
        self.assertEqual(response.status_code, 200, response.data)
        self.assertNotIn("review_token", response.data)
        data = response.data["mapping_template"]
        self.assertNotIn("review_token", data)
        self.assertNotIn("review_id", data)
        self.assertNotIn("review_id", response.data)
        self.assertNotIn("entries", response.data["suggestions"][0])
        for item in data["mappings"]:
            item["sense_ids"] = [self.sense.id]
        return data

    def test_legacy_optional_fields_are_discarded(self):
        suggestion = {**self.suggestion, "intended_meaning": "Legacy explanation", "url_verification": "unchecked"}
        for operation in ["validate", "export"]:
            response = self.post(operation, {"suggestions": [suggestion]})
            self.assertEqual(response.status_code, 200, response.data)
            self.assertNotIn("intended_meaning", response.data["suggestions"][0])
            self.assertNotIn("url_verification", response.data["suggestions"][0])

    def test_context_preserves_occurrence_identity_and_punctuation(self):
        response = self.client.get(f"{self.base}/context/")
        tokens = response.data["cues"][0]["tokens"]
        self.assertEqual(tokens[4], {"index": 4, "word": "take", "position_in_cue": 2})
        self.assertEqual(tokens[2]["word"], "off,")

    def test_review_import_and_repeat_are_safe(self):
        data = self.export()
        preview = self.post("preview", data)
        self.assertEqual(preview.data["ready"], 1)
        self.assertEqual(WordSenseMapping.objects.count(), 0)
        result = self.post("import", data)
        self.assertEqual(result.status_code, 200, result.data)
        self.assertEqual(result.data["created"], 1)
        words = list(SubtitleWord.objects.order_by("id"))
        self.assertEqual([word.word for word in words], ["take", "off,"])
        self.assertEqual(words[0].next_cue_start_time, 5)
        repeat = self.post("import", data)
        self.assertEqual(repeat.data["created"], 0)
        self.assertEqual(repeat.data["skipped"], 1)
        self.assertEqual(WordSenseMapping.objects.count(), 1)

    def test_repeated_sense_ids_and_occurrences_reuse_one_sense(self):
        second = {**self.suggestion, "id": "second", "subtitle_word": "take off.", "token_indices": [4, 5]}
        data = self.export([self.suggestion, second])
        for item in data["mappings"]:
            item["sense_ids"] = [self.sense.id, self.sense.id]
        for expected_created in (2, 0):
            response = self.post("import", data)
            self.assertEqual(response.status_code, 200, response.data)
            self.assertEqual(response.data["created"], expected_created)
        self.assertEqual(Sense.objects.count(), 1)
        self.assertEqual(Entry.objects.count(), 1)
        for mapping in WordSenseMapping.objects.all():
            self.assertEqual(list(mapping.senses.values_list("id", flat=True)), [self.sense.id])

    def test_any_overlap_skips_entire_phrase_without_changing_existing_mapping(self):
        existing = WordSenseMapping.objects.create(section=self.section)
        existing.senses.add(self.sense)
        SubtitleWord.objects.create(mapping=existing, word="off,", cue_id=1, position_in_cue=1, cue_start_time=1, cue_end_time=4)
        result = self.post("import", self.export())
        self.assertEqual(result.data["skipped"], 1)
        self.assertEqual(SubtitleWord.objects.count(), 1)
        self.assertEqual(list(existing.senses.values_list("id", flat=True)), [self.sense.id])

    def test_overlap_within_import_is_skipped_but_second_occurrence_is_distinct(self):
        overlap = {**self.suggestion, "id": "overlap"}
        second = {**self.suggestion, "id": "second", "subtitle_word": "take off.", "token_indices": [4, 5]}
        result = self.post("import", self.export([self.suggestion, overlap, second]))
        self.assertEqual(result.data["created"], 2)
        self.assertEqual(result.data["skipped"], 1)
        self.assertEqual(sorted(SubtitleWord.objects.filter(word="take").values_list("position_in_cue", flat=True)), [1, 2])

    def test_wrong_cue_text_hash_or_token_are_rejected(self):
        for change in [{"cue_text": "wrong"}, {"subtitle_sha256": "0" * 64}, {"token_indices": [90]}, {"token_indices": [1, 1]}, {"subtitle_word": "take off"}]:
            with self.subTest(change=change):
                result = self.post("validate", {"suggestions": [{**self.suggestion, **change}]})
                self.assertEqual(result.status_code, 400)
                self.assertIsInstance(result.data["detail"], str)

    def test_untrusted_dictionary_url_is_rejected(self):
        result = self.post("validate", {"suggestions": [{**self.suggestion, "longman_url": "https://example.com/dictionary/take-off"}]})
        self.assertEqual(result.status_code, 400)

    def test_lookup_is_case_insensitive_and_includes_all_parts_of_speech(self):
        Entry.objects.create(word="take off", part_of_speech="noun")
        result = self.post("lookup", {"dictionary_word": "TAKE OFF"})
        self.assertEqual(len(result.data["entries"]), 2)

    def test_invalid_sense_aborts_whole_batch(self):
        second = {**self.suggestion, "id": "second", "subtitle_word": "take off.", "token_indices": [4, 5]}
        data = self.export([self.suggestion, second])
        data["mappings"][1]["sense_ids"] = [999999]
        self.assertEqual(self.post("import", data).status_code, 400)
        self.assertEqual(WordSenseMapping.objects.count(), 0)

    def test_changed_subtitles_and_wrong_section_are_rejected(self):
        data = self.export()
        wrong = copy.deepcopy(data)
        wrong["section_id"] += 1
        self.assertEqual(self.post("import", wrong).status_code, 400)
        self.section.subtitle_file.save("changed.vtt", SimpleUploadedFile("changed.vtt", b"WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nChanged\n"))
        self.assertEqual(self.post("import", data).status_code, 400)

    def test_direct_mapping_without_export(self):
        data = {
            "schema_version": 2, "section_id": self.section.id,
            "subtitle_sha256": self.suggestion["subtitle_sha256"],
            "mappings": [{"cue_id": 1, "token_indices": [4], "sense_ids": [self.sense.id]}],
        }
        result = self.post("import", data)
        self.assertEqual(result.status_code, 200, result.data)
        self.assertEqual(result.data["created"], 1)
        word = SubtitleWord.objects.get()
        self.assertEqual((word.word, word.position_in_cue), ("take", 2))

    def test_invalid_locations_abort_whole_batch(self):
        data = self.export()
        for change in [{"cue_id": 999}, {"token_indices": []}, {"token_indices": [-1]},
                       {"token_indices": [99]}, {"token_indices": [2, 1]}, {"token_indices": [1, 1]}]:
            with self.subTest(change=change):
                wrong = copy.deepcopy(data)
                wrong["mappings"].append({**wrong["mappings"][0], **change})
                self.assertEqual(self.post("import", wrong).status_code, 400)
                self.assertEqual(WordSenseMapping.objects.count(), 0)

    def test_legacy_file_gets_actionable_error(self):
        data = self.export()
        data["schema_version"] = 1
        response = self.post("preview", data)
        self.assertEqual(response.status_code, 400)
        self.assertIn("schema_version 2", response.data["detail"])

    def test_existing_sense_can_be_selected_without_export_allowlist(self):
        data = self.export()
        other_entry = Entry.objects.create(word="other")
        other_sense = Sense.objects.create(entry=other_entry, title="other", definition="Other")
        data["mappings"][0]["sense_ids"] = [other_sense.id]
        self.assertEqual(self.post("import", data).status_code, 200)

    def test_preview_does_not_report_unknown_omission_count(self):
        data = self.export()
        self.assertNotIn("omitted", self.post("preview", data).data)

    def test_deleted_sense_is_rejected(self):
        data = self.export()
        self.sense.delete()
        self.assertEqual(self.post("import", data).status_code, 400)

    def test_export_preserves_only_submitted_accepted_occurrences(self):
        second = {**self.suggestion, "id": "second", "subtitle_word": "take off.", "token_indices": [4, 5]}
        response = self.post("export", {"suggestions": [second]})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["suggestions"], [second])
        self.assertEqual(response.data["mapping_template"]["mappings"],
                         [{"cue_id": 1, "token_indices": [4, 5], "sense_ids": []}])
        self.assertEqual(WordSenseMapping.objects.count(), 0)

    def test_staff_permissions_apply_to_every_operation(self):
        self.client.force_authenticate(self.learner)
        self.assertEqual(self.client.get(f"{self.base}/context/").status_code, 403)
        for operation in ["validate", "lookup", "export", "preview", "import"]:
            self.assertEqual(self.post(operation, {}).status_code, 403)

    def test_invalid_top_level_input_is_rejected(self):
        self.assertEqual(self.post("import", []).status_code, 400)
        self.assertEqual(self.post("validate", {"suggestions": []}).status_code, 400)

    def test_malformed_subtitles_return_actionable_validation_error(self):
        self.section.subtitle_file.save("bad.vtt", SimpleUploadedFile("bad.vtt", b"WEBVTT\n\n00:00:01.000 -->\nText\n"))
        response = self.client.get(f"{self.base}/context/")
        self.assertEqual(response.status_code, 400)
        self.assertIn("missing cue end", response.data["detail"])

    def test_srt_non_numeric_identifiers_and_duplicate_ids(self):
        self.section.subtitle_file.save("test.srt", SimpleUploadedFile("test.srt", b"intro\n00:00:01,000 --> 00:00:02,000\nHello\n\n5\n00:00:03,000 --> 00:00:04,000\nThere\n"))
        response = self.client.get(f"{self.base}/context/")
        self.assertEqual([cue["cue_id"] for cue in response.data["cues"]], [1, 5])
        self.section.subtitle_file.save("duplicate.vtt", SimpleUploadedFile("duplicate.vtt", b"WEBVTT\n\n2\n00:00:01.000 --> 00:00:02.000\nHello\n\n00:00:03.000 --> 00:00:04.000\nThere\n"))
        self.assertEqual(self.client.get(f"{self.base}/context/").status_code, 400)
