# Stage 7 implementation report

| Field | Value |
| --- | --- |
| Date | 12 October 2026 |
| Scope | Stage 7 CRM: enquiry queue, assignment, statuses, tasks, internal notes, communication log, SLA, saved views, and operational reporting |
| Exit | Staff with the matching permission can search, assign, update, and export enquiries. A consultant sees assigned enquiries. Private notes stay off the customer thread. Lost and Closed require a reason code. |

## Result

`/admin/enquiries` is the staff queue. Assignment, status, tasks, notes, the communication log, and attachments are on `/admin/enquiries/[reference]`. `/admin/enquiries/report` counts open work against the internal first-response target.

The quote builder, quote approval, quote PDF, quote acceptance, newsletter, reviews, and dashboard analytics were left for later stages. A status of Quoted or Won is available only when a sent or accepted quote version already exists. This stage does not create one.

## Schema changes

None. `prisma/schema.prisma` and the migrations were not changed. Enquiries, status history, assignment history, tasks, notes, communication logs, attachments, the SLA policy, vocabularies, and system settings were already in the contract. `.env.local` was not migrated.

Saved queue views use the existing `system_settings` row `crm.queueViews.{userId}`. Each staff member reads and writes only that key. A user can keep 20 views.

## New routes

| Route | Who | Behaviour |
| --- | --- | --- |
| `/admin/enquiries` | `enquiry.read.assigned` or `enquiry.read.all` | Queue, search, status filter, assignment filter, saved views, and the export link. |
| `/admin/enquiries/[reference]` | the same, limited to assigned rows when the role lacks `enquiry.read.all` | Detail and the working forms. |
| `/admin/enquiries/report` | `report.read` plus an enquiry read permission | Operational counts. |
| `GET /api/v1/admin/enquiries` | the same as the queue | JSON page of the queue. |
| `PATCH /api/v1/admin/enquiries/[id]` | `enquiry.update` on a readable enquiry | Status transition. |
| `POST /api/v1/admin/enquiries/[id]/assign` | `enquiry.assign` on a readable enquiry | Assignment with a reason. |
| `GET /api/v1/admin/enquiries/export` | `enquiry.export` | CSV download, capped and audited. |

The staff navigation shows Enquiries when the user can read enquiries, and Enquiry operations when the user can read reports. A customer session is turned away from these routes.

`GET /api/health` still returns only `status`, `application`, `environment`, and `version`. The homepage heading remains “Maldives Explorer”. Robots stay `noindex` because D-014 is still provisional. Public pages still withhold indicative prices because D-002 is still provisional.

## Queue and object access

A consultant has `enquiry.read.assigned` and `enquiry.update`. The queue and the detail load rows whose `assignedUserId` is that user. Another consultant’s enquiry, and an unassigned enquiry, return “That record is not available.”

An operations manager, an administrator, and an auditor have `enquiry.read.all` and can open the whole queue. The auditor has no `enquiry.update`, `enquiry.assign`, or `enquiry.export`, so those actions return “That action is not available.” A content editor has no enquiry permission and receives the same refusal on the queue.

Search matches the reference, the customer name, and the customer email. The page size comes from `admin.pageSize`, with a fallback of 50. Child ages and accessibility needs appear on the detail for a staff member who can read that enquiry. They are omitted from the queue and the export.

## Assignment

Assignment requires `enquiry.assign`, a reason of 1 to 500 characters, and the enquiry revision loaded with the form. The history row stores the previous assignee, the new assignee, the reason, and the person who assigned it. History rows stay insert-only.

The assignee must be an active staff user whose role includes `enquiry.update`. A customer account is not an assignee.

`roundRobinAssignment` stays `false` in the seed. While it is false, an assignment without a chosen consultant is refused. While it is true, the enquiry goes to the active consultant with the fewest open enquiries, and the reason is still stored. The migration exercise turned the setting on for one assignment, checked that the chosen user was an active consultant, and restored `false`.

## Status

The allowed moves are the enquiry state machine. Lost requires an active `LOSS_REASON` code. Closed requires an active `CLOSURE_REASON` code. Free text is refused. Reopening Lost or Closed to Contacted requires `enquiry.assign`. Negotiation requires a follow-up time in Maldives time and creates an open task titled “Follow up”. Qualified requires the checklist confirmation. Contact attempted requires a channel and writes an outbound communication log.

Quoted is refused with “A sent quote is required.” until a sent quote version already exists. Won is refused with “An accepted quote and an operational reference are required.” until an accepted version exists and the form includes an operational reference. This stage does not build the quote, the approval, the PDF, or the acceptance.

A stale revision returns “This enquiry was updated. Reload it.” Status history is insert-only and records the previous status, the next status, the reason code, and the staff user.

## Tasks, notes, communication, and attachments

Tasks have a title, an optional due time, and a status of open, in progress, done, or cancelled. The assignee is the enquiry’s consultant, or the staff member making the change when the enquiry is unassigned.

Notes are `INTERNAL` by default. A note marked `CUSTOMER` is the one the portal thread can show. `readOwnThread` still loads notes with visibility `CUSTOMER` only. The migration exercise added an internal note and a customer note on the same enquiry. The customer thread contained the customer note and omitted the internal note. Another customer’s thread stayed empty.

