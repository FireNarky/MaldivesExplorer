# Stage 10.1 — Staging enablement and blocker remediation

| Field | Value |
| --- | --- |
| Date | 17 October 2026 |
| Scope | Staging enablement only. Not a product feature stage. |
| Production | Not deployed. Indexing stays off. |
| Phase 2 | Not started. |

## Verdict

**NOT READY FOR STAGING**

**STAGING NOT VERIFIED**

D-010 is still a provisional staging architecture. This stage does not approve production.

Staging was not deployed. Cloudflare, R2, Resend, Turnstile, Sentry, and a hosted PostgreSQL 16 database were not available. The startup gate would refuse that environment until those values exist. A local test run is not a staging deployment.

## Changes

- Claim, reset, magic-link, and newsletter tokens are minted in memory at send time. Only the SHA-256 hash is stored. A refused send deletes the hash. Migration `20261017000000_stage10_1_staging` deletes existing `claim:` rows and adds `rate_limit_buckets`. The decision is `Documentation/adr/0002-claim-token-delivery.md`.
- Provider boundaries: `MediaStorage`, `EmailProvider`, `RateLimiter`, and `BotProtection`. Domain modules do not call Resend or Cloudflare directly.
- R2, Resend, database rate limiting, Turnstile, and a scrubbed Sentry client are implemented. Local development keeps the local storage, disabled email, memory limiter, and disabled bot adapter.
- Scheduled publication writes `publication.promote` in the same transaction as the status change. The actor recorded on the audit row is `system:publication-scheduler`. `actorId` stays null.
- Public list and error pages keep their own `h1`. `EmptyState` and `ErrorState` stay `h2`.
- Staging requirements, the dependency assessment, and this report were added.

## Security remediation

| Check | Result |
| --- | --- |
| `verification_tokens.token` | SHA-256 hex only. The disposable suite rejected any other shape. |
| `jobs.payload` | No `claim=` and no `token=` after the suite. |
| Audit rows | No `claim=` and no `token=`. |
| Application logs | `logError` and failed job text pass through the scrubber. |
| `GET /api/health` | `{"status":"ok","application":"Maldives Explorer","environment":"local","version":"0.1.0"}`. No token field. |
| Expired or used claim | Redeem deletes the hash. An expired hash is deleted and is not accepted. |
| Existing claim rows | Deleted by the new migration. |

The newsletter confirmation exercise used the capture provider, which is rejected when `APP_ENV` is staging or production. The raw token existed only in that process's memory. The delivery row was `SENT` only after the capture provider returned `capture-N`.

## Node

| Command | Result |
| --- | --- |
| `node --version` | v22.23.3 |
| `npm --version` | 10.9.9 |
| Install | `node_modules` was deleted and `npm ci` completed on that Node version |

`.nvmrc` and CI both pin Node 22.23.3. `package.json` allows `>=22.13.0 <23`.

## Dependencies

`npm audit` after the clean install reported 11 findings: 0 critical, 1 moderate, 10 high. No forced fix was applied. The production-reachable high findings are PostCSS 8.4.31 inside Next.js 15.5.27. They are accepted as a known build-time risk and are not patched without a Next.js 16 upgrade. Prisma was left on 6.16.2. The full record is `Documentation/Dependency_Risk_Assessment.md`.

## Provider adapters

| Boundary | Local | Staging |
| --- | --- | --- |
| Media | `LocalMediaStorage` | `R2MediaStorage` when `MEDIA_STORAGE=r2`. Staging refuses local storage. |
| Email | `DisabledEmailProvider` | `ResendEmailProvider`. Capture is rejected. |
| Rate limit | `MemoryRateLimiter` | `DatabaseRateLimiter`. Memory is rejected. |
| Bot protection | `DisabledBotProtection` | `TurnstileBotProtection`, or a rejecting adapter when the secret is missing. |

## R2

