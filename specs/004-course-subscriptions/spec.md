# Feature Specification: Course Subscriptions

**Created:** 2026-11-17  
**Status:** Ready for planning  
**Input:** Launch paid course access in Iran with a single 30-day plan, public courses selected by the owner, and ZarinPal checkout with manual renewal.

This specification supersedes earlier free-access rules for the paid launch. Other course, account, and vocabulary behavior continues to follow the existing specifications.

## User Scenarios & Testing

### User Story 1 - Buy or renew course access (P1)

A signed-in learner pays 200,000 tomans once to unlock every published course for 30 days. A learner can buy more time before or after expiry.

**Independent test:** Start from a signed-in account and complete checkout using a test payment. Repeat with an active subscription and an expired subscription.

1. **Given** no active subscription, **when** the payment is confirmed, **then** all published courses unlock and access expires 30 days after the purchase is applied.
2. **Given** 10 days of remaining access, **when** a renewal is confirmed, **then** the expiry moves forward by 30 days, leaving 40 days of access.
3. **Given** a failed or cancelled payment, **when** the learner views the order, **then** they can see its outcome and their expiry has not changed.

### User Story 2 - Recover a payment when checkout is interrupted (P1)

A learner who paid can get their access even if they closed the bank page, lost their connection, or reached the site during an outage.

**Independent test:** Complete a test payment without returning to the site. Repeat with a forced interruption after provider verification and before access is granted.

1. **Given** a successful payment and a missed browser return, **when** the service checks outstanding orders, **then** the learner gets the purchased access without paying again.
2. **Given** a payment that the provider already verified, **when** the service retries an order interrupted before the extension was saved, **then** it applies the extension once. Later retries leave the expiry unchanged.
3. **Given** an unresolved payment, **when** the learner views its status, **then** they see that it is being checked, their order reference, and the support email. The unresolved order does not prompt them to pay again.

### User Story 3 - Browse the catalog and learn as a guest (P1)

A guest can browse published courses and use any free course. A learner without active access can see what paid courses are available.

**Independent test:** Publish one free course and one paid course. Open the catalog, lessons, and their media as a guest and as a signed-in learner without active access.

1. **Given** a guest, **when** they open a free course, **then** they can watch lessons, use subtitles, and click highlighted words to see definitions and other lesson information.
2. **Given** a guest in a free course, **when** they try to save a word, mark a sense as learned or already known, or otherwise save personal learning state, **then** they are prompted to sign in and no personal record is changed.
3. **Given** a guest or signed-in learner without active access, **when** they browse the catalog, **then** they see a Free badge on free courses and a lock icon on paid courses. Selecting a locked card opens Plans. Direct links to paid content still require access.
4. **Given** a signed-in learner whose access just expired, **when** they revisit a paid lesson, **then** it is locked. The dictionary, saved vocabulary, and existing learning state remain available as applicable.

### User Story 4 - Manage free courses and give access (P2)

An authorized admin can make a course free independently of publishing it, give someone extra time, and investigate payment issues.

**Independent test:** As an admin, change a course's free setting, apply a 7-day and a 30-day grant, and look up a test order by its reference.

1. **Given** a published paid course, **when** an admin marks it free, **then** guests can open it. An unpublished course stays hidden even if marked free.
2. **Given** a learner with active or expired access, **when** an admin adds 7 or 30 days, **then** the extension uses the same starting rule as a purchase and is recorded as a staff grant.
3. **Given** a learner's order reference, **when** an admin looks it up, **then** they can see its status, amount, and available provider reference and recheck an unresolved payment without charging the learner.

### Edge Cases

- A repeated or concurrent payment check cannot extend access twice. Two distinct verified purchases each add their full 30 days, including when an admin grant is made concurrently.
- A timeout or uncertain provider response leaves the order available for rechecking. A return from the payment page alone does not confirm a purchase. A mismatched order or amount grants no access.
- Access is active strictly before the expiry time. A new purchase or grant applied at expiry starts from the time it is applied.
- Changing a course back to paid restores the access check. Direct links to previously available subtitles, lesson content, and hosted video must respect the updated access rules.

## Requirements

### Functional Requirements

