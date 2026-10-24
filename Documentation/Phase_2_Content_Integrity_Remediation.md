# Phase 2 — Content Integrity Remediation

Scope: public catalog and content integrity findings from `Persona_Driven_End_to_End_Audit.md` (F-04, F-05, F-07 and the related persona observations). Phase 1 launch-blocker work is already in history and was preserved. No Phase 3 accessibility, layout, performance, gallery, image-optimisation or lightbox work was done. Nothing was committed, pushed, merged, or deployed.

Owner decisions in `Decisions.md` take precedence over this document. No catalog fact, price, schedule, review, claim, or contact detail was invented.

## 1. Branch and starting commit

- Branch: `fix/phase-2-content-integrity`
- Starting commit: `4f2a4ef` ("Merge Phase 1 launch-blocker remediation"), clean working tree.
- Phase 1 history (`5c7499f`, `4f2a4ef`) is untouched.

## 2. Findings addressed

| Finding | Result |
| --- | --- |
| F-04 transfers / meal plans / audiences missing, room and resort fields not shown | Partially resolved by design: rendering fixed, only evidenced audiences seeded, no invented transfers or meal plans. |
| F-05.1 hardcoded newsletter dispatch cards | Resolved. |
| F-05.2 quick-search article links | Verified: both slugs exist in the seed. Left as is and listed in section 15. |
| F-05.3 `Browser *` fixtures on public pages | Resolved by one central policy at the data boundary. |
| F-07.1 OAuth buttons that do nothing | Resolved. |
| F-07.2 UAT traveller quick-fill | Resolved (dead option removed, remaining helper gated). |
| Persona 3: no hero on experience and guide pages | Resolved. |

Premise corrections found while verifying the audit against the code:

- `ResortTransfer`, `ResortMealPlan` and `resort_*` tables do not exist. The models are `TransferOption`, `DiningVenueMealPlan` (per venue) and `ResortAudience`.
- `RoomType` has `maxAdults`, `maxChildren` and `sizeSqm`. It has **no** `maxOccupancy`, `cotAvailable` or `extraBedAvailable`; no schema change was made and none of those are shown or implied.
- `maxChildren` defaults to `0`, which is indistinguishable from "unknown", so it is displayed only when above 0 and nothing is claimed about families when it is 0.

## 3. Files changed

Source:

- `src/modules/discovery/visibility.ts` (new) — the fixture policy.
- `src/modules/discovery/public.ts`, `index.ts` — policy applied; `listRecentPublishedGuides` added.
- `src/modules/catalog/repository.ts` — policy; resort select extended (room size and children, `checkInNotes`, reef fields, venue meal plans, transfer basis and notes).
- `src/modules/search/query.ts` — policy in every raw SQL statement.
- `src/modules/compare/service.ts`, `attributes.ts` — hidden fixtures become "Unavailable"; shared `uniqueLabels`.
- `src/modules/wishlist/service.ts`, `src/modules/offers/service.ts`, `src/modules/enquiries/service.ts`, `src/modules/customers/records.ts` — policy.
- `src/modules/media/repository.ts`, `index.ts` — canonical `listLeadMedia`.
- `src/components/discovery/detail-hero.tsx` (new).
- `src/app/resorts/[slug]/page.tsx`, `experiences/[slug]/page.tsx`, `guides/[slug]/page.tsx`.
- `src/app/page.tsx`, `guides/page.tsx`, `experiences/page.tsx`, `resorts/page.tsx`, `destinations/page.tsx`, `collections/page.tsx` — policy and shared media query.
- `src/app/newsletter/page.tsx`.
- `src/lib/auth/oauth-providers.ts`, `oauth.ts`, `uat.ts` (new); `src/auth.ts`; `src/modules/identity/actions.ts`; `src/components/auth/social-oauth-buttons.tsx`; `src/app/login/page.tsx`, `login-form.tsx`; `src/app/register/page.tsx`.
- `scripts/prepare-browser-discovery.ts` (shared FAQ constant), `scripts/seed-rich-catalog.ts` (two audience links), `.env.example`.

