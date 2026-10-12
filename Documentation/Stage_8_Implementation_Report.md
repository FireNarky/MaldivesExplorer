# Stage 8 implementation report

| Field | Value |
| --- | --- |
| Date | 12 October 2026 |
| Scope | Stage 8 quotes: builder, versions, itinerary segments, line items, approval, PDF, send, expiry, acceptance, decline, and history |
| Exit | Staff can prepare, approve, and send an immutable quote version. The owning customer can read that sent version, download its PDF, and accept or decline it once before it expires. |

## Result

`/admin/quotes` lists quotes a staff user is allowed to read. `/admin/quotes/[id]` is the builder for the active version, with history and the approval and send actions. An enquiry detail shows its quotes and can start one when the user can write quotes.

A customer sees a sent version on the enquiry and at `/account/quotes/[id]`. Accept and decline are available only while that version is sent and still inside its expiry. Acceptance records the choice. It does not mark the enquiry Won and it does not create a booking.

Newsletter signup, reviews, analytics dashboards, the booking engine, payments, and supplier integrations were not started.

## Schema changes

None. `prisma/schema.prisma` and the migrations were not changed. Quotes, versions, segments, items, responses, media, email deliveries, jobs, idempotency keys, and the approval settings were already in the contract. `.env.local` was not migrated.

## New routes

| Route | Who | Behaviour |
| --- | --- | --- |
| `/admin/quotes` | `quote.read`, `quote.write`, or `quote.approve`, limited by enquiry assignment | Quote list. |
| `/admin/quotes/[id]` | the same | Builder, history, approval, send, and a new version. |
| `GET /api/v1/admin/quotes` | the same as the list | JSON list. |
| `POST /api/v1/admin/quotes` | `quote.write` on a readable enquiry | Creates draft version 1. |
| `POST /api/v1/admin/quotes/[id]/versions` | `quote.write` on that quote | Copies a sent version into a new draft. |
| `POST /api/v1/admin/quote-versions/[id]/approve` | `quote.approve` | Records the approval decision. |
| `POST /api/v1/admin/quote-versions/[id]/send` | `quote.send`, and not an approver of that version | Freezes the version, stores the PDF, and queues delivery. |
| `GET /api/v1/admin/quote-versions/[id]/pdf` | a staff user who can read that quote | PDF download after send. |
| `POST /api/v1/me/quotes/[id]/response` | the enquiry’s customer | Clarification, accept, or decline. Requires `Idempotency-Key`. |
| `GET /api/v1/me/quotes/[id]/pdf` | the enquiry’s customer, after send | PDF download. |

`GET /api/v1/me/quotes/[id]` remains the customer read from Stage 6. The staff navigation shows Quotes when the user can read, write, or approve quotes.

`GET /api/health` still returns only `status`, `application`, `environment`, and `version`. The homepage heading remains “Maldives Explorer”. Robots stay `noindex` because D-014 is still provisional. Public pages still withhold indicative prices because D-002 is still provisional. A customer’s own sent quote shows the amounts stored on that version.

## Builder and versions

A quote reference is `ME-Q-######`. Version 1 starts as a draft on an enquiry the user can read and write. The draft holds a welcome, an overview, inclusions, exclusions, terms, an expiry date, stays, and line items.

A stay has dates, an optional published resort, an optional room, a meal plan, a transfer, and notes. A line is accommodation, transfer, experience, tax, fee, discount, or other. Quantity is a whole number from 1 to 999. Amounts are USD with two decimal places. Tax and fee amounts are entered as their own lines. No tax rate is invented.

Header totals are recalculated from the lines in the same transaction: subtotal from accommodation, transfer, experience, and other lines; tax from line tax plus tax lines; fees from fee lines; discounts from line discounts plus discount lines. The grand total is subtotal plus tax plus fees minus discounts.

Inclusions and exclusions are stored inside the terms snapshot and shown again as separate fields on a draft.

A draft can be edited in place. Submitting it moves the version to in review. Returning an in-review or approved version to draft clears the approval. A sent version cannot be edited. The message is “A sent version stays as sent. Start a new version.” A new version is allowed from a sent, accepted, declined, expired, superseded, or withdrawn version. It copies the lines and stays into a new draft and becomes the active version.

## Approval

The seeded provisional rules are `quote.approval.discountPercent` 10, `quote.approval.grandTotalUsd` 25000, and separation of duties on. A second approver is required when the discount is above 10 percent of the pre-discount subtotal, or when the grand total is above 25,000 USD. Exactly 10 percent and exactly 25,000 USD stay on the single-approver path.

The person who prepared the version cannot approve it. A content approver can approve a version under the threshold. Over the threshold, the first approver leaves the version in review and the audit records stage `first`. A different approver, who is also not the preparer, records the final approval. Approvals count only after the latest submission, so a return to draft starts the count again.

The sender must have `quote.send` and must not be an approver of that review. A content approver does not see Send.

## Send, PDF, and expiry

Send requires an approved version whose expiry is still ahead. It writes the PDF, sets the version to sent, and stores `sentAt` and the PDF together. A later send of the same version returns the stored result and does not create a second PDF or a second email. Sending a newer version marks earlier sent versions superseded. Accepted and declined versions are left as they are.

