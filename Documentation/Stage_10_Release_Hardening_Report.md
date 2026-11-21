# Stage 10 release hardening report

| Field | Value |
| --- | --- |
| Date | 17 October 2026 |
| Scope | MVP release hardening only. No new product area beyond the approved offer gap and defect fixes. |
| Exit | The defect inventory is classified, the regression suite has been run, and the readiness verdict is recorded. |

## Result

The existing MVP was hardened where the approved requirements or a launch defect required it. Public offers are now listed and read with expiry handling, and the numeric price stays off the public page. Stored redirects emit the stored status. A due scheduled record is promoted on a page view. Child ages in the planner match the database constraint.

The release is not ready to stage and not ready for production. The functional suite passed. Staging and production are still blocked by owner decisions, a missing host, email, catalog data, a backup drill that could not be run, and privacy jobs that record a request without completing it.

Production was not deployed. Phase 2 was not started.

## Verdict

**NOT READY FOR STAGING**

**NOT READY FOR PRODUCTION**

The migration suite, unit tests, format check, and production build succeeded. Those results are not the staging or production verdict. Staging needs a host, a shared reading of the rate limits for however that host runs, an observed CI run, and a backup restore that this machine cannot perform. Production also needs the decisions in `Documentation/Production_Decisions_Required.md`.

## Inventory from Stages 0–9

| Item | Class | Stage 10 disposition |
| --- | --- | --- |
| D-014 noindex, uncleared name and domain | BLOCKER | Unchanged. Indexing stays off. |
| D-010 no host, storage, email, or Turnstile | BLOCKER | Unchanged. No provider was selected. |
| D-013 no owner-approved catalog | BLOCKER | Unchanged. No resorts or prices were invented. |
| D-009 analytics launch gate | BLOCKER | Opt-in behavior kept. |
| D-012 retention and incomplete privacy jobs | BLOCKER | Requests stay requests. No retention job was added. |
| D-002 public prices | BLOCKER for prices | Offers withhold the amount. |
| D-005 and D-006 quote commercial policy | BLOCKER for a production quote | Existing quote rules were not loosened. |
| Local Node v22.11.0 against CI 22.23.3 | BLOCKER for this machine matching CI | Documented. The install was not changed. |
| No preview, no observed PR CI, no branch protection | BLOCKER | Unchanged from the Stage 0 checklist. |
| In-process rate limits | BLOCKER for more than one process | Documented as a D-010 dependency. No new table. |
| `pg_dump` / `pg_restore` not run | BLOCKER for backup proof | Client tools are not installed. Drill not run. |
| Public offers missing | HIGH | Implemented for the approved listing, detail, and expiry behavior. |
| 301/302 emitted as 308/307 | HIGH | Fixed and checked over HTTP. |
| Scheduled rows never promoted | HIGH | Fixed and checked with a due FAQ. |
| Planner ages 12–17 rejected by `travelers_age` | HIGH | Fixed in the planner. The constraint was not changed. |
| Claim URL stored in the acknowledgement job | HIGH | Still open. |
| CSV formula injection in exports | HIGH | Prefix added in Stage 10 and covered by the unit test. |
| `next-env.d.ts` format check | MEDIUM | The generated file is in `.prettierignore`. `format:check` passes. |
| Production build required a live database | MEDIUM | The root layout is `force-dynamic`, so the build no longer prerenders those pages. |
| Automatic promotion writes no audit row | MEDIUM | Open. |
| Collection search is `ILIKE` | MEDIUM | Deferred. Meilisearch is later. |
| Compare and recently viewed stay on the device | MEDIUM | Deferred. Wishlist merge is the account copy. |
| Turnstile widget not rendered | MEDIUM | Deferred until D-010. |
| Empty catalog pages other than offers use an `h2` only | MEDIUM | Offers empty state now has an `h1`. The others were left. |
| Hydration overlay during browser automation | LOW | Investigated. The diff is `data-cursor-ref`. Not an application defect. |
| Honeypot exposed to the automation snapshot | LOW | The field stays `aria-hidden` and off the tab order. |
| Windows `EBUSY` while deleting the temporary database directory | LOW | The suite still exited 0. |
| Collection-item editor, FAQ owner picker, reusable blocks on public pages, video transcript editor, catalog filter panel, map view, tag pages, `/guides/[category]` | DEFERRED / PHASE 2 | Not required to close the approved MVP. `mapView` stays disabled. |
| Offer compare | DEFERRED | FR-OFF-004 remainder. Compare stays resort-only. |
| Booking, payments, supplier confirmation, round-robin, further languages, advanced dashboards | DEFERRED / PHASE 2 | D-001, D-003, and D-007. |