Tests: `src/tests/phase2-content-integrity.test.tsx` (new).

Documentation: this file and section 5 of `Persona_Driven_End_to_End_Audit.md`.

## 4. Root causes

- **Fixture leakage.** Only some pages had an ad-hoc `browser-` slug filter, copy-pasted per page. `/guides`, `/faq` and the planner had none; search SQL, compare, wishlist, offers and the sitemap had none either. There was no shared definition of what a fixture is.
- **Missing resort data.** The seed never created transfers or meal plans, and the detail page hid whole sections instead of saying data was missing. Several stored fields were simply never selected or rendered.
- **Newsletter.** A hardcoded array of cards, all linking to `/guides`.
- **OAuth.** The client component always rendered Google and Facebook buttons whose handler only showed a notice. Separately, `auth.ts` registered providers but had no mapping from a provider profile to a database account, so a successful provider sign-in would have produced a session whose `user.id` was the provider's profile id, not an account id.
- **UAT.** Credentials for an account that is never seeded were hardcoded in a client component, alongside the admin credentials.

## 5. Fixture query-boundary strategy

`src/modules/discovery/visibility.ts` is the single definition:

- A fixture is a record whose slug starts with `browser-`, plus the global FAQ whose question is `Browser question` (FAQs have no slug). `scripts/prepare-browser-discovery.ts` imports the FAQ constant, and a test fails if any slug in that script lacks the prefix or the script stops using the constant.
- Helpers build the `where` fragments (`publishedPublic`, `notTestFixture`, `publishedPublicFaq`), a slug predicate (`isHiddenFixtureSlug`) and a raw-SQL guard (`fixtureGuardSql`) so every public read goes through one policy.
- Opt-in (fail-closed): fixtures are visible only when `ALLOW_TEST_FIXTURES=true` **and** `APP_ENV` is explicitly and exactly `local` (no trimming or case folding). An unset or empty `APP_ENV` is **not** treated as local for this gate, and staging, preview, production, and any unknown or malformed value never honour it. The default is hidden. This uses `isExplicitLocalEnvironment` in `src/lib/env/schema.ts`; the schema's general `APP_ENV` default is unchanged and does not affect this gate.
- Applied to: `/`, `/search` (including suggestions), `/resorts`, `/resorts/[slug]`, `/destinations`, `/atolls/[slug]`, `/islands/[slug]`, `/experiences`, `/experiences/[slug]`, `/offers`, `/collections`, `/guides`, `/guides/[slug]`, `/faq`, `/plan`, `/compare`, `/wishlist`, `/recently-viewed`, related lists and the sitemap.
- Fixtures were not deleted. To use them in a local browser environment set `APP_ENV=local` **and** `ALLOW_TEST_FIXTURES=true`. `scripts/run-dev.mjs` deliberately does not set it because that script also exposes the app through a public tunnel.
- Verified live on a disposable database with fixtures present: without the flag, `/guides`, `/faq`, `/plan`, `/search?q=browser`, and every other target page showed no `Browser *` text and `browser-resort`, `browser-guide` and `browser-experience` returned 404; with the flag they were visible.

## 6. Catalog data populated

Only two audience links, both idempotent upserts in `scripts/seed-rich-catalog.ts`, each justified by text already stored in the same seed:

| Resort | Audience tag | Evidence already in the seed |
| --- | --- | --- |
| `hurawalhi-island-resort` | `adults-only` | Summary: "Adults-only sanctuary ..." and description: "5-star adults-only escape". |
| `soneva-fushi` | `family` | `editorialPositioning`: "... family-friendly paradise." |

