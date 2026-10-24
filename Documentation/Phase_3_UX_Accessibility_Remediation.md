# Phase 3 — UX, Accessibility, Responsive Layout, and Image Performance Remediation

Scope: remaining F-06 UX/accessibility findings and Persona 15 image/media performance issues from `Persona_Driven_End_to_End_Audit.md`. Phase 1 launch-blocker and Phase 2 content-integrity work are preserved. No schema changes, no invented catalog facts, no visual redesign, no commit/push/deploy.

## 1. Branch and starting commit

- Branch: `fix/phase-3-ux-accessibility`
- Starting commit: `7702b3f` ("Merge Phase 2 content integrity remediation"), clean working tree at start.
- Phase 1 (`5c7499f`, `4f2a4ef`) and Phase 2 (`7df8ffa`, `7702b3f`) history untouched.

## 2. Scope

In scope:

1. Dark-mode contrast (planner trip-type select, analytics consent).
2. Compare tray / floating-widget collision.
3. Planner child-age remove.
4. Registration password visibility (aligned with login).
5. Resort gallery composition by image count.
6. Overlay keyboard accessibility (Quick Search, palette, chat, mobile menu).
7. Login mode switcher semantics (pressed buttons, not tabs).
8. Heading hierarchy on confirmed defective surfaces.
9. Focused touch-target / focus-visibility fixes.
10. Catalog image delivery via Next Image Optimization; media cache headers; homepage hero single-load.
11. Reduced-motion regression check.
12. Focused responsive regression pass.
13. Tests, validation, documentation.

Out of scope (deliberately deferred): business-content verification, legal wording, transfers/meal plans/pricing, brand/domain decisions, lightbox, CDN redesign, F-08 `run-dev.mjs`.

## 3. Findings resolved

| Finding | Result |
| --- | --- |
| F-06.1 Dark-mode trip-type select contrast | Resolved. Select uses opaque dark surface/text tokens. Measured dark-mode contrast **17.4:1** (was ~1.11:1). |
| F-06.2 Analytics consent dark surface | Resolved. Theme surfaces (`bg-sand` / `dark:bg-[#071318]`) with dark text tokens. Measured dark-mode paragraph contrast **≈19.2:1**. |
| F-06.3 Compare tray / floating collision | Resolved via `--me-compare-tray-h` published by CompareTray (ResizeObserver) and consumed by PaletteSwitcher / FloatingChatWidget offsets; tray `z-20`. No z-index arms race. |
| F-06.4 Child ages cannot be removed | Resolved. Accessible **Remove child N** per row; draft/validation updated. |
| F-06.5 Single-photo gallery empty column | Resolved. `ResortGallery` composes by count (0/1/2/3+). |
| F-06.6 Register password Eye non-interactive | Resolved. Shared `PasswordField` on register and login. |
| Quick Search / overlay focus | Resolved for modal Quick Search (focus in, Escape, restore). Palette/chat use Escape + focus helpers appropriate to popover/non-modal dialog. Mobile menu traps focus while open. |
| Login Password / Magic Link semantics | Resolved as mode-selection buttons (`role="group"`, `aria-pressed`), not tabs. |
| Heading skips on /plan and /newsletter perks | Resolved (perk titles → styled `<p>`). Review card titles demoted from `<h3>` to styled `<p>`. |
| Persona 15 image delivery | Resolved for catalog cards/heroes/gallery via Next Image Optimization (`/_next/image`) with responsive `sizes`; media route cache improved with ETag + day-long max-age + SWR (not immutable). Homepage hero is CSS-only (single request). |

## 4. Findings partially resolved

| Item | Notes |
| --- | --- |
| Site-wide heading outline | Confirmed defective perk/review skips fixed. Homepage/card titles still use multiple `h2`/`h3` for marketing sections; not treated as F-06 defects and left unchanged to avoid redesign. |
| Floating chat collision | Chat widget offset wired; production seed has messaging channels disabled so chat was absent during live collision check. Palette/tray non-overlap verified. |
| Touch targets | Confirmed small controls in Phase 3 surfaces enlarged (`min-h-11` / `min-w-11` where needed). Not a full WCAG inventory of every inline link. |

## 5. Files changed

New:

- `src/lib/a11y/focus-trap.ts`
- `src/components/ui/password-field.tsx`
- `src/components/discovery/resort-gallery.tsx`
- `src/tests/phase3-ux-accessibility.test.tsx`
- `Documentation/Phase_3_UX_Accessibility_Remediation.md` (this file)

Modified (selected):

