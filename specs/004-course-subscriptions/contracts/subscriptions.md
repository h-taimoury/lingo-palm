# Subscription Interfaces

| Surface | Contract |
| --- | --- |
| Course catalog | Existing course list returns published title, image, descriptive metadata, free status, and whether the viewer has access. Only authorized staff use the authoring view. |
| Courses, lessons and media | Guest requests can read published free lessons and shared lesson senses. Unentitled requests cannot receive paid lesson data, mappings, video, or subtitles through any route. Staff authoring and preview retain their existing rules. Media requests support playback ranges and do not cache protected responses publicly. |
| Plans and checkout | Show 200,000 tomans for 30 days, manual renewal, and the current expiry where applicable. A signed-in buyer starts checkout with a CSRF-protected POST. The server sets the amount, records the order, returns its reference and a provider-hosted redirect URL, and handles a duplicate submission without creating another payable order for the same attempt. |
| ZarinPal return | Public redirect endpoint looks up a stored authority and verifies server-side. Query parameters select the candidate order only. Return to an order status screen without exposing order details to anonymous visitors or another account. |
| Order status | Buyer and staff can see the order reference, amount, pending or completed outcome, support email, and saved expiry after success. A pending order can be checked again without starting a new payment. |
| Staff tools | Use the course editor to set Free for everyone. Use Django admin for a 7-day or 30-day grant, payment lookup, and unresolved-order recheck. Require existing staff authorization and CSRF on mutations. |
| Recovery command | A scheduled process runs the same verification and fulfillment path as the callback and staff recheck. It never creates a new payment. Report unresolved exceptions with order references and omit payment credentials or card data. |
