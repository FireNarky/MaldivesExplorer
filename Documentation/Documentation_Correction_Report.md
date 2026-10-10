# Documentation correction report

| Field | Value |
| --- | --- |
| Date | 10 October 2026 |
| Scope | Documentation correction and Stage 0 preparation. No feature pages were added. |
| Result | The documents below are updated. Stage 0 is not ready to exit. |

## Files modified

| File | Change |
| --- | --- |
| `Documentation/README_FOR_CURSOR.md` | Source-of-truth order now includes `Decisions.md`, `Implementation_Plan.md`, `Database_Design.md`, and `Design_System.md`. Stage 0 checklist and ADRs are named without overriding that order. |
| `Documentation/Implementation_Plan.md` | Version 1.1. Release A–C split, provisional decisions, and the offer index rule. |
| `Documentation/Database_Design.md` | Version 1.1. Customer ownership, quote-response transaction, vocabulary triggers, and the coordinate correction. |
| `Documentation/Decisions.md` | Created. D-001 through D-014. |
| `Documentation/Stage_0_Checklist.md` | Created. |
| `Documentation/adr/0001-vocabulary-set-constraints.md` | Created from the PostgreSQL measurement. |
| `Documentation/Design_System.md` | Not modified. No new measured contrast failure was found in this pass. |

No file under `prisma/migrations` was added or edited. No feature page, production route, authentication module, or catalog module was added in this pass.

## Conflicts corrected

1. **Offer index.** `Implementation_Plan.md` recommended a partial index predicate `validUntil >= now()`. PostgreSQL rejects `now()` and `current_date` in an index predicate. The published index is `WHERE status = 'PUBLISHED'`. Public queries apply `valid_until >= current_date`, because `valid_until` is a date. `Database_Design.md` already had the index rule and now uses `current_date` in the query text.

2. **Plan approval is not policy approval.** Version 1.0 said approval of the plan accepted every proposed default. Version 1.1 withdraws that. Legal, commercial, retention, tax, SLA, hosting, and review policies stay unapproved. D-002, D-003, D-005, D-006, D-009, D-010, D-011, D-012, and D-014 are Provisional.

3. **Delivery split.** The complete MVP is Releases A through C: discovery and lead capture, staff operations, and the customer proposal experience. Shipping A or B alone does not complete the MVP.

4. **Customer ownership.** A customer may access or respond only to quotes on that customer’s enquiry, and may create or view messages only on that enquiry. Both controls require integration tests. `respondToQuoteVersion` is one transaction: ownership, row lock, expiry and status, response insert, version status, and audit rows commit or roll back together. Triggers reject a mismatched customer on insert.

5. **Resort coordinates.** The integrity SQL added `resorts_coordinates` on `latitude` and `longitude`. Those columns are on `atolls` and `islands`, not on `resorts`. The resort constraint was removed. The same range check remains on `atolls` and `islands`. This was a wrong-table constraint, not a dropped rule.

6. **Vocabulary sets.** Cross-table `CHECK` constraints were measured as unreliable and replaced with triggers. See the validation section and ADR 0001. Typed vocabulary tables were not introduced.

7. **Prisma formatting.** `prisma format` changed alignment only, 298 lines, with no identifier changes. The schema fence in `Database_Design.md` now matches that formatted text.

## Validation commands executed

The schema and SQL were extracted from `Documentation/Database_Design.md` into a temporary directory. The application tree was not the target. PostgreSQL was 16.14, started only for this pass.

| Command | Result |
| --- | --- |
| `prisma format` on the extracted schema | Exit 0. Alignment-only diff, then written back into the document. |
| `prisma validate` on the extracted schema | Exit 0. Schema valid. |
| `prisma migrate diff --from-empty --to-schema-datamodel` | Exit 0. 445 SQL statements. |
| Apply that migration to empty database `maldives_validate` | 445 statements, 0 failures. |
| Apply §8 and §9 integrity SQL | First apply failed at statement 53: `column "latitude" does not exist` on `resorts`. After the coordinate correction and the vocabulary-trigger replacement, a clean rebuild applied 121 integrity statements with 0 failures. |
| §6.4 assertion queries | 9 queries, each returned 0 rows. |
| Migration reset | `maldives_validate` was dropped and both scripts were applied again. 0 failures. |
| Second empty database `maldives_restore` | Both scripts applied again. 0 failures. 76 public tables, including the notes view. |
| Vocabulary behavior on PostgreSQL 16.14 | A matching `PRICE_BAND` was accepted. A `MEAL_PLAN` id was rejected. Changing `set` was rejected while the immutability trigger was enabled. With that trigger disabled, the old `CHECK` did not notice the changed set. |

`pg_dump` and `pg_restore` are not in the embedded PostgreSQL 16.14 package used here, so the restore test replayed the generated migration and the integrity SQL onto a second empty database. It was not a `pg_dump` archive round-trip.

## Validation results that changed the design

| Observation | Correction |
| --- | --- |
| `CHECK (vocabulary_item_in_set(...))` does not recheck when `vocabulary_items.set` changes | Replaced those checks with `BEFORE INSERT OR UPDATE` triggers. The immutability trigger remains. Recorded in ADR 0001. |
| `resorts_coordinates` referenced columns the resort table does not have | Removed that constraint. Kept the coordinate checks on `atolls` and `islands`. |
| `prisma format` realigned relation fields | Updated the schema fence. No columns or relations were added or removed by formatting. |

No constraint was removed to hide a failure except the resort coordinate check, and that rule still exists on the tables that store coordinates.

## Remaining provisional decisions

| ID | Status | Blocks |
| --- | --- | --- |
| D-002 | Provisional | Publishing an indicative price |
| D-003 | Provisional | Treating the two-hour target as an operating rule |
| D-005 | Provisional | Quote approval thresholds |
| D-006 | Provisional | Currency, tax, and fee policy |
| D-009 | Provisional | Non-essential analytics |
| D-010 | Provisional | Production hosting and vendors |
| D-011 | Provisional | Calling a review verified |
| D-012 | Provisional | Production retention |
| D-014 | Provisional | Public brand claims and launch |
| D-013 | Open | Who owns resort data and how it is imported |

D-001, D-004, D-007, and D-008 are recorded as accepted for the MVP boundary, optional accounts, English-only content, and the Auth.js approach. They were not in the provisional list. Phase 2 booking, a translation workflow, and production hosting are not accepted with them.

## Remaining blockers

- Stage 0 checklist items are written and unchecked. CI, formatter enforcement, preview deployment, and the pinned Node runtime are not in place.
- This machine is Node v22.11.0. The checklist requires a Node 22 release that satisfies `^22.13.0`.
- D-010 is Provisional, so production hosting is not chosen.
- D-013 is open, so catalog import has no approved source.
- Customer quote and message ownership integration tests are specified and not implemented. They belong to Release C, after this review.
- The integrity SQL is validated, and it is not yet a migration in the application tree. That wait is intentional.

## Whether Stage 0 is ready

No. The decision log, checklist, ADR, and database validation are in place. Stage 0 exits only when `Documentation/Stage_0_Checklist.md` is signed, including the Node pin, CI, secret layout, health route on a preview deployment, and a repeatable migration test. Feature pages stay stopped until this report is reviewed.
