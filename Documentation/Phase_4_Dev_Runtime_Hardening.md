# Phase 4 — Development Environment & Runtime Hardening

Scope: F-08 (`scripts/run-dev` development launcher) and related local runtime safety. Phase 1–3 application behaviour is preserved. No schema changes, no marketing redesign, no commit/push/deploy.

## 1. Branch and starting commit

- Branch: `fix/phase-4-dev-runtime-hardening`
- Starting commit: `20d8f6d` ("Merge Phase 3 UX accessibility and performance remediation"), clean working tree.
- Phase 1–3 history present (`5c7499f` … `4d52481` … `20d8f6d`).

## 2. Original F-08 behaviour (audit)

The persona audit reported that `scripts/run-dev.mjs`:

- unconditionally overwrote the repository root `.env`;
- defaulted `AUTH_URL` to `https://xplorer.itnvend.com`;
- referenced a machine-specific path `/home/roon/Desktop/Grinding/maldivexplorer`.

## 3. Verified current behaviour before remediation

Inspected `scripts/run-dev.mjs` on this branch before edits. Confirmed:

| Topic | Pre-remediation behaviour |
| --- | --- |
| Env files read | Process env only (no dotenv load in-script) |
| Env files written | **Root `.env`** and `.data/stage1-browser.env` (full rewrite) |
| Overrides | Forces `DATABASE_URL`, `APP_ENV=local`, default `AUTH_SECRET`, default `AUTH_URL=https://xplorer.itnvend.com`, default `SEED_ADMIN_*` |
| PostgreSQL | Embedded Postgres, persistent under `.data/postgres`, port **54329**, user/password `postgres`/`password`, DB `maldives_stage1` |
| First-run | `initialise` → create DB → migrate deploy → `prisma/seed.ts` → browser staff/discovery → `seed-rich-catalog.ts` |
| Next.js | `next dev --hostname 127.0.0.1 --port 3000` with child env |
| Tunnel | **Always** started HTTP proxy on `127.0.0.1:3100` advertising public domain `https://xplorer.itnvend.com` |
| Team Board | Hardcoded `/home/roon/Desktop/Grinding/maldivexplorer` on port 3200 |
| Cleanup | SIGINT/SIGTERM stops proxy, dashboard, Next, then `pg.stop()`; partial failure path did not always clean owned children |
| Secrets in logs | Connection string with password assembled in memory; seed password written into `.env` files |
| Fixtures / UAT | Did not set `ALLOW_TEST_FIXTURES` / `ENABLE_UAT_QUICK_FILL` (good), but tunnel always exposed the app |

## 4. Files changed

- `scripts/lib/dev-runtime.ts` (new) — pure config helpers
- `scripts/run-dev.ts` (replaces `scripts/run-dev.mjs`) — hardened launcher
- `scripts/start-db.ts` (replaces `scripts/start-db.mjs`) — repo-relative DB start
- `package.json` — `dev:all` → `tsx scripts/run-dev.ts`
- `.env.example` — tunnel / Team Board / port docs and warnings
- `Documentation/Development_Setup.md` — `dev` vs `dev:all`, precedence
- `scripts/lib/dev-lifecycle.ts` — owned process registry, port wait helpers, cleanup
- `eslint.config.mjs` / `tsconfig.json` — `scripts/run-dev.ts` and `scripts/start-db.ts` included in ESLint and `tsc --noEmit`
- `scripts/validate-docs-schema.mjs` — disposable `DATABASE_URL` placeholder when unset
- `src/tests/phase4-dev-runtime.test.ts` / lifecycle coverage
- `Documentation/Phase_4_Dev_Runtime_Hardening.md` (this file)
- `Documentation/Persona_Driven_End_to_End_Audit.md` — Phase 4 status append

## 5. Environment precedence

For `npm run dev:all`, the launcher **consumes `process.env` only** (it does not load `.env` / `.env.local`; a normal shell does not load those files either). Per-variable child-env behaviour:

| Variable | Behaviour |
| --- | --- |
| `DATABASE_URL` | **Launcher-owned** embedded loopback URL (overrides any process value). |
| `AUTH_URL` | Tunnel off: explicit process value wins; else `http://127.0.0.1:{port}`. Tunnel on: require `DEV_TUNNEL_PUBLIC_URL` or a non-loopback `AUTH_URL` (loopback default is never the tunnel origin). |
| `APP_ENV` | Preserved when set; else `local`. |
| `AUTH_SECRET` / `SEED_ADMIN_*` | Preserved when set; else local development defaults. |
| `ALLOW_TEST_FIXTURES` / `ENABLE_UAT_QUICK_FILL` | **Never set by the launcher.** |
| Tunnel / Team Board | Opt-in via `ENABLE_DEV_TUNNEL`, `DEV_TUNNEL_PUBLIC_URL`, `ME_TEAM_BOARD_DIR` / `DEV_TEAM_BOARD_DIR`. |

