# Stage 9 implementation report

| Field | Value |
| --- | --- |
| Date | 17 October 2026 |
| Scope | Stage 9 reviews, testimonials, moderation, publishing, newsletter subscription, preferences, management, and operational reporting |
| Exit | Staff can record a review with its source and verification, publish only a moderated review, and feature a non-imported published review. A visitor can subscribe with marketing consent and unsubscribe. Operations can read named operational metrics. |

## Result

Reviews, testimonials, newsletter consent, and operational reports are in place. Imported ratings stay labeled as imported ratings. Newsletter marketing consent is stored on the subscription. Unsubscribe adds a withdrawal record and leaves the original grant in place. Reports show the formula beside each metric.

The Stage 8 quote workflow was left as it was. Quote viewing and quote responses stay inside that workflow. The operational quote funnel is calculated from the quote tables.

Booking, payments, supplier integrations, and advanced dashboards were not built.

## Schema changes

None. `prisma/schema.prisma` and the migrations were not changed. Reviews, subscriptions, consent records, analytics events, and feature flags were already in the contract. `.env.local` was not migrated.

## New routes

| Route | Who | Behaviour |
| --- | --- | --- |
| `/reviews` | Public | Featured, published, non-imported reviews. Each item shows the stored source label. |
| `/newsletter` | Public | Subscribe form with topics and a required marketing-consent checkbox. |
| `/newsletter/confirm` | Public | Confirms a pending subscription from a token. |
| `/newsletter/preferences` | Public, signed token | Topic changes for a pending or subscribed address. |
| `/newsletter/unsubscribe` | Public, signed token | Withdraws marketing consent for that subscription. |
| `/account/preferences` | Signed-in account | Newsletter status, topics, and unsubscribe for the account email. |
| `/admin/reviews` | `review.moderate` or `review.publish` | List and create. |
| `/admin/reviews/[id]` | the same | Edit text, hide, reject. Publish and feature require `review.publish`. |
| `/admin/newsletter` | `newsletter.read` or `newsletter.write` | Subscriber list. Import, export, and suppress require `newsletter.write`. |
| `/admin/reports` | `report.read` | Operational counts and named formulas. |
| `/admin/reports/analytics` | `report.read` | Consented event counts and named formulas. |
| `POST /api/v1/newsletter/subscriptions` | Public | Subscribe. Rate limited. Turnstile is checked when the secret is set. Requires `Idempotency-Key`. |
| `POST /api/v1/newsletter/unsubscribe` | Public | Unsubscribe from a signed token. |
| `GET /api/v1/admin/newsletter/export` | `newsletter.write` | CSV of addresses, status, topics, and consent. |
| `POST /api/v1/analytics/events` | Public | Records an allowlisted event when the analytics cookie allows it. |

Staff navigation shows Reviews, Newsletter, and Reports when the signed-in user has the matching permission. The footer includes the subscribe form and links to testimonials and the newsletter. `GET /api/health` still returns only `status`, `application`, `environment`, and `version`. The homepage heading remains “Maldives Explorer”.

## Reviews

A review stores one of three sources: first-party, editorial, or imported. The source, source reference, resort, and verification state are kept on later edits. Changing any of those on an existing review is refused with “The source of a review stays as it was recorded.” A text edit returns the review to pending and clears publication and featuring.

Verification is decided when the review is created. Editorial and imported reviews stay unverified. A first-party review is verified only when the source reference is a won enquiry that has an accepted quote, and the resort matches when one is set, or when the reference is a written permission note. A web address is not treated as written permission.

Public copy uses three labels. An imported rating is always “Imported rating”. A verified first-party review is “First-party review”. Every other published review is “Editorial”. Public pages do not use the word “Verified”. Staff evidence reads “First-party evidence recorded”, “Evidence not established”, or “Evidence rejected”.

Publication requires `review.publish`, granted consent, and a passing publish check. A first-party review must be verified. An imported rating needs its source and the basis of the score. Only an approved, published, non-imported review can be featured. The database constraint also rejects a featured import. An editor can moderate and cannot publish.

The public testimonials page lists featured published reviews whose source is not imported. A resort page lists that resort’s published reviews, including imported ratings under the imported label, and only when at least one such review exists. There is no aggregate score and no invented review count. The empty testimonials heading is “No testimonials are published”. The seed writes no reviews.

## Newsletter

Marketing consent is a consent row with purpose `MARKETING` and subject type `SUBSCRIPTION`. It is separate from account consent and from enquiry contact consent. Account consent changes do not create or reopen a subscription.

Subscribe requires the consent checkbox and the current notice version. With the seed flag `newsletterDoubleOptIn` left off, a new consented address is stored as subscribed. The same idempotency key and body return the stored result. A different body for that key returns “This submission key was already used.”