The communication log stores channel, direction, an optional subject, a summary, and the time. An outbound entry, a customer-visible note, or a move out of the terminal statuses records `firstResponseAt` when it is still empty. An internal note does not. Lost and Closed do not record a first response by themselves.

An attachment links an existing media id to the enquiry. The form asks for that id. There is no new upload pipeline and no quote PDF.

## SLA and operational reporting

The active SLA policy is “Default Maldives business hours”: 120 minutes, Sunday to Thursday, 09:00 to 17:00, `Indian/Maldives`. The queue, the detail, and the operations page show that figure as an internal target. D-003 remains provisional, so the two-hour figure stays on the staff pages.

Waiting time is business minutes from receipt until the first response, or until now when no response is recorded. The operations page counts each status, unassigned open enquiries, waiting inside the target, waiting past the target, answered inside the target, answered past the target, and the oldest open enquiry. It is an enquiry operations count. It is not a product analytics dashboard.

## Export

Export requires `enquiry.export`. The consultant and the auditor are refused. The file is CSV, capped by `export.maxRows` and also by 5,000. The seed value is 5,000. The audit action is `enquiry.export` and stores the row count, whether the cap applied, and the filters. The file includes the reference, status, customer name and email, assignee email, times, SLA label, and terminal reason. It omits requirements, accessibility needs, traveler ages, and note bodies.

## Audit coverage

| Action | When |
| --- | --- |
| `enquiry.assign` | An enquiry is assigned. The audit stores the previous and next assignee. The reason stays on the assignment history row. |
| `enquiry.status` | The status changes. The audit stores the previous status, the next status, and the reason code. |
| `enquiry.note` | A note is added. The audit stores the visibility and omits the body. |
| `enquiry.task` | A task is added or its status changes. |
| `enquiry.communication` | A communication is logged. The audit stores the channel and direction and omits the summary. |
| `enquiry.attachment` | An existing media file is linked. |
| `enquiry.view.save` | A queue view is saved. The audit stores the view name. |
| `enquiry.export` | A CSV is produced. The audit stores the row count and the cap. |

## Tests added

| Check | Result |
| --- | --- |
| `src/tests/crm.test.ts` | A consultant reads an assigned enquiry and not another assignee’s. Export permission is separate from read-all. Lost, Closed, Quoted, Won, and reopen each stop on the missing control. Maldives business hours count 120 minutes inside Monday 09:00–11:00 and skip Friday and Saturday. The export cap accepts 10, keeps 5,000, and clamps 9,000. |
| `npm test` | 41 tests, 11 files, passed. |
| `scripts/exercise-crm.ts` via `npm run test:migrations` | On disposable `maldives_stage1` only. A consultant cannot read an unassigned enquiry or another consultant’s enquiry. Assignment writes a history row with the reason. An internal note stays out of the customer thread. A customer note appears there. Lost without a reason code fails. Lost with `PRICE` stores the code and the history row. A consultant cannot reopen. Operations can reopen and close with `DUPLICATE`. Quoted and Won fail until an accepted version already exists, then Won stores the operational reference. Export without `enquiry.export` fails. A permitted export is audited, omits the internal note, and honours a cap of 1 before the setting returns to 5,000. A backdated open enquiry is past the internal target. Round robin assigns an active consultant and the setting returns to `false`. The portal exercise still passed in the same run. Migrations were dropped and reapplied. |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed. |
| Playwright `tests/smoke.spec.ts` | 4 passed, including the homepage heading, the health payload, and the skip link. |

## Verification

Checked in the browser against a disposable database, not `.env.local`.

A staff sign-in with the seeded administrator opened the queue. The queue showed `ME-E-000001` as Received and Unassigned, with the internal target of 120 business minutes. Saving a view named “Unassigned received” listed that view. Assigning the enquiry stored “Browser assignment check” on the assignment history. An internal note, the task “Call the guest”, and an outbound phone summary were saved. The status moved to Contacted. Choosing Lost with no reason showed “Choose a loss reason.” and left the status on Contacted.

The operations page showed one Contacted enquiry and one first response inside the target. The export returned `text/csv` for that reference and did not include the internal note. At 390px the queue, the enquiry, and the operations page did not overflow.

The disposable database and the Next.js process were stopped afterward, and `.data` was removed.

## Open defects

Stored redirect codes `301` and `302` are still applied as `308` and `307`. That defect is unchanged from Stage 3.

A Next.js development overlay can report a hydration mismatch while the automation browser is attached. The attribute involved is the browser’s `data-cursor-ref`. The queue, the enquiry, and the operations page still completed.

## Remaining items

- The quote builder, quote approval, quote PDF, and quote acceptance were not built. Quoted and Won read quote rows that already exist.
- Newsletter signup, reviews, and dashboard analytics were not built.
- D-014 is still provisional, so robots disallow the whole site. D-002 is still provisional, so indicative prices stay off public pages. D-003 is still provisional, so the first-response target stays on the staff pages.
- Round robin remains off. The seed value of `roundRobinAssignment` is `false`.
- Stage 3 leftovers remain: collection full-text search, Meilisearch, tag pages, `SCHEDULED` promotion, the collection-item editor, the FAQ owner picker, reusable blocks, video transcripts, the filter panel, and map view. `mapView` stays disabled.

Stage 8 was not started.
