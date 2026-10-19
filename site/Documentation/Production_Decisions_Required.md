# Production decisions required

| Field | Value |
| --- | --- |
| Date | 17 October 2026 |
| Authority | `Documentation/Decisions.md` |
| Rule | A proposed default is not an approval. This file does not change any decision. |

Accepted decisions are not repeated here. D-001, D-004, D-007, and D-008 stay as recorded on 10 October 2026.

## D-002 Indicative prices

| | |
| --- | --- |
| What must be decided | Whether a staff-entered indicative price may be shown on a public page, and which fields are mandatory before that happens. |
| Current provisional behavior | Staff can store currency, occupancy, meal plan, transfer, inclusions, exclusions, validity, stay dates, and a price basis. Public pages, including offers, do not show the numeric amount. The public sentence is “An indicative price is not published.” |
| Launch consequence | A launch that shows prices would publish an unapproved commercial claim. A launch that keeps prices off the public site matches the current build. |
| Recommended option | Keep prices off public pages until the owner records the price policy. |
| Alternatives | Approve the proposed default and then publish only rows that have currency, occupancy, inclusions, a source note, and a review date. Or decide that the MVP never shows a price. |
| Blocks production | Yes for any public price. No for a launch that continues to withhold the amount. |

## D-003 Assignment and first response

| | |
| --- | --- |
| What must be decided | Who assigns an enquiry, whether round-robin is allowed, and whether any response time is a public promise. |
| Current provisional behavior | Assignment is manual. `roundRobinAssignment` is false. The CRM measures a 120-minute target on Sunday to Thursday, 09:00 to 17:00, `Indian/Maldives`. That figure is on staff pages only. |
| Launch consequence | Publishing the two-hour figure as a customer promise would make an unapproved SLA. |
| Recommended option | Keep assignment manual and keep the target internal. |
| Alternatives | Approve the proposed default. Or set a different target and say whether customers may see it. |
| Blocks production | Yes if a public response promise is required. No while the target stays on staff pages. |

## D-005 Quote approval

| | |
| --- | --- |
| What must be decided | When a quote needs a second approver, and who may approve or send. |
| Current provisional behavior | A second approver is required when the discount is above 10 percent of the pre-discount subtotal, or when the grand total is above 25,000 USD. Exactly 10 percent and exactly 25,000 USD do not require a second approver. The creator cannot be the sole approver. The sender cannot be an approver. |
| Launch consequence | A quote sent to a customer uses thresholds the owner has not approved. |
| Recommended option | Confirm or replace the thresholds before the first production quote is sent. |
| Alternatives | Approve the proposed default. Or require two approvers for every quote. |
| Blocks production | Yes for sending a customer quote. The workflow can be exercised in a non-production database before the decision. |

## D-006 Currency and tax

| | |
| --- | --- |
| What must be decided | The quote currency, the money scale, and how tax is represented. |
| Current provisional behavior | Quotes use USD and `NUMERIC(12,2)`. Tax and fees are explicit lines. The application does not invent a statutory rate. Offer currency is whatever staff store. |
| Launch consequence | A production quote or offer states money under an unapproved currency and tax policy. |
| Recommended option | Confirm USD and explicit tax lines, or name the currency and tax treatment before the first production quote. |
| Alternatives | Approve the proposed default. Or require another ISO currency and a documented tax treatment. |
| Blocks production | Yes for a production quote or a published monetary amount. |

## D-009 Analytics

| | |
| --- | --- |
| What must be decided | Whether first-party analytics may run, and whether non-essential analytics require opt-in. |
| Current provisional behavior | Necessary operation continues. Non-essential analytics stay off until the visitor allows them. Search analytics on the public site asks before it stores a search. A denied choice stores nothing except an `entity_viewed` row reduced to kind, with no anonymous key. |
| Launch consequence | Decisions.md marks this as a launch gate. Turning analytics on without a recorded privacy choice would cross that gate. |
| Recommended option | Record the privacy choice before launch. Keep the current opt-in until that record exists. |
| Alternatives | Approve the proposed default. Or disable first-party analytics entirely. |
| Blocks production | Yes. The decision is a launch gate. |

## D-010 Hosting, storage, email, and bot checks

