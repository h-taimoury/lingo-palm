# Data Model: Course Subscriptions

| Entity | Fields and rules |
| --- | --- |
| Course | Add `is_free`, default false. Keep existing publication status separate. |
| User | Add nullable `subscription_ends_at` as a timezone-aware timestamp. The purchase and staff grant paths add days to the later of the existing value and the current time. |
| Payment order | Unique public order reference, buyer, expected amount in IRR, purchased days, gateway environment, unique gateway authority once issued, provider receipt if available, state, timestamps, and resulting expiry when fulfilled. Price and duration stay fixed for each order. |
| Staff grant | Target user, staff actor, 7 or 30 days, grant time, and resulting expiry. Commit the grant and the user update together. |

A payment order starts pending. A successful payment request attaches its authority while the order stays pending. Ambiguous responses leave it pending for recheck. A definitive failure, cancellation, or reversal can close an unfulfilled order. A verified order transitions to fulfilled in the same transaction that updates the learner's expiry. Use the fulfilled state as proof of the local extension, including when the provider reports it already verified the payment.

Enforce unique authorities and an immutable order-to-account relationship. Lock the user and then the payment order when fulfilling, and use the same user lock for staff grants. Distinct successful purchases accumulate even when they arrive together. Staff can investigate a manual refund using the stored reference. Any automated entitlement adjustment after a refund is outside the initial design.
