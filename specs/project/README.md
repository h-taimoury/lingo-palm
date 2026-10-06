# Lingo Palm planning

Recorded: 2026-10-04. Status: product planning in progress.

Start with the [project overview](project-overview.md). The [decision record](decisions.md) contains the detailed choices confirmed by the owner in our planning conversation. The [open questions](open-questions.md) separate unresolved choices from future features. The [roadmap](roadmap.md) describes the proposed planning and review process.

These are supporting project documents for work with Spec Kit. They are not generated feature specifications or proof that the code already meets the requirements.

## How to use these documents

- Treat explicit owner decisions in this record as the current product direction where older notes disagree.
- Preserve earlier decisions that are not changed here, while checking their current relevance before implementation.
- Keep suggestions separate from confirmed decisions. Do not silently turn an open question into a requirement.
- Update the relevant documents as discussion continues. Use plain B2-level English and offer lettered answer options in chat.
- Review the code separately: code shows current behavior, while agreed requirements describe intended behavior. Report differences before planning changes.
- Application-code changes are outside the current planning task.

## Original references

The original files remain unchanged:

- [Product concept](../../lingo-palm%20AI%20context/Project_Concept.txt)
- [Backend reference](../../lingo-palm%20AI%20context/lingo_palm_backend_ai_context.txt)
- [Frontend planning recap](../../lingo-palm%20AI%20context/lingopalm-frontend-planning-recap.txt)
- [Scraper reference](../../lingo-palm%20AI%20context/longman_scraper_ai_context.txt)

The frontend recap contains later updates that replace some earlier sections. Read those updates before treating an old statement as an unresolved question. Known examples include the move to `/admin`, removing `/learning`, click/tap selection instead of requiring Ctrl, and returning all mappings to staff. The backend reference disagrees with the later staff-mapping decision; actual implementation has not been checked in this documentation task.

## Relationship to Spec Kit

The [constitution](../../.specify/memory/constitution.md) is now version 1.0.0, created through the installed constitution skill. Three specifications were created through separate specification-skill runs using its resolved template:

- [Course learning and completion](../001-course-learning/spec.md): D02, D04-D13.
- [Personal vocabulary and manual review](../002-vocabulary-review/spec.md): D05, D11-D20, D28.
- [Accounts and shared authoring](../003-accounts-authoring/spec.md): D01-D05, D13, D21-D27.

These specifications are review drafts, not evidence of completed implementation. Empty-section progress and publication behavior remain unresolved in the course and authoring specs. The active Spec Kit feature is `003-accounts-authoring`, the last specification created. Select the intended feature directory before running later feature commands.

The documents in this directory were moved from `docs/planning/` without losing their contents. This is a supporting project record under `specs/`, not a fourth feature. The decision table records what the owner agreed; specifications hold detailed acceptance behavior. Future amendments should update the relevant specification and record the decision once here, rather than create another parallel requirements folder. Application implementation has not been authorized by creating these specifications.
