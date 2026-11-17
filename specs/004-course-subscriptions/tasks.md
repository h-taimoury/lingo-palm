# Tasks: Course Subscriptions

**Inputs:** [Spec](spec.md), [plan](plan.md), [research](research.md), [data model](data-model.md), [interfaces](contracts/subscriptions.md), and [validation guide](quickstart.md).

`[P]` marks work on separate files that can proceed against the agreed contract once its named prerequisites are complete. Story labels match the spec. Use a local or isolated test database for development and sandbox payments.

## Phase 1 — Setup

- [X] T001 Add server-side billing configuration in `backend/config/settings/base.py` and `backend/config/settings/production.py` for disabled, sandbox, private live test, and public live checkout. Keep merchant ID, callback origin, and support email in environment settings. Fail closed on incompatible settings and disallow sandbox in the live environment.
- [X] T002 [P] Document local sandbox setup, separate database settings, and the production configuration in `backend/README.md`. Use a generated sandbox UUID and identify the owner inputs for live checkout.

## Phase 2 — Shared Access Rules

- [X] T003 [P] Add `is_free`, default false, in `backend/apps/courses/models.py` and its migration. Keep existing publication status separate and leave all existing courses with the default.
- [X] T004 [P] Add nullable `subscription_ends_at` as a timezone-aware timestamp in `backend/apps/users/models.py` and its migration. Treat access as active only before expiry and omit expiry from public user responses in `backend/apps/users/serializers.py`.
- [X] T005 Implement the shared access rule in `backend/apps/courses/permissions.py`. Permit published free lessons for guests and published paid lessons for active subscribers. Preserve staff authoring and draft preview. Enable the new policy in test environments while preserving existing production access until the paid launch.

## Phase 3 — US3: Browse and Learn as a Guest (P1)

**Goal:** Show a public catalog and let guests use free lessons while protecting paid content and personal state.

**Independent test:** Visit a free, paid, and draft course with guest, unsubscribed, expired, and active test accounts. Check direct lesson and media routes and attempt to save a sense as a guest.

- [X] T006 [P] [US3] Add cases for catalog, nested sections, taught senses, subtitle mappings, and direct lesson and media permissions in `backend/apps/courses/tests/test_api.py` and `backend/config/tests.py`, including guest-to-paid denial after changing the free setting.
- [X] T007 [P] [US3] Add guest sign-in prompt cases in `frontend/src/components/video-player/VideoPlayerInner.test.tsx` and `frontend/src/components/vocabulary/SectionVocabularyManager.test.tsx`. Check that guest reads work and save actions send no write.
- [X] T008 [US3] Split catalog summaries from protected content in `backend/apps/courses/views.py` and `backend/apps/courses/serializers.py`. Return only published metadata and viewer access in public lists. Apply T005 to nested sections, taught senses, subtitle mappings, and subtitle words. Preserve authenticated dictionary and personal vocabulary access.
- [X] T009 [US3] Move subtitle and video delivery behind authorized section routes in `backend/apps/courses/urls.py` and `backend/apps/courses/media.py`. Remove public serving for lesson assets in `backend/config/static_files.py`, `backend/config/urls_development.py`, and `frontend/public/sample-courses/`. Keep public thumbnails and pronunciation audio. Use a fixed private media origin, handle byte ranges and applicable HLS child requests, and prevent public caching of protected responses.
- [X] T010 [P] [US3] Make course routes usable by guests in `frontend/src/proxy.ts`, `frontend/src/app/(learner)/layout.tsx`, `frontend/src/components/navigation/LearnerNav.tsx`, and `frontend/src/lib/api/server.ts`. Keep account, dictionary, and personal vocabulary paths signed in. Update `frontend/src/components/courses/CourseCard.tsx` to show a Free badge or a lock icon linking to Plans using T008's access response.
- [X] T011 [US3] Update `frontend/src/app/api/backend-media/[...path]/route.ts`, `frontend/src/lib/media.server.ts`, `frontend/src/lib/courses/video.ts`, `frontend/src/app/(learner)/courses/[courseId]/sections/[sectionId]/page.tsx`, and `frontend/src/app/(admin)/admin/courses/[courseId]/sections/[sectionId]/page.tsx` to request protected media with session and range support. Replace raw public media links and ensure protected variants and HLS segments use the same access rule.
- [X] T012 [US3] Use optional learner state and prompt guests to sign in before writing from `frontend/src/components/video-player/VideoPlayerInner.tsx` and `frontend/src/components/vocabulary/SectionVocabularyManager.tsx`. Preserve signed-in saves and progress.

