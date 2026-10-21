from django.test import TestCase
from django.db import IntegrityError, transaction

from apps.dictionary.models import Entry, Sense


class DictionaryModelTests(TestCase):
    def test_duplicate_entry_identity_is_rejected_by_database(self):
        for homonym in (None, 1):
            with self.subTest(homonym=homonym):
                Entry.objects.create(word="book", part_of_speech="noun", homonym_num=homonym)
                with self.assertRaises(IntegrityError), transaction.atomic():
                    Entry.objects.bulk_create([
                        Entry(word=" book ", part_of_speech="noun ", homonym_num=homonym)
                    ])

    def test_distinct_dictionary_entries_are_preserved(self):
        for word, pos, homonym in [
            ("passion", "noun", None), ("Passion", "noun", None),
            ("passion", "verb", None), ("passion", "noun", 1),
            ("passion", "noun", 2), ("passion", "noun", 0),
        ]:
            Entry.objects.create(word=word, part_of_speech=pos, homonym_num=homonym)
        self.assertEqual(Entry.objects.count(), 6)

    def test_duplicate_sense_title_is_rejected_by_database(self):
        entry = Entry.objects.create(word="book")
        Sense.objects.create(entry=entry, title="book_n_1", definition="pages")
        with self.assertRaises(IntegrityError), transaction.atomic():
            Sense.objects.bulk_create([
                Sense(entry=entry, title="book_n_1", definition="pages")
            ])

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
