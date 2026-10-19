# Stage 0 audit

| Field | Value |
| --- | --- |
| Date | 11 October 2026 |
| Scope | Inspection only. No application code was changed. |
| Ready for Stage 1 | NO |

This audit compares the runnable tree with `Stage_0_Implementation_Report.md`, `Stage_0_Checklist.md`, and the Stage 0 and Stage 1 boundaries in `Implementation_Plan.md`. Stage 1 in that plan is authentication, RBAC, MFA, audit, media upload, and the job worker. Catalog, CRM, and quotes are later stages.

`Database_Design.md` and `Design_System.md` remain documentation contracts. They are not application code.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| 1. No Stage 1 functionality remains | Pass | No sign-in, MFA, audit writer, media upload, or job worker under `src/`. Routes are `/`, `/_not-found`, `/api/health`, and `/robots.txt`. |
| 2. No authentication code remains | Pass | No `src/auth.ts`, `src/middleware.ts`, `src/app/(auth)`, `src/app/api/auth`, or `next-auth` import. `package-lock.json` has no `next-auth`, `otpauth`, or `@node-rs/argon2` entry. |
| 3. No RBAC code remains | Pass | No permission, role, or staff-gate module. The only `role` attributes are `role="alert"` on `FieldError` and `ErrorState`. |
| 4. No CMS code remains | Pass | No admin tree, publish workflow, or media library. |
| 5. No CRM code remains | Pass | No enquiry queue, assignment, task, or note module. |
| 6. No quote module remains | Pass | No quote service, portal, or PDF route. The badge tone `quoted` is the design-system status color from `Design_System.md` §1.3. It is not a quote feature. |
| 7. No Prisma schema remains | Pass for the application | `prisma/` is absent. There is no `schema.prisma` file. The schema fence inside `Documentation/Database_Design.md` is the approved contract, and `scripts/validate-docs-schema.mjs` only validates a temporary copy of that fence. |
| 8. No application database migrations remain | Pass | No `prisma/migrations` directory and no `.sql` files in the repository. |
| 9. No hidden routes remain | Pass | `src/app` contains `page.tsx`, `not-found.tsx`, `error.tsx`, `global-error.tsx`, `robots.ts`, and `api/health/route.ts`. There is no `middleware.ts` and no route group. Generated `.next/types/app` matches those routes. |
| 10. No dead dependencies remain in `package.json` | Pass | Every direct dependency is imported by the shell, the tests, or the documentation schema check. See the dependency table below. |

## Remaining Stage 1 artifacts

No Stage 1 source file remains.

These leftovers are from the earlier skeleton. They are not compiled into the app:

- `.env.local` is present and gitignored. Its keys are `DATABASE_URL` (set), `AUTH_SECRET` (set), and `AUTH_URL` (empty). The values were not read for this audit. The Stage 0 shell does not use them. They are leftover local secrets, not application code.
- `node_modules/@node-rs/.argon2-win32-x64-msvc-jujcyHzJ` is still on disk. `npm prune` did not remove it. `@node-rs/argon2` is not in `package.json` or `package-lock.json`, and `node_modules/next-auth`, `node_modules/@prisma/client`, and `node_modules/otpauth` are absent.

`src/lib/env/schema.ts` still accepts `DATABASE_URL`, `AUTH_SECRET`, and `AUTH_URL` when those names are present. That is reserved-name validation for the Stage 0 checklist. It does not start a session, connect to a database, or enforce a role.

## Dead dependencies

Direct dependencies and where they are used:

| Package | Used by |
| --- | --- |
| `next`, `react`, `react-dom` | Application shell |
| `zod` | `src/lib/env/schema.ts` |
| `@radix-ui/react-slot` | `Button` `asChild` |
| `class-variance-authority` | `Button`, `Badge` |
| `clsx`, `tailwind-merge` | `cn` |
| `lucide-react` | `FieldError`, `ErrorState` |
| `tailwindcss`, `@tailwindcss/postcss` | `src/app/globals.css` |
| `typescript`, `eslint`, `eslint-config-next`, `@eslint/eslintrc`, `eslint-config-prettier`, `prettier` | Quality scripts |
| `vitest`, `happy-dom`, Testing Library, `axe-core` | `src/tests` |
| `@playwright/test` | `tests/smoke.spec.ts` |
| `@types/node`, `@types/react`, `@types/react-dom` | Typecheck |
| `prisma` | `scripts/validate-docs-schema.mjs` only |

