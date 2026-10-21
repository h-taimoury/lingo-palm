from dataclasses import dataclass, field
from unittest.mock import patch

from django.db import IntegrityError
from django.test import TestCase, override_settings

from apps.dictionary.models import Entry, Sense
from apps.scraper_admin.services import DuplicateScrapeError, scrape_and_save_word


@dataclass
class FakeExample:
    text: str
    usage: str | None = None


@dataclass
class FakeSense:
    sense_number: str | None
    title: str
    definition: str
    lex_unit: str | None = None
    geo: str | None = None
    register: str | None = None
    synonyms: list[str] = field(default_factory=list)
    opposites: list[str] = field(default_factory=list)
    examples: list[FakeExample] = field(default_factory=list)


@dataclass
class FakePronunciation:
    text: str | None
    br_audio: str | None = None
    am_audio: str | None = None


@dataclass
class FakeEntry:
    word: str
    part_of_speech: str
    pronunciation: FakePronunciation | None
    frequency: list[str] = field(default_factory=list)
    homonym_num: int | None = None
    level: dict[str, str] | None = None
    inflections: str | None = None
    register: str | None = None
    senses: list[FakeSense] = field(default_factory=list)
    source_entry_id: str | None = None


@dataclass
class FakeResult:
    entries: list[FakeEntry]


class ScraperServiceTests(TestCase):
    @patch("apps.scraper_admin.services.scrape_word")
    def test_slug_headword_mismatch_cannot_duplicate_senses(self, scrape_word_mock):
        async def fake_scrape(word, audio_dir):
            return FakeResult(entries=[FakeEntry(
                word="take off", part_of_speech="phrasal verb", pronunciation=None,
                senses=[FakeSense("1", "take_off_1", "leave the ground")],
            )])

        scrape_word_mock.side_effect = fake_scrape
        first = scrape_and_save_word("take-off")
        with self.assertRaises(DuplicateScrapeError):
            scrape_and_save_word("take-off")
        self.assertEqual(Entry.objects.count(), 1)
        self.assertEqual(Sense.objects.count(), 1)
        self.assertEqual(Sense.objects.get().entry_id, first[0].id)

        # Simulate stale existence checks when another request has already
        # inserted this identity. The database must still reject the write.
        with patch("django.db.models.query.QuerySet.exists", return_value=False):
            with self.assertRaises(IntegrityError):
                scrape_and_save_word("take-off")
        self.assertEqual(Entry.objects.count(), 1)
        self.assertEqual(Sense.objects.count(), 1)

    @patch("apps.scraper_admin.services.scrape_word")
    def test_case_distinct_headwords_from_same_page_are_preserved(self, scrape_word_mock):
        async def fake_scrape(word, audio_dir):
            return FakeResult(entries=[
                FakeEntry(word="passion", part_of_speech="noun", pronunciation=None,
                          senses=[FakeSense("1", "passion_n_1", "strong feeling")]),
                FakeEntry(word="Passion", part_of_speech="noun", pronunciation=None,
                          senses=[FakeSense(None, "Passion_n", "suffering of Christ")]),
            ])

        scrape_word_mock.side_effect = fake_scrape
        self.assertEqual(len(scrape_and_save_word("passion")), 2)
        self.assertEqual(Sense.objects.count(), 2)

    @patch("apps.scraper_admin.services.scrape_word")
    def test_duplicate_returned_entry_rolls_back_entire_scrape(self, scrape_word_mock):
        async def fake_scrape(word, audio_dir):
            entry = FakeEntry(
                word="take off", part_of_speech="phrasal verb", pronunciation=None,
                senses=[FakeSense("1", "take_off_1", "leave the ground")],
            )
            return FakeResult(entries=[entry, entry])

        scrape_word_mock.side_effect = fake_scrape
        with self.assertRaises(DuplicateScrapeError):
            scrape_and_save_word("take-off")
        self.assertEqual(Entry.objects.count(), 0)
        self.assertEqual(Sense.objects.count(), 0)

    @override_settings(MEDIA_ROOT="/tmp/lingo-palm-test-media")
    @patch("apps.scraper_admin.services.scrape_word")
    def test_scrape_result_is_saved_per_sense(self, scrape_word_mock):
        async def fake_scrape(word, audio_dir):
            return FakeResult(
                entries=[
                    FakeEntry(
                        word=word,
                        part_of_speech="noun",
                        pronunciation=FakePronunciation(text="/bʊk/"),
                        frequency=["S1"],
                        level={"tooltip": "Core vocabulary: High-frequency", "indicator": "●●●"},
                        senses=[
                            FakeSense(
                                sense_number="1",
                                title="book_n_1",
                                definition="a set of printed pages",
                                examples=[FakeExample("I read a book.")],
                            )
                        ],
                    )
                ]
            )

        scrape_word_mock.side_effect = fake_scrape
        entries = scrape_and_save_word("book")
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0].senses.get().title, "book_n_1")
        self.assertEqual(entries[0].level, {"tooltip": "Core vocabulary: High-frequency", "indicator": "●●●"})

    @patch("apps.scraper_admin.services.scrape_word")
    def test_duplicate_is_rejected_before_second_save(self, scrape_word_mock):
        Entry.objects.create(word="book", part_of_speech="noun")
        with self.assertRaises(DuplicateScrapeError):
            scrape_and_save_word("BOOK")
        scrape_word_mock.assert_not_called()