## Defects fixed

- Public offers. `/offers` lists published offers that are inside `validFrom` and `validUntil` and whose resort is published. `/offers/[slug]` shows the resort, a published room when one is linked, occupancy, meal plan, transfer, inclusions, exclusions, currency, price basis, validity, stay dates, and terms. The numeric `fromPrice` is not on the public object or in JSON-LD. An expired published offer is omitted from the list. Its direct URL says it is no longer available. A draft, an unpublished resort, or an unknown slug is a not-found page. Staff edit offers at `/admin/catalog/offers`. Search accepts the offers kind. The sitemap includes current offers. A saved offer points at `/offers/{slug}` only while it is current.
- Redirect status. Middleware reads `GET /api/internal/redirects` and redirects with the stored 301, 302, 307, or 308. The homepage still answered while that lookup ran.
- Scheduled publication. `promoteDuePublications` updates due `SCHEDULED` rows to `PUBLISHED` for atolls, islands, resorts, experiences, articles, collections, offers, FAQs, and homepage modules. Reusable blocks are excluded because they have no schedule columns. A due FAQ became `PUBLISHED` with `published_at` set.
- Planner ages. The form and `classifyTravelerAge` accept 0 through 11. Ages 12 and over are adults, matching `travelers_age`.
- CSV cells that look like formulas are prefixed in the CRM and newsletter exports.
- Response headers listed in the checklist are set. `X-Powered-By` is off.
- `next-env.d.ts` is ignored by Prettier.
- The root layout is dynamic so `next build` does not require the database on port 5432.

## Defects still open

- The acknowledgement job payload still contains the raw claim URL. The email row stays `QUEUED`. The token is not returned by an API and is not written to the health response. It remains in `jobs` until a provider exists and the payload is cleared at send time.
- Privacy export does not produce a file. Privacy deletion does not close the account.
- Automatic publication does not write an audit row.
- `npm audit` findings below were not patched.
- `pg_dump` / `pg_restore` were not run.
- WCAG 2.2 AA was not established for the whole site.
- Core Web Vitals were not measured.

## Deferred backlog

| Item | Reference |
| --- | --- |
| Booking, payment, and supplier confirmation | D-001. Customer acceptance does not set Won and does not reserve a supplier. |
| Round-robin assignment | D-003. Seed value `roundRobinAssignment` is false. |
| Further languages | D-007. |
| Offer compare and a dedicated offer filter beyond the search kind | FR-OFF-004 remainder. Listing, detail, and expiry were the Stage 10 requirement. |
| Meilisearch, collection full-text, tag landing pages, `/guides/[category]` | Stage 3 remaining items. PostgreSQL search stays. |
| Collection-item editor, FAQ owner picker, reusable blocks rendered on public pages, catalog filter panel, map view | Stage 2 and Stage 3 leftovers. Not required to publish the records the MVP already publishes. |
| Video transcript editing | The media row can store a transcript. The staff form does not edit it. A caption remains the publication requirement. No video was invented. |
| Compare and recently viewed copied onto the account | Stage 4. Wishlist merge is implemented. |
| Production retention jobs | D-012. |
| Turnstile widget | D-010. The API checks the token only when the secret is set. |
| Quote, acknowledgement, and newsletter mail staying `QUEUED` | D-010. |

## Offers

