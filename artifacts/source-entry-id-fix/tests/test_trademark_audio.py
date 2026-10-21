import asyncio
from unittest.mock import AsyncMock, patch

import pytest
from bs4 import BeautifulSoup
from longman_scraper.exceptions import AudioDownloadError
from longman_scraper.parsers.pronunciation import resolve_pronunciations


def entry(trademark=True, own=True, sense_label=False):
    label = '<span class="REGISTERLAB"> Trademark </span>' if trademark else ''
    phonetics = ('<span class="PronCodes">/nʌts/</span>'
                 '<span class="speaker brefile" data-src-mp3="br"></span>'
                 '<span class="speaker amefile" data-src-mp3="am"></span>') if own else ''
    html = '<span class="dictentry"><span class="Head"><span class="HWD">Nuts</span>' + label + phonetics + '</span>'
    if sense_label:
        html += '<span class="Sense"><span class="REGISTERLAB">trademark</span></span>'
    return BeautifulSoup(html + '</span>', 'lxml').select_one('.dictentry')


@pytest.mark.parametrize('failed', [{'br'}, {'am'}, {'br', 'am'}, set()])
def test_trademark_accents_are_independent(failed, caplog):
    async def download(page, url):
        if url in failed:
            raise AudioDownloadError(url, RuntimeError('HTTP 404'), status_code=404)
        return b'audio'
    with patch('longman_scraper.parsers.pronunciation.download_audio', side_effect=download) as fetch, patch('longman_scraper.parsers.pronunciation.save_audio') as save:
        result = asyncio.run(resolve_pronunciations([entry()], None, 'unused', 'nuts'))[0]
    assert result.br_audio == (None if 'br' in failed else 'nuts_Br.mp3')
    assert result.am_audio == (None if 'am' in failed else 'nuts_Am.mp3')
    assert result.text == '/nʌts/'
    assert fetch.call_count == 2
    assert save.call_count == 2 - len(failed)
    for accent in failed:
        assert ('British' if accent == 'br' else 'American') in caplog.text
        assert 'Nuts' in caplog.text


@pytest.mark.parametrize('entries', [
    [entry(False)], [entry(False, sense_label=True)],
    [entry(), entry(False, own=False)],
    [entry(False, own=False), entry()],
])
def test_ordinary_or_mixed_groups_still_fail(entries):
    with patch('longman_scraper.parsers.pronunciation.download_audio', new=AsyncMock(side_effect=AudioDownloadError('br', RuntimeError('timeout')))):
        with pytest.raises(AudioDownloadError):
            asyncio.run(resolve_pronunciations(entries, None, 'unused', 'nuts'))


def test_shared_trademark_group_downloads_only_once_per_accent():
    with patch('longman_scraper.parsers.pronunciation.download_audio', new=AsyncMock(side_effect=AudioDownloadError('br', RuntimeError('404'), status_code=404))) as fetch:
        result = asyncio.run(resolve_pronunciations([entry(), entry(own=False)], None, 'unused', 'nuts'))
    assert result[0] is result[1]
    assert fetch.await_count == 2


def test_trademark_disk_errors_are_not_suppressed():
    with patch('longman_scraper.parsers.pronunciation.download_audio', new=AsyncMock(return_value=b'audio')), patch('longman_scraper.parsers.pronunciation.save_audio', side_effect=OSError('disk full')):
        with pytest.raises(OSError, match='disk full'):
            asyncio.run(resolve_pronunciations([entry()], None, 'unused', 'nuts'))