Generated file written **only** to `.data/stage1-browser.env` (gitignored). Root `.env` is never created or overwritten. Ordinary `npm run dev` is unchanged (Next only; no launcher).

## 6. `.env` handling

| Before | After |
| --- | --- |
| Unconditional `writeFileSync(root/.env, …)` including secrets | Root `.env` never written; byte-for-byte equality asserted after generated write |
| Secrets persisted into tracked-risk path if someone forced-add `.env` | Secrets only in gitignored `.data/stage1-browser.env` for disposable tooling (owner-only mode where POSIX `chmod` applies) |

The launcher does not load `.env` / `.env.local`. Regression test uses sentinel `PHASE4_SENTINEL=do-not-overwrite`.

## 7. AUTH_URL handling

| Before | After |
| --- | --- |
| Default `https://xplorer.itnvend.com` | Default `http://127.0.0.1:{DEV_APP_PORT\|\|3000}` |
| Tunnel assumed that domain | Tunnel requires explicit public origin; loopback AUTH_URL / default rejected for tunnel mode |
| Explicit `AUTH_URL` respected if set | Tunnel off: explicit still wins. Tunnel on: must be a non-loopback public origin (or use `DEV_TUNNEL_PUBLIC_URL`) |

OAuth callback expectations:

- **localhost / loopback:** register `http://127.0.0.1:3000/api/auth/callback/google` (or the configured port).
- **Explicit AUTH_URL (tunnel off):** register that origin’s Auth.js callback path.
- **Tunnel:** set `ENABLE_DEV_TUNNEL=true` and `DEV_TUNNEL_PUBLIC_URL=https://…`; Auth.js must use that public origin. No production domain is invented.

## 8. Machine-path removal

Removed hardcoded `/home/roon/Desktop/Grinding/maldivexplorer`. Optional Team Board path comes only from `ME_TEAM_BOARD_DIR` / `DEV_TEAM_BOARD_DIR` (absolute or repo-relative via `path.resolve`). Repo root uses `import.meta.url` + `fileURLToPath`.

## 9. Tunnel safety

| Before | After |
| --- | --- |
| Proxy always on `:3100` with public domain banner | Proxy starts only when `ENABLE_DEV_TUNNEL=true` |
| Implied Cloudflare host | Requires `DEV_TUNNEL_PUBLIC_URL` or a non-loopback `AUTH_URL`; rejects missing/malformed/loopback |
| Normal `dev:all` was publicly framed | Normal `dev:all` is local-only |

`npm run dev` never starts a tunnel. Fixtures/UAT remain fail-closed; launcher does not set those flags.

## 10. Database safety

- Embedded cluster under `.data/postgres` (repo-relative).
- Listens via embedded-postgres on configured port; launcher documents **127.0.0.1**.
- Refuses to start if DB/app (or tunnel) ports are already in use — **does not kill** other processes.
- Does not point at an arbitrary external `DATABASE_URL` for the embedded cluster (child env gets the embedded URL).
- `test-migrations.mjs` left intact with its disposable `maldives_stage1` guards.

## 11. Port handling

- Defaults: app `3000`, DB `54329`, tunnel proxy `3100`, board `3200`.
- Overrides: `DEV_APP_PORT`, `DEV_DB_PORT`, `DEV_TUNNEL_PROXY_PORT`, `DEV_BOARD_PORT`.
- Preflight `assertPortFree` on loopback; clear error on `EADDRINUSE`.

## 12. Child-process lifecycle

- Owned children tracked via `OwnedProcessRegistry` (`scripts/lib/dev-lifecycle.ts`).
- SIGINT/SIGTERM: stop tunnel proxy / embedded PG resources → signal only registry-owned children → exit.
- Next exit triggers the same cleanup.
- Startup failure path calls cleanup with exit code 1.
- Port conflicts fail clearly; unrelated processes are never killed.

## 13. Cleanup behaviour

- Stops only launcher-owned processes and the embedded PG instance started by this run.
- Does **not** delete `.data/postgres` (persistent local cluster).
- Does **not** delete or rewrite root `.env`.
- Generated `.data/stage1-browser.env` may remain for `dev-disposable` tooling (gitignored).

## 14. Secret / logging behaviour

Safe to print: stage names, local URL, AUTH_URL value when it is a public/local URL the developer configured, DB host/port/name, tunnel on/off, fixture/UAT on/off.

