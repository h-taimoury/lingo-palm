# Bulk Mappings

Open a section in the admin panel and choose **Bulk Mappings**. The original
mapping editor remains available and unchanged.

## Authoring workflow

1. Upload the final subtitle file to the section using the existing section editor.
2. In Bulk Mappings, download **subtitle context**. Give that JSON and, optionally,
   the subtitle file to the assistant in chat. The context contains instructions,
   the subtitle fingerprint, exact cue text, timing, and canonical tokens.
3. Ask for useful vocabulary in context, using the current vocabulary preference
   guide. Keep explicitly selected phrase groups together, and choose the dictionary
   headword or supported phrase entry that explains them. Never verify URLs online.
   Do not generate intended_meaning or url_verification fields.
4. Upload or paste the assistant's suggestions array. Optionally review occurrences
   with **Keep and next** or **Remove and next**. **Continue to dictionary** (or the
   **Prepare dictionary** step) automatically keeps all unreviewed occurrences and
   preserves removals. Previous/Next navigation alone does not count as acceptance.
   Removed suggestions remain revisitable until a new file is imported.
5. Optionally download accepted suggestions as a checkpoint. Reimporting this file
   starts a new review, but does not alter saved dictionary entries or mappings.
6. Prepare dictionary entries. Lookup is case-insensitive by canonical headword,
   across all parts of speech. Missing headwords use the supplied scrape term via
   the existing development-only scraper. Only one request runs at a time, terms
   are deduplicated, and successful work is preserved. Confirmed page-loading and
   audio-download failures retry up to three times after 3, 8, and 15 seconds,
   checking the dictionary before each attempt. After the initial attempt and three
   retries fail, the word is recorded in the failed-word list and the queue continues.
   **Retry failed words** retries that list without discarding the vocabulary choices.
   Failed occurrences are excluded from export until successfully prepared. Each run
   logs prepared, failed, and not-found counts. Other failures are logged and
   skipped immediately, without automatic retries or pausing the queue.
   A confirmed Longman word-not-found response is logged and all
   occurrences of that headword are removed from the selection; preparation
   continues with the next word. These occurrences are excluded from sense exports.
   All failed words remain available through **Retry failed words**; successful
   dictionary entries are retained. No manual skip is required.
   Stop cancels pending waits immediately and lets an active
   request finish before pausing. Keep the page open while requests run.
7. Download accepted words for sense selection after preparing the dictionary.
   This exports the final accepted suggestions, excluding removals and skipped
   words, plus a compact mapping template. Give it to the assistant, who reads
   senses from the dictionary database by dictionary_word and selects meanings
   matching the subtitle context. Database access is read-only for this step.
8. Upload the returned schema-version-2 mapping object, preview, then create
   mappings. No review token, review ID, saved review record, or browser session
   is needed. Keep section_id and subtitle_sha256 unchanged. Older version-1
   files must be regenerated; their suggestion IDs do not identify locations.

No model/AI API calls happen inside the application. Vocabulary selection happens in chat.
URL verification is never performed. The application validates the URL shape and host,
but does not claim to have verified the dictionary page itself.

## Bulk Selecting: words and phrase groups

Click normally to toggle an individual word. Hold **Ctrl** (or **Cmd** on Mac)
while clicking all words that belong to one expression. They share a highlight
color and group number, with a phrase summary below the cue. Release the modifier
to finish; the next modifier-held selection starts another group. Navigation or
window blur also ends the current group. Click a selected word normally to remove
only that word. Ctrl-clicking an existing selection moves it into the current
group; clicking it again in that group removes it. Already mapped words are locked.

Groups may contain non-adjacent tokens but cannot span cues. The
`bulk_vocabulary_selection` schema-version-1 export retains its existing shape:
each `selections` item represents one intended mapping. For a group,
`token_indices` contains all selected indices in subtitle order and `subtitle_word`
joins their exact token strings with spaces. Separate words remain separate items.
The assistant must preserve every item and its indices, including phrase groups,
when producing suggestions and selecting database senses. It must not insert
intervening tokens, split a group, or reduce a group to its dictionary headword.

## Suggestions format

The initial file is a JSON **array**. One object identifies one occurrence. The hash
below is a placeholder; copy the real `subtitle_sha256` from the context export.

```json
[
  {
    "id": "take-off-1",
    "subtitle_sha256": "COPY_THE_64_CHARACTER_SHA256_FROM_CONTEXT",
    "subtitle_word": "take off,",
    "cue_id": 1,
    "cue_text": "We take off, then take off.",
    "start_time": 1,
    "end_time": 4,
    "token_indices": [1, 2],
    "dictionary_word": "take off",
    "scrape_term": "take-off",
    "longman_url": "https://www.ldoceonline.com/dictionary/take-off"
  }
]
```

The URL above illustrates the format, not a guarantee that this dictionary page is
the correct entry. Use the main headword the scraper stores; do not verify the URL online.

Indices are zero-based whitespace-token indices **within a cue**. Preserve case,
punctuation, and cue line breaks. They are not `position_in_cue`: that database
field counts occurrences of an exact token string, starting at one. The backend
derives it, as well as neighboring cue times, from the saved subtitle file.

Both VTT and SRT-style timing are accepted by the context parser. Work from the
actual saved section file: reformatting or changing its bytes changes its hash.
Cross-cue phrases are not supported in this initial bulk mappings format; use the existing
editor for these. Suggestion files accept up to 2,000 occurrences (browser file
uploads are limited to 5 MB).

## Final mappings format

Return the `mapping_template` object provided by the export, filling `sense_ids`:

```json
{
  "schema_version": 2,
  "section_id": 3,
  "subtitle_sha256": "COPY_FROM_EXPORT",
  "mappings": [
    { "cue_id": 1, "token_indices": [1], "sense_ids": [42] }
  ]
}
```

Use actual database sense IDs matching the context; `42` is illustrative. At least one mapping is needed.
Omit uncertain mappings and explain them separately. The server cannot count
omissions without the original selection; preview reports ready/skipped only.
Keep subtitle metadata and locations unchanged. Import validates the entire file before any
write, checks current subtitles and sense availability, and skips a whole phrase
when any selected token is already mapped. Overlaps inside the same batch are also
skipped in input order. Reimporting an already applied file creates no duplicates.
It never deletes or updates existing mappings.

All bulk mappings endpoints require a staff account. The existing scraper stays
development-only; `NEXT_PUBLIC_ENABLE_SCRAPER=true` enables its wizard button path.
No new model or migration is needed for this workflow.
