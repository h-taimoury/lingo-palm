# Subscription Validation

Run these checks after implementation. Use test accounts, private media fixtures, a separate development database, and sandbox configuration. Generate a UUID for the sandbox merchant ID. Keep the live merchant ID out of development settings.

## Local setup

From `backend/`, install development requirements using the steps in the [backend README](../../backend/README.md). Run `python manage.py migrate` and `python manage.py runserver`. From `frontend/`, run `npm ci` and `npm run dev`. Run Django's existing test command from the backend README and `npm test` from the frontend. Run payment concurrency checks on a disposable PostgreSQL database.

## Access and admin

Publish one free and one paid fixture course, and leave a third course unpublished. As a guest, open the free lesson, click a highlighted word, and try to mark its sense as learned. Expect the definition to open and the save action to prompt for sign-in. Open the paid lesson and its direct media routes with no access and with active access, then try again at expiry. Confirm the original media URL denies public requests. Confirm an expired learner can still open the dictionary and their saved vocabulary. Apply both staff grant durations and change a free course back to paid while checking that guest access ends.

## Payment and recovery

1. Start a sandbox checkout as a signed-in test user. Confirm the amount, finish checkout, and verify a single 30-day extension. Renew while still active and repeat after expiry.
2. Cancel a payment and verify that access does not change. Check a mismatched amount and an order opened by someone other than the buyer.
3. Complete a payment and close the tab before the return route. Run the recovery command. Compare the order state and expiry before and after recovery.
4. In automated tests, force a verification timeout and a process interruption between provider verification and the local commit. Retry with the already-verified response and replay the callback. Assert exactly one extension. Simulate simultaneous payment and staff updates and verify that distinct extensions accumulate.
5. Confirm a pending order shows its reference and support email and that staff can recheck it without charging the buyer.

## Production

Confirm merchant approval, registered callback domain, outbound IP approval, verification settings, and merchant-paid fees. Run recovery from the production environment and check that it can complete within the gateway's verification window. Verify media access from an unauthenticated request and from an active subscriber. Run a private live payment through the production site, check the amount debited, confirm exactly one 30-day grant, and match the provider receipt to settlement. Enable public checkout after these checks pass.

## Implementation verification

- Django and frontend suites passed. The PostgreSQL concurrency test passed separately on a temporary database, including simultaneous distinct purchases, a duplicate check, and a staff grant.
- A browser opened a free lesson, saw the locked paid card link to Plans, and received a 404 from the direct paid subtitle route.
- ZarinPal's sandbox accepted the order for 2,000,000 rials. After a successful simulated payment, the browser return was intercepted. The recovery command granted exactly 30 days and replaying the callback did not change the expiry.
- Hosted sandbox cancellation returned `NOK`, while the server-to-server inquiry still reported `IN_BANK`. No access was granted. The return page distinguishes the interrupted checkout from a confirmed failure, and recovery keeps checking the pending order. The automated suite verifies that a later confirmed payment can still grant access.
- Production hosting, scheduling, fees, and settlement still need their live checks.