No audience was inferred from brand, price band, star category, or "couples" language (Hurawalhi's "couples escape" was not turned into `honeymoon`).

## 7. Data intentionally left unknown

- **Transfers (`TransferOption`):** none seeded. `checkInNotes` is free prose, the seed contains no structured transfer source, and a transfer row would need a type, a duration, and (by a database check) a `source_note`. Converting prose would be inventing a structured claim. The prose is displayed as written under "Check-in and arrival" instead.
- **Meal plans:** none seeded. No meal-plan source exists in the repository and nothing was inferred from resort class or dining venues.
- **Other audiences** (for example honeymoon, diving, luxury) and every other resort's audiences.
- **`maxChildren`** for every room, and everything about cots and extra beds (no such fields exist).
- Neutral states: the resort page says "Transfer details have not been published for this resort." and "Meal plan details have not been published for this resort."; `/compare` continues to show "Unknown".

Prose that a business owner could verify and then load as structured records (this is a worklist, not loaded data):

| Resort | Stored `checkInNotes` |
| --- | --- |
| Soneva Jani | "Accessible via a scenic 45-minute flight on the customized Soneva twin-otter seaplane from Malé." |
| Soneva Fushi | "30 minutes by seaplane from Velana International Airport." |
| Cheval Blanc Randheli | "40-minute flight on Cheval Blanc's bespoke private 9-seat seaplane." |
| The Ritz-Carlton Maldives, Fari Islands | "45 minutes by luxury speedboat or 10 minutes by private seaplane." |
| Waldorf Astoria Maldives Ithaafushi | "30-minute private yacht transfer available 24 hours a day." |
| Hurawalhi Island Resort | "40-minute scenic seaplane journey from Velana International Airport." |
| Gili Lankanfushi | "Convenient 20-minute luxury speedboat transfer from Malé." |
| Baros Maldives | "25-minute speedboat ride from Velana International Airport." |

## 8. Resort rendering changes (`/resorts/[slug]`)

All conditional; nothing prints null, undefined, NaN, or an empty heading.

- Rooms: name, description (if any), "Size: N m²" (only when recorded and positive), "Maximum adults: N" always, "Maximum children: N" only when above 0. Max adults is never described as occupancy.
- Dining: venue list as before plus one "Meal plans: ..." line, de-duplicated by the same `uniqueLabels` helper `/compare` uses, or the neutral sentence when none are recorded.
- Transfers: always present; structured records show label, type, duration (only when recorded, with its basis if stored) and notes; neutral sentence otherwise.
- "Check-in and arrival" from `checkInNotes` (line breaks preserved).
- "Reef and diving": house reef Yes/No only when recorded, reef summary, dive-centre summary; the section is omitted when none exist.
- "Good for" continues to read `ResortAudience`.
- `reefSourceNote` and `starCategorySource` are not displayed.
- Layout reuses the existing cards and grid; no gallery or layout redesign.

## 9. Guide and experience media changes

- `listLeadMedia(ownerType, ids)` (`src/modules/media/repository.ts`) is the canonical query. A link qualifies only when the media is published, an image or drone shot, and has alt text; a HERO link wins, otherwise the first by sort order. Captions are returned only if stored.
- `DetailHero` renders the image with the stored alt text and a `figcaption` only when a caption exists. With no qualifying media the detail page renders without any image and without an error, and a media-query failure does not break the page.
- The home, `/guides` and `/experiences` cards use the same query; they previously fell back to the record title as alt text and did not check publication status, so they could request an image `/media/[id]` would refuse to serve.
- No new imagery, image-optimisation change, or lightbox.

## 10. Newsletter changes

- Removed the hardcoded dispatch array. `/newsletter` shows up to three published guides ordered newest first, from the same visibility policy as `/guides`: real title, real `/guides/{slug}` link, and the stored category name. No read time, date, or author is generated.
- Section heading changed from "Recent Gazette Dispatches" to "Recent guides" because the cards are guides, not newsletter issues. The section is hidden when no suitable guide exists or when the lookup fails.
- Not changed (section 15): the marketing perk cards and hero copy. The newsletter page still carries unverified perk claims that belong to a copy review.

## 11. OAuth behavior

- `src/lib/auth/oauth.ts` is the single availability source. A provider is available only if both its id and secret are set **and** it can assert a verified email. Today that is Google only; Facebook's profile carries no verified-email assertion, so it is neither registered in `auth.ts` nor shown.
- The login page reads availability on the server and passes only provider ids to the client. The client component receives no credentials (a test asserts the rendered HTML contains neither id nor secret).
- A configured provider renders a real form that posts to the `oauthSignIn` server action. The action rejects unknown or unconfigured providers before reaching Auth.js and uses the existing safe-destination logic.
- No provider configured: nothing renders, including the divider and the old "being upgraded" notice. `/register` no longer shows social buttons because social sign-in does not create accounts.
- Sign-in completion (`auth.ts`): the provider email must be verified, the account must already exist, be `ACTIVE` and not be staff (staff keep password plus MFA). A matching customer receives the same database-backed session as password sign-in. Anything else is sent to `/login?error=oauth` with an explanatory message. No account is created and no consent is bypassed.
- Hardening: a token without a database session now yields an empty session, so a provider profile id can never be mistaken for an account id.
- Verified live with dummy (non-secret) values: Google shown, Facebook not shown, `/register` has no social block, nothing leaked into HTML. A real provider round trip could not be exercised without real credentials and is a deployment check.
- Limitation: there is no linking UI and no sign-up through a provider; both are deferred until the business decides on a verified-link policy.

## 12. UAT behavior

- The traveller quick-fill (account never seeded) was removed.
- The bar needs all of: `APP_ENV` explicitly and exactly `local` (unset, empty, or any other value keeps it closed), `ENABLE_UAT_QUICK_FILL=true`, `?uat=1` or `?dev=1`, and `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` set in the server environment. Credentials come from that environment, never from source, and are passed to the page only when the gate is open.
- No default password, no production path, no bypass: the helper only pre-fills the normal form. The staff MFA step is unchanged.
- `run-dev.mjs` does not enable it; a developer sets the flag explicitly.

## 13. Tests added

`src/tests/phase2-content-integrity.test.tsx` (50 tests, Vitest + happy-dom + Testing Library), covering:

- Fixture policy: default hidden, opt-in only local, never in production/staging/preview/unknown, Prisma and SQL builders, every discovery and catalog query, guides/experiences/newsletter pages, search SQL guarded by default and only open when allowed locally, compare returns "Unavailable" for a hidden fixture, fixture script and policy stay in sync.
- Resort page: size, max adults versus max children, no occupancy/cot/extra-bed implication, check-in notes, reef and dive centre, house reef Yes/No/unknown, no empty sections or null text, neutral transfer and meal-plan states, structured transfer rendering, meal plans de-duplicated and equal to the `/compare` value, no meal-plan inference, audiences from tags, seed adds only the two evidenced audiences and no transfer or meal-plan rows.
- Media: query constraints, alt/caption handling, empty input, `DetailHero`, experience and guide pages with and without media and with a media failure.
- Newsletter: real links only, no read times, no hardcoded cards, hidden when empty, fixture-filtered query.
- OAuth: availability rules, Facebook unavailable, verified-email rule, nothing rendered when unconfigured, configured form fields, login with and without providers, no buttons on register, no secrets in HTML, action rejects unknown/unconfigured providers and uses a safe destination.
- UAT: gate closed by default, local-only, no default password, no credential literals in the login source, no traveller option, login page opens the bar only when flag and gate agree.

The 15 Phase 1 tests and all earlier tests still pass.

## 14. Validation results

| Check | Result |
| --- | --- |
| `npx prisma generate` | Passed |
| `npm run typecheck` | Passed |
| `npm run lint` (`--max-warnings 0`) | Passed |
| `npm test` | Passed — 16 files, 121 tests |
| `npm run docs:validate-schema` (with `DATABASE_URL`) | Passed |
| `npm run build` | Passed |
| `node scripts/test-migrations.mjs` | Passed (migrate, exercise scripts, drop, reapply) |
| `prettier --check` on changed source, scripts and tests | Passed (the repo-wide check still fails on untouched files; `Documentation/` is prettier-ignored) |
| `git diff --check` | Clean apart from line-ending warnings for CRLF checkouts |

Browser verification (production build on a disposable PostgreSQL 16 with the browser fixtures and the rich catalog loaded, then torn down):

- Without any opt-in: `/`, `/guides`, `/guides/[slug]`, `/faq`, `/plan`, `/resorts`, `/resorts/[slug]`, `/compare`, `/experiences`, `/experiences/[slug]`, `/newsletter`, `/login`, `/register` all returned 200 with no fixture text, no null or undefined text, and no Google/Facebook buttons; fixture URLs returned 404.
- Hurawalhi page showed room size and max adults, neutral transfer and meal-plan sentences, check-in notes, reef and dive sections, and the "Adults Only" audience. Guide and experience pages rendered their hero with the stored caption. Newsletter listed the two real guides.
- Desktop (about 1024 px) and mobile (390 px): no horizontal overflow on the resort page.
- With `ALLOW_TEST_FIXTURES=true`, `ENABLE_UAT_QUICK_FILL=true` and dummy provider values: fixtures visible, the admin helper visible with no traveller option, only Google shown, no secrets in HTML.
- Servers stopped, disposable database stopped, `.data` and temp directories deleted.

## 15. Content requiring business verification

- Transfers, meal plans, further audiences, cot and extra-bed policy, children's limits (section 7).
- Seed provenance strings that read as sourced facts but are not evidenced in the repository: `starCategorySource` ("Ministry of Tourism Maldives") and `reefSourceNote` ("Maldives Marine Research Institute & On-Site Survey") are written for every seeded resort. They are not shown publicly, but they should not be treated as verified.
- Marketing copy that makes unverified claims and was left alone (not Phase 2 scope): the `/newsletter` perk cards and hero ("Unpublished Villa Privileges", "complimentary half-board upgrades", "secret sandbank coordinates", "Bi-weekly editorial dispatches" which also contradicts "occasional"); the homepage badge "26 Atolls" and its statement that every transfer is "synchronized directly with resort marine desks"; "Resident Concierge Service" on `/plan`.
- `QuickSearchDialog` quick links are hardcoded to seeded slugs and 404 on a database that lacks them.
- `/guides/[slug]` and `GuideCard` hide one author name through a hardcoded string comparison.
- Resort price bands and "Price on request" wording (unchanged).
- Real photography licensing (`D-013`).
- Whether the verified-link policy should allow Facebook or sign-up through a provider.

## 16. Deferred Phase 3 and other findings

- F-06 in full: dark-mode contrast on `/plan` and the consent banner, bottom-right z-index collisions, removing planner child ages, single-photo gallery grid, the non-functional password eye icon on `/register`.
- Hero and gallery layout polish (the new hero uses a simple 16:9 figure and does not change the existing gallery), image optimisation, caching headers on `/media/[id]`, lightbox.
- Narrow article column on detail pages leaving empty space on wide screens.
- F-08: `scripts/run-dev.mjs` overwrites `.env`, defaults `AUTH_URL` to a production-style domain, and references a machine-specific path.
- A nullable party size for contact enquiries (carried over from Phase 1).

## 17. Deployment considerations

- Do **not** set `ALLOW_TEST_FIXTURES` outside a local environment; it is ignored unless `APP_ENV` is explicitly set to exactly `local`. An unset `APP_ENV` does not count as local for the fixture and UAT gates (they fail closed), so a missing `APP_ENV` in a deployment can never expose fixtures or the UAT helper. The same applies to `ENABLE_UAT_QUICK_FILL`.
- Do not set `ENABLE_UAT_QUICK_FILL` on any shared or tunnelled host. Never ship real admin credentials in `SEED_ADMIN_*` to a shared environment.
- Social sign-in is off until `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are both set; before enabling, register the callback URL for the deployed `AUTH_URL`, and test a full round trip with a real existing customer. Existing `AUTH_FACEBOOK_*` values are now ignored.
- If a database was seeded before this change, re-running `scripts/seed-rich-catalog.ts` adds the two audience links; no migration is required and no schema changed.
- Search SQL is built when the server process starts, so a change to `ALLOW_TEST_FIXTURES` needs a restart.
- Search engine indexing remains disabled.
