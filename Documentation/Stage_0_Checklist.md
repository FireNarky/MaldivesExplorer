# Maldives Explorer — Stage 0 checklist

| Field | Value |
| --- | --- |
| Status | Implementation recorded on 10 October 2026. This list is not fully signed. Feature pages stay stopped. |
| Date | 10 October 2026 |
| Release | Release A begins with Stage 0. Stage 0 is not itself a public release. |

A box is complete only when the evidence named on that line exists. Preparing this checklist does not complete Stage 0.

## Repository initialization

- [x] The git repository has a default branch, a readable root README is not required by this gate, and `Documentation/` is the requirements root named in `README_FOR_CURSOR.md`. Evidence: `git branch --show-current` prints `master`. There are no commits yet. `README_FOR_CURSOR.md` names `Documentation/` as the requirements root.
- [x] Application source, if present from an earlier pass, is not treated as feature approval. Evidence: the earlier authentication, MFA, RBAC, CMS, and Prisma application files were removed from the runnable tree on 10 October 2026 and are recorded in `Stage_0_Implementation_Report.md`. They are not Stage 0 features.
- [x] No production migration is added under `prisma/migrations` until this checklist and `Documentation_Correction_Report.md` are reviewed. Evidence: the correction report was accepted, and this Stage 0 authorization still forbids production migrations. `prisma/migrations` is not in the application tree.

## Node and package-manager version

- [x] CI pins a Node 22 release that satisfies `^22.13.0`, because the installed ESLint toolchain rejects Node v22.11.0. Evidence: `.github/workflows/ci.yml` sets `node-version: "22.23.3"`. `.nvmrc` contains `22.23.3`. `package.json` `engines.node` is `>=22.13.0 <23`. GitHub has not executed this workflow.
- [ ] The package manager is npm, with `package-lock.json` committed. `package-lock.json` exists and `packageManager` is `npm@10.9.0`. The file is not committed: `git status` reports `## No commits yet on master`.
- [ ] Local development uses the same Node major and the same lockfile. The machine used for this correction pass is Node v22.11.0 and does not yet meet the pin. Still true on 10 October 2026: `node --version` is `v22.11.0`. `npm install` warned `EBADENGINE`.

## Environment strategy

- [x] Four environments are named: `local`, `preview`, `staging`, `production`. Evidence: `src/lib/env/schema.ts` `appEnvironments`, and `src/tests/env.test.ts` passed on 10 October 2026.
- [x] Staging and preview send `noindex`. Production robots are generated from published records only after launch approval. Evidence: `src/app/robots.ts` disallows `/` for all user agents, and the root metadata sets `robots: { index: false, follow: false }`. A browser check on 10 October 2026 read `<meta name="robots" content="noindex, nofollow">`. Production uses the same noindex response because launch is not approved, so robots are not generated from published records.
- [ ] Each environment has its own database and its own `AUTH_SECRET`. Secrets are not copied from production into preview. No hosted environments exist. D-010 remains Provisional.

## CI checks