Unsubscribe inserts a new marketing consent row with status withdrawn. The original granted row stays granted. The subscription becomes unsubscribed. Suppress inserts another withdrawn row and sets the subscription to suppressed. A suppressed address cannot be subscribed again.

An enquiry that uses the same email leaves an unsubscribed address unsubscribed and leaves the withdrawal row unchanged. Subscribing again requires a new explicit marketing-consent action, which stores a new granted row and does not rewrite the withdrawal.

When double opt-in is enabled, the subscription stays pending, a confirmation email is stored as `QUEUED`, and the `newsletter.confirm` job succeeds without marking that email sent. The confirm page uses the token. It does not confirm an unsubscribed or suppressed address. The seed leaves double opt-in off.

Import requires `newsletter.write` and an attestation that each address has newsletter consent. The attestation is stored on the audit log. Suppressed addresses are skipped. An auditor can read the list and cannot import or export. A consultant cannot read the list.

## Reporting

Every displayed metric has a formula in `metricFormulas` in `src/modules/analytics/rules.ts`, and that formula is shown on the page.

| Metric | Formula |
| --- | --- |
| Lead response | Enquiries with a first response ÷ enquiries received. |
| Quote send | Quotes with a sent version ÷ quotes. |
| Quote acceptance | Quotes with an accepted version ÷ quotes with a sent version. |
| Stale guides | Published guides whose review date is before now. |
| Confirmed subscribers | Subscriptions whose status is confirmed. |
| Failed jobs | Jobs whose status is failed. |
| Consented view share | Entity views with analytics consent granted ÷ all stored entity views. |
| Search demand | Consented `search_submitted` events. |
| Empty searches | Consented searches that store a result count of 0. A search without a result count is omitted. |
| Shortlist use | Consented `saved_item_added` events. |
| Planner completion | Consented review steps ÷ consented planner starts. |
| Content performance | Consented entity views that store a kind, grouped by that kind. |

A ratio whose inputs are missing is shown as “Not available”. A ratio whose denominator is an observed zero uses the empty sentence for that metric, such as “No enquiries are stored.” Version and subscription rows appear only for statuses the query returned. The analytics page does not list search text, email addresses, or a zero quote-interest count. The operational page does not list subscriber addresses.

`report.read` is required. A consultant receives “That record is not available.” The report queries are read-only. The Stage 9 exercise counted enquiries before and after the report and the count was unchanged.

Consented product events use the allowlist from the plan. A denied consent stores nothing, except `entity_viewed`, which keeps the consent state and the kind and drops the anonymous key and any email-like property. Search events are stored as `search_submitted` only when analytics consent is granted. `quote_viewed` and `quote_response` remain on the allowlist for the events endpoint. The quote screens do not call them.

## Audit coverage

| Action | When |
| --- | --- |
| `review.create` | A review is recorded. |
| `review.update` | Review text is saved. The audit keeps the existing source and verification. |
| `review.publish` | A review is approved for the public site. |
| `review.hide` | A review is hidden. |
| `review.reject` | A review is rejected. |
| `review.feature` | A published non-imported review is featured. |
| `review.unfeature` | A featured review is removed from testimonials. |
| `newsletter.unsubscribe` | A subscription is withdrawn. |
| `newsletter.import` | A consented import is stored. The log records the attestation and the counts, not the address list. |
| `newsletter.export` | An export is downloaded. The log records the count. |

## Tests added

| Check | Result |
| --- | --- |
| `src/tests/stage9.test.ts` | An imported rating stays “Imported rating” even if marked verified. An unverified first-party review is labeled editorial. Featuring an import is refused. Written permission and a won enquiry can verify a first-party review. Subscribe is blocked without marketing consent and when the address is suppressed. Preference tokens round-trip. Metric helpers return null when a measurement is missing. Denied event properties drop an email address. |
| `npm test` | 54 tests, 13 files, passed. |
| `scripts/exercise-stage9.ts` via `npm run test:migrations` | Passed on disposable `maldives_stage1`. See the regression section. |
| `npm run typecheck` | Passed before the browser check. The Stage 9 exercise then ran under the same TypeScript sources. |
| ESLint `--max-warnings 0` | Passed on the Stage 9 paths, including `scripts/exercise-stage9.ts` after the testimonial assertion was corrected. |
| Playwright `tests/smoke.spec.ts` | 4 passed, including the homepage heading, the health payload, and the skip link. |

## Regression results

`npm run test:migrations` applied both migrations, seeded, ran every exercise below on disposable `maldives_stage1`, dropped the schema, and reapplied the migrations. The expected database rejections for an offer room on the wrong resort, a line edit on a sent quote, and a featured imported review were raised and caught. They are the integrity checks, and the exercises still passed.

