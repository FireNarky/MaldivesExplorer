# Stage 5 implementation report

| Field | Value |
| --- | --- |
| Date | 11 October 2026 |
| Scope | Stage 5 trip planner, inquiry creation, lead capture, draft save and resume, consent, spam protection, acknowledgement, and inquiry validation |
| Exit | A visitor can complete a five-step plan on a phone, save and resume it on this device, and submit it once. The submit creates a customer and an enquiry, records consent and attribution, queues a transactional acknowledgement, and shows the reference on this device. |

## Result

`/plan` is a five-step planner: Dates, Budget, Travel type, Preferences, and Review. The page says “A consultant reviews the plan. Nothing is booked from this form.” Progress reads “Step N of 5”. Past steps are buttons. Later steps stay disabled until the visitor reaches them.

Submitting `POST /api/v1/enquiries` creates the enquiry in status `NEW`, matches or creates the customer, stores consent, attaches published shortlist targets, and queues the acknowledgement email. The acknowledgement page shows the reference from this browser only. It does not look the enquiry up by reference.

CRM, quote generation, the customer portal, newsletter signup, reviews, and dashboard analytics were left for later stages. Claim-link redemption was left with the account work. The email stays `QUEUED` because no mail provider is configured.

## Schema changes

None. `prisma/schema.prisma` and the migrations were not changed. Customers, enquiries, travelers, joins, status history, consent records, email deliveries, jobs, idempotency keys, verification tokens, `enquiry_reference_seq`, `notice.version`, `planner.draftTtlDays`, and the `enquiry.received` template were already in the contract. `.env.local` was not migrated.

## New routes

| Route | Who | Behaviour |
| --- | --- | --- |
| `/plan` | public, and a signed-in account | Five-step planner. A signed-in visitor’s email is filled and read-only. |
| `/plan/received` | this browser | Acknowledgement from `sessionStorage`. An empty visit says “Submit a plan to see the acknowledgement on this device.” |
| `POST /api/v1/enquiries` | public | Creates the enquiry, or replays the same idempotency key. |

The header, footer, and homepage link “Plan a trip”. `/plan` is in the sitemap static paths. `GET /api/health` still returns only `status`, `application`, `environment`, and `version`. The homepage heading remains “Maldives Explorer”. Robots stay `noindex` because D-014 is still provisional. Public pages still withhold indicative prices because D-002 is still provisional.

## Planner behaviour

| Step | Fields |
| --- | --- |
| Dates | Arrival and departure. Both may be empty. If either is set, both must be real dates and departure is not before arrival. Flexibility is optional and holds 200 characters. |
| Budget | Lowest and highest amounts in USD. Both may be empty. If either is set, both are numbers with up to two decimals and the lowest is not above the highest. |
| Travel type | Adults from 1 through 20. Child ages from 0 through 17. Age 0 or 1 is `INFANT`. Age 2 through 17 is `CHILD`. An active trip type from the seeded vocabulary. |
| Preferences | Published resorts and published experiences. Optional note, 2000 characters. Optional accessibility needs, 500 characters: “Rooms, transfers, or mobility. Leave this blank if you prefer.” |
| Review | Name, email, optional phone, optional two-letter country code, the summary, and consent. |

FR-ENQ-001 is covered by those fields. FR-ENQ-005 stays in force: the form has no religion or health-diagnosis field. Accessibility needs is the optional free-text field named in FR-ENQ-001.

FR-ENQ-006 scores dates, budget, trip type, and a preferred resort, offer, or interest from 0 through 4. The review lists the open prompts: “Add the travel dates.”, “Add a budget range.”, “Choose a trip type.”, and “Add a preferred resort, offer, or interest.” Phone and accessibility needs are optional and are not demanded. A plan can be sent with those gaps when name, email, adults, and consent are valid. The score is stored on the enquiry and in the snapshot.

The layout is one column. Optional fields are marked “Optional”. Errors appear in a summary at the top of the step and on the fields. Main content has bottom padding so the sticky compare tray can be scrolled clear of Save, Next, and Send.

## Draft and resume

| Rule | Behaviour |
| --- | --- |
| Store | `localStorage` key `me.planner.v1`. Invalid JSON and non-UUID list ids are dropped. |
| Save | “Save draft” and each Next save the draft. The live region says “Draft saved on this device.” |
| Resume | A stored draft fills the fields. The step index starts again at Dates. |
| Expiry | `planner.draftTtlDays` is seeded as 30. The code fallback is 30. An expired draft is removed and the page says “This draft has expired.” |
| Clear | A successful send removes the device draft. |