## Phase 4 — US1: Buy or Renew Course Access (P1)

**Goal:** Start an authenticated 200,000 toman checkout and grant a verified 30-day purchase exactly once.

**Independent test:** Complete a first purchase, active renewal, purchase after expiry, and cancellation using test accounts. Compare the result and expiry to the order.

- [X] T013 [P] [US1] Add checkout, private status, fulfillment, amount mismatch, repeated callback, and concurrent purchase tests in `backend/apps/billing/tests/test_checkout.py`. Assert the price and duration are server-controlled and successful purchases each extend the correct account.
- [X] T014 [US1] Register the billing app and its routes in `backend/config/settings/base.py` and `backend/config/urls.py`. Add `PaymentOrder` and migrations in `backend/apps/billing/models.py`. Store a unique public order reference, buyer, expected amount in IRR, purchased days, gateway environment, unique gateway authority once issued, provider receipt if available, state, timestamps, and resulting expiry when fulfilled. Keep price and duration fixed for each order and the order-to-account relationship immutable.
- [X] T015 [P] [US1] Implement the ZarinPal request and verify calls in `backend/apps/billing/zarinpal.py`. Send explicit IRR and the stored expected amount, use bounded network timeouts, and distinguish provider verification and already-verified responses from failure or ambiguity. Keep sandbox and live credentials and hosts separate.
- [X] T016 [US1] Implement order creation and fulfillment in `backend/apps/billing/services.py`. Record the order before checkout and the authority before returning the provider URL. Prevent duplicate payable orders for the same attempt. After provider verification of the stored payment, lock the user and then the order in PostgreSQL. Commit the fulfilled state and extension together, adding 30 days to the later of the current expiry or now. Skip orders already fulfilled. Keep network calls outside the transaction.
- [X] T017 [US1] Implement the checkout POST, ZarinPal return, and owner/staff order status in `backend/apps/billing/views.py` and `backend/apps/billing/urls.py`. Keep CSRF for user writes, verify stored orders server-side, disclose no private details to the browser return alone, and reject public live checkout while it is disabled.
- [X] T018 [P] [US1] Build the plans and order status pages at `frontend/src/app/(learner)/plans/page.tsx` and `frontend/src/app/(learner)/payments/[orderRef]/page.tsx` against the checkout contract. Use the existing API client and sign-in redirects. Show 200,000 tomans, 30 days, manual renewal, pending or completed outcome, order reference, support email, and resulting expiry on success.

## Phase 5 — US2: Recover Interrupted Payments (P1)

**Goal:** Recover confirmed payments independently of the browser and make uncertain outcomes visible.

**Independent test:** Complete a test payment and close the tab. Force a timeout and a crash after provider verification. Recheck and verify that the result is exactly one extension per confirmed payment.

- [X] T019 [P] [US2] Add missed return, verification timeout, interrupted save, already-verified retry, and failed or reversed payment tests in `backend/apps/billing/tests/test_recovery.py`. Check that an unresolved response is not misreported as failure or as a new payable order.
- [X] T020 [US2] Add inquiry and per-order reconciliation in `backend/apps/billing/zarinpal.py` and `backend/apps/billing/services.py`. Use inquiry to decide when to verify. Use T016 for fulfillment. Leave ambiguous orders pending and make definitive outcomes available to buyers and staff.
- [X] T021 [US2] Add `backend/apps/billing/management/commands/reconcile_payments.py` to recheck outstanding orders in bounded batches without creating payments. Surface old or stuck orders with references while omitting credentials and card data. Document scheduling and how to detect missed runs in `backend/README.md`. Choose the production interval after confirming the provider's verification window and request limits.
- [X] T022 [US2] Verify the unresolved state in `frontend/src/app/(learner)/payments/[orderRef]/page.tsx`. Show that the app is checking the payment, the order reference, and the support email. Refresh or recheck the existing order without asking the buyer to pay again.