| Journey | Exercise | Result |
| --- | --- | --- |
| Anonymous discovery | `scripts/exercise-discovery.ts` | Passed. Published search found the exercise atoll. A draft resort was absent from search, suggestions, the public page, and the sitemap. Search analytics was stored only after consent was granted. |
| Search draft exclusion | `scripts/exercise-discovery.ts` | Passed. Draft resort hits and draft suggestions were empty. |
| Wishlist merge | `scripts/exercise-wishlist.ts` | Passed. Merge kept two real listings and both notes, skipped a missing listing, hid an unpublished name, and a repeat merge did not duplicate the row. |
| Planner idempotency | `scripts/exercise-enquiry.ts` | Passed. A repeated submission did not create a second enquiry. The acknowledgement stayed queued. |
| Customer ownership | `scripts/exercise-portal.ts` | Passed. Another account could not read the saved resort, the plan, the sent quote, or the messages. A draft quote stayed hidden. A private note stayed off the customer thread. |
| CRM assignment and status controls | `scripts/exercise-crm.ts` | Passed. Assignment saved the consultant. An auditor was not offered an update. Lost stored `PRICE` and Closed stored `DUPLICATE`. |
| Internal note privacy | `scripts/exercise-crm.ts` and `scripts/exercise-portal.ts` | Passed. An internal note did not start the first-response timer. The customer thread omitted the private note. The enquiry export omitted the private note and traveler ages. |
| Quote immutability | `scripts/exercise-quotes.ts` | Passed. A sent line stayed unchanged. A commercial change created a new version, and sending it superseded the earlier sent version. The database rejected a line update on a sent version. |
| Quote ownership | `scripts/exercise-quotes.ts` | Passed. A draft stayed hidden. The owner could read and accept the sent quote. Another customer could not. |
| Quote acceptance and expiry | `scripts/exercise-quotes.ts` | Passed. Accept was idempotent. Decline was stored once. The send email stayed queued. The expiry job marked an overdue sent version expired. |

The quote exercise ran after the Stage 9 code was in the tree. It did not require a change to the quote services.

## Verification

Checked in the browser against a disposable database, not `.env.local`.

The homepage heading was “Maldives Explorer”, with the empty homepage state and no invented reviews. Search opened for an anonymous visitor and asked for a search word. The testimonials page was empty before a review was published.

An administrator recorded an editorial review, “A guest” / “The transfer notes were clear.”, with source reference “Desk note 2026-10-17”. The edit screen showed the source as read-only text and “Evidence not established.” Publishing and featuring it put “Editorial” and that text on `/reviews`. The page did not say “Verified” and did not show a rating or a count.

An imported rating, “External score”, was published with source “Imported” and “Evidence not established.” Featuring it returned “An imported rating cannot be featured.” It stayed off `/reviews`.

The newsletter form refused a submit that omitted the consent checkbox: “Confirm consent before subscribing.” A consented submit stored the administrator address as Subscribed and showed “Saved.” It did not say the message was sent. Unsubscribe on account preferences changed the status to Unsubscribed. A later submit of the same address without consent left it Unsubscribed. A new consented submit subscribed it again. The staff list showed the address, “Subscribed”, and “Consent granted”.

Operational reports showed “No enquiries are stored.”, “No quotes are stored.”, and “No sent quotes are stored.”, each with its formula. One subscribed address was counted and the address was not shown. Analytics showed “No entity views are stored.” and “No consented planner starts are stored.”, with the formulas for search demand, empty searches, shortlist use, and content. At a 390px width, `/reviews` and `/admin/reports` did not widen the page.

The disposable database and the Next.js process were stopped afterward, and `.data` was removed.

## Open defects

Stored redirect codes `301` and `302` are still applied as `308` and `307`. That defect is unchanged from Stage 3.

A Next.js development overlay can report a hydration mismatch while the automation browser is attached. The attribute involved is the browser’s `data-cursor-ref`. The review, newsletter, and report pages still completed.

The Turnstile widget is still not rendered. The newsletter API checks Turnstile only when `TURNSTILE_SECRET_KEY` is set.

`npm run format:check` was not re-run. Stage 8 already reported `next-env.d.ts`, and that file was not part of this stage.

## Remaining items

- Booking, payments, supplier integrations, and advanced dashboards were not built.
- D-009 is still provisional, so non-essential analytics stays off until the visitor allows it. D-011 is still provisional, so a public review is labeled from the stored source and verification rather than called verified. D-012 is still provisional, so no production retention job was added.
- D-014 is still provisional, so robots disallow the whole site. D-002 is still provisional, so indicative prices stay off public pages.
- Newsletter confirmation mail stays queued while email delivery is unconfigured. The double opt-in flag stays off in the seed.
- Newsletter and analytics rate limits are in memory.
- Stage 3 leftovers remain: collection full-text search, Meilisearch, tag pages, `SCHEDULED` promotion, the collection-item editor, the FAQ owner picker, reusable blocks, video transcripts, the filter panel, and map view. `mapView` stays disabled.

Stage 10 was not started.
