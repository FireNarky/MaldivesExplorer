# Maldives Explorer — Controlled Project Takeover, Baseline Verification, Gap Audit, and Safe Remediation Report

| Field | Value |
| --- | --- |
| Date | 30 October 2026 |
| Authoritative Baseline Commit | `659c15989856e318a2db0420d9adfff9a9482b41` (`main`, `origin/main`, `origin/master`) |
| Historical Phase 4 Checkpoint | `3748418cf599c5ce12f4061ec0ff98344dd348ff` (local `master` before fast-forward; ancestor of `659c159`) |
| Working Branch | `audit/takeover-production-readiness` |

---

## 1. Authoritative Git Baseline & `3748418` Resolution

- **Initial checked-out branch**: `main`
- **Initial working tree status**: Clean (`git status --short` returned empty)
- **Authoritative branch commit tips at takeover**:
  - `main` (local): `659c15989856e318a2db0420d9adfff9a9482b41` (`feat(ui): position concierge chat at bottom right and make theme float draggable`)
  - `origin/main`: `659c15989856e318a2db0420d9adfff9a9482b41`
  - `origin/master`: `659c15989856e318a2db0420d9adfff9a9482b41`
  - `master` (local): `3748418cf599c5ce12f4061ec0ff98344dd348ff` (`Merge Phase 4 development runtime hardening`)
- **Divergence & ancestry matrix**:
  - `main...origin/main`: `0 0` (identical)
  - `origin/main...origin/master`: `0 0` (remotes are already synchronized at `659c15989856e318a2db0420d9adfff9a9482b41`)
  - `main...master` (local): `9 0` (`main` is 9 commits ahead of local `master`; `git merge-base main master` is `3748418cf599c5ce12f4061ec0ff98344dd348ff`)
  - `master...origin/master`: `0 9` (local `master` simply had not been fast-forwarded to `origin/master` after the 9 UI/design/documentation commits between `3748418` and `659c159`)
- **Historical branches**:
  - `audit/post-phase4-e2e`, `cursor/*`, `feat/*`, `fix/*`, and `remediation/phase-*` are historical checkpoints behind `main`/`origin/master` and were left untouched per repository branch policy.
  - Only `cursor/stage-10-1-staging-enablement` (`2de04ac`, branched from `c069c34`) contains 3 unmerged experimental Stage 10.1 staging-adapter commits; per `D-010` and `Stage_10_Release_Hardening_Report.md`, provider/host selection remains an open owner decision, so this branch was not merged.

---

## 2. Machine-Verified Repository Inventory

| Metric | Previous Summary Claim | Machine-Verified Value | Verification Source |
| --- | --- | --- | --- |
| Node.js version (local) | `v22.11.0` | `v22.11.0` (`.nvmrc`: `22.23.3`, `engines.node`: `>=22.13.0 <23`) | `node -v`, `.nvmrc`, `package.json` |
| npm / `packageManager` | `10.9.0` | `10.9.0` / `"npm@10.9.0"` | `npm -v`, `package.json` |
| `src/modules` directories | 20 (with 24 listed) | **24** (`admin`, `analytics`, `audit`, `catalog`, `communications`, `compare`, `contact`, `content`, `crm`, `customers`, `destinations`, `discovery`, `enquiries`, `experiences`, `identity`, `media`, `newsletter`, `offers`, `publishing`, `quotes`, `redirects`, `reviews`, `search`, `wishlist`) | `Get-ChildItem src/modules -Directory` |
| Vitest test files | 17 | **18** at baseline (**19** after adding `src/tests/takeover-remediation.test.tsx`, plus `src/tests/setup.ts`) | `Get-ChildItem src/tests/*.test.*` |
| Vitest test cases | 168 | **168** at baseline (**180** after adding 12 takeover regression tests) | `npx vitest run` |
| Prisma models | 70 | **75** | `prisma/schema.prisma` (`^model `) |
| Prisma enums | 28 | **37** | `prisma/schema.prisma` (`^enum `) |
| Prisma migrations | 2 | **2** (`20261011000000_init`, `20261011010000_integrity`) + `prisma/integrity.sql` | `prisma/migrations/` |
| Page routes (`src/app/**/page.tsx`) | 51 | **52** (including `/map`) | `Get-ChildItem src/app -Recurse -Filter page.tsx` |
| Route handlers (`src/app/**/route.ts`) | 31 | **31** (`30` under `src/app/api/**` + `1` at `src/app/media/[id]/route.ts`) | `Get-ChildItem src/app -Recurse -Filter route.ts` |

---

## 3. Gap Audit & Remediated Software Defects

All findings below were verified against executable code and live browser/runtime inspection on `audit/takeover-production-readiness`:

