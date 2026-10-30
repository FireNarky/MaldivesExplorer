# MVP readiness checklist

| Field | Value |
| --- | --- |
| Date | 17 October 2026 (updated 30 October 2026 takeover verification) |
| Evidence window | Stage 10 checks on 17 October 2026 + Takeover verification on 30 October 2026 (`Documentation/Takeover_Baseline_Audit_and_Remediation_Report.md`) |
| Rule | A passing build is not a pass for a row that was not measured or is waiting on an owner decision. |

| Status | Meaning |
| --- | --- |
| PASS | The check was run and the result matches the approved MVP. |
| FAIL | The check was run and the result does not meet the bar, or the required proof was not produced. |
| BLOCKED | An unresolved decision or a missing production dependency stops the row. |
| DEFERRED | The item is outside the approved MVP and is recorded as later work. |

## Functional

| Item | Status | Evidence |
| --- | --- | --- |
| Authentication, staff MFA, RBAC, and audit | PASS | `npm run test:migrations` on 17 October 2026: foundation exercise passed, including the expected database rejections. |
| Publication workflow and draft isolation | PASS | Catalog and discovery exercises passed. A draft stays out of public search. |
| Resorts, destinations, experiences, guides, search, and sitemap | PASS | Discovery exercise passed. The disposable sitemap included `/offers` and the public discovery paths, and did not include `/account` or `/admin`. |
| Stored redirects keep 301 and 302 | PASS | On the disposable server, `GET /stage10-301` returned `301 Moved Permanently` and `GET /stage10-302` returned `302 Found`, both with `Location` ending in `/offers`. |
| Wishlist and account merge | PASS | Wishlist exercise passed. |
| Compare and recently viewed | PASS | Existing device-local behavior remains. They are not copied into the account. That limit is deferred below, not a failed merge of the wishlist. |
| Planner draft, resume, idempotency, and consent | PASS | Enquiry exercise passed. A repeated submit did not create a second enquiry. Child ages now stop at 11 so a saved plan matches `travelers_age`. |
| Enquiry ownership, portal, messages, and internal notes | PASS | Portal and CRM exercises passed. |
| CRM assignment, transitions, SLA, and export permission | PASS | CRM exercise passed. |
| Quotes: approval, immutability, PDF, send, ownership, response, and expiry | PASS | Quote exercise passed. The expected “lines on a sent quote version cannot change” error was raised and caught. |
| Reviews, newsletter, and operational reporting | PASS | Stage 9 exercise passed. The expected `reviews_featured` rejection was raised and caught. |
| Public offers | PASS | Offer exercise passed: a current published offer is listed without `fromPrice`, and an expired published offer is absent from the list and reads as expired. The browser showed `/offers` with one `h1`, the sentence “No current offer is published.”, and a missing slug as “Page not found”. |
| Offer compare | DEFERRED | FR-OFF-004 also names compare. Compare remains resort-only. The offer URL is the share. |

## Security

| Item | Status | Evidence |
| --- | --- | --- |
| Session, MFA, and staff boundary | PASS | Staff password sign-in still returns no session until TOTP. Customer magic links remain refused for staff. Foundation exercise passed. |
| Password reset and magic links | PASS | Reset and magic-link flows stay on the existing Auth.js path. No new token is written to logs. |
| Rate limiting | BLOCKED | Limits are in-process maps. They hold on one Node process and do not hold across more than one process. D-010 has not chosen a host, so a shared store was not added. |
| Security headers | PASS | Homepage and redirect responses sent `nosniff`, `strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, an empty camera, microphone, and geolocation policy, and `frame-ancestors 'none'`. HSTS is added only when `APP_ENV` is `production`. There is no full `script-src` policy. |
| Secrets in health and logs | PASS | `GET /api/health` returned only `status`, `application`, `environment`, and `version`. |
| CSV injection | PASS | CRM and newsletter export prefix a cell that starts with `=`, `+`, `-`, `@`, tab, or carriage return. The unit test expects `csvCell("=cmd")` to be `'=cmd`. |
| Open redirects | PASS | Middleware accepts only a path that starts with `/` and does not contain `//`. The redirect editor already rejects `//` and the prefixes `/admin`, `/api`, `/login`, `/media`, and `/_next`. |
| Claim link stored on the acknowledgement job | FAIL | An unlinked enquiry still puts the raw `/register?claim=` URL in `jobs.payload`. The job can succeed while the email stays `QUEUED`, so the token remains in the database. No API returns that payload. It is still a bearer token at rest. |
| Dependency audit | FAIL | `npm audit` on 17 October 2026: 11 findings, 0 critical, 1 moderate, 10 high. No `npm audit fix --force`. Details are in the Stage 10 report. The suggested fixes are a Next.js 16 upgrade or a downgrade of Prisma and ESLint, and were not applied. |