| | |
| --- | --- |
| What must be decided | The production host, database host, object storage, DNS and WAF, email provider, and bot-check provider. |
| Current provisional behavior | Nothing is hard-wired. Media uses the local disk adapter. Email delivery throws “Email delivery is not configured.” and the job is `FAILED`. Transactional and marketing rows stay `QUEUED` until a provider accepts them. No row is marked `SENT` without that acceptance. Turnstile is checked only when `TURNSTILE_SECRET_KEY` is set, and the widget is not rendered. Sign-in, enquiry, newsletter, analytics, and customer-message limits are counters in the current Node process. |
| Launch consequence | There is no production or staging host, no shared rate-limit store, no durable object storage, and no email delivery. A second application process would not share the limits. |
| Recommended option | Choose the host and data services before any deployment. Do not select Resend, Neon, R2, Cloudflare, or Turnstile in code until this decision is recorded. |
| Alternatives | Approve the proposed default and then configure those vendors. Or choose a different host, database, storage, and email provider. |
| Blocks production | Yes. It also blocks a deployed staging environment. |

## D-011 Reviews

| | |
| --- | --- |
| What must be decided | When a review may be treated as first-party, and when it may be called verified. |
| Current provisional behavior | Public copy uses the stored source. Imported is “Imported rating”. A first-party review that is also verified is “First-party review”. Other published reviews are “Editorial”. The word “Verified” is not used. An imported review cannot be featured. |
| Launch consequence | Calling a review verified, or presenting an imported rating as a first-party review, would use an unapproved policy. |
| Recommended option | Keep the current labels until the owner records the verification rule. |
| Alternatives | Approve the proposed default. Or publish no reviews until the rule exists. |
| Blocks production | Yes for any public “verified” claim. No for the current labels. |

## D-012 Retention

| | |
| --- | --- |
| What must be decided | How long enquiries, quotes, marketing consent, access logs, and analytics are kept, and how deletion is carried out. |
| Current provisional behavior | No production retention job deletes or anonymises rows. A privacy export request and a privacy deletion request are stored and their jobs confirm that the customer exists. They do not produce an export file and they do not close the account. |
| Launch consequence | Production personal data would be kept without an approved retention rule, and a deletion request would not be a completed deletion. |
| Recommended option | Record the retention periods and the meaning of a deletion request before production data is collected. |
| Alternatives | Approve the proposed periods and then build the jobs. Or set different periods. |
| Blocks production | Yes. |

## D-013 Catalog data

| | |
| --- | --- |
| What must be decided | The owner-approved source for atolls, islands, and resorts, and the import method. |
| Current provisional behavior | Engineering does not invent resorts, islands, prices, reviews, or offers. Seed data does not create a catalog. Public lists are empty until staff publish owner-approved records. |
| Launch consequence | A public catalog cannot be filled from this repository. An empty catalog is truthful and is not a launch catalog. |
| Recommended option | Provide the dataset and the import method before content entry. |
| Alternatives | Authorise staff to enter records from named sources. Do not authorise invented places or prices. |
| Blocks production | Yes for a public catalog. |

## D-014 Brand, domain, and indexing

| | |
| --- | --- |
| What must be decided | The public name, domain, and handles, and whether the site may be indexed. |
| Current provisional behavior | The working name is Maldives Explorer. The descriptor “Your Maldives, beautifully planned.” is not published. `robots.txt` disallows `/`. Public metadata sends `noindex, nofollow`. Account and admin routes are not in the sitemap. |
| Launch consequence | Enabling indexing, or publishing the descriptor as a claim, would launch an uncleared brand. |
| Recommended option | Keep `noindex` until trademark, domain, and handle clearance is recorded. |
| Alternatives | Approve the working name and a domain, then change robots in a later release. Do not turn indexing on in this stage. |
| Blocks production | Yes for a public indexed launch. |

## Email provider configuration, after D-010

Do not choose a provider while D-010 is open. When a provider is approved, production needs:

- A server-side API key that is not committed and is not written to logs or `GET /api/health`.
- A from-address on a domain the owner controls.
- Delivery webhooks or provider responses that move a row from `QUEUED` to `SENT` or `FAILED`.
- A worker that can see the same database as the application.

Until that exists, `email.deliver` fails the job and no message is marked `SENT`.