- [ ] Pull requests run typecheck, lint, unit tests, and the documentation schema extraction described below. `.github/workflows/ci.yml` defines those steps. No pull request has run. The same commands passed locally on 10 October 2026: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run docs:validate-schema`, `npm run build`, and `npm run test:e2e`.
- [x] CI does not deploy production. Evidence: `.github/workflows/ci.yml` has no deploy step and no production environment.
- [ ] A failing check blocks merge. Branch protection is not configured. There is no remote pull request to prove it.

## Formatting and linting

- [x] Prettier or the agreed formatter is configured and clean on the application tree. Evidence: `.prettierrc.json` and `npm run format:check` exited 0 on 10 October 2026.
- [x] ESLint uses the Next.js TypeScript configuration already chosen for the skeleton, with zero warnings on the gated paths. Evidence: `eslint.config.mjs` extends `next/core-web-vitals` and `next/typescript`. `npm run lint` (`eslint . --max-warnings 0`) exited 0 on 10 October 2026.
- [x] Prisma schema files are formatted with `prisma format` before a migration is reviewed. Evidence: there is no application schema and no migration under review. The schema fence in `Database_Design.md` was formatted during the accepted correction pass. `npm run docs:validate-schema` ran `prisma validate` on that fence and exited 0 on 10 October 2026.

## TypeScript strict configuration

- [x] `strict` is on. Evidence: `tsconfig.json`, and `npm run typecheck` exited 0 on 10 October 2026.
- [x] `noUncheckedIndexedAccess` is on. Evidence: `tsconfig.json`.
- [x] Path alias `@/*` points at the application source. Evidence: `tsconfig.json` maps `@/*` to `./src/*`.

## Test setup

- [x] Unit tests run without a database. Evidence: `npm test` on 10 October 2026 passed 3 files and 5 tests. None open a database connection.
- [ ] Integration tests that need PostgreSQL use an empty disposable database, apply the Prisma migration, then apply the integrity migration. That harness is not in the application. Stage 0 does not add a production migration.
- [ ] The quote-ownership and message-ownership integration tests in `Database_Design.md` §4.9 are part of Release C’s exit, and the harness that can run them exists before that release starts. The harness does not exist yet.

## Secret layout

- [x] `.env.example` lists every required name and contains no live secret. Evidence: the file contains `APP_ENV`, `DATABASE_URL`, `AUTH_SECRET`, and `AUTH_URL`, each with an empty value.
- [x] `.env`, `.env.local`, and other local env files are gitignored. Evidence: `.gitignore` lists `.env`, `.env.local`, and `.env.*.local`.
- [x] Required names for Stage 0 are `DATABASE_URL`, `AUTH_SECRET`, and `AUTH_URL`. Evidence: those names are in `.env.example` and in `src/lib/env/schema.ts`. They are optional for the Stage 0 shell because this stage does not connect to a database or start authentication. `src/tests/env.test.ts` covers a boot with all three absent.
- [x] Email, storage, and bot-defense secrets stay empty until those providers are accepted under D-010. Evidence: `.env.example` does not contain those names, and no provider keys were added.

## Health route

- [x] `GET /api/health` returns HTTP 200 when the process is up. Evidence: Playwright `health returns only public fields` passed on 10 October 2026. A browser request to `http://127.0.0.1:3000/api/health` returned the JSON body below.
- [ ] The body reports the database as `up` or `down` and does not fail the process check solely because the database is down. Not implemented. The Stage 0 authorization requires the body to contain only `status`, `application`, `environment`, and `version`. Dependency status is omitted on purpose. This box stays open.
- [x] The route returns no secrets and no personal data. Evidence: `src/tests/health.test.ts` passed a database URL and an auth secret into the payload builder and asserted those values are absent. The live body was `{"status":"ok","application":"Maldives Explorer","environment":"local","version":"0.1.0"}`.

## Preview deployment

- [ ] A preview URL is produced for the Stage 0 shell. No host is approved. D-010 is Provisional.
- [ ] The preview serves `/api/health`. No preview exists.
- [ ] The preview database is empty of catalog content and is not the production database. No preview database exists.
- [ ] D-010 remains Provisional, so the preview host is temporary until that decision is accepted. D-010 is still Provisional in `Decisions.md`. The host was not chosen.

## Database migration test strategy

- [x] Generate the Prisma migration from `Database_Design.md` against an empty PostgreSQL 16 database. Evidence: `Documentation_Correction_Report.md`, accepted 10 October 2026. `prisma migrate diff` produced 445 statements and the apply had 0 failures on PostgreSQL 16.14. That validation stayed outside the application.
- [x] Apply the integrity SQL from §8 and §9 of that document as the next migration. Evidence: the same report. 121 integrity statements, 0 failures, on the disposable database. It was not written to `prisma/migrations`.
- [x] Run the §6.4 assertion queries and require zero rows. Evidence: the same report. 9 queries, 0 rows.
- [x] Reset the disposable database and apply both migrations again. Evidence: the same report. `maldives_validate` was dropped and both scripts were applied again with 0 failures.
- [ ] Dump and restore that database. Vocabulary rules must survive the restore. See `Documentation/adr/0001-vocabulary-set-constraints.md`. Not done. The correction report states that `pg_dump` and `pg_restore` were not in the embedded PostgreSQL package. The second database was a replay of the SQL, not a dump round-trip.
- [x] Do not drop a constraint to make this list pass. Record the failure and correct the design. Evidence: ADR 0001 replaces the unsupported cross-table vocabulary `CHECK` with triggers after a measured failure. The resort coordinate constraint was removed because resorts have no latitude or longitude; atolls and islands keep the check. Both corrections are in the accepted correction report.

## ADR directory

- [x] Technical decisions live in `Documentation/adr/`. Evidence: `Documentation/adr/0001-vocabulary-set-constraints.md`.
- [x] Each ADR states the context, the decision, and the consequences. Evidence: ADR 0001 has those three sections.
- [x] An ADR does not override `Documentation/Decisions.md`. Evidence: `README_FOR_CURSOR.md` places `Decisions.md` first. ADR 0001 says it is accepted for the database contract and does not record an owner decision.

## Documentation validation

- [x] `README_FOR_CURSOR.md` lists the markdown contracts in the source-of-truth order. Evidence: the precedence section lists `Decisions.md` first, then the suite, then the implementation, database, and design contracts. `Stage_0_Checklist.md` is named as the Stage 0 exit gate.
- [x] `Decisions.md` has a row for every D-001 through D-014. Evidence: the decision table contains D-001 through D-014.
- [x] `Implementation_Plan.md`, `Database_Design.md`, and `Design_System.md` agree on offer validity: the published index does not use `now()` or `current_date`, and the public query does. Evidence: those three files were not changed in this implementation pass. The accepted correction report records that agreement.
- [x] The Prisma schema inside `Database_Design.md` passes `prisma format` and `prisma validate`. Evidence: formatting was completed in the correction pass. `npm run docs:validate-schema` exited 0 on 10 October 2026 with `The schema ... is valid`.
- [x] `Design_System.md` remains the UI contract unless a measured contrast failure requires a correction. Evidence: `Design_System.md` was not modified. No contrast failure was measured against its pairs.