`prisma` is not a dead dependency. It is also not an application database client. `@prisma/client` is not installed.

Extraneous folders still under `node_modules`, and not declared in `package.json`:

- `@emnapi/core`, `@emnapi/runtime`, `@emnapi/wasi-threads`
- `@img/sharp-wasm32` and `@img/sharp-win32-x64`
- `@napi-rs/wasm-runtime`
- `@node-rs/.argon2-win32-x64-msvc-jujcyHzJ`
- `@tybys/wasm-util`

A clean `npm ci` in a new directory would not install the argon2 folder. The current `node_modules` directory is not a clean install.

## Orphaned files

These files are in the Stage 0 tree and have no importer:

- `src/lib/observability/log.ts` — `logInfo` and `logError` are unused.
- `src/lib/validation/fields.ts` — `describedBy` is unused.

These directories contain only `.gitkeep`:

- `src/components/patterns`
- `src/modules`

They are reserved placeholders, not product modules.

`next-env.d.ts` is generated. The current `.gitignore` does not ignore it. `.env.local` is ignored by the `.env.*` rule.

## Cleanup recommendations

Do these before Stage 1. This audit did not do them.

1. Clear `DATABASE_URL` and `AUTH_SECRET` in the gitignored `.env.local`, or delete that file. The shell boots with the empty names in `.env.example`.
2. Delete `node_modules` and run `npm ci` so the argon2 binary and the other extraneous folders are gone.
3. Decide whether `src/lib/observability/log.ts` and `src/lib/validation/fields.ts` stay as unused Stage 0 helpers or are removed until a caller exists.
4. Move the local Node version to `22.23.3` so it matches `.nvmrc` and CI. The machine audited here was recorded as `v22.11.0` in the implementation report.
5. Review the 11 npm audit findings from 10 October 2026 without `npm audit fix --force`.
6. Keep `prisma` until the documentation schema check is replaced. Do not add `schema.prisma` or `prisma/migrations` as part of that cleanup.

## Technical debt

- `Documentation/Stage_0_Checklist.md` is not fully signed. Open items include the uncommitted lockfile, the local Node pin, per-environment databases and `AUTH_SECRET`, a pull request that has actually run CI, branch protection, the PostgreSQL integration harness, the Release C ownership harness, preview deployment, and a real `pg_dump` / `pg_restore`.
- `Implementation_Plan.md` says Stage 0 exits when that checklist passes and a preview deployment serves the health check. D-010 is still Provisional, so no preview host exists.
- The checklist still asks the health body to report database `up` or `down`. The authorized Stage 0 health contract omits that field. The box is correctly still open. Do not add a database probe just to tick it.
- Component tests use `happy-dom` because jsdom failed to start on Node `v22.11.0`.
- Tailwind radius utilities are `rounded-sm`, `rounded-md`, and `rounded-lg`. The contract variables remain `--radius-s`, `--radius-m`, and `--radius-l`.
- The repository still has no commits, so the lockfile and the CI workflow are not yet on a branch that GitHub has run.
- `Button` includes the design-system `conversion` variant. No page renders it. That is a primitive, not a trip-planner route.

## Security concerns

- `.env.local` still holds a database URL and an auth secret from the removed skeleton. They are gitignored. They should be cleared before the file is reused, and the auth secret should be treated as retired.
- `GET /api/health` returns only `status`, `application`, `environment`, and `version`. `src/tests/health.test.ts` checks that a database URL and an auth secret passed to the payload builder are not echoed.
- `src/app/robots.ts` disallows all crawlers, and the root metadata sets `noindex, nofollow`.
- `next.config.ts` sets `poweredByHeader: false`. The CI workflow has no deploy step.
- `.github/secret-scanning.md` tells developers to enable GitHub secret scanning and push protection. The repository has no commits and no evidence that those GitHub settings are on.
- The npm audit reported 11 vulnerabilities (1 moderate, 10 high) on 10 October 2026. They were not force-fixed, and this audit did not re-run the audit.
- The leftover argon2 binary is not referenced by source. It should not remain in a working install.

## Ready for Stage 1

NO.

The runnable source does not contain Stage 1 authentication, RBAC, CMS, CRM, quotes, a Prisma schema, or an application migration. That is necessary, and it is not sufficient. Stage 0 exits only when `Documentation/Stage_0_Checklist.md` is signed, including a preview health check, and the local secret file and orphaned install artifacts above are cleaned up. Stage 1 was not started by this audit.