The adapter sends `PutObject`, `GetObject`, and `DeleteObject` to the account endpoint with no public ACL. Keys are rejected when they contain `..`, a backslash, `@`, or an absolute path. Quote PDFs use `quotes/{versionId}.pdf` and are not published, so `/media/{id}` does not serve them. Staff deletion refuses a published asset, deletes the object, then deletes the metadata row.

No R2 upload or read was performed. No bucket was configured.

## Resend

`ResendEmailProvider` posts to `https://api.resend.com/emails` and returns `accepted` only when the response contains an id. `dispatchDelivery` sets `SENT` and `providerId` only after that. A refusal sets `FAILED` and releases any hash minted for that message. Staging recipients must be on `EMAIL_ALLOWLIST`. Marketing and newsletter confirmation to a suppressed or unsubscribed address are marked `SUPPRESSED` before the body is composed.

No request was sent to Resend. The capture provider is the evidence that `SENT` waits for an id.

## Shared rate limit

`exercise-stage10.ts` set `RATE_LIMIT_STORE=database` and observed the first request allowed and the second request refused for a limit of one. The key stored in `rate_limit_buckets` is a SHA-256 hash. Sign-in, MFA, registration, password reset, magic links, planner submissions, newsletter, analytics, and customer messages call this limiter. There is no silent fallback to memory when `APP_ENV` is staging or production.

## Turnstile

The widget renders only when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set. On the disposable server that key was absent, and the sign-in page showed no widget. The server verifies `cf-turnstile-response` with Cloudflare's siteverify endpoint. A failed or missing token does not continue into the protected mutation when the secret is configured. Local development uses the disabled adapter. Turnstile does not replace the rate limits.

No live siteverify call was made.

## Monitoring

`captureError` posts a scrubbed message and an optional correlation id to the Sentry store URL parsed from `SENTRY_DSN`. It does not send passwords, tokens, message bodies, or quote terms. The scrubber redacts `claim=` values, bearer values, and object keys for secrets, tokens, bodies, and terms. Middleware sets `x-correlation-id` on the request and the response. Failed jobs log that id as the job id and store the scrubbed error.

No Sentry project was configured, so no event was delivered. Events intended for capture are unhandled error strings that already reach `logError`: page load failures and failed jobs. Request bodies are not attached.

## PostgreSQL

The disposable suite used embedded PostgreSQL 16.14 on `127.0.0.1:54329`, database `maldives_stage1`, user `postgres`. It applied the init migration, the integrity migration, and `20261017000000_stage10_1_staging`, seeded synthetic data, ran the exercises, dropped the schema, and reapplied the migrations. The user's `.env.local` database was not migrated.

A hosted staging database was not created.

## Backup and restore

Client tools: `pg_dump (PostgreSQL) 16.14` and `pg_restore (PostgreSQL) 16.14` from the PostgreSQL 16.14 Windows binaries.

The source was a new embedded PostgreSQL 16.14 cluster. Migrations and the synthetic seed were applied, then the database was dumped and restored. The exercises were not the restore test. After restore, `scripts/verify-restore.ts` ran against `maldives_restore`.

Commands:

```text
pg_dump --format=custom --no-owner --no-acl --file=<temp>/maldives-stage10-1.dump --dbname=maldives_stage1
pg_restore --no-owner --no-acl --dbname=maldives_restore <temp>/maldives-stage10-1.dump
```

Evidence:

- Restored public tables: 77
- Restored `quote_child_locked` triggers: 2
- Integrity assertion queries returned no rows
- Offer insert with another resort's room type raised `offer room type must belong to the offer resort`
- Update of a sent quote line raised `lines on a sent quote version cannot change`
- Featuring an imported review raised `reviews_featured`
- `readOwnQuote` returned the owner's sent quote and did not return the other customer's quote
- `postOwnMessage` did not add a message to the other customer's enquiry

The dump file and the cluster were deleted after the check. A hosted backup schedule is not configured.

## CI

Pull request: https://github.com/FireNarky/MaldivesExplorer/pull/8

