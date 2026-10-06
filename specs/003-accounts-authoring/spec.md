# Feature Specification: Public access and shared course authoring

**Feature Branch**: None created; specification work uses the current checkout.

**Created**: 2026-10-04

**Status**: Draft for review; implementation not audited; empty-section behavior unresolved.

**Input**: Owner requested Spec Kit specifications using the original text documents and confirmed planning decisions D01-D28. See [project record](../project/README.md) and [constitution](../../.specify/memory/constitution.md).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Join and use free courses (Priority: P1)

An adult registers, signs in, and accesses published courses without payment.

**Why this priority**: Learners need a simple route into the first release.
**Independent Test**: Use a new learner account and prepared published/draft content.

**Acceptance Scenarios**:

1. **Given** a visitor, **When** valid registration is completed, **Then** an account can be created without an invitation.
2. **Given** a signed-in learner, **When** published courses are opened, **Then** no purchase or subscription is required.
3. **Given** a learner, **When** admin operations or draft content are requested, **Then** access is denied.
4. **Given** a signed-in learner, **When** their name is edited successfully, **Then** the saved name is shown.
5. **Given** first-release account features, **When** profile editing is offered, **Then** name editing is provided without self-service password changes or email password reset.
6. **Given** a learner using the site, **When** menus and controls appear, **Then** the interface is English.

### User Story 2 - Prepare shared teaching content (Priority: P1)

Trusted administrators create courses and select subtitle meanings together.

**Why this priority**: Content must be prepared before learners can use it.
**Independent Test**: Use two staff accounts, a section with subtitles, and dictionary senses.

**Acceptance Scenarios**:

1. **Given** a course created by one admin, **When** another trusted admin edits it, **Then** editing is permitted.
2. **Given** a draft section, **When** an admin adds a hosted video reference, subtitles, and selected teaching meanings, **Then** the content can be prepared without a formal level filter.
3. **Given** unmapped subtitle occurrences, **When** the admin selects a phrase across cues, **Then** one mapping can link those occurrences to specific senses.
4. **Given** a mapped occurrence, **When** an admin opens it, **Then** the existing mapping is edited rather than overlapped by a second mapping.
5. **Given** an admin who personally knows the taught meanings, **When** the editor opens, **Then** all mappings remain available.
6. **Given** a meaning without Persian text, **When** the admin saves it for teaching, **Then** absence of a translation does not block use.

### User Story 3 - Publish and update content (Priority: P2)

Administrators control visibility and update published content directly.

**Why this priority**: Learners need current content while unfinished content stays hidden.
**Independent Test**: Prepare course and section combinations with different publication states.

**Acceptance Scenarios**:

1. **Given** a published course and published section, **When** a learner opens the section, **Then** access succeeds.
2. **Given** either a draft course or draft section, **When** a learner requests that section, **Then** its teaching content is unavailable.
3. **Given** a published course, **When** an admin saves changes, **Then** those changes are visible without a separate republish step.
4. **Given** a completed learner section, **When** an admin adds an unknown taught meaning, **Then** completion follows the current vocabulary calculation.

### Edge Cases

- An unfinished mapping edit should warn before leaving; confirmed saves are no longer unsaved work.
- A learner must not gain staff powers by editing their own profile.
- An admin's vocabulary must not hide content from their teaching editor.
- A dictionary sense used by a mapping must not be silently deleted from underneath it.
- Publishability of sections without taught meanings is unresolved.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Registration MUST be public; sign-in MUST grant free access to all published courses.
- **FR-002**: Payments, subscriptions, and invitation-only registration MUST NOT be required.
- **FR-003**: The first-release learner interface MUST be English.
- **FR-004**: Learners MUST be able to edit their name. Self-service password changes and email recovery are deferred.
- **FR-005**: Trusted admins MUST share course editing access without teacher ownership restrictions.
- **FR-006**: Course preparation MUST support video references, subtitles, publication states, and manually selected teaching meanings.
- **FR-007**: Teaching selection MUST support exact occurrences and phrases, including cross-cue selections, without requiring Ctrl.
- **FR-008**: Existing mappings MUST remain visible to admins regardless of their personal vocabulary. Occurrences MUST NOT belong to overlapping mappings.
- **FR-009**: Meanings MUST be reusable across courses and may have optional Persian translations.
- **FR-010**: Published content edits MUST become visible upon successful save.
- **FR-011**: Both the course and section MUST be published for learner access.
- **FR-012**: Permission checks MUST prevent learner authoring and self-promotion.
- **FR-013**: Dictionary data already referenced in teaching MUST be protected against destructive deletion.
- **FR-014**: Meaningful unsaved authoring changes MUST trigger navigation warnings where supported.

### Key Entities

- **Account**: A learner or trusted administrator with a name and sign-in identity.
- **Course and section**: Shared teaching content with separate publication states.
- **Dictionary entry and sense**: Shared definitions referenced by teaching mappings.
- **Teaching mapping**: A selected group of subtitle occurrences and their meanings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user completes registration and opens a published course without an invitation or payment.
- **SC-002**: Both test admins can edit shared content, while the learner cannot perform authoring actions.
- **SC-003**: All four course/section publication combinations enforce the specified visibility.
- **SC-004**: An admin creates, edits, and removes a mapping with click/tap selection, including a cross-cue phrase.
- **SC-005**: A saved published-content edit is visible without another publication action.
- **SC-006**: Personal vocabulary causes zero missing mappings in the staff editor.

## Assumptions

- Existing email/password sign-in remains the product entry method.
- Original account and authoring behavior not changed here remains reference context for later inspection; email editing is not newly approved.
- Password reset by email is explicitly wanted later. No manual recovery process has been approved.
- A bilingual interface, payments, and teacher-specific ownership are outside the agreed release.
- Section duration is an authoring preference rather than a strict rejection rule.
- The empty-section publication decision is pending; release readiness for that case is not claimed.
- Depends on course-learning progress and shared vocabulary rules. A code audit is still needed before implementation planning.