- **FR-001:** The published catalog MUST be visible to guests. Free courses MUST show a Free badge in the bottom right with the same padding as the level badge. Locked paid courses MUST show a lock icon in the bottom right and link to Plans.
- **FR-002:** The service MUST enforce publication and access rules for course pages, lessons, learning content, and their media, including direct requests. A published free course is open to everyone. A published paid course is open to accounts with active access and authorized staff. Drafts stay private to authorized staff.
- **FR-003:** Guests MUST be able to use playback, subtitles, and in-lesson word information in free courses. Actions that write personal learning state MUST ask guests to sign in. Signed-in learners MUST retain access to the dictionary and their saved vocabulary regardless of subscription status.
- **FR-004:** Staff MUST be able to set Free for everyone independently of publication. No course is automatically made free at the paid launch. Existing published courses without that setting become paid at launch with no complimentary access automatically granted.
- **FR-005:** The service MUST offer one plan for 200,000 tomans for 30 days. The business absorbs gateway fees. Purchase and renewal require sign-in and use ZarinPal hosted checkout. Each purchase is initiated by the learner and there are no scheduled charges.
- **FR-006:** Before checkout, the service MUST record an order on the purchasing account with the price and duration agreed at that time and track its provider reference when issued. Only provider confirmation matched to that order and its expected amount may grant the purchased time.
- **FR-007:** Each confirmed order MUST extend the account once. Payment completion and the access extension MUST take effect together. Purchases and staff grants MUST add their duration to the later of the current expiry or the time the extension is applied. Expiry MUST preserve previously saved learning state.
- **FR-008:** The service MUST recheck outstanding orders automatically without waiting for the learner to return. It MUST recover a provider-verified order that was interrupted before the access grant was recorded. Failed and cancelled orders grant no access. Uncertain results remain available for rechecking and must not trigger a second charge or extension.
- **FR-009:** Learners MUST be able to see the payment outcome, order reference, and support email, plus the new expiry on success. Orders MUST be private to the purchasing account and authorized staff. Authorized staff MUST be able to look up payments and recheck unresolved orders.
- **FR-010:** Authorized staff MUST be able to add exactly 7 or 30 days to an account and see that the grant was made by staff. Refund requests are handled manually by the owner at launch.
- **FR-011:** Test checkout MUST use ZarinPal sandbox and test accounts. A sandbox payment MUST never grant access on the live site. Live checkout MUST be available to customers only after the controlled live test in SC-005 passes.

### Key Entities

- **Course access setting** — Publication state and whether the course is free for everyone.
- **Access expiry** — The date and time through which an account can use paid courses.
- **Payment order** — The buyer, agreed price and duration, payment state, provider references, and whether its access has been granted.
- **Staff grant** — The learner, staff member, duration, and resulting expiry for a manual extension.

## Success Criteria

### Measurable Outcomes

- **SC-001:** Successful first purchases, active renewals, and purchases after expiry each add exactly 30 days. The checkout shows exactly 200,000 tomans as the customer total.
- **SC-002:** In the missed-return, verification-timeout, and interrupted-save tests, each confirmed order grants exactly one extension by the first successful recovery check. Replaying it grants zero additional days. Failed, cancelled, and mismatched orders grant zero days.
- **SC-003:** Guest, signed-in unsubscribed, expired, and active test accounts each see the correct access for free, paid, and draft courses, including direct lesson, subtitle, and video requests. No guest action writes personal learning state.
- **SC-004:** A staff member can add either duration, see the resulting expiry, and find and recheck a payment from its order reference without charging the customer again.
- **SC-005:** Before public checkout opens, a controlled live purchase through the production site confirms the expected charge, grants the correct access, and appears in settlement. Sandbox tests cover cancellation and recovery when the browser does not return.

## Assumptions

- The paid launch requires an approved ZarinPal merchant account, registered production domain, approved server outbound IP, and owner-provided support email. Sandbox testing can start before those are ready.
- The owner chooses which course to make free in admin. The plan grants course access only. Automatic renewal, additional plans, coupons, and self-service refunds are outside this release.
- Paid course media must be served from a source that supports restricting access. The implementation plan must verify whether existing hosted video and subtitle URLs can satisfy this requirement.