The PDF is a branded document titled “Maldives Explorer”. It uses the same section order as the portal: welcome, overview, accommodation, transfers, activities, pricing, terms, and next steps. It is stored as a draft document asset, so the public media route does not serve it. Unpublished resort names are withheld the same way as on the portal.

Delivery is an email row with template `quote.sent` and status `QUEUED`. The `quote.send` job confirms that row and does not mark it sent. Email delivery is still not configured, so the handler does not call the mailer. A `quote.expire` job is scheduled at the version expiry. It marks overdue sent versions expired. Running it again changes nothing.

## Customer response

A customer can read a version only when it belongs to that customer, `sentAt` is set, and the status is sent, accepted, declined, expired, superseded, or withdrawn. Draft, in review, and approved versions stay hidden. Another customer’s quote returns “That record is not available.” and writes no response.

Accept and decline require status sent and an expiry later than the transaction time. An expired sent version is refused with “This quote has expired.” A clarification requires a sent version and a message, and it does not change the status. One accept or decline is stored. A second terminal response is refused. The same idempotency key and body return the stored result. The same key with a different body returns “This submission key was already used.”

## Ownership

A consultant can read, draft, and send quotes on enquiries assigned to that consultant. An operations manager and an auditor can read quotes because they can read every enquiry. They cannot write, approve, or send. A content approver can read any quote in order to approve it, and cannot write or send. Guessing an id returns “That record is not available.”

## Audit coverage

| Action | When |
| --- | --- |
| `quote.create` | A quote and its first draft are created. |
| `quote.update` | A draft’s narrative or expiry is saved. |
| `quote.submit` | A draft is submitted for approval. |
| `quote.withdraw` | An in-review or approved version returns to draft. |
| `quote.approve` | An approver records the first or final approval. |
| `quote.send` | A version is sent and the PDF is stored. |
| `quote.supersede` | An earlier sent version is replaced. |
| `quote.response` | The customer clarifies, accepts, or declines. |
| `quote.status` | Accept or decline changes the version status. |
| `quote.expire` | A sent version passes its expiry. |

## Tests added

| Check | Result |
| --- | --- |
| `src/tests/quotes.test.ts` | Line totals reconcile to the header. A discount of exactly 10 percent and a total of exactly 25,000 USD need one approver; a step above either needs two. The preparer cannot self-approve. An expired or unsent version cannot be accepted. The PDF contains the brand, the reference, and the USD amount. |
| `npm test` | 46 tests, 12 files, passed. |
| `scripts/exercise-quotes.ts` via `npm run test:migrations` | On disposable `maldives_stage1` only. Another customer cannot read or respond. Accept of a sent, unexpired version is idempotent. An expired sent version cannot be accepted. Decline is stored once. A second accept or decline is rejected. A line change on a sent version is rejected by the database. A commercial change creates a new version, and sending it supersedes the previous sent version. The preparer cannot self-approve. A 30,000 USD quote needs two approvers. Send is idempotent. The PDF is stored as a document. The send job succeeds and the email stays queued. The expiry job marks an overdue sent version expired. An internal note stays off the customer thread. Migrations were dropped and reapplied. |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed on the quote paths. |
| Playwright `tests/smoke.spec.ts` | 4 passed, including the homepage heading, the health payload, and the skip link. |

## Verification

Checked in the browser against a disposable database, not `.env.local`.

An administrator prepared `ME-Q-000001` on `ME-E-000001`: welcome “Your quote for four nights.”, terms “A consultant confirms any reservation with the resort.”, a stay from 2026-12-01 to 2026-12-05 with a speedboat transfer, and a “Lagoon stay” line of USD 100.00. Submitting it showed that the preparer cannot approve it. A content approver opened the same version, approved it, and did not see Send. The administrator then sent it. The version became Sent, the history recorded the approval, and the PDF returned `application/pdf` with the reference and USD 100.00.

The enquiry’s customer opened the sent quote, accepted it, and the accept and decline forms were gone. The enquiry stayed Received. The quote list showed Accepted.

The disposable database and the Next.js process were stopped afterward, and `.data` was removed.

## Open defects

Stored redirect codes `301` and `302` are still applied as `308` and `307`. That defect is unchanged from Stage 3.

A Next.js development overlay can report a hydration mismatch while the automation browser is attached. The attribute involved is the browser’s `data-cursor-ref`. The quote pages still completed.

`npm run format:check` still reports `next-env.d.ts`. That file was already in the tree and was not changed in this stage.

## Remaining items

- Newsletter signup, reviews, analytics dashboards, the booking engine, payments, and supplier integrations were not built.
- D-014 is still provisional, so robots disallow the whole site. D-002 is still provisional, so indicative prices stay off public pages. D-005 is still provisional, so send uses the seeded approval thresholds and separation of duties. D-006 is still provisional, so currency stays USD and tax is an explicit line.
- Quote email stays queued because delivery is not configured.
- Customer acceptance does not set an enquiry to Won and does not reserve a supplier.
- Stage 3 leftovers remain: collection full-text search, Meilisearch, tag pages, `SCHEDULED` promotion, the collection-item editor, the FAQ owner picker, reusable blocks, video transcripts, the filter panel, and map view. `mapView` stays disabled.

Stage 9 was not started.