## Privacy

| Item | Status | Evidence |
| --- | --- | --- |
| Enquiry and account consent | PASS | Enquiry exercise records `ENQUIRY_CONTACT`. Consent withdrawal remains a new row, not a rewrite of the grant. |
| Marketing consent and suppression | PASS | Stage 9 exercise passed. Unsubscribe inserts a withdrawn marketing consent. A suppressed address cannot be resubscribed without a new explicit consent. |
| Cookie and analytics preference | PASS | The public site asks before search analytics. A denial does not store the search. |
| Privacy export | FAIL | The request and job exist. `confirmPrivacyRequest` checks that the customer exists. It does not produce a file. |
| Privacy deletion | FAIL | The request and job exist. They do not close the account or delete the customer. |
| Retention jobs | BLOCKED | D-012 is provisional. No production retention job was added. |

## Accessibility

| Item | Status | Evidence |
| --- | --- | --- |
| WCAG 2.2 AA conformance | FAIL | No full audit was run. Keyboard order, contrast, every dialog, and every template were not measured with an assistive-technology pass. |
| Offers and planner checks that were run | PASS | `/offers` has a skip link, one `h1`, a breadcrumb, and `main`. At 390px the document width was 390 and did not overflow. `/plan` step 3 showed “Ages from 0 through 11” and did not overflow at 390px. |
| Hydration mismatch | PASS | The development overlay on `/plan` differed only by `data-cursor-ref` attributes inserted by the automation browser. That is not an application defect. |
| Video transcript editor | DEFERRED | A caption is still enough to publish a video. Transcript text can be stored. The staff form does not edit it. No seeded video is published. |
| Other empty catalog pages | FAIL | Resorts, guides, and the other lists still use an `h2` empty state when they have no rows. Offers was given an `h1`. Those other empty states were not changed in this stage. |

## Performance

| Item | Status | Evidence |
| --- | --- | --- |
| Production build | PASS | `npm run build` completed on 17 October 2026. Routes are server-rendered. `robots.txt` is the static page. |
| Core Web Vitals | FAIL | LCP, INP, and CLS were not measured in a browser. |
| Bundle size | PASS | Shared first-load JavaScript is 103 kB. Largest route first loads: `/plan` 148 kB, `/plan/received` 132 kB, `/resorts/[slug]` 126 kB. Middleware is 34.3 kB. These are measurements, not a passed budget. |
| Search latency, N+1, sitemap scale, and PDF time | FAIL | Not measured against a filled catalog. The offer and collection search paths use `ILIKE`. |

## SEO

| Item | Status | Evidence |
| --- | --- | --- |
| Indexing stays off | PASS | `robots.txt` is `Disallow: /`. `/offers` sent `noindex, nofollow`. D-014 was not approved, so indexing was not enabled. |
| Sitemap excludes account and admin | PASS | The disposable sitemap listed public discovery URLs, including `/offers`, and did not list `/account` or `/admin`. |
| Canonical, Open Graph, breadcrumbs, and JSON-LD | PASS | Offer pages use `publicMetadata` and breadcrumbs. A published offer page emits schema.org `Offer` JSON-LD without a price. Expired and missing offers do not emit a price. |
| Error pages | PASS | An unknown offer slug rendered the existing not-found page. |

## Data

