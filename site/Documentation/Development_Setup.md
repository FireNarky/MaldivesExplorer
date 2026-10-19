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

`APP_ENV` accepts `local`, `preview`, `staging`, or `production`. An empty value is treated as `local`. `DATABASE_URL`, `AUTH_SECRET`, and `AUTH_URL` are reserved names. The Stage 0 shell does not connect to a database and does not start authentication, so those values are not required to boot.

Do not put real secrets in `.env.example`. `.env`, `.env.local`, and `.env.*.local` are gitignored. See `.github/secret-scanning.md`.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the development server. |
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
- `npm run docs:validate-schema` only checks the documented schema. It does not need `DATABASE_URL`.
- `npm audit` reported 11 vulnerabilities (1 moderate, 10 high) on 10 October 2026. Do not run `npm audit fix --force` as part of Stage 0. Review advisory changes separately.
