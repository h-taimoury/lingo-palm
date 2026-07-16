from django.core.exceptions import ValidationError
from django.test import TestCase

from apps.dictionary.models import Entry, Sense


class DictionaryModelTests(TestCase):
    def test_json_shapes_validate(self):
        entry = Entry(
            word="book",
            part_of_speech="noun",
            pronunciation={
                "text": "/bʊk/",
                "br_audio": "book_Br.mp3",
                "am_audio": "book_Am.mp3",
            },
            frequency=["S1", "W1"],
        )
        entry.full_clean()
        entry.save()

        sense = Sense(
            entry=entry,
            sense_number="1",
            title="book_n_1",
            definition="a set of printed pages",
            synonyms=["volume"],
            opposites=[],
            examples=[{"text": "I am reading a book.", "usage": None}],
        )
        sense.full_clean()

    def test_invalid_examples_are_rejected(self):
        entry = Entry.objects.create(word="book", part_of_speech="noun")
        sense = Sense(
            entry=entry,
            title="book_n_1",
            definition="definition",
            examples=[{"usage": "formal"}],
        )
        with self.assertRaises(ValidationError):
            sense.full_clean()
