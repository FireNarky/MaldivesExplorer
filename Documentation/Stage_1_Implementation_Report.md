# Stage 1 implementation report

| Field | Value |
| --- | --- |
| Date | 11 October 2026 |
| Scope | Stage 1 foundation only |
| Exit | Foundation is implemented and checked. Do not start Stage 2. |

## Result

Authentication, RBAC, staff MFA, audit logging, media storage, background jobs, the database contract, and domain scaffolds are in the application. No resort, offer, destination, experience, search, wishlist, planner, CRM, quote, newsletter, or review feature was built. Those domain folders exist only as scaffolds.

## Authentication and access

Customer sign-in is email and password. A second customer method queues an email magic link. Staff password sign-in does not create a session. It sets a short-lived HTTP-only `mfa_challenge` cookie and continues at `/login/mfa`. Staff without a TOTP factor enroll there; the authenticator key is shown as text. A valid code creates the session and stores the encrypted factor. Every staff role requires TOTP.

Auth.js is `next-auth` 5.0.0-beta.32 with the Credentials provider. Credentials cannot use the Auth.js database session strategy, so the browser cookie is a JWT whose only server identifier is `sessions.session_token`. The cookie is HTTP-only, `SameSite=Lax`, and `Secure` when `APP_ENV` is `production`. Revocation is the `sessions.revoked_at` column. Sign-out sets it. A role change sets it for that user's open sessions and writes an audit row. Staff session rows expire after 12 hours. Customer session rows expire after 30 days. The JWT lifetime is only the cookie ceiling; the session callback rejects a revoked, expired, or non-active row.

Passwords use Argon2id (memory cost 19456, time cost 2, parallelism 1) and must be at least 12 characters. Password reset and magic-link tokens are stored as SHA-256 hashes. The raw token is not put in the job payload. Magic links are refused for staff. The response does not say whether the address exists. Sign-in attempts are limited to 5 per email per 15 minutes inside the current server process.

`AUTH_SECRET` must be at least 32 characters before auth initializes. Health still starts when it is absent.

## Audit, media, and jobs

`writeAudit` inserts `audit_logs` with a correlation id. Role assignment is the first caller: action `user.role.assign`.

Media storage is a local adapter. The root is `MEDIA_STORAGE_PATH` or `.data/media`. Keys that contain `..` or are absolute are rejected. Images are JPEG, PNG, or WebP up to 15 MB. Video is MP4 or WebM up to 200 MB. Other types are rejected. `POST /api/media` requires `media.write` and stores a `DRAFT` asset. `GET /api/media` requires `media.read`. This is not Cloudflare R2. D-010 is still provisional, so no storage vendor is hard-wired.

Jobs live in PostgreSQL. A worker claims due `PENDING` rows with `FOR UPDATE SKIP LOCKED`. `email.deliver` throws `Email delivery is not configured.` and the worker marks the job `FAILED`. No mail provider is configured.

## Database

`prisma/schema.prisma` is the contract from `Documentation/Database_Design.md` §7. The datasource enables `pgcrypto`, `citext`, and `pg_trgm`.

| Migration | Contents |
| --- | --- |
| `20261011000000_init` | Schema from §7. Extensions are created before `citext` columns. |
| `20261011010000_integrity` | §8 and §9 in order: functions, checks, triggers, partial and GIN indexes, generated `search_vector` columns, `customer_visible_notes`, `enquiry_reference_seq`, `quote_reference_seq`. |

The integrity file records the rollback note. Dropping that migration removes the triggers, checks, generated columns, indexes, view, and sequences. Dropping the initial migration drops the schema. Production rollback restores a backup.

`npm run test:migrations` applies both migrations to an empty database named `maldives_stage1` on localhost. Locally that database is embedded PostgreSQL 16.14 on port 54329. The script does not read `.env.local`. In CI the same script uses the workflow's PostgreSQL 16 service. It then seeds, runs the exercise, drops `public`, and applies both migrations again.

The exercise confirmed:

- Every assertion query in §6.4 returned zero rows, including the same missing-target shape for content relations, media links, and attachments.
- An offer whose room type belongs to another resort was rejected with `offer room type must belong to the offer resort`.
- After `sent_at` was set, a quote line update was rejected with `lines on a sent quote version cannot change`.
- A status change to `EXPIRED` was accepted.
- Assigning `CONSULTANT` wrote `user.role.assign` and revoked the user's open session.
- The queued `email.deliver` job finished `FAILED` with `Email delivery is not configured.`
- Both migrations applied again after `public` was dropped.

The seed is idempotent and skips the administrator when `NODE_ENV` is `production`. It writes permissions, roles, the role matrix, vocabulary, audience tags, experience-category taxonomy, one active SLA, settings, disabled feature flags, and empty draft email templates. It writes an administrator only when both `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are set, with no MFA factor. It does not write atolls, islands, resorts, rooms, offers, articles, reviews, awards, media, enquiries, quotes, customers, or subscribers.

## Domain modules

Identity, audit, and media are implemented. These folders export `moduleStatus = "scaffold"` and do not implement product behavior: catalog, destinations, experiences, offers, content, search, customers, wishlist, enquiries, crm, quotes, communications, analytics, admin. Consultant `customer.read` still does not open a customer table. That object scope belongs to a later service.

## Routes

| Route | Behavior |
| --- | --- |
| `/login` | Password sign-in and magic-link queue |
| `/login/mfa` | Staff TOTP enroll or verify |
| `/register` | Customer account. `emailVerifiedAt` stays null because mail is not configured |
| `/forgot-password` | Queues a reset token |
| `/admin` | Staff foundation only. Redirects to `/login` without a staff session |
| `/api/auth/[...nextauth]` | Auth.js handlers, or 503 when auth is not configured |
| `/api/media` | Guarded upload and read |
| `/api/health` | Unchanged: `status`, `application`, `environment`, `version` |

The header shows Sign in, or Sign out, and a Staff link only for a staff session. Search and Plan controls were not added. The uncleared descriptor is not published.

## Checks

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| `eslint . --max-warnings 0` | Passed |
| `vitest run` | 10 tests passed |
| `npm run test:migrations` | Passed, including drop and reapply |
| `npm run build` | Passed |
| Playwright smoke | 4 tests passed |
| `docs:validate-schema` | Passed |

Browser checks against a disposable database:

- A wrong password stays on `/login` with “Those details do not match.”
- The seeded administrator reached `/login/mfa`, enrolled TOTP, and landed on `/admin` with a Staff link.
- Sign-out returned to the home page.
- `/admin` without a session redirected to `/login`.
- Customer registration signed in and did not show the Staff link.
- A magic-link request showed the generic queued message, stored one hashed token, and the worker marked `email.deliver` failed.
- Health returned only the four public fields.
- `POST /api/media` without a session returned 401.
- An authorized image write created a `DRAFT` `IMAGE` asset on disk. A text file was rejected.
- Resort count on that database was 0 before the image write. The disposable cluster was then stopped.

Local Node is v22.11.0. The CI pin remains 22.23.3, and `package.json` requires Node `>=22.13.0 <23`. The checks above ran on the local runtime.

## Still outside this stage

Stage 0 checklist items that were already open remain open: preview, branch protection, and a production `pg_dump` drill. Email delivery and object storage stay unconfigured while D-010 is provisional. The sign-in rate limit is per process. This work is not committed.

## Stop

Stage 2 has not been started. Waiting for approval.
