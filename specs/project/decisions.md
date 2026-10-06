# Confirmed product decisions

Recorded: 2026-10-04, from the owner's answers in this planning conversation. Individual decision dates are not inferred. These are intended requirements, not implementation-status claims.

## Audience and course content

| ID | Decision |
| --- | --- |
| D01 | The main audience is Persian-speaking adults. Beginners already know some basic English. |
| D02 | Sections are about 20-30 minutes. A typical 90-minute film is divided into about 3-4 sections, rather than many short lessons. |
| D03 | For now, administrators select vocabulary they feel is important. A formal word-selection method remains open and will be informed by learner feedback. |
| D04 | Only administrator-selected subtitle words and phrases are clickable. General lookup of every subtitle word is outside the agreed first-release interaction. |
| D05 | Persian translations are optional per meaning. Some meanings have a translation and others do not. |
| D06 | Provide section vocabulary lists only; do not add a combined course vocabulary list for the first release. The separate personal My Vocabulary page remains in scope. |

## Progress and navigation

| ID | Decision |
| --- | --- |
| D07 | Vocabulary progress is the main measure of section completion. Watching the full video is not required, and watching progress is not a first-release requirement. |
| D08 | Previously known and newly learned meanings count equally toward completion. Each distinct taught meaning counts once, regardless of repeated occurrences. |
| D09 | A section reaches 100% when every distinct meaning it teaches is known or learned. |
| D10 | Learners can open any published section in any order. Completion does not unlock later sections. |
| D11 | Removing a meaning from learned vocabulary lowers progress where relevant. A subtitle mapping remains highlighted when any attached meaning is not learned; its highlight disappears only when all attached meanings are learned or known. |
| D12 | Marking a learned meaning as needing review does not reduce progress or make it unlearned. |
| D13 | Progress reflects the current taught meanings. Adding an unknown meaning can lower a completed section below 100%. Completion is not a permanent award. |

## Vocabulary review

| ID | Decision |
| --- | --- |
| D14 | Newly learned meanings enter the review list automatically. Meanings marked already known skip review by default. Learners may change review status later. |
| D15 | The first release uses manual review, without automatic review scheduling. |
| D16 | Display flashcards in a grid. Learners can flip individual cards. |
| D17 | Each card has a Stop reviewing action. It removes the meaning from review but keeps it learned and preserves progress. |
| D18 | Show the most recently added vocabulary first. Do not introduce random order or an order selector for this release. |
| D19 | The card front shows the word or phrase, part of speech, and sense number. The definition is on the back. Handling absent sense numbers needs to follow the data and be checked later. |
| D20 | Keep a Translation button on the back when a Persian translation is available. The owner described this as the current implementation; it has not been verified in this task. |

## Access, administration, and accounts

| ID | Decision |
| --- | --- |
| D21 | Anyone can register. This is not an invitation-only release. |
| D22 | All published courses are free for signed-in users. Payments and subscriptions are outside the first release to avoid their added complexity. |
| D23 | The owner and other trusted administrators can create and edit all courses. There are no separate teacher-owned course permissions for this release. |
| D24 | Saved changes to published courses become visible immediately. A separate draft-and-republish system for edits is not required. |
| D25 | Keep the English interface for the first release. A Persian interface and language switching are possible later additions. Optional Persian meaning translations remain in scope now. |
| D26 | Password reset by email is outside the first release and is a confirmed future requirement. No administrator-assisted recovery process was agreed. |
| D27 | Learners can edit their name in the first release. Changing their password while signed in is deferred. Email editing was not decided. |
| D28 | Video clip review is deferred. The first-release review method is flashcards. |

## Examples for later verification

- A section teaches four distinct meanings. Two are already known and one is newly learned: progress is 75%, even if the video has never been played.
- A taught meaning appears five times: it still counts once in the progress calculation.
- A mapping has two meanings. One is learned and one is unknown: it remains highlighted. Marking the second as already known removes the highlight.
- A learned meaning needs review: progress stays the same. Stopping review also leaves progress unchanged.
- A section is 100% complete. An administrator adds a previously untaught meaning that the learner does not know: progress falls below 100%.
- A learner removes a taught meaning from their vocabulary: progress falls and related mappings become highlighted where applicable.
- A meaning has no Persian translation: its English definition can still be used for teaching and review.

These examples describe expected behavior for future review. They are not test results.
