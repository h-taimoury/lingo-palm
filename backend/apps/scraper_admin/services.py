from __future__ import annotations

import logging
from dataclasses import asdict
from pathlib import Path

from asgiref.sync import async_to_sync
from django.conf import settings
from django.db import transaction

from apps.dictionary.models import Entry, Sense

logger = logging.getLogger(__name__)


def _audio_directory() -> Path:
    return Path(settings.MEDIA_ROOT) / "pronunciation_audios"


def scrape_and_save_word(word: str) -> list[Entry]:
    if Entry.objects.filter(word__iexact=word).exists():
        raise DuplicateScrapeError(word)

    # Imported only inside the development-only app. Production neither installs
    # this app nor imports longman_scraper.
    from longman_scraper import scrape_word

    try:
        result = async_to_sync(scrape_word)(word, audio_dir=str(_audio_directory()))
    except Exception:
        # scrape_word() can fail (e.g. AudioDownloadError) after it has already
        # saved some audio files for this word to disk. The scraper's exceptions
        # don't tell us which files were written before the failure, so we can't
        # target them precisely — do a best-effort sweep for this word instead.
        _cleanup_orphaned_audio_for_word(word)
        raise

    audio_filenames = _audio_filenames_from_result(result)

    try:
        with transaction.atomic():
            if Entry.objects.filter(word__iexact=word).exists():
                raise DuplicateScrapeError(word)

            created_entries: list[Entry] = []
            for scraped_entry in result.entries:
                pronunciation = (
                    asdict(scraped_entry.pronunciation)
                    if scraped_entry.pronunciation is not None
                    else None
                )
                entry = Entry.objects.create(
                    word=scraped_entry.word,
                    part_of_speech=scraped_entry.part_of_speech,
                    pronunciation=pronunciation,
                    frequency=list(scraped_entry.frequency),
                    inflections=scraped_entry.inflections,
                    register=scraped_entry.register,
                )
                Sense.objects.bulk_create(
                    [
                        Sense(
                            entry=entry,
                            sense_number=sense.sense_number,
                            title=sense.title,
                            definition=sense.definition,
                            lex_unit=sense.lex_unit,
                            geo=sense.geo,
                            register=sense.register,
                            synonyms=list(sense.synonyms),
                            opposites=list(sense.opposites),
                            examples=[asdict(example) for example in sense.examples],
                        )
                        for sense in scraped_entry.senses
                    ]
                )
                created_entries.append(entry)
    except Exception:
        _delete_unreferenced_audio_files(audio_filenames)
        raise

    return list(
        Entry.objects.filter(id__in=[entry.id for entry in created_entries]).prefetch_related(
            "senses"
        )
    )


def reject_scraped_entries(entry_ids: list[int]) -> list[int]:
    entries = list(Entry.objects.filter(id__in=entry_ids).prefetch_related("senses"))
    found_ids = {entry.id for entry in entries}
    if found_ids != set(entry_ids):
        missing = sorted(set(entry_ids) - found_ids)
        raise MissingEntriesError(missing)

    words = {entry.word.casefold() for entry in entries}
    if len(words) != 1:
        raise MixedScrapeEntriesError()

    if Sense.objects.filter(
        entry_id__in=entry_ids,
        word_mappings__isnull=False,
    ).exists():
        raise EntriesInUseError()

    audio_filenames = _audio_filenames_from_entries(entries)
    with transaction.atomic():
        Entry.objects.filter(id__in=entry_ids).delete()

    _delete_unreferenced_audio_files(audio_filenames)
    return sorted(found_ids)


def _audio_filenames_from_result(result) -> set[str]:  # noqa: ANN001
    filenames: set[str] = set()
    for entry in result.entries:
        pronunciation = entry.pronunciation
        if pronunciation is None:
            continue
        if pronunciation.br_audio:
            filenames.add(pronunciation.br_audio)
        if pronunciation.am_audio:
            filenames.add(pronunciation.am_audio)
    return filenames


def _audio_filenames_from_entries(entries: list[Entry]) -> set[str]:
    filenames: set[str] = set()
    for entry in entries:
        pronunciation = entry.pronunciation or {}
        for key in ("br_audio", "am_audio"):
            filename = pronunciation.get(key)
            if filename:
                filenames.add(filename)
    return filenames


def _delete_unreferenced_audio_files(filenames: set[str]) -> None:
    if not filenames:
        return

    referenced: set[str] = set()
    for pronunciation in Entry.objects.values_list("pronunciation", flat=True):
        pronunciation = pronunciation or {}
        for key in ("br_audio", "am_audio"):
            filename = pronunciation.get(key)
            if filename:
                referenced.add(filename)

    directory = _audio_directory()
    for filename in filenames - referenced:
        path = directory / filename
        try:
            path.unlink(missing_ok=True)
        except OSError:
            logger.exception("Could not remove rejected pronunciation audio: %s", path)


def _cleanup_orphaned_audio_for_word(word: str) -> None:
    """Best-effort cleanup for partial audio downloads left behind when
    scrape_word() itself raises (e.g. AudioDownloadError after some audio for
    this word already saved successfully). longman_scraper's exceptions don't
    report which files were written before the failure, so this scans the
    audio directory for filenames that look like they belong to this word
    (per the scraper's own "{word}_Br.mp3" / "{word}_Am.mp3" convention) and
    removes any that aren't referenced by an existing Entry.
    """
    directory = _audio_directory()
    if not directory.exists():
        return

    referenced: set[str] = set()
    for pronunciation in Entry.objects.values_list("pronunciation", flat=True):
        pronunciation = pronunciation or {}
        for key in ("br_audio", "am_audio"):
            filename = pronunciation.get(key)
            if filename:
                referenced.add(filename)

    prefix = f"{word.strip().lower()}_"
    for path in directory.glob("*"):
        if path.name.lower().startswith(prefix) and path.name not in referenced:
            try:
                path.unlink(missing_ok=True)
            except OSError:
                logger.exception("Could not remove orphaned pronunciation audio: %s", path)


class DuplicateScrapeError(Exception):
    def __init__(self, word: str) -> None:
        self.word = word
        super().__init__(f"{word!r} has already been scraped.")


class MissingEntriesError(Exception):
    def __init__(self, missing_ids: list[int]) -> None:
        self.missing_ids = missing_ids
        super().__init__(f"Entries do not exist: {missing_ids}")


class MixedScrapeEntriesError(Exception):
    pass


class EntriesInUseError(Exception):
    pass
