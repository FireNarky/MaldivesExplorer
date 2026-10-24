# Development setup

Stage 0 is the application foundation. It does not include accounts, catalog pages, or a database migration.

## Prerequisites

- Node.js `22.23.3`. The acceptable range is `>=22.13.0 <23`, which is the range in `package.json` and the pin in `.nvmrc` and `.github/workflows/ci.yml`.
- npm `10.9.0`, named in `package.json` as `packageManager`.
- A Chromium browser for Playwright. `npx playwright install chromium` downloads it.

The machine that produced the Stage 0 report was Node `v22.11.0`. That version is below the pin. `npm install` prints `EBADENGINE` there. Use `22.23.3` before treating a local run as the same as CI.

## Install

```bash
npm ci
npx playwright install chromium
```

`npm ci` installs from `package-lock.json`. Do not use `npm install` to refresh the lockfile unless a dependency change is intentional.

## Environment

Copy the names from `.env.example`. Leave the values empty for the Stage 0 shell.

```text
APP_ENV=
DATABASE_URL=
AUTH_SECRET=
AUTH_URL=
```

`APP_ENV` accepts `local`, `preview`, `staging`, or `production`. An empty value is treated as `local` for ordinary app parsing. Security-sensitive gates (`ALLOW_TEST_FIXTURES`, `ENABLE_UAT_QUICK_FILL`) require `APP_ENV` to be set to exactly `local` — unset or empty does **not** count. `DATABASE_URL`, `AUTH_SECRET`, and `AUTH_URL` are reserved names.

### Environment precedence for `npm run dev:all`

The launcher (`scripts/run-dev.ts`) **consumes `process.env` only**. It does **not** load `.env` or `.env.local`. A normal shell also does not load those files automatically — export variables yourself, or rely on Next.js loading dotenv after it starts (separate from the launcher). The launcher never creates, rewrites, normalizes, or reformats the repository root `.env`.

Per-variable behaviour for the **child** environment passed to PostgreSQL tools and Next.js:

| Variable | Precedence |
| --- | --- |
| `DATABASE_URL` | **Launcher-owned** for the embedded local database. Always set to the loopback embedded URL for this run (any existing process value is overridden). |
| `AUTH_URL` | When tunnel is off: explicit `AUTH_URL` in `process.env` wins; otherwise `http://127.0.0.1:{DEV_APP_PORT\|\|3000}`. When `ENABLE_DEV_TUNNEL=true`: `DEV_TUNNEL_PUBLIC_URL` (preferred) or a **non-loopback** `AUTH_URL` is required; the loopback default is never used as the tunnel origin. |
| `APP_ENV` | Existing process value preserved when set; otherwise defaults to `local`. |
| `AUTH_SECRET` | Existing process value preserved when set; otherwise a local development default. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Existing process values preserved when set; otherwise local development defaults. |
| `ALLOW_TEST_FIXTURES` / `ENABLE_UAT_QUICK_FILL` | **Never set by the launcher.** Fail-closed unless already present in `process.env` (and still require `APP_ENV=local` in the app). |
| `ENABLE_DEV_TUNNEL` / `DEV_TUNNEL_PUBLIC_URL` / `ME_TEAM_BOARD_DIR` | Read from `process.env` only; tunnel and Team Board remain opt-in. |

A generated copy of the child env is written only to `.data/stage1-browser.env` (covered by the `.data/` gitignore entry; owner-only permissions where the OS supports POSIX modes). Optional Team Board: `ME_TEAM_BOARD_DIR` (repo-relative or absolute). No hardcoded personal path. No production tunnel domain is assumed.

Do not put real secrets in `.env.example`. `.env`, `.env.local`, and `.env.*.local` are gitignored. See `.github/secret-scanning.md`. Never commit `SEED_ADMIN_PASSWORD` or enable fixture/UAT flags on shared or public environments.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the Next.js development server only (local). Does not start PostgreSQL, seed data, or any tunnel. |
| `npm run dev:all` | Local launcher (`scripts/run-dev.ts`): embedded PostgreSQL under `.data/postgres`, first-run migrate/seed, then Next.js on `127.0.0.1:3000`. **Does not overwrite** the repository root `.env`. Writes only `.data/stage1-browser.env`. Defaults `AUTH_URL` to `http://127.0.0.1:3000`. Public tunnel proxy requires `ENABLE_DEV_TUNNEL=true` and `DEV_TUNNEL_PUBLIC_URL` (or an explicit `AUTH_URL`). Does **not** set `ALLOW_TEST_FIXTURES` or `ENABLE_UAT_QUICK_FILL`. |
| `npm run build` | Builds the production application. |
| `npm run start` | Serves the production build. |
| `npm run format` | Writes Prettier formatting. |
| `npm run format:check` | Checks formatting without writing. |
| `npm test` | Runs Vitest unit and component tests. |
| `npm run test:e2e` | Runs the Playwright smoke tests. Build first, because the smoke server uses `npm run start`. |
| `npm run lint` | Runs ESLint with zero warnings allowed. |
| `npm run typecheck` | Runs `tsc --noEmit`. |
| `npm run docs:validate-schema` | Extracts the Prisma schema from `Documentation/Database_Design.md` and runs `prisma validate`. It does not migrate a database. |

## Folders

| Path | Purpose |
| --- | --- |
| `src/app` | App Router routes, the shell, and global styles. |
| `src/components/ui` | Primitive controls. |
| `src/components/patterns` | Reserved for later product patterns. Empty in Stage 0. |
| `src/components/layout` | Header and footer structure. |
| `src/modules` | Reserved for later product modules. Empty in Stage 0. |
| `src/lib/env` | Environment-variable parsing. |
| `src/lib/observability` | Log helpers that accept a message string only. |
| `src/lib/validation` | Small field helpers. |
| `src/tests` | Vitest tests. |
| `tests` | Playwright smoke tests. |
| `Documentation` | Requirements, decisions, and this setup note. |
| `Documentation/adr` | Technical decision records. They do not override `Decisions.md`. |

## Troubleshooting

- `EBADENGINE` during install means the local Node version is outside `>=22.13.0 <23`. Switch to `22.23.3` and run `npm ci` again.
- `GET /api/health` returns 500 when `APP_ENV` is not one of the four names, or when a non-empty `AUTH_URL` is not a URL. Empty values are valid.
- Playwright reports a connection error when port 3000 is already taken or the production build is missing. Stop the other process, run `npm run build`, then `npm run test:e2e`.
- `npm run docs:validate-schema` only checks the documented schema fence. It does not migrate or connect to a database. Prisma still requires a `DATABASE_URL` name during `prisma validate`; when unset, the script supplies a disposable placeholder for that process only (it does not read or write root `.env`).
- `npm audit` reported 11 vulnerabilities (1 moderate, 10 high) on 10 October 2026. Do not run `npm audit fix --force` as part of Stage 0. Review advisory changes separately.