FR-OFF-001 through FR-OFF-005 are Must. The public list, detail, expiry, resort, optional room, occupancy, meal plan, transfer, inclusions, exclusions, currency, price basis, validity, stay dates, and terms were missing from the public site and are now implemented. D-002 is respected: the staff column `fromPrice` is required in the database and is omitted from the public query. The page says an indicative price is not published. No availability was invented.

The browser check used the disposable database, which has no owner-approved offer. It confirmed the empty list, the heading, `noindex`, the 390px width, and the not-found slug. The migration exercise confirmed a current offer and an expired offer.

## Regression

`npm test` on 17 October 2026: 14 files, 56 tests, passed.

`npm test` on 30 October 2026 (Takeover & Post-Phase 4 Regression Suite): 19 files, 180 tests, passed (including Phase 1–4 suites and `src/tests/takeover-remediation.test.tsx`; see `Documentation/Takeover_Baseline_Audit_and_Remediation_Report.md`).

`npm run test:migrations` on 17 October 2026 exited 0. Order: migrate, seed, foundation, catalog, discovery, wishlist, enquiry, portal, CRM, quotes, Stage 9, offers, drop schema, migrate again. Passed lines included foundation, catalog, discovery, wishlist, enquiry, portal, CRM, quote, Stage 9, and offer. PostgreSQL `RAISE` lines for a room on the wrong resort, a changed line on a sent quote, and a featured imported review were the integrity checks, and each exercise still passed.

Playwright was not re-run. Its config starts `next start` against the configured database. That database was not the disposable server, and the disposable server was stopped after the browser check.

Browser, on the disposable server: `/offers`, an unknown offer slug, and `/plan` through the travel-type step. Servers were stopped and `.data` was removed.

## Security

Reviewed against the current code and the exercises above.

- Staff sessions still require TOTP. Customer passwords do not. Magic links are not a staff sign-in.
- Object access for enquiries, messages, notes, quotes, newsletter export, and CRM export remains the permission and ownership checks those exercises already assert.
- Upload keys still reject traversal. SQL that takes a visitor path uses parameters or a fixed query. The redirect lookup does not forward the destination from the query string without a stored row and a path check.
- The health route stays four fields.
- Headers were observed on the homepage and on both redirect responses.
- Rate limits stay in memory. Production on more than one process needs a shared limiter after D-010. That dependency is recorded. A new table was not added.
- The claim URL in the job payload is the open secret-handling defect.
- Audit coverage of the existing workflows was not reduced. Automatic promotion is the new unaudited write.

`npm audit` on 17 October 2026, not force-fixed:

| Finding | Reach |
| --- | --- |
| `postcss` `<=8.5.22` under `next`: XSS in CSS stringify (GHSA-qx2v-qp2m-jg93, moderate) and source-map file reads (GHSA-6g55-p6wh-862q, GHSA-fxqj-rqcc-2cmp, GHSA-r28c-9q8g-f849). `next` is reported moderate through this package. | Production reachable as Next’s CSS pipeline. This application does not parse visitor CSS. The suggested fix is `next@16.4.2`, a major upgrade, and was not applied. |
| `eslint-config-next`, `@next/eslint-plugin-next`, `fast-glob`, `micromatch`, `braces` (GHSA-vfj7-8cjw-p6xm). | Dev lint toolchain. Not a production request path. The suggested fix downgrades `eslint-config-next` to 14.2.35 and was not applied. |
| `prisma`, `@prisma/config`, `deepmerge-ts` (GHSA-ggr8-5vv4-36mx), `effect` (GHSA-38f7-945m-qr2g). | Prisma CLI and config. Not the query engine on a page request. The suggested fix downgrades `prisma` to 6.12.0 and was not applied. |

## Privacy

Consent for an enquiry is stored. Marketing consent is independent. Unsubscribe adds a withdrawal and does not reactivate a suppressed address. Analytics stay off until allowed.

Export and deletion are requests. Their jobs confirm the customer and finish. They do not mean the export was delivered or the account was deleted.

## Accessibility