Landing attribution is remembered once in `sessionStorage` key `me.landing.v1`. The planner reads `utm_source`, `utm_medium`, `utm_campaign`, `document.referrer` clipped to 300 characters, and the landing path from `?from=` or that stored path. When there is no draft, saved resort, experience, and offer ids from the signed-in account and the device wishlist are prefilled.

## Validation and idempotency

The client checks the current step before Next, and the review step before send. The server parses the same rules. A signed-in submit whose email differs from the account is refused with “Use the email on your account.” A blank session user id, which an expired session cookie can present, is treated as signed out.

| Rule | Behaviour |
| --- | --- |
| Key | Header `Idempotency-Key`, pattern 8 to 80 letters, digits, underscores, or hyphens. The browser stores `crypto.randomUUID()` on the draft. |
| Fingerprint | SHA-256 of the submission JSON. The honeypot is excluded. |
| Replay | The same key and the same fingerprint return the original reference with `created: false` and HTTP 200. |
| Conflict | The same key and a different fingerprint return 409 “This submission key was already used for a different plan.” |
| Window | The idempotency row is kept for 24 hours. The enquiry’s `idempotencyKey` stays unique. A unique-constraint race replays the stored response. |
| Reference | `nextval('enquiry_reference_seq')` formatted as `ME-E-######`. A rolled-back transaction can still consume a sequence value. |

## Duplicate detection and customer matching

An open enquiry is `NEW`, `CONTACT_ATTEMPTED`, `CONTACTED`, `QUALIFIED`, `QUOTED`, or `NEGOTIATION`. The same customer email and an overlapping travel window are recorded in `submittedSnapshot.duplicateOf`. The submit still succeeds. The acknowledgement says “This trip overlaps an open plan for the same email.” Missing dates do not overlap. `WON`, `LOST`, and `CLOSED` are not open.

An anonymous email finds the customer or creates one with no user. Phone and country update on a match when they are provided. An existing customer’s name stays as stored. A signed-in visitor uses the linked customer, links an unlinked customer with the same email, or creates the customer. An email already linked to a different user returns “That email is already linked to another account.”

## Consent, spam, and attribution

Consent is required. The label is “I agree that Maldives Explorer may contact me about this trip plan. Notice version {notice.version}.” Unchecked, the field says “Consent is required before this plan can be sent.” The insert is a `consent_records` row: subject `CUSTOMER`, purpose `ENQUIRY_CONTACT`, status `GRANTED`, source `planner`, notice version from the system setting with fallback `2026-10-10`, and an SHA-256 hash of the forwarded address. Newsletter consent is not collected.

| Check | Behaviour |
| --- | --- |
| Honeypot | A Company field is off-screen, `aria-hidden`, and removed from the tab order. A filled value returns 400 “The plan could not be submitted.” |
| Email rate | More than 5 enquiries for that email in the last hour return 429 “Try again later.” A replay of a known key is checked before this limit. |
| Address rate | More than 20 requests from one address in the last hour return 429. The counter is in process memory. |
| Turnstile | Checked only when `TURNSTILE_SECRET_KEY` is set. The widget is not rendered while that secret is absent. D-010 stays provisional. |

Attribution stores source, medium, campaign, referrer, and landing path. The snapshot freezes contact, party, budget, dates, flexibility, trip type, requirements, accessibility needs, accepted ids, consent version, attribution, duplicates, qualification, and the request hash. Only published resort, offer, and experience ids are attached. Draft and missing ids are skipped.

## Acknowledgement and email queue

The browser writes `sessionStorage` key `me.plan.ack` and opens `/plan/received`. The page shows the reference, “A message is queued for this plan.”, the overlap sentence when it applies, and the still-open prompts when they apply.

`email_deliveries` is inserted as `QUEUED`, classification `TRANSACTIONAL`, template `enquiry.received`, related to the enquiry. A job `enquiry.acknowledge` uses the same idempotency key `enquiry.received:{enquiryId}`. The handler confirms the delivery row and leaves the status `QUEUED`. When the customer has no user, the job payload includes `/register?claim={token}` and the SHA-256 hash is stored on `verification_tokens` for 7 days. `/register` does not redeem that token.

