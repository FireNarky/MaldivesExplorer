# Stage 6 implementation report

| Field | Value |
| --- | --- |
| Date | 12 October 2026 |
| Scope | Stage 6 customer portal: profile, saved items, enquiries, messages, preferences, consent, export request, and deletion request |
| Exit | A signed-in customer can open only their own account, saved items, trip plans, messages, and sent quotes. Consent changes and privacy requests are recorded. Another customer’s enquiry, quote, or message stays unavailable. |

## Result

`/account` is the signed-in portal. The header shows Account after sign-in, and the footer links to Account. An unsigned visit redirects to sign-in and returns to the account path afterward.

The portal lists profile, saved items, enquiries, messages, preferences, consent, and privacy requests. A customer sees the plans, messages, and sent quotes that belong to the customer row linked to that account. A missing or foreign record returns “That record is not available.”

CRM, the quote builder, quote editing, the consultant workspace, newsletter signup, reviews, and analytics dashboards were left for later stages. A sent quote can be read. The page has no control that creates, edits, accepts, or declines a quote.

## Schema changes

None. `prisma/schema.prisma` and the migrations were not changed. Customers, consent records, saved items, enquiries, messages, notes, quotes, and jobs were already in the contract. `.env.local` was not migrated.

## New routes

| Route | Who | Behaviour |
| --- | --- | --- |
| `/account` | signed-in account | Portal home. A claim token in the query links a matching unlinked customer, then the token leaves the address. |
| `/account/profile` | signed-in account | Name, phone, and country. Email is read-only. |
| `/account/saved` | signed-in account | Saved resorts, offers, experiences, and guides on this account. |
| `/account/enquiries` | signed-in account | Own trip plans. |
| `/account/enquiries/[reference]` | owner | Plan detail, published place names, and links to sent quotes. |
| `/account/quotes/[id]` | owner of a sent version | Read-only quote. |
| `/account/messages` | signed-in account | One thread per own plan. |
| `/account/messages/[reference]` | owner | Thread and a message form. |
| `/account/preferences` | signed-in account | Language. English is the available choice. |
| `/account/consent` | signed-in account | Account, trip-plan, analytics, and marketing consent. |
| `/account/privacy` | signed-in account | Export request and deletion request. |
| `GET` and `PATCH /api/v1/me` | signed-in account | Profile and consent. |
| `GET /api/v1/me/saved` | signed-in account | Own saved items. Unpublished names are omitted. |
| `GET /api/v1/me/enquiries` | signed-in account | Own plans. |
| `GET /api/v1/me/enquiries/[reference]` | owner | One plan, or 404. |
| `GET /api/v1/me/quotes/[id]` | owner of a sent version | One sent quote, or 404. |
| `GET` and `POST /api/v1/me/messages` | owner | Own threads. A post on another plan is 404 and stores no row. |
| `POST /api/v1/me/privacy/export` | signed-in account | Records an export job. HTTP 202. |
| `POST /api/v1/me/privacy/deletion` | signed-in account | Records a deletion job. HTTP 202. |

`GET /api/health` still returns only `status`, `application`, `environment`, and `version`. The homepage heading remains “Maldives Explorer”. Robots stay `noindex` because D-014 is still provisional. Account paths are absent from the sitemap. Public pages still withhold indicative prices because D-002 is still provisional. A sent quote shows the amounts stored on that version.

## Profile, preferences, and saved items

Profile saves the customer name, phone, and country code, and the same name on the user. The email stays the account email. Country codes are stored in uppercase. A blank phone or country clears that field.

Preferences save `locale`. The form offers English.

Saved items are the account rows in `saved_items`. `/account/saved` and the signed-in `/wishlist` page use the same list, note, and remove actions. An unpublished target reads “This listing is not currently published.” The device list remains the unsigned wishlist.

Opening the portal links an existing customer with the same email when that row has no user. If that email is already linked to a different user, the portal says “That email is already linked to another account.” A simultaneous first open that races the customer insert reloads the row that won.

## Enquiries, messages, and quotes

The enquiry list and detail include only rows whose `customerId` is the signed-in customer. The detail shows dates, flexibility, adults, child ages, the submitted budget, trip type, requirements, accessibility needs, and published resort, offer, and experience names. A draft or missing place name is withheld. Assignment, tasks, qualification, and attribution stay off the page.

Messages are the `messages` rows on that enquiry, plus notes whose visibility is `CUSTOMER`. Notes whose visibility is `INTERNAL` are excluded. The customer’s own messages are labeled “You”. Staff messages and customer-visible notes are labeled “Consultant”. A message body is required and holds 2,000 characters. More than 20 messages from one customer in an hour return “Try again later.”

A quote version is visible when `sentAt` is set and the status is `SENT`, `ACCEPTED`, `DECLINED`, `EXPIRED`, `SUPERSEDED`, or `WITHDRAWN`. `DRAFT`, `IN_REVIEW`, and `APPROVED` stay hidden, including from the owner. The page order is welcome, overview, accommodation, transfers, activities, pricing, terms, and next steps. The next-steps copy says a consultant handles the next step and the page does not change the quote. Existing responses are shown when rows already exist. The portal does not insert a response.