Checked in the browser at 390px: skip link, primary and footer navigation, one `h1` on offers and on the planner, breadcrumb, `main`, the planner age explanation, and no horizontal overflow on those two pages. Form fields on the planner step expose names. The newsletter footer fields expose names.

Not checked: contrast ratios, a full keyboard pass of every dialog, a screen reader pass, and reduced motion in this session. Playwright’s reduced-motion smoke was not re-run. WCAG 2.2 AA is not claimed.

The hydration overlay is the automation attribute described above.

## Performance

`npm run build` on 17 October 2026 succeeded. Shared first-load JavaScript is 103 kB. `/plan` is 148 kB, `/plan/received` is 132 kB, `/resorts/[slug]` is 126 kB, and offer detail is 121 kB. Middleware is 34.3 kB. Pages are dynamic. No Core Web Vitals sample was taken. No search, sitemap, or PDF timing was taken against a large catalog. No performance target is marked passed.

## SEO

D-014 still controls indexing. `robots.txt` disallows the whole site. `/offers` metadata is `noindex, nofollow`. The sitemap includes `/offers` and does not include account or admin URLs. Offer JSON-LD has no price. Indexing was not turned on.

## Email

| State | When it is used |
| --- | --- |
| QUEUED | The acknowledgement, quote send, and newsletter confirmation create the delivery row. |
| FAILED | `email.deliver` throws because no provider is configured, and the job is marked failed. |
| SENT | Not used. A provider response would be required. |

D-010 is open, so no provider was selected. The configuration a future provider needs is in `Documentation/Production_Decisions_Required.md`.

## Database

`prisma format --check` passed. `prisma validate` passed with a local URL set. The migration suite applied both migrations to an empty disposable database, seeded, ran every exercise, dropped `public`, and applied both migrations again. Integrity errors in the exercises were expected and did not fail the run.

`pg_dump` and `pg_restore` are not installed. The embedded server binaries do not include them. The restore drill is outstanding.

The user’s `.env.local` database was not migrated.

## CI and repository

CI pins Node 22.23.3. This machine is Node v22.11.0 and npm 10.9.0. `format:check` passes, including after `next-env.d.ts` was ignored. The lockfile was not rewritten by an audit fix. Secret scanning remains a GitHub setting described in `.github/secret-scanning.md`. Branch protection cannot be set from this environment. No pull request CI run was observed.

## Provisional decisions

Unresolved and recorded in `Documentation/Production_Decisions_Required.md`: D-002, D-003, D-005, D-006, D-009, D-010, D-011, D-012, D-013, and D-014. None were approved in this stage.

## Production blockers

- D-009, D-010, D-012, D-013, and D-014.
- No email provider, so no message can be `SENT`.
- No shared rate limit for more than one process.
- Privacy export and deletion are not completed outcomes.
- No backup restore proof.
- No owner-approved catalog.
- Claim tokens remain in job payloads.
- Dependency findings above, with no safe patch applied.
- This machine’s Node version does not match CI, and CI has not been observed on a pull request.

## Launch checklist

1. Record D-009, D-010, D-012, D-013, and D-014.
2. Choose a host that matches the rate-limit design, or add a shared limiter before a second process.
3. Configure email only after D-010, and mark `SENT` only from provider confirmation. Clear the claim URL from the job when the message is accepted or abandoned.
4. Import an owner-approved catalog. Do not invent resorts or prices.
5. Decide D-002, D-005, and D-006 before any public price or production quote.
6. Install PostgreSQL client tools and complete `pg_dump` / `pg_restore`, then confirm an integrity constraint still rejects a bad row.
7. Run the CI workflow on a pull request with Node 22.23.3 and enable branch protection and secret scanning.
8. Finish the privacy export file and the deletion behavior the owner records under D-012.
9. Measure Core Web Vitals and a WCAG 2.2 AA pass on the staging host. Do not treat this report as that pass.
10. Keep `noindex` until D-014 is approved.

## Readiness matrix

`Documentation/MVP_Readiness_Checklist.md` is the row-by-row status. It uses PASS, FAIL, BLOCKED, and DEFERRED with the evidence from this stage.

Stage 10 stops here.