- Planner/consent: `planner-form.tsx`, `analytics-consent.tsx`, `plan/page.tsx`, `newsletter/page.tsx`
- Floating chrome: `compare-tray.tsx`, `palette-switcher.tsx`, `floating-chat-widget.tsx`, `globals.css`
- Overlays: `quick-search-dialog.tsx`, `mobile-menu.tsx`
- Auth: `login-form.tsx`, `register/page.tsx`
- Gallery/media: `resorts/[slug]/page.tsx`, `resort-gallery.tsx`, `detail-hero.tsx`, resort/experience/guide cards, `media/[id]/route.ts`, `modules/media/service.ts`, `next.config.ts`, `page.tsx` (hero)
- Reviews: `review-list.tsx`
- Tests: `phase3-ux-accessibility.test.tsx`, `phase2-content-integrity.test.tsx` (hero src assertion accepts optimized URLs)
- Docs: `Persona_Driven_End_to_End_Audit.md` (Phase 3 status appended)

## 6. Before/after contrast measurements

Measured in production build browser (dark class on `<html>`):

| Control | Before (audit) | After |
| --- | --- | --- |
| `/plan` Step 3 `#tripTypeId` | fg `rgb(237,244,247)` on bg `rgb(255,255,255)` ≈ **1.11:1** | fg `rgb(255,255,255)` on bg `rgb(12,28,36)` ≈ **17.4:1** |
| Analytics consent copy (dark) | Light text on white panel (failing) | fg ≈ `rgb(241,245,249)` on dark surface ≈ **19.2:1** (paragraph) / **17.2:1** (section) |

## 7. Overlay / focus-management behavior

| Component | Semantics | Behavior |
| --- | --- | --- |
| QuickSearchDialog | Modal dialog (`aria-modal="true"`) | Focus moves to search input; Escape closes; focus restored to trigger; Tab cycling trapped. |
| PaletteSwitcher panel | Non-modal popover | Escape closes; focus trap while open; bottom offset uses `--me-compare-tray-h`. |
| FloatingChatWidget panel | Non-modal dialog (page remains usable; no `aria-modal`) | Escape closes and restores toggle; focus moves into panel; offset uses tray height. |
| MobileMenu | Modal-style drawer while open | Focus trap while open. |
| Login mode switcher | Button group with `aria-pressed` | Not tabs. |

Manual keyboard check (register page): Quick Search opened → focus in search input → Escape → focus restored to “Search site…”.

## 8. Planner child-age fix

- **Add a child age** still appends a row.
- Each row has **Remove child N** (`type="button"`, named by index).
- Removal splices `draft.childAges`, reindexes labels, clears validation for removed rows, persists via existing draft save on continue/save.
- Age rules unchanged (0–11 child; 12+ adult messaging).

## 9. Registration password behavior

- Shared `PasswordField`: `type="button"`, `aria-label` Show/Hide password, `aria-pressed`, visible focus, local state only.
- Login refactored to the same component (no auth-flow changes).

## 10. Heading corrections

- `/plan` perk titles: `h3` → styled `p`.
- `/newsletter` perk titles: already styled `p` (confirmed).
- `/reviews` review display names: `h3` → styled `p` (avoids h1→h3 under Testimonials).
- Resort/guide/experience detail outlines left as logical h1→h2→h3.

## 11. Gallery behavior by image count

`ResortGallery` (alt-text-filtered, max 5):

| Count | Layout |
| --- | --- |
| 0 | Renders nothing (no empty shell) |
| 1 | Single full-width frame (`data-gallery-count="1"`) |
| 2 | `sm:grid-cols-2` |
| 3+ | Featured first cell spanning 2×2 in a 3-column grid |

Live check: `/resorts/soneva-jani` published one alt-described gallery image → single-column composition, no empty tracks.

## 12. Touch-target changes

- Compare tray actions `min-h-11`.
- Password toggle `min-h-11 min-w-11`.
- Quick Search trigger already `size-11`.
- Review resort links `min-h-11` inline-flex + focus ring.
- Only confirmed Phase 3 failures touched.

## 13. Image-delivery investigation

**Why `unoptimized` existed:** catalog images are same-origin `/media/[id]`. Previously Image Optimization was not relied on; cards/heroes marked `unoptimized`, so small viewports downloaded full source JPEGs.

**Decision:** remove `unoptimized` and enable Next Image Optimization for same-origin media. Responsive `sizes` now request `/_next/image?url=%2Fmedia%2F…&w=…`. Authorization/publication still enforced by `/media/[id]`.

**Homepage hero:** previously CSS `bg-[url('/images/hero-maldives.jpg')]` plus a Next `<Image>` could double-fetch. Hero is now CSS-background only (including the small preview chip). Measured **one** `hero-maldives.jpg` request.

