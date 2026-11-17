# Implementation Plan: Course Subscriptions

**Feature:** 004-course-subscriptions | **Date:** 2026-11-17 | **Spec:** [Course subscriptions](spec.md)

## Summary

Add a public catalog and enforce access to paid course content. Sell one 30-day extension through ZarinPal, store a confirmed purchase and its extension together, and recover incomplete orders even when no browser returns. Reuse the existing account and admin areas.

## Technical Context

- **Stack:** Python 3.12, Django 5.2, Django REST Framework, Next.js 16, TypeScript.
- **Storage:** PostgreSQL in production. Keep local SQLite for ordinary development and verify concurrent extensions on a separate PostgreSQL test database.
- **Testing:** Django API and transaction tests, Vitest for learner UI states, browser checks for checkout and media, and a ZarinPal sandbox integration check.
- **Operations:** Keep provider calls in Django. Run periodic recovery independently of browser traffic. Live checkout depends on a matching production domain, approved outbound IP, private media, a support email, and the controlled live test.

## Constitution Check

Django enforces publication, staff permissions, subscriptions, order ownership, and access to protected files. Keep the current cookie and CSRF rules for buyer and staff writes. Guests can read shared lesson senses only through an accessible course context. Personal learning data remains scoped to the user, and playback and progress semantics stay intact. The owner's paid launch decisions supersede the constitution's historical first-release access assumptions for this feature. The design adds no learning model or payment service outside Django. Verify payment recovery and direct media access before enabling the paid launch.

## Project Structure

- `backend/apps/courses/` and `backend/config/static_files.py` for catalog, content, and media restrictions.
- `backend/apps/users/` for expiry and the existing staff permissions. Use a small Django billing app for durable orders, grants, provider verification, and the recovery command.
- `frontend/src/app/(learner)/` and `frontend/src/components/courses/` for public browsing, locked cards, plans, and payment status. Reuse the admin course editor and the existing Django admin for staff access operations.
- `frontend/src/app/api/` for same-origin requests and authorized media access with range support.

## Implementation Order

1. **Course access.** Add the free setting and expiry. Separate public summaries from protected lesson content. Apply the same rule to every lesson, vocabulary mapping, and media request. Allow anonymous lesson reads and prompt for sign-in on personal writes. Preserve authenticated dictionary and personal vocabulary access.
2. **Billing and staff access.** Add the payment order and grant records. Implement server-side checkout, verified fulfillment, owner-only status, audited staff grants, and a staff recheck action. Use one transaction to record fulfillment and extend expiry, and serialize updates on the account row.
3. **Recovery and prelaunch validation.** Run a scheduled recovery command against outstanding orders. Exercise timeouts, missing returns, interrupted saves, concurrent writes, and provider retries. Validate the production media route, outbound connectivity, recovery scheduling, and a private live purchase before enabling public checkout.

The [research](research.md), [data model](data-model.md), [interface contracts](contracts/subscriptions.md), and [validation guide](quickstart.md) document the design and launch checks. Implementation tasks can be generated from these files.
