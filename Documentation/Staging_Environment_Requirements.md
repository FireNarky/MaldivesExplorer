# Staging environment requirements

| Field | Value |
| --- | --- |
| Date | 17 October 2026 |
| Decision | D-010 is provisional for staging only. A working staging environment is not production approval. |
| Deployment | Not deployed. The credentials and hosted services below were not available on 17 October 2026. |

Status values:

- **REQUIRED** — staging must not start without it.
- **OPTIONAL** — useful, and startup is allowed while it is absent.
- **NOT YET CONFIGURED** — no credential or hosted service was available for this stage.

## Architecture

| Piece | Status | Notes |
| --- | --- | --- |
| Cloudflare DNS, CDN, and WAF | REQUIRED, NOT YET CONFIGURED | No zone, proxy, or WAF policy was created. |
| Cloudflare-compatible Next.js runtime | REQUIRED, NOT YET CONFIGURED | The application remains a Node.js Next.js server. No staging hostname was deployed. |
| Cloudflare R2 | REQUIRED, NOT YET CONFIGURED | `R2MediaStorage` is implemented. No bucket or key was supplied. |
| Cloudflare Turnstile | REQUIRED, NOT YET CONFIGURED | `TurnstileBotProtection` is implemented. No site key or secret was supplied. |
| Managed PostgreSQL 16 | REQUIRED, NOT YET CONFIGURED | Local disposable clusters were used for tests. They are not the staging database. |
| Resend | REQUIRED, NOT YET CONFIGURED | `ResendEmailProvider` is implemented. No API key was supplied. |
| GitHub Actions | REQUIRED | `.github/workflows/ci.yml` runs on pull requests and on pushes to `master`. Whether branch protection is enabled is a repository setting and is recorded only after it is verified. |
| Sentry or equivalent | OPTIONAL, NOT YET CONFIGURED | `SENTRY_DSN` is not required for the startup gate. No project was created. |
| Shared rate limiting | REQUIRED | `DatabaseRateLimiter` uses PostgreSQL. Staging startup refuses `RATE_LIMIT_STORE=memory`. The staging database that would hold the buckets is NOT YET CONFIGURED. |
| Workers and jobs | REQUIRED | The existing job worker is the staging worker. It is not deployed. |

`src/instrumentation.ts` refuses to start when `APP_ENV` is `staging` or `production` and any required value below is missing or wrong. Local and test runs do not use that gate.

## Environment variables

| Name | Status | Purpose |
| --- | --- | --- |
| `APP_ENV` | REQUIRED | Must be `staging` for the staging gate. Local development leaves it unset or `local`. |
| `DATABASE_URL` | REQUIRED, NOT YET CONFIGURED | Separate staging database. TLS when the provider supports it. |
| `AUTH_SECRET` | REQUIRED, NOT YET CONFIGURED | At least 32 characters. Must not be the local or production secret. |
| `AUTH_URL` | REQUIRED, NOT YET CONFIGURED | Public staging origin. |
| `MEDIA_STORAGE` | REQUIRED | Must be `r2` in staging. |
| `RATE_LIMIT_STORE` | REQUIRED | Must not be `memory`. Unset selects the database limiter when `APP_ENV` is staging. |
| `EMAIL_PROVIDER` | REQUIRED | Must be `resend`. `capture` is rejected. |
| `EMAIL_FROM` | REQUIRED, NOT YET CONFIGURED | Verified staging sender. |
| `EMAIL_ALLOWLIST` | REQUIRED, NOT YET CONFIGURED | Comma-separated recipients. Any other address fails before the provider is called. |
| `RESEND_API_KEY` | REQUIRED, NOT YET CONFIGURED | Server only. |
| `R2_ACCOUNT_ID` | REQUIRED, NOT YET CONFIGURED | Server only. |
| `R2_ACCESS_KEY_ID` | REQUIRED, NOT YET CONFIGURED | Server only. |
| `R2_SECRET_ACCESS_KEY` | REQUIRED, NOT YET CONFIGURED | Server only. |
| `R2_BUCKET` | REQUIRED, NOT YET CONFIGURED | Private staging bucket. |
| `TURNSTILE_SECRET_KEY` | REQUIRED, NOT YET CONFIGURED | Server only. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | REQUIRED, NOT YET CONFIGURED | Public site key. The widget is omitted when this is empty, which is correct for local development and not correct for staging. |
| `SENTRY_DSN` | OPTIONAL, NOT YET CONFIGURED | Error events are scrubbed before they are sent. |
| `MEDIA_STORAGE_PATH` | OPTIONAL | Local development only. Ignored when storage is R2. |
| `SEED_ADMIN_EMAIL` | REQUIRED for a synthetic seed, NOT YET CONFIGURED | Use an example address, not a customer address. |
| `SEED_ADMIN_PASSWORD` | REQUIRED for a synthetic seed, NOT YET CONFIGURED | Generated for the staging seed. Not a shared password. |