class SourceEntryScrapeTests(TestCase):
    @patch("apps.scraper_admin.services.scrape_word")
    def test_junior_entries_save_and_rescrape_is_rejected(self, scrape_mock):
        async def scrape(word, audio_dir):
            return FakeResult(entries=[
                FakeEntry(word="junior", part_of_speech="adjective", pronunciation=None,
                          homonym_num=1, source_entry_id="sense:junior__1",
                          senses=[FakeSense("1", "junior_adj_1", "lower rank")]),
                FakeEntry(word="Junior", part_of_speech="", pronunciation=None,
                          source_entry_id="entry:junior__12",
                          senses=[FakeSense(None, "Junior_", "humorous name for a boy")]),
                FakeEntry(word="Junior", part_of_speech="", pronunciation=None,
                          source_entry_id="entry:junior__14",
                          senses=[FakeSense(None, "Junior_", "name suffix")]),
            ])
        scrape_mock.side_effect = scrape
        result = scrape_and_save_word("junior")
        self.assertEqual(len(result), 3)
        self.assertEqual(Sense.objects.count(), 3)
        self.assertEqual(Entry.objects.filter(word="Junior", homonym_num=None).count(), 2)
        with self.assertRaises(DuplicateScrapeError):
            scrape_and_save_word("junior")
        # Also protect calls made through a different URL alias.
        with self.assertRaises(DuplicateScrapeError):
            scrape_and_save_word("junior-alias")
        self.assertEqual(Sense.objects.count(), 3)

    @patch("apps.scraper_admin.services.scrape_word")
    def test_repeated_source_in_response_rolls_back_with_clear_error(self, scrape_mock):
        from apps.scraper_admin.services import DuplicateScrapeResultError
        async def scrape(word, audio_dir):
            entry = FakeEntry(word="Junior", part_of_speech="", pronunciation=None,
                              source_entry_id="entry:junior__12",
                              senses=[FakeSense(None, "Junior_", "a boy")])
            return FakeResult(entries=[entry, entry])
        scrape_mock.side_effect = scrape
        with self.assertRaisesMessage(DuplicateScrapeResultError, "same entry identity twice"):
            scrape_and_save_word("junior")
        self.assertEqual(Entry.objects.count(), 0)
        self.assertEqual(Sense.objects.count(), 0)

    @patch("apps.scraper_admin.services.scrape_word")
    def test_source_id_does_not_bypass_legacy_entry(self, scrape_mock):
        old = Entry.objects.create(word="Junior")
        old.senses.create(title="Junior_", definition="original")
        async def scrape(word, audio_dir):
            return FakeResult(entries=[FakeEntry(word="Junior", part_of_speech="", pronunciation=None,
                source_entry_id="entry:junior__12", senses=[FakeSense(None, "Junior_", "new")])])
        scrape_mock.side_effect = scrape
        with self.assertRaises(DuplicateScrapeError):
            scrape_and_save_word("junior-alias")
        self.assertEqual(Sense.objects.get().definition, "original")