Must not print: passwords, `AUTH_SECRET`, full credentialed `DATABASE_URL`, `SEED_ADMIN_PASSWORD`.

Helpers: `redactConnectionString`, `redactEnvValue`, `safeLauncherSummary`. Live run confirmed no password dump and no `xplorer.itnvend.com`.

## 15. Node-version findings

Already declared consistently:

- `package.json` `engines`: `>=22.13.0 <23`
- `.nvmrc`: `22.23.3`
- `Documentation/Development_Setup.md` documents the same pin

No new conflicting pin added. This remediation machine sometimes ran Node `v22.11.0` (below engines); CI/docs remain authoritative. **Do not leave `NODE_ENV=production` in the shell** when running `npm ci`/`npm test` — it omits devDependencies.

## 16. Tests added

`src/tests/phase4-dev-runtime.test.ts` (Vitest `@vitest-environment node`):

- repo root derivation / no forbidden machine paths / no hardcoded production AUTH domain in launcher sources
- root `.env` sentinel byte-for-byte preservation vs generated `.data` file
- AUTH_URL local default, explicit override, tunnel requires public URL
- Team Board path optional
- secret redaction
- Phase 2 fail-closed fixtures/UAT with unset/`staging`/`production`/`preview`
- launcher does not set fixture/UAT flags by default
- loopback DATABASE_URL; launcher-owned override
- tunnel rejects loopback / malformed public origins
- lifecycle: SIGINT/SIGTERM cleanup, partial startup failure, port release, root `.env` preservation, no kill of unrelated listeners

## 17. Live development check

Controlled `node`/`tsx` launch of the hardened launcher (tunnel off):

- PostgreSQL started; first-run migrate/seed completed when cluster was new
- Summary showed `AUTH_URL: http://127.0.0.1:3000`, tunnel disabled, fixtures hidden, UAT off
- Root `.env` with `PHASE4_SENTINEL=do-not-overwrite` remained **byte-for-byte identical**
- No `xplorer.itnvend.com`, no seed password in stdout
- Process tree terminated afterward; ports cleaned

## 18. Validation results

Supported runtime for this pass: Node `v22.23.3` (`.nvmrc`), npm `10.9.9`. `NODE_ENV` was unset during install/validation.

| Command | Result |
| --- | --- |
| `node --version` / `npm --version` | `v22.23.3` / `10.9.9` |
| `npm ci` | Pass |
| `npx prisma generate` | Pass |
| `npm run typecheck` | Pass (`scripts/run-dev.ts` + `scripts/start-db.ts` included) |
| `npm run lint` | Pass (same files not ESLint-ignored) |
| `npm test` | Pass — **168** tests |
| `npm run docs:validate-schema` | Pass with `DATABASE_URL` unset (script supplies disposable placeholder) |
| `npm run build` | Pass |
| `node scripts/test-migrations.mjs` | Pass |
| `git diff --check` | Pass (CRLF warnings only) |
| Controlled `dev:all` live check | READY on `:3000`; tunnel/fixtures/UAT off; root `.env` byte-equal; ports freed after terminate; no secrets / no `itnvend` in logs |

## 19. Deployment / developer implications

- Prefer `npm run dev` for UI-only work against an already configured DB.
- Prefer `npm run dev:all` for a self-contained local stack; expect first-run seeding to take minutes.
- Public demos require explicit tunnel env vars; register OAuth callbacks for that public origin.
- Do not enable `ALLOW_TEST_FIXTURES` or `ENABLE_UAT_QUICK_FILL` on shared tunnels.
- Keep developer `.env` as the source of personal secrets; the launcher will not clobber it.

## 20. Deferred items

- Changing `siteOrigin()` SEO fallback (`https://xplorer.itnvend.com` when AUTH_URL unset) — application SEO behaviour, outside F-08 launcher scope.
- Removing the optional Team Board multi-app proxy entirely — retained behind opt-in for existing workflows.
- Upgrading Node on every developer machine to `.nvmrc` automatically.
- Broader `run-dev` e2e automation against a throwaway cluster in CI.

## 21. Remaining risks

- Persistent `.data/postgres` still uses a well-known local password; acceptable for disposable local only, not for network exposure.
- If a developer already exported `NODE_ENV=production`, `npm ci` skips devDependencies (observed during this phase); document and avoid.
- External Cloudflare/tunnel binary is still operator-managed; the launcher only provides the local proxy when opted in.
- `siteOrigin` production-style fallback can still affect canonical URLs when AUTH_URL is empty in non-launcher runs.
