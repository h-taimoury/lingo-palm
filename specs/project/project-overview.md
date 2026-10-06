# Lingo Palm project overview

Recorded: 2026-10-04. Product scope confirmed in conversation; implementation not audited.

## Purpose and audience

Lingo Palm helps Persian-speaking adults learn English vocabulary through videos with interactive subtitles. Animations are the main planned content, with films such as Kung Fu Panda given as examples, not a confirmed release catalogue.

Beginner users are adults who already know some basic English. Teaching English from zero is not the intended beginner experience. The owner would like to support a broad range of levels, but exact level coverage and course-level rules remain open.

## First release

- Public registration and login.
- Free access to all published courses for signed-in users.
- Courses divided into sections of about 20-30 minutes; a typical 90-minute film has about 3-4 sections.
- Learners may open any published section in any order.
- Interactive subtitles: only administrator-selected words and phrases are clickable.
- Each teaching mapping connects the selected subtitle occurrence or phrase to specific dictionary meanings.
- Optional Persian translations for individual meanings. Meanings without translations can still be taught.
- A vocabulary list for each section, plus the learner's personal vocabulary collection. No combined full-course vocabulary list in the first release.
- Completion based on vocabulary knowledge, not video watching.
- Manual flashcard review in a grid.
- Trusted administrators prepare and edit shared courses and dictionary content.
- English interface, following the current language choice.
- Learners can edit their name. Self-service password changes are deferred.

## Content preparation

Administrators manually select the words, phrases, and meanings they feel are important. There is no required CEFR filter or formal word-selection method for the first courses. The owner will gather learner feedback before deciding whether to adopt a more structured method.

Separate versions of a course for different levels and AI-assisted selection were discussed but not approved as requirements.

## Learning and completion

A distinct dictionary meaning is the learning unit. Knowing one meaning of a word does not mean knowing all of its meanings.

For sections with taught meanings:

`progress = known or learned distinct taught meanings / all distinct taught meanings * 100`

Both previously known and newly learned meanings count equally. Repeated occurrences count once. A section is complete when every taught meaning is known or learned. Review status does not change completion. Removing a learned meaning or adding an unknown taught meaning can reduce progress.

The empty-section case and rounding rules are not settled by this conversation.

## Existing technical context

The original documents describe a Next.js frontend, a Django/DRF backend, a separate development-only dictionary scraper, and shared dictionary meanings referenced by courses. This remains reference context for later review. Saving this overview does not verify the current code or approve new technical changes.

See the [decision record](decisions.md) for detailed behavior and [open questions](open-questions.md) for future scope.
