# Feature Specification: Course learning and vocabulary completion

**Feature Branch**: None created; specification work uses the current checkout.

**Created**: 2026-10-04

**Status**: Draft for review; implementation not audited; empty-section behavior unresolved.

**Input**: Owner requested Spec Kit specifications using the original text documents and confirmed planning decisions D01-D28. See [project record](../project/README.md) and [constitution](../../.specify/memory/constitution.md).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Learn from selected subtitle meanings (Priority: P1)

A signed-in learner opens any published section and explores the meanings chosen by an administrator.

**Why this priority**: This is the main learning experience.
**Independent Test**: Use a prepared published section with repeated words, a phrase, and a mapping with two meanings.

**Acceptance Scenarios**:

1. **Given** an incomplete earlier section, **When** the learner opens a later published section, **Then** access is allowed.
2. **Given** a selected subtitle phrase, **When** the learner clicks any of its words, **Then** the relevant mapping's meanings appear and playback pauses.
3. **Given** an unselected word, **When** the learner clicks it, **Then** no dictionary learning interaction opens.
4. **Given** playback was active before the learning modal, **When** it closes, **Then** playback resumes; previously paused playback remains paused.
5. **Given** a meaning without a Persian translation, **When** it opens, **Then** the English definition remains usable.

### User Story 2 - Complete a section through vocabulary (Priority: P1)

A learner marks taught meanings as learned or already known and sees current progress.

**Why this priority**: Completion measures vocabulary knowledge.
**Independent Test**: Prepare four distinct taught meanings with repeated occurrences.

**Acceptance Scenarios**:

1. **Given** two already-known meanings and one learned meaning out of four, **When** progress is shown, **Then** it is 75%, regardless of viewing.
2. **Given** all four are known or learned, **When** completion is shown, **Then** it is 100%.
3. **Given** a completed section, **When** the learner removes one of its learned meanings, **Then** progress falls and affected mappings become highlighted.
4. **Given** a completed section, **When** an admin adds a distinct unknown taught meaning, **Then** progress falls below 100%.
5. **Given** a learned meaning, **When** review status changes, **Then** progress is unchanged.
6. **Given** two meanings in one mapping, **When** only one is learned, **Then** the highlight stays; after both are confirmed known or learned, it disappears.

### User Story 3 - Browse section vocabulary (Priority: P2)

A learner reviews a section's taught meanings without needing to play its video.

**Why this priority**: Learners can identify existing knowledge before watching.
**Independent Test**: Open a section vocabulary list with repeated meanings in the subtitles.

**Acceptance Scenarios**:

1. **Given** repeated occurrences of a sense, **When** its section list opens, **Then** that meaning appears once.
2. **Given** selected individual meanings, **When** the learner marks them known or learned, **Then** only those meanings change.
3. **Given** a course, **When** vocabulary navigation is offered, **Then** section lists are available without a combined full-course list.

### Edge Cases

- A failed vocabulary save must not remove a highlight or claim success.
- Repeated words and phrases spanning cues must open the correct mapping.
- Learners must not access a draft section or a section in a draft course.
- An empty taught-meaning set needs a product decision before completion behavior is implemented.
- A section URL that pairs the wrong course and section must not present that pairing as valid.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Learners MUST freely open published sections in any order.
- **FR-002**: Courses MUST support sections of about 20-30 minutes; this is an authoring target, not a hard duration limit.
- **FR-003**: Only selected teaching words and phrases MUST open learning interactions.
- **FR-004**: Each mapping MUST present its specific linked meanings, including optional Persian translations, rather than every meaning of a word.
- **FR-005**: Opening and closing the learning modal MUST preserve the playback behavior in Story 1.
- **FR-006**: For nonempty sections, progress MUST equal known or learned distinct taught senses divided by all distinct taught senses, multiplied by 100. Viewing and review status MUST NOT affect it.
- **FR-007**: Progress and highlights MUST reflect removal of learned senses and changes to taught senses.
- **FR-008**: A mapping MUST stay highlighted if any linked sense is unknown. Successful learning of its final unknown sense MUST remove its highlight without reloading the page.
- **FR-009**: Section vocabulary lists MUST show distinct meanings and support individual-sense selection. No full-course list or whole-word expansion is included.
- **FR-010**: Keyboard and visible touch/mouse controls MUST support learning navigation. Current-cue mode MUST show the cue's mappings in subtitle order; specific-mapping mode MUST stay within that mapping. Closing MUST restore focus.
- **FR-011**: Learners MUST NOT see unpublished teaching content.
- **FR-012**: Empty-section progress and publishability remain an open decision, not a rule inferred from division by zero.

### Key Entities

- **Course and section**: Published teaching content with video, subtitles, and selected meanings.
- **Sense**: One dictionary meaning shared across content.
- **Teaching mapping**: Exact subtitle occurrences linked to one or more senses.
- **Learner vocabulary**: A learner's known or learned senses and independent review choices.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All prepared progress examples (0%, 75%, 100%, removal, added sense, review change) produce the specified result for nonempty sections.
- **SC-002**: All prepared single-word, repeated-word, and multiword mapping cases open only the intended meanings.
- **SC-003**: A learner can complete the open-meaning, learn, and return-to-video flow with both keyboard and visible controls.
- **SC-004**: No unpublished content or section-order lock is encountered contrary to the access rules.

## Assumptions

- Depends on account access, admin-prepared content, and the personal vocabulary behavior in the sibling specifications.
- Exact English levels and a formal vocabulary-selection method remain deliberately open.
- This records current product intent; the implementation has not been audited.
- Percentage rounding and zero-meaning section behavior require review before implementation. Core nonempty-section planning can proceed, but final release acceptance is not complete.
- Original player controls and later frontend interaction decisions remain reference input for detailed player specifications, not proof of implementation.

