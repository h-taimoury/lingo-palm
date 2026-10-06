<!--
Sync Impact Report (remove before committing this amendment)
Version: unfilled template -> 1.0.0 (first adoption)
Principles: replace five example slots with sense-based learning, backend authority,
shared content and personal state, focused architecture, and verified changes.
Added: Product Boundaries; Development Workflow; Governance.
Removed: example-only template text. Deferred placeholders: none.
Separate work: specifications and documentation consolidation follow this constitution step.
-->
# Lingo Palm Constitution

## Core Principles

### I. Teach and track specific meanings

The learning unit MUST be a specific dictionary sense. Courses MUST reference shared
senses rather than duplicate dictionary definitions. A teaching mapping MUST connect exact
subtitle occurrences to one or more senses; phrases may span cues. Knowing one sense MUST
NOT imply knowing every sense of the word. Vocabulary writes MUST identify explicit senses.

### II. Keep Django responsible for persisted rules and permissions

Django MUST enforce authentication, staff permissions, publication visibility, and personal
vocabulary access. Frontend visibility checks are user-interface aids, not security controls.
Next.js MUST use the established Django API for ordinary data changes. Authentication MUST
preserve httpOnly JWT cookies and the established CSRF protection. Browser JavaScript MUST
NOT store or read JWT values. Refresh flows MUST be bounded and avoid repeated retry loops.

### III. Share teaching content and keep learning state personal

Trusted administrators MUST be able to edit shared courses and dictionary content. Personal
vocabulary MUST remain scoped to its learner. Progress MUST count distinct taught senses;
already-known and newly learned senses count equally. Review status and video viewing MUST
NOT reduce or increase vocabulary completion. Progress MUST reflect current content and
current learner knowledge, including removals and newly added taught senses.

### IV. Keep responsibilities clear and reuse subtitle identity

Learner playback and admin editing MUST use the same subtitle parsing and token identity
rules. Exact word text, cue identity, and a one-based counter for that exact word in the cue
MUST identify occurrences consistently. Player media control, shared player state, subtitle
rendering, and learning interactions MUST have separate responsibilities. Shared player state
MUST belong to each player instance, not a global player singleton. Django remains the
backend; server rendering and interactive frontend components MUST not duplicate its rules.
The development-only scraper MUST remain outside production execution paths.

### V. Verify important behavior and keep decisions visible

Changes MUST include checks appropriate to their risk, especially permissions, personal
vocabulary, progress, subtitle identity, media interactions, and session handling. Existing
plans call for focused unit/component checks and critical browser flows; trivial presentation
changes do not require exhaustive tests. Reports MUST distinguish intended requirements,
code observations, executed checks, and remaining uncertainty. Work MUST proceed in small
reviewable changes. Open product questions MUST NOT silently become requirements.

## Product Boundaries

The first release serves Persian-speaking adults who already know some basic English.
The interface is English, with optional Persian translations per sense. Registration is
public and published courses are free after sign-in. Vocabulary is selected manually;
formal level filters and selection methods are not release prerequisites. Sections are
about 20-30 minutes and can be opened in any order. Review is manual. Payments, scheduled
review, video clip review, and password recovery are outside the first release. Email
password recovery is explicitly wanted later. Detailed behavior belongs in specifications.

## Development Workflow

Use the original text references and confirmed owner decisions as planning evidence.
Read later amendments before relying on earlier notes. Specifications describe the agreed
product; code inspection describes the implementation. Compare them before planning fixes.
Keep requirements, plans, tasks, and verification results separate. Preserve unresolved
choices and explain assumptions. Discuss product questions in plain B2 English with stable
lettered choices. The current authorization covers planning, not application-code changes.

## Governance

This is the first adopted constitution, version 1.0.0. Owner instructions and explicit
product decisions govern amendments. Record the reason, affected principles, date, and
version for each amendment. Use a major version for incompatible principle changes, a
minor version for added principles, and a patch for wording-only corrections. During
planning and review, check work against these principles and document any required change
rather than hiding a conflict. Templates read this file at runtime and are not rewritten
by the constitution workflow. Unresolved feature choices remain in their specifications.

**Version**: 1.0.0 | **Ratified**: 2026-10-04 | **Last Amended**: 2026-10-04