## 14. Before/after mobile image transfer measurements

Environment: production `next start`, disposable DB + rich catalog, viewport **390×844**, DPR 2, cache disabled for the measured reload.

Homepage `/` at 390px:

| Metric | After (measured) |
| --- | --- |
| Hero requests | **1** (`/images/hero-maldives.jpg`, ≈531 KB transfer) |
| Catalog images | **8** via `/_next/image` with `w=828` |
| Catalog transfer total | ≈**251 KB** |
| Raw `/media/{id}` downloads on homepage | **0** |
| Horizontal overflow | **none** |

Single-asset comparison (featured resort lead):

| Route | Bytes |
| --- | --- |
| Raw `/media/{id}` | **324,633** |
| Optimized `/_next/image?…&w=828&q=75` | **93,046** (≈**28.7%** of raw) |

Audit “before” evidence (full-resolution catalog JPEGs on small screens) aligns with the raw column; after uses optimized widths.

## 15. Caching decision and rationale

`/media/[id]`:

- **Not immutable:** bytes under an id can change after unpublish/edit/republish.
- Headers: `Cache-Control: public, max-age=86400, stale-while-revalidate=604800` plus strong `ETag` (`storageKey:updatedAt:byteSize`) and `304` support.
- Preserves publication checks before serving.

## 16. Responsive viewport results

Focused checks (production build) across 390 / 1440 (and unit coverage for tray offsets):

| Check | Result |
| --- | --- |
| Homepage 390 overflow | Pass |
| Plan dark select readability | Pass |
| Register password toggle | Pass |
| Compare tray + palette non-overlap | Pass (`trayOverlapsPalette: false`; tray height CSS var published) |
| Resort one-image gallery | Pass |
| Quick Search Escape restore | Pass |

Additional viewport widths (360/768/1024/1366/1920) were not each instrumented with separate screenshots in this pass; layout coordination is CSS-var based and does not introduce fixed magic collisions. No new horizontal overflow observed on exercised pages.

## 17. Automated accessibility results

- Vitest Phase 3 suite: **18** focused tests (contrast tokens, tray offset, child ages, password, gallery, Quick Search focus, login semantics, headings, icon names, review structure).
- Full suite: **147** tests passing (includes Phase 1 and Phase 2).
- `axe-core` is present in the repo but was **not** presented as WCAG compliance proof; manual contrast + keyboard checks used instead.

## 18. Manual keyboard results

- Quick Search: opens, focuses search field, Escape closes, restores trigger.
- Register Show/Hide password: keyboard-operable, does not submit.
- Login mode buttons expose `aria-pressed`.
- Reduced-motion global CSS (`prefers-reduced-motion: reduce`) unchanged; no new animation dependencies introduced that bypass it.

## 19. Tests added

`src/tests/phase3-ux-accessibility.test.tsx` covers the Phase 3 checklist items 1–20 that are unit-testable. Phase 2 hero assertion updated to accept `/_next/image` URLs while still requiring `/media/{id}` in the source URL.

## 20. Validation results

| Command | Result |
| --- | --- |
| `npx prisma generate` | Pass |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm test` | Pass — **147** tests |
| `npm run docs:validate-schema` | Pass (requires `DATABASE_URL` env) |
| `npm run build` | Pass |
| `node scripts/test-migrations.mjs` | Pass |
| Prettier on Phase 3 sources | Applied |
| `git diff --check` | Pass (CRLF warnings only) |

## 21. Regressions checked

- Phase 1 contact/privacy/RBAC tests still pass.
- Phase 2 fixture visibility / OAuth / UAT / media hero tests still pass.
- No `ALLOW_TEST_FIXTURES` or `ENABLE_UAT_QUICK_FILL` gate changes in this phase.
- No schema/migrations added.
- No secrets committed.
- Disposable DB/server/`.data` cleaned after browser verification.

## 22. Items deliberately deferred

- F-08 `scripts/run-dev.mjs` env/tunnel behaviour.
- Full site heading redesign beyond confirmed skips.
- Lightbox for galleries.
- New CDN/media architecture.
- Business content (transfers, meal plans, pricing, legal copy).
- Facebook OAuth / social registration policy.

## 23. Remaining risks

- Next Image Optimization adds CPU on first request per size; subsequent loads use the optimizer cache. Monitor under production traffic.
- Chat collision could not be live-verified without configured messaging channels.
- Some marketing pages still use dense heading trees that are visually intentional; a future a11y pass may demote card titles more broadly.
- Hero JPG remains a large static asset (~531 KB); optimization of that static file itself is outside Phase 3 media-route work.
