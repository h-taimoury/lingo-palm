from django.test import TestCase

from apps.dictionary.models import Entry
from apps.dictionary.serializers import EntrySerializer, SenseSerializer


class DictionarySerializerValidationTests(TestCase):
    def test_level_round_trip_and_nested_sense_entry(self):
        level = {"tooltip": " Core vocabulary: Medium-frequency ", "indicator": " ●●○ "}
        serializer = EntrySerializer(data={"word": "test", "part_of_speech": "noun", "level": level})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        entry = serializer.save()
        entry.refresh_from_db()
        expected = {"tooltip": "Core vocabulary: Medium-frequency", "indicator": "●●○"}
        self.assertEqual(entry.level, expected)
        sense = entry.senses.create(title="test_n", definition="a test")
        self.assertEqual(SenseSerializer(sense).data["entry"]["level"], expected)
        self.assertEqual(EntrySerializer(entry).data["level"], expected)

    def test_level_missing_or_null_is_supported(self):
        for extra in ({}, {"level": None}):
            serializer = EntrySerializer(data={"word": "test", "part_of_speech": "noun", **extra})
            self.assertTrue(serializer.is_valid(), serializer.errors)
            self.assertIsNone(serializer.save().level)

    def test_invalid_level_is_rejected(self):
        for level in ([], "high", {}, {"tooltip": "high"}, {"tooltip": "", "indicator": "●●●"}, {"tooltip": "high", "indicator": 3}, {"tooltip": "high", "indicator": "●●●", "extra": True}):
            with self.subTest(level=level):
                serializer = EntrySerializer(data={"word": "test", "level": level})
                self.assertFalse(serializer.is_valid())
                self.assertIn("level", serializer.errors)

    def test_valid_entry_and_sense_shapes_are_accepted(self):
        entry_serializer = EntrySerializer(
            data={
                "word": "book",
                "part_of_speech": "noun",
                "register": "informal",
                "pronunciation": {
                    "text": "/bʊk/",
                    "br_audio": "book_Br.mp3",
                    "am_audio": "book_Am.mp3",
                },
                "frequency": ["S1", "W1"],
            }
        )
        self.assertTrue(entry_serializer.is_valid(), entry_serializer.errors)
        entry = entry_serializer.save()

        sense_serializer = SenseSerializer(
            data={
                "entry_id": entry.id,
                "sense_number": "1",
                "title": "book_n_1",
                "definition": "a set of printed pages",
                "register": "literary",
                "synonyms": ["volume"],
                "opposites": [],
                "examples": [{"text": "I am reading a book.", "usage": None}],
            }
        )
        self.assertTrue(sense_serializer.is_valid(), sense_serializer.errors)
        sense_serializer.save()
        self.assertEqual(sense_serializer.data["entry"]["register"], "informal")
        self.assertEqual(sense_serializer.data["register"], "literary")

    def test_invalid_examples_are_rejected(self):
        entry = Entry.objects.create(word="book", part_of_speech="noun")
        sense_serializer = SenseSerializer(
            data={
                "entry_id": entry.id,
                "title": "book_n_1",
                "definition": "definition",
                "examples": [{"usage": "formal"}],
            }
        )
        self.assertFalse(sense_serializer.is_valid())
        self.assertIn("examples", sense_serializer.errors)

    def test_bulk_sense_create_uses_list_serializer(self):
        entry = Entry.objects.create(word="run", part_of_speech="verb")
        sense_serializer = SenseSerializer(
            data=[
                {
                    "entry_id": entry.id,
                    "title": "run_v_1",
                    "definition": "to move fast on foot",
                },
                {
                    "entry_id": entry.id,
                    "title": "run_v_2",
                    "definition": "to manage a business",
                },
            ],
            many=True,
        )
        self.assertTrue(sense_serializer.is_valid(), sense_serializer.errors)
        created = sense_serializer.save()
        self.assertEqual(len(created), 2)
        self.assertEqual(entry.senses.count(), 2)