## Phase 6 — US4: Manage Free Courses and Staff Grants (P2)

**Goal:** Let staff choose free courses, give access time, and handle payment support.

**Independent test:** Make a paid course free and back again. Grant 7 and 30 days to active and expired accounts. Look up and recheck a pending order as staff and confirm an ordinary user is denied.

- [X] T023 [P] [US4] Add Free for everyone in `backend/apps/courses/admin.py`, `frontend/src/components/admin/courses/CourseEditor.tsx`, `frontend/src/components/admin/courses/CourseCreateForm.tsx`, and `frontend/src/types/api/courses.ts`. Let only authorized staff write `is_free` through the course interface in `backend/apps/courses/serializers.py`.
- [X] T024 [P] [US4] Add staff grant, permission, and grant-versus-payment concurrency tests in `backend/apps/billing/tests/test_staff.py`. Test payment lookup by order reference and no-charge recheck as staff.
- [X] T025 [US4] Add `StaffGrant` and a migration in `backend/apps/billing/models.py`. Store target user, staff actor, 7 or 30 days, grant time, and resulting expiry. Commit the grant and user update together using the same user lock as T016. Add staff-only grant, payment search, and recheck actions in `backend/apps/users/admin.py` and `backend/apps/billing/admin.py`. Reuse T020. Handle refunds manually using the order reference.

## Phase 7 — Integrated Validation and Launch

- [X] T026 Run the relevant Django and frontend suites and the browser access and sandbox payment scenarios in `specs/004-course-subscriptions/quickstart.md`. Verify purchase and staff concurrency on disposable PostgreSQL. Record the actual sandbox results for amount, cancellation, replay, and missed-return recovery.
- [ ] T027 Verify the production media origin and old public lesson paths, approved gateway domain and outbound IP, scheduled recovery, merchant-paid fees, and the configured support email using `specs/004-course-subscriptions/quickstart.md`. Complete the controlled live purchase and match the charge, extension, and settlement before switching on public checkout and the paid access policy.

## Dependencies and Execution Order

- Setup and foundation precede the story implementation. The course access phase comes first, as planned. Its independent checks can use seeded access timestamps.
- US1 depends on the shared access rules. US2 extends US1's verified fulfillment path. US4's free-course controls can begin after the course model and catalog contract are stable. Its grants and recheck depend on US1 and US2, respectively.
- Run the tests for each story against its service and interface changes. Full sandbox validation follows the integration of all four stories. Public launch follows T027.

## Parallel Execution Examples

- **US3:** Write backend access tests (T006) and frontend guest action tests (T007) in parallel. With the access contract in place, work on the backend media path (T009) and public navigation (T010) separately.
- **US1:** Write the checkout tests (T013) and ZarinPal client (T015) in parallel after configuration and the interface contract are agreed. Build the two frontend pages (T018) against the contract while the backend views are being wired.
- **US2:** Write recovery tests (T019) while the reconciliation logic (T020) is implemented in separate files.
- **US4:** Work on the course toggle (T023) and tests for staff billing actions (T024) separately. Complete the billing actions once reconciliation is available.

## Implementation Strategy

Validate US3 locally first. Then show the complete purchase and recovery flow in the sandbox with US1 and US2, and verify the staff tools in US4. The smallest public release includes all four stories because recovery, protected media, and staff support are needed when money is accepted. Production credentials, support email, and the live settlement check are launch dependencies, so implementation and sandbox testing can start before they are ready.