## Database

| Requirement | Status |
| --- | --- |
| PostgreSQL 16 | REQUIRED |
| Separate database from local and production | REQUIRED, NOT YET CONFIGURED |
| Separate credentials | REQUIRED, NOT YET CONFIGURED |
| TLS where the provider supports it | REQUIRED, NOT YET CONFIGURED |
| Migrations, including `20261017000000_stage10_1_staging` | REQUIRED. Proven on a disposable cluster, not on a hosted staging database. |
| Synthetic or test data only | REQUIRED, NOT YET CONFIGURED |

## Object storage

| Requirement | Status |
| --- | --- |
| Private R2 bucket | REQUIRED, NOT YET CONFIGURED |
| No public bucket listing | REQUIRED. The adapter does not grant a public ACL. |
| MIME allowlist and size limits stay in the application | REQUIRED. Implemented for staff uploads. |
| Object keys are storage ids, not names or email addresses | REQUIRED. Implemented. |
| Quote PDFs stay out of the public media route | REQUIRED. They are stored as draft documents. |
| Deletion removes the object and then the database row, and refuses a published row | REQUIRED. Implemented. |

## Email

| Requirement | Status |
| --- | --- |
| Resend behind `EmailProvider` | REQUIRED. Implemented, NOT YET CONFIGURED |
| `SENT` only after a provider message id | REQUIRED. Implemented |
| Allowlist so a test cannot mail an arbitrary customer | REQUIRED, NOT YET CONFIGURED |
| Marketing suppression before the provider is called | REQUIRED. Implemented |
| Enquiry acknowledgement, magic link, password reset, quote sent, newsletter confirmation | REQUIRED. Wired. Not delivered through Resend. |

## Abuse controls

| Requirement | Status |
| --- | --- |
| Shared rate limit for sign-in, MFA, planner, newsletter, analytics, messages, password reset, and magic links | REQUIRED. Implemented on the database limiter. |
| Turnstile on sign-in, registration, password reset, magic link, planner submit, and newsletter | REQUIRED, NOT YET CONFIGURED |
| Turnstile is not the only control | REQUIRED. Rate limits and the honeypot remain. |

## DNS, TLS, and indexing

| Requirement | Status |
| --- | --- |
| Staging hostname and TLS certificate | REQUIRED, NOT YET CONFIGURED |
| Cloudflare proxy and WAF | REQUIRED, NOT YET CONFIGURED |
| `noindex` and `robots.txt` disallow | REQUIRED. Implemented in the application. Do not turn indexing on. |

## Operations

| Requirement | Status |
| --- | --- |
| Backup with `pg_dump` and restore with `pg_restore` | REQUIRED. Proven on a disposable PostgreSQL 16.14 cluster. A hosted staging backup schedule is NOT YET CONFIGURED. |
| Error monitoring | OPTIONAL, NOT YET CONFIGURED |
| Logs must not contain passwords, raw tokens, message bodies, or quote terms | REQUIRED. The log scrubber and job error scrubber are implemented. A hosted log drain is NOT YET CONFIGURED. |
| Separate secrets, database, storage, and email from production | REQUIRED, NOT YET CONFIGURED |
| No production customer data | REQUIRED |
