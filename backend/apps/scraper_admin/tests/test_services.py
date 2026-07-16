from dataclasses import dataclass, field
from unittest.mock import patch

from django.test import TestCase, override_settings

from apps.dictionary.models import Entry
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
    inflections: str | None = None
    register: str | None = None
    senses: list[FakeSense] = field(default_factory=list)


@dataclass
class FakeResult:
    entries: list[FakeEntry]


class ScraperServiceTests(TestCase):
    @override_settings(MEDIA_ROOT="/tmp/lingo-palm-test-media")
    @patch("longman_scraper.scrape_word")
    def test_scrape_result_is_saved_per_sense(self, scrape_word_mock):
        async def fake_scrape(word, audio_dir):
            return FakeResult(
                entries=[
                    FakeEntry(
                        word=word,
                        part_of_speech="noun",
                        pronunciation=FakePronunciation(text="/bʊk/"),
                        frequency=["S1"],
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

    @patch("longman_scraper.scrape_word")
    def test_duplicate_is_rejected_before_second_save(self, scrape_word_mock):
        Entry.objects.create(word="book", part_of_speech="noun")
        with self.assertRaises(DuplicateScrapeError):
            scrape_and_save_word("BOOK")
        scrape_word_mock.assert_not_called()
