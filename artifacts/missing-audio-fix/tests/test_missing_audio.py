import asyncio
import base64
from unittest.mock import AsyncMock, patch

import pytest
from bs4 import BeautifulSoup
from longman_scraper.audio import download_audio
from longman_scraper.exceptions import AudioDownloadError
from longman_scraper.parsers.pronunciation import resolve_pronunciations


def entry(word, pos='', trademark=False):
    label = '<span class="REGISTERLAB">trademark</span>' if trademark else ''
    return BeautifulSoup(f'''<span class="Entry"><span class="Head">
        <span class="HWD">{word}</span><span class="POS">{pos}</span>{label}
        <span class="PronCodes">/pronunciation/</span>
        <span class="speaker brefile" data-src-mp3="{word}-br"></span>
        <span class="speaker amefile" data-src-mp3="{word}-am"></span>
        </span></span>''', 'lxml').select_one('.Entry')


@pytest.mark.parametrize('status', [404, 410])
def test_missing_job_british_audio_keeps_other_accents_and_entries(status, caplog):
    async def fetch(page, url):
        if url == 'Job-br':
            raise AudioDownloadError(url, RuntimeError(f'HTTP {status}'), status_code=status)
        return b'audio'
    with patch('longman_scraper.parsers.pronunciation.download_audio', side_effect=fetch), patch('longman_scraper.parsers.pronunciation.save_audio') as save:
        result = asyncio.run(resolve_pronunciations([entry('job', 'noun'), entry('Job')], None, 'unused', 'job'))
    assert result[0].br_audio and result[0].am_audio
    assert result[1].br_audio is None
    assert result[1].am_audio
    assert result[1].text == '/pronunciation/'
    assert save.call_count == 3
    assert 'Job-br' in caplog.text and 'British' in caplog.text


@pytest.mark.parametrize('status', [403, 429, 500, 502, 503, None])
@pytest.mark.parametrize('trademark', [False, True])
def test_unresolved_audio_still_fails_for_all_entries(status, trademark):
    error = AudioDownloadError('url', RuntimeError('failure'), status_code=status)
    with patch('longman_scraper.parsers.pronunciation.download_audio', new=AsyncMock(side_effect=error)):
        with pytest.raises(AudioDownloadError):
            asyncio.run(resolve_pronunciations([entry('Job', trademark=trademark)], None, 'unused', 'job'))


@pytest.mark.parametrize('status', [404, 410, 403, 429, 503])
def test_audio_download_preserves_http_status(status):
    page = AsyncMock()
    page.evaluate.return_value = {'status': status, 'encoded': None}
    with pytest.raises(AudioDownloadError) as raised:
        asyncio.run(download_audio(page, 'url'))
    assert raised.value.status_code == status


def test_audio_success_and_network_failure():
    page = AsyncMock()
    page.evaluate.return_value = {'status': 200, 'encoded': base64.b64encode(b'audio').decode()}
    assert asyncio.run(download_audio(page, 'url')) == b'audio'
    page.evaluate.side_effect = RuntimeError('network error')
    with pytest.raises(AudioDownloadError) as raised:
        asyncio.run(download_audio(page, 'url'))
    assert raised.value.status_code is None
