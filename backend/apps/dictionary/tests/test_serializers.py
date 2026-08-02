from django.test import TestCase

from apps.dictionary.models import Entry
from apps.dictionary.serializers import EntrySerializer, SenseSerializer


class DictionarySerializerValidationTests(TestCase):
    def test_valid_entry_and_sense_shapes_are_accepted(self):
        entry_serializer = EntrySerializer(
            data={
                "word": "book",
                "part_of_speech": "noun",
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
                "synonyms": ["volume"],
                "opposites": [],
                "examples": [{"text": "I am reading a book.", "usage": None}],
            }
        )
        self.assertTrue(sense_serializer.is_valid(), sense_serializer.errors)

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