| ID | Severity | Category | Location | Defect Summary | Remediation Applied |
| --- | --- | --- | --- | --- | --- |
| `F-TAKEOVER-01` | `P1` | Software defect (`D-003` SLA contract & channel gating) | `src/components/contact/contact-form.tsx`, `src/app/contact/page.tsx` | Commit `ea2321e` reintroduced a public promise (`"Written response delivered to {email} within 2 business hours."`) in `ContactForm`, violating `D-003` (*"A 2-business-hour first-response target is measured inside the CRM and is not a public promise"*). Additionally, `src/app/contact/page.tsx` passed `settings.whatsappNumber` to `ContactForm` unconditionally without checking `active.whatsapp` (`settings.whatsappEnabled`). | Replaced the 2-hour SLA promise with neutral copy (`"Our team will review your request and send a written response to {email}."`) and gated `whatsappNumber` on `active.whatsapp ? settings.whatsappNumber : undefined`. |
| `F-TAKEOVER-02` | `P1` | Software defect (`D-013` content integrity & `Design_System.md` §4.4 / §7.2 `MapWithList` accessibility) | `src/app/map/page.tsx`, `src/components/map/archipelago-3d-map.tsx`, `src/app/destinations/page.tsx`, `src/components/patterns/destination-card.tsx` | Commit `a36bf54` added `/map` and `Archipelago3DMap` with hardcoded unverified transfer durations (`"35 min TMA Seaplane"`, `"45 min Luxury Yacht"`, `"30–45 minute scenic flights"`, `"day and night"`), contradicting `D-013`, `seed-rich-catalog.ts`, and `/resorts/[slug]` (`"Transfer details have not been published for this resort."`). `/destinations` and `DestinationCard` also hardcoded `"35m Avg Seaplane"` and per-atoll transfer durations (`"30m Seaplane"`, `"25–45m Speedboat"`, etc.). Moreover, `/map` lacked a keyboard-accessible `MapWithList` fallback (`Design_System.md` §4.4 & §7.2) and had 3 icon-only map controls without `aria-label`. | Removed all unverified transfer duration claims from `RESORTS_DATA`, `/map`, `/destinations`, and `DestinationCard`; wired `/map` to query published resorts and atolls via `publishedPublic()` with structured transfer durations shown only when recorded in `resort.transfers`; added the accessible `Published Archipelago Directory` (`MapWithList`) section in tab order; and added `aria-label` + `aria-pressed` + `size-9` touch targets to map controls. |
| `F-TAKEOVER-03` | `P1` | Software defect (Windows cross-platform test & runtime failure) | `scripts/lib/dev-runtime.ts` | `resolveRepoRoot(fromUrl)` called `fileURLToPath(fromUrl)` directly, throwing `TypeError [ERR_INVALID_FILE_URL_PATH]: File URL path must be absolute` on Windows (`win32`) when passed a synthetic drive-less POSIX URL (`file:///opt/ci/repo/scripts/lib/dev-runtime.ts`), causing `src/tests/phase4-dev-runtime.test.ts` to fail on Windows. | Added a safe `win32` fallback in `resolveRepoRoot` for drive-less POSIX `file:///` URLs so both Windows and POSIX resolve `path.resolve("/opt/ci/repo")` identically. |
| `F-TAKEOVER-04` | `P2` | Software defect (Formatting gate & CRLF/LF drift) | `.gitattributes`, `.prettierignore`, 22 source/script files | `npm run format:check` failed on 421 files on Windows (`core.autocrlf=true` vs `.prettierrc.json` `"endOfLine": "lf"`), and 22 source/script files plus static `docs/` mockups had Prettier formatting violations introduced after `3748418`. | Added `.gitattributes` (`* text=auto eol=lf`), added `docs` and `tsconfig.tsbuildinfo` to `.prettierignore`, and formatted all repository source/script files so `npm run format:check` passes cleanly. |
| `F-TAKEOVER-05` | `P2` | Software defect (Touch target size & accessible control naming) | `src/components/layout/palette-switcher.tsx`, `src/components/chat/floating-chat-widget.tsx`, `src/app/admin/settings/contact/page.tsx` | Close buttons in `PaletteSwitcher` (`size-9`) and `FloatingChatWidget` (`p-1`) were below the 44×44 CSS pixel minimum (`Design_System.md` §7.2), and the back link on `/admin/settings/contact` (`<Link href="/admin"><ArrowLeft /></Link>`) lacked an `aria-label` and used `size-9`. | Restored `size-11` (44×44px) on all three controls and added `aria-label="Back to staff dashboard"` on `/admin/settings/contact`. |
| `F-TAKEOVER-06` | `P2` | Software defect (Redirect lookup resilience & collection item count filtering) | `src/app/api/internal/redirects/route.ts`, `src/app/collections/page.tsx` | `GET /api/internal/redirects` called `findActiveRedirect(path)` without `try/catch`, emitting unhandled 500 errors when the database was unreachable; `/collections` queried raw `include: { items: true }` without filtering for published non-fixture items and labeled all items `"curated resorts"`. | Wrapped `findActiveRedirect` in `try/catch` returning `204 No Content` on error, and updated `/collections` to count via `listPublishedCollectionItems(col.id)` with accurate `"curated item(s)"` labeling. |

---

## 4. Open Non-Code / Owner / Infrastructure Blockers

The following items are **not** remediated in code because they are governed by open owner, legal, commercial, or infrastructure decisions (`Documentation/Decisions.md`, `Documentation/Production_Decisions_Required.md`):

- **Commercial & Legal Decisions (`D-001`–`D-007`, `D-009`, `D-011`–`D-014`)**:
  - `D-002`: Public numeric resort/villa rates remain withheld (`Price on request`).
  - `D-005` / `D-006`: Quote validity defaults, tax/service-charge breakdown policy, and terms remain provisional.
  - `D-009`: Search analytics remains opt-in behind explicit consent.
  - `D-010`: Production hosting, object storage, transactional email provider, and Turnstile keys are not selected; email deliveries remain `QUEUED` / `FAILED` without fabricated `SENT` states, and rate limiting remains in-memory single-process.
  - `D-011`: Verified-review methodology is unapproved.
  - `D-012`: Retention schedule and automated privacy export/deletion fulfillment remain provisional.
  - `D-013`: Owner-approved production catalog dataset is pending.
  - `D-014`: Brand/domain clearance is pending; `robots.txt` (`Disallow: /`) and `noindex, nofollow` remain enforced.
- **Environment / Operational Prerequisites**:
  - Local Node runtime is `v22.11.0` while `.nvmrc` pins `22.23.3` and `package.json` `engines` specifies `>=22.13.0 <23`.
  - `pg_dump` / `pg_restore` client binaries are not bundled with `embedded-postgres`, so a physical backup/restore drill requires a target PostgreSQL client installation.