Workflow run: https://github.com/FireNarky/MaldivesExplorer/actions/runs/39055817920

| Job | Result | Link |
| --- | --- | --- |
| verify | Passed in 3m 6s | https://github.com/FireNarky/MaldivesExplorer/actions/runs/39055817920/job/117463455310 |
| migrations | Passed in 1m 50s | https://github.com/FireNarky/MaldivesExplorer/actions/runs/39055817920/job/117463455465 |

The verify job runs `npm ci`, format, lint, typecheck, unit tests, docs schema validation, the production build, and Playwright. The migrations job runs the migration and exercise suite on PostgreSQL 16.

Repository settings were read with `gh` on 17 October 2026. The repository is private. The branch-protection request for `master` returned HTTP 403, "Upgrade to GitHub Pro or make this repository public to enable this feature." Branch protection is not enabled. `security_and_analysis` was null, so secret scanning and push protection are not enabled. A required pull-request review is not configured.

## Accessibility smoke

This is not a WCAG 2.2 AA conformance claim.

| Check | Result |
| --- | --- |
| axe-core on foundation components, including `EmptyState` | Unit test passed. No violations in that render. |
| Keyboard | Playwright: the first tab stop is the skip link. Passed. |
| Reduced motion | Playwright: transition duration no greater than 0.01ms and `scroll-behavior: auto`. Passed. |
| 390px | Playwright homepage did not overflow. The offers page at 390px had one `h1` and `scrollWidth` 390. |
| Empty public lists | `/resorts` and `/offers` on the disposable server each showed one `h1` and an empty-list sentence. `EmptyState` was not the page heading. |

## Regression

On Node v22.23.3 after `npm ci`:

| Check | Result |
| --- | --- |
| `prettier --check` | Passed |
| `eslint . --max-warnings 0` | Passed |
| `tsc --noEmit` | Passed |
| Vitest | 15 files, 61 tests, passed |
| Docs schema validation | Passed |
| `next build` | Passed. Shared first-load JavaScript 103 kB. |
| Migration and exercise suite | Passed, including the new Stage 10.1 exercise |
| Playwright smoke | 5 passed |

The exercise scripts that passed cover publication and discovery data, search and offers, wishlist, the planner enquiry and its claim job, portal ownership, CRM, quote approval and sent-version immutability, quote PDF storage, quote response, reviews, newsletter confirmation and suppression, reporting, and the new claim-token, rate-limit, and publication-audit checks. Redirects and staff MFA were not re-run in a browser in this stage. Their earlier implementation was not removed. Unit tests still cover the access matrix, MFA secret storage, quote approval, and discovery contracts.

## Remaining blockers

1. No staging hostname, Cloudflare zone, WAF, or TLS deployment.
2. No separate hosted PostgreSQL 16 database or staging credentials.
3. No R2 bucket, Resend key, Turnstile keys, or Sentry project.
4. Shared rate limiting is implemented but has no staging database to run in.
5. PostCSS high advisories remain inside Next.js 15.5.27. Accepted as a known build-time risk. Not a production approval.
6. D-012 retention and D-014 indexing remain open. Indexing stays disabled.
7. Branch protection, required checks, secret scanning, and push protection are not enabled on this private repository. GitHub returned HTTP 403 for branch protection and a null security-analysis payload.

## D-010

The preferred staging architecture is compatible with the application boundaries that were added: Auth.js and Prisma stay in the app, PostgreSQL holds both product data and the shared rate-limit buckets, jobs and PDF generation do not call a vendor SDK directly, media and email go through adapters, and Turnstile is an additional check. That compatibility was proved with local adapters and a disposable PostgreSQL 16.14 cluster.

It was not proved on Cloudflare's runtime, R2, Resend, Turnstile, or a managed database. D-010 therefore stays provisional. Successful local tests are not production approval.

**NOT READY FOR STAGING**

**STAGING NOT VERIFIED**