| Item | Status | Evidence |
| --- | --- | --- |
| Prisma format and validate | PASS | `prisma format --check` reported the schema formatted. `prisma validate` reported the schema valid when `DATABASE_URL` was set. |
| Empty-database migrate, seed, exercises, drop, reapply | PASS | `npm run test:migrations` exited 0. Both migrations applied, exercises passed, the schema was dropped, and both migrations applied again. |
| Integrity constraints | PASS | The suite still raises and catches the offer-room, sent-quote, and featured-review constraints. They were not weakened. |
| Backup and restore | FAIL | `pg_dump` and `pg_restore` are not on `PATH`. The embedded PostgreSQL package has `postgres.exe` and `pg_ctl.exe` and does not include the dump client. The restore drill was not run. |

## Email

| Item | Status | Evidence |
| --- | --- | --- |
| QUEUED, SENT, and FAILED stay distinct | PASS | Acknowledgement, quote, and newsletter rows are created as `QUEUED`. `email.deliver` throws and the job becomes `FAILED`. Nothing in the send path sets `SENT` without a provider response. |
| Provider selected | BLOCKED | D-010 is open. Resend was not selected. |

## Storage

| Item | Status | Evidence |
| --- | --- | --- |
| Upload type and path checks | PASS | The local adapter still rejects `..` and absolute keys, and still limits image and video types. This is the Stage 1 adapter. |
| Production object storage | BLOCKED | D-010 is open. Storage is local disk. |

## Monitoring

| Item | Status | Evidence |
| --- | --- | --- |
| Health endpoint | PASS | Four fields only. It does not report database state or secrets. |
| Production monitoring | BLOCKED | No host is chosen, so no production log drain, uptime check, or error sink is configured. |

## CI/CD

| Item | Status | Evidence |
| --- | --- | --- |
| Workflow file | PASS | `.github/workflows/ci.yml` pins Node `22.23.3` and runs install, format, lint, typecheck, unit tests, schema docs, build, and the migration job. |
| This machine matches CI | FAIL | Local Node is v22.11.0. `.nvmrc` and CI pin 22.23.3. `engines` requires `>=22.13.0 <23`. The local install was not changed. |
| Pull-request CI and branch protection | FAIL | No pull request has run this workflow from this environment. Branch protection is not configured here. Secret scanning is documented in `.github/secret-scanning.md` and is not enabled from this machine. |
| Lockfile | PASS | `package-lock.json` is the install source. `npm audit fix --force` was not run. |

## Content

| Item | Status | Evidence |
| --- | --- | --- |
| Catalog dataset | BLOCKED | D-013 is open. Seed does not invent resorts, islands, reviews, or prices. |
| Offers content | BLOCKED | Staff can enter an offer against a published resort. There is no owner-approved offer to publish. |

## Legal

| Item | Status | Evidence |
| --- | --- | --- |
| Brand and indexing | BLOCKED | D-014. |
| Retention and privacy completion | BLOCKED | D-012. Export and deletion are requests. |
| Review claims | BLOCKED | D-011 for any verified claim. Current labels do not say verified. |

## Domain

| Item | Status | Evidence |
| --- | --- | --- |
| Production domain | BLOCKED | D-014. No domain is cleared. Canonical URLs use the configured site URL. |

## Analytics

| Item | Status | Evidence |
| --- | --- | --- |
| Opt-in behavior | PASS | Non-essential analytics wait for a grant. |
| Launch approval | BLOCKED | D-009 is a launch gate and is still provisional. |

## Operations

| Item | Status | Evidence |
| --- | --- | --- |
| Scheduled publication | PASS | A FAQ inserted as `SCHEDULED` with `scheduled_at` in the past became `PUBLISHED` with `published_at` set after a page view. The promotion does not write an audit row. |
| Single-process limits | BLOCKED | See rate limiting. A production deployment of more than one process is not acceptable on the current limiter. |
| Jobs worker | PASS | Due jobs are claimed with `FOR UPDATE SKIP LOCKED`. A thrown handler marks the job `FAILED` and does not mark an email `SENT`. |

## Support

| Item | Status | Evidence |
| --- | --- | --- |
| Customer support channel | DEFERRED | No separate support desk was in the MVP. Enquiries and the customer message thread are the support path. |
| Quote email and acknowledgement | BLOCKED | Both stay `QUEUED` until D-010 names a provider. |
