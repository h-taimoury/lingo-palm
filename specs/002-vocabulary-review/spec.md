# Feature Specification: Personal vocabulary and manual review

**Feature Branch**: None created; specification work uses the current checkout.

**Created**: 2026-10-04

**Status**: Draft for review; implementation not audited.

**Input**: Owner requested Spec Kit specifications using the original text documents and confirmed planning decisions D01-D28. See [project record](../project/README.md) and [constitution](../../.specify/memory/constitution.md).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage personal meanings (Priority: P1)

A learner manages specific meanings they know, learned, or want to review.

**Why this priority**: Personal knowledge drives review and completion.
**Independent Test**: Use two learners and several senses of the same word.

**Acceptance Scenarios**:

1. **Given** an unknown sense, **When** it is marked newly learned, **Then** it enters personal vocabulary and review.
2. **Given** an unknown sense, **When** it is marked already known, **Then** it counts as known and skips review by default.
3. **Given** a known sense, **When** review is enabled later, **Then** knowledge and progress stay unchanged.
4. **Given** two senses of one word, **When** only one is selected for an action, **Then** the other stays unchanged.
5. **Given** another learner's vocabulary, **When** a user manages their own list, **Then** the other learner's records remain private and unchanged.

### User Story 2 - Review in a flashcard grid (Priority: P1)

A learner browses and flips cards for meanings needing review.

**Why this priority**: This is the first-release review method.
**Independent Test**: Prepare meanings with different addition dates, some with Persian translations.

**Acceptance Scenarios**:

1. **Given** review meanings with different vocabulary addition dates, **When** the grid opens, **Then** newest additions appear first.
2. **Given** a card, **When** its front appears, **Then** it shows the word or phrase, part of speech, and available sense number.
3. **Given** a card front, **When** the learner flips it, **Then** the English definition appears on the back.
4. **Given** an available Persian translation, **When** the back's Translation button is used, **Then** the translation is shown.
5. **Given** no Persian translation, **When** the card is reviewed, **Then** the English definition still works and no false translation is shown.

### User Story 3 - Stop reviewing a learned meaning (Priority: P2)

A learner removes an item from review directly on its card.

**Why this priority**: Learners control their manual review list.
**Independent Test**: Stop reviewing a card linked to section progress.

**Acceptance Scenarios**:

1. **Given** a review card, **When** Stop reviewing succeeds, **Then** it leaves the review list but stays learned and preserves progress.
2. **Given** a failed save, **When** Stop reviewing fails, **Then** the item stays in review and an error is shown.
3. **Given** no remaining review meanings, **When** the grid opens, **Then** it explains that there are no meanings to review.

### Edge Cases

- Different meanings of the same word remain separate cards.
- Missing sense numbers must not produce invented identifiers.
- Missing translations must not prevent reviewing.
- Re-enabling review must not create duplicate vocabulary records.
- Removing a learned sense is distinct from stopping review.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Personal vocabulary MUST track explicit senses, not whole-word knowledge.
- **FR-002**: Newly learned senses MUST enter review; already-known senses MUST skip it by default.
- **FR-003**: Learners MUST be able to change review status independently of knowledge.
- **FR-004**: Personal lists and changes MUST be limited to the owning learner, including for staff.
- **FR-005**: Review MUST use individually flippable cards in a grid.
- **FR-006**: Cards MUST show newest vocabulary additions first.
- **FR-007**: Fronts MUST show word or phrase, part of speech, and available sense number; backs MUST show the English definition.
- **FR-008**: Available Persian translations MUST be accessed through a Translation button on the back.
- **FR-009**: Stop reviewing MUST be available directly on each card and MUST preserve knowledge and progress.
- **FR-010**: Review MUST remain manual, without automatic scheduling, random ordering, or video clips in this release.
- **FR-011**: Failed writes MUST preserve the previous saved state and show an error.

### Key Entities

- **Sense**: A specific meaning with its definition and optional translation.
- **Vocabulary item**: A learner's sense, date added, already-known flag, and review flag.
- **Flashcard**: A view of a vocabulary meaning currently selected for review.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every prepared knowledge/review transition preserves the independent knowledge and review rules.
- **SC-002**: All cards with distinct addition dates appear newest first and flip independently.
- **SC-003**: Every successful Stop reviewing action leaves completion unchanged.
- **SC-004**: The full review flow works with and without translations or sense numbers.
- **SC-005**: Two learners cannot change or read each other's private vocabulary through these flows.

## Assumptions

- Newest means when the sense was added to personal vocabulary, not when review was re-enabled. This is an explicit planning assumption for review, not a newly confirmed owner choice.
- Missing sense numbers are omitted; missing translations have no active Translation action. These are display defaults to check against the current interface.
- Existing vocabulary actions remain available; this specification does not redesign their established behavior.
- Course completion depends on the sibling course-learning specification.
- A future review method similar to the app called "memorize" remains unselected; no algorithm is assumed.
- These are requirements and reviewable defaults, not claims that current code has passed tests.