## RBAC and ownership

Anyone can submit a plan. A signed-in submit must use the account email. There is no staff screen for the enquiry queue, and no policy that lets one account read another customer’s plan. The acknowledgement page does not accept a reference in the URL.

## Audit coverage

| Action | When |
| --- | --- |
| `customer.create` | A new customer is created. `after.account` is false for an anonymous submit. |
| `customer.match` | An existing customer is reused by email. |
| `customer.link` | A signed-in submit links an unlinked customer with the same email. |
| `consent.grant` | The enquiry-contact consent row is inserted. |
| `enquiry.create` | The enquiry is inserted. `after` stores the reference and `duplicateOf`. |

The actor is the session user id, or null for an anonymous submit. A blank actor id is stored as null. The audit row does not store the free-text requirements.

## Tests added

| Check | Result |
| --- | --- |
| `src/tests/planner.test.ts` | A valid plan lowercases the email and reports a missing trip type and place. Age 18 is rejected. Age 1 is `INFANT` and age 8 is `CHILD`. Overlap is true for overlapping dates, false for a later window, and false when a window is missing. A draft expires after 30 days. Consent is required. A reversed budget is rejected. |
| `npm test` | 32 tests, 9 files, passed. |
| `scripts/exercise-enquiry.ts` via `npm run test:migrations` | On disposable `maldives_stage1` only. The published wishlist resort is attached. The draft resort and a missing id are not. Traveler types, status history `NEW`, attribution, an unlinked customer, `ENQUIRY_CONTACT` consent, a `QUEUED` transactional delivery, and a claim path are asserted. The same key replays. A second key flags the overlap. A different plan on the first key is rejected. The worker leaves the delivery `QUEUED`. Integrity queries stay at zero rows. Migrations were dropped and reapplied. |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed. |
| Playwright `tests/smoke.spec.ts` | 4 passed, including the homepage heading, the health payload, and the skip link. |

## Verification

Checked in the browser against a disposable database, not `.env.local`.

The planner loaded “Step 1 of 5”. Dates 2026-11-01 to 2026-11-08 saved with “Draft saved on this device.” Budget 1500 to 4000 USD, trip type Family, and Browser Resort were entered. Review read “Dates, budget, trip type, and a place or interest are included.” with notice version `2026-10-10`. Sending before name, email, and consent showed the summary “Check this step” and the three field messages. With name “Browser Guest”, email `browser-plan@example.com`, and consent checked, the browser opened `/plan/received` with reference `ME-E-000002`, “A message is queued for this plan.”, and an empty missing list. The device draft was cleared. The first failed submit, caused by a blank session user id, consumed sequence value `ME-E-000001` because `nextval` is not rolled back. That blank id is now treated as signed out.

At 390px the review step and the acknowledgement page did not overflow. Scrolled to the end of `/plan`, the Next button sat above the compare tray. The homepage heading stayed “Maldives Explorer” and the homepage did not overflow at 390px.

The disposable database and the Next.js process were stopped afterward, and `.data` was removed.

## Open defects

Stored redirect codes `301` and `302` are still applied as `308` and `307`. That defect is unchanged from Stage 3.

A Next.js development overlay can report a hydration mismatch while the automation browser is attached. The attribute involved is the browser’s `data-cursor-ref`. The planner steps and the acknowledgement still completed.

The automation snapshot listed the honeypot label even though the field is `aria-hidden` and off-screen. It is removed from the tab order.

## Remaining items

- CRM, quote generation, the customer portal, newsletter signup, reviews, and dashboard analytics were not built.
- The claim link is queued for an unlinked customer. `/register` does not redeem it.
- The acknowledgement email stays `QUEUED`. Resend is not configured.
- Turnstile is checked only when `TURNSTILE_SECRET_KEY` is set. The widget is not shown.
- Offer pages are still not built. A published offer id can be attached to an enquiry.
- D-014 is still provisional, so robots disallow the whole site. D-002 is still provisional, so indicative prices stay off public pages.
- Stage 3 leftovers remain: collection full-text search, Meilisearch, tag pages, `SCHEDULED` promotion, the collection-item editor, the FAQ owner picker, reusable blocks, video transcripts, the filter panel, and map view. `mapView` stays disabled.

Stage 6 was not started.