A claim token from `/register?claim=` or a sign-in that carries the same token links the customer when the account email matches `claim:{email}`. A token for another email stays unused. A used token is deleted.

## Consent and privacy requests

Consent is insert-only. The portal offers `ACCOUNT`, `ENQUIRY_CONTACT`, `ANALYTICS`, and `MARKETING`. Newsletter signup is absent. A checked purpose inserts `GRANTED` when the latest row differs. An unchecked purpose inserts `WITHDRAWN` when a prior row exists. An unset purpose that stays unchecked does not insert a row. The notice version comes from `notice.version`, with fallback `2026-10-10`.

An export request enqueues `privacy.export`. A deletion request enqueues `privacy.deletion`. Each job confirms the customer still exists and finishes `SUCCEEDED`. The export page says a file is not available there. The deletion page says the account stays open. The jobs do not delete the user, the customer, or the enquiry, and they do not write a download.

## Ownership

Every portal read and write starts from the session user id. The customer is the row with that `userId`. Enquiries, messages, and quotes are loaded through `enquiries.customer_id`. A foreign reference or quote id returns 404 and does not reveal the other record. A customer message sets `senderType` to `CUSTOMER` and `customerSenderId` to that customer. The database trigger still rejects a customer message whose sender is not the enquiry owner.

## Audit coverage

| Action | When |
| --- | --- |
| `customer.create` | The first account open creates the customer. |
| `customer.link` | An unlinked customer with the same email is linked. |
| `customer.claim` | A claim token links that customer. |
| `customer.profile` | Name, phone, country, or language changes. The audit stores the previous and next values. |
| `consent.grant` | A portal consent choice becomes granted. |
| `consent.withdraw` | A portal consent choice becomes withdrawn. |
| `message.create` | The customer sends a message. The audit stores the enquiry id and omits the body. |
| `privacy.export.request` | An export job is recorded. |
| `privacy.deletion.request` | A deletion job is recorded. |

Saved-item audits remain `wishlist.add`, `wishlist.remove`, and `wishlist.note`.

## Tests added

| Check | Result |
| --- | --- |
| `src/tests/portal.test.ts` | Ownership requires the same user id. A sent quote is visible and a draft is hidden. Profile and message validation reject empty or oversized values. Consent writes a grant, a withdrawal, and skips an unchanged choice. Account return paths stay on `/account`. |
| `npm test` | 37 tests, 10 files, passed. |
| `scripts/exercise-portal.ts` via `npm run test:migrations` | On disposable `maldives_stage1` only. Customer A cannot list, read, or message Customer B’s plan, and the failed message leaves no row. A cannot read B’s sent quote or A’s own draft. A can read A’s sent total. Internal notes and B’s message stay out of A’s thread. A customer-visible note and A’s message appear. No quote response is inserted. Profile, consent withdrawal, claim linking, and privacy jobs are asserted. The account and the plan remain after the deletion job. Integrity queries stay at zero rows. Migrations were dropped and reapplied. |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed. |
| Playwright `tests/smoke.spec.ts` | 4 passed, including the homepage heading, the health payload, and the skip link. |

## Verification

Checked in the browser against a disposable database, not `.env.local`.

Creating an account opened `/account` for `browser-portal@example.com`. Profile saved the phone and stored the country code as `MV`, and the email stayed read-only. Consent saved the account and trip-plan choices. Privacy recorded the export request and the deletion request, and the account stayed signed in. Preferences offered English. At 390px the privacy page, the quote page, the message thread, and the homepage did not overflow. The homepage heading stayed “Maldives Explorer”.

A signed-in plan produced reference `ME-E-000001` and the account enquiry list showed “Received”. The message thread accepted “A question about the dates.” and labeled it “You”. A sent quote prepared in that disposable database opened as `ME-Q-000001` with the welcome, the line `USD 100.00`, the terms, and the next-steps sentence. The page had no accept, decline, or edit control. Saved items showed the empty account state.

The disposable database and the Next.js process were stopped afterward, and `.data` was removed.

## Open defects

Stored redirect codes `301` and `302` are still applied as `308` and `307`. That defect is unchanged from Stage 3.

A Next.js development overlay can report a hydration mismatch while the automation browser is attached. The attribute involved is the browser’s `data-cursor-ref`. Account pages, the plan, and the message still completed.

## Remaining items

- CRM, the quote builder, quote editing, the consultant workspace, newsletter signup, reviews, and analytics dashboards were not built.
- Clarification, accept, and decline of a sent quote were not built. The portal reads a sent version and does not change it.
- Export and deletion requests are recorded. They do not produce a file and they do not close the account.
- Offer pages are still not built. A published offer on an enquiry shows its title and has no public URL and no price.
- D-014 is still provisional, so robots disallow the whole site. D-002 is still provisional, so indicative prices stay off public pages.
- Stage 3 leftovers remain: collection full-text search, Meilisearch, tag pages, `SCHEDULED` promotion, the collection-item editor, the FAQ owner picker, reusable blocks, video transcripts, the filter panel, and map view. `mapView` stays disabled.

Stage 7 was not started.
