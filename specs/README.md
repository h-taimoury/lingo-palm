# Lingo Palm specifications

Start with the [whole-project record](project/README.md) and [constitution](../.specify/memory/constitution.md).

| Specification | Status |
| --- | --- |
| [001: Course learning](001-course-learning/spec.md) | Draft; empty-section progress needs clarification |
| [002: Vocabulary review](002-vocabulary-review/spec.md) | Ready for planning review, with explicit display/order assumptions |
| [003: Accounts and authoring](003-accounts-authoring/spec.md) | Draft; empty-section publication needs clarification |
| [004: Course subscriptions](004-course-subscriptions/spec.md) | [Implementation plan](004-course-subscriptions/plan.md) ready; defines paid launch access and payment recovery |

Each feature has a `checklists/requirements.md` file. Checklist results assess the requirements, not the code. No application changes or implementation tests were performed in this documentation task.

`.specify/feature.json` currently selects `004-course-subscriptions`. Its paid launch rules supersede the earlier free-access rules. The earlier specifications remain the baseline for other behavior.

The supporting `project/` directory holds the original discussion record, overview, roadmap, and future questions. It is not an extra feature. All five files were moved from `docs/planning/` and checked by hash. Windows currently prevents removal of that empty directory because another process has it open. No duplicate planning files remain there. Original text references remain unchanged.
