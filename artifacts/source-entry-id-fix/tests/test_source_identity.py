import asyncio
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from bs4 import BeautifulSoup
from longman_scraper.exceptions import ScrapeError
from longman_scraper.parser import parse_word_page
from longman_scraper.parsers.head import parse_source_entry_id


def test_two_unnumbered_junior_entries_are_distinct():
    html = (Path(__file__).parent / 'fixtures/junior-identities.html').read_text(encoding='utf-8')
    with patch('longman_scraper.parser.resolve_pronunciations', new=AsyncMock(return_value=[None, None])):
        entries = asyncio.run(parse_word_page(html, None, None, 'https://www.ldoceonline.com', 'junior', 'unused'))
    assert [e.source_entry_id for e in entries] == ['entry:junior__12', 'entry:junior__14']
    assert all(e.word == 'Junior' and e.homonym_num is None and e.part_of_speech == '' for e in entries)
    assert entries[0].senses[0].definition != entries[1].senses[0].definition


def test_first_sense_is_used_when_entry_id_missing():
    element = BeautifulSoup('<span class="dictentry"><span class="ldoceEntry Entry"><span class="Sense" id="junior__1"></span></span></span>', 'lxml').select_one('.dictentry')
    assert parse_source_entry_id(element) == 'sense:junior__1'


def test_missing_source_ids_fail_clearly():
    element = BeautifulSoup('<span class="dictentry"><span class="Head"><span class="HWD">example</span></span></span>', 'lxml').select_one('.dictentry')
    with pytest.raises(ScrapeError, match='No source entry or sense ID'):
        parse_source_entry_id(element)
