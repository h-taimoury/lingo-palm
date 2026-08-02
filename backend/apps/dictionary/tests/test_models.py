from django.test import TestCase

from apps.dictionary.models import Entry, Sense


class DictionaryModelTests(TestCase):
    def test_entry_and_sense_can_be_created(self):
        entry = Entry.objects.create(
            word="book",
            part_of_speech="noun",
            pronunciation={
                "text": "/bʊk/",
                "br_audio": "book_Br.mp3",
                "am_audio": "book_Am.mp3",
            },
            frequency=["S1", "W1"],
        )

        sense = Sense.objects.create(
            entry=entry,
            sense_number="1",
            title="book_n_1",
            definition="a set of printed pages",
            synonyms=["volume"],
            opposites=[],
            examples=[{"text": "I am reading a book.", "usage": None}],
        )

        self.assertEqual(sense.entry_id, entry.id)
