# Phase 1 Launch-Blocker Remediation Report

## 1. Branch and Starting Commit

- **Starting Branch:** `master`
- **Starting Commit:** `170abd3` (`Merge origin/main into master and integrate latest Maldives Explorer updates`)
- **Implementation Branch:** `fix/phase-1-launch-blockers`
- **Commit / Push Status:** Uncommitted on `fix/phase-1-launch-blockers` per instructions; nothing pushed or deployed.

---

## 2. Findings Addressed in Phase 1

- **F-01:** Broken `/contact` enquiry creation (`enquiries_reference` check constraint failure) and raw Prisma/PostgreSQL error + PII disclosure to the browser.
- **F-02:** Broken `/terms` and `/privacy` links (`404 Page Not Found`) on `/register`.
- **F-03.1 (& F-03.5):** Fabricated/duplicated fallback reviews on `/` (`Elena & Marcus T.`, `David & Claire H.`, `Sophia & Liam K.`) and seeded demo review with `verificationStatus: "VERIFIED"` (`Victoria & Alexander M.`).
- **F-03.2:** Pre-checked contact consent checkbox (`defaultChecked`) on `/contact` and missing `ConsentRecord` persistence.
- **F-03.3:** Unverified operational, physical address, airport seaplane desk, placeholder telephone/email, `"24/7"`, and `"Written Quotes Within 4 Hours"` SLA claims.
- **F-03.4:** Misleading `"End-to-End Encrypted"` badge on `/login` and `/register`.
- **F-09:** Missing granular RBAC authorization (`setting.manage`) and transactional `AuditLog` recording on `/admin/settings/contact` (`saveContactSettingsAction` / `saveContactSettings`).

---

## 3. Exact Root Cause of Each Defect

1. **F-01 (`/contact` Crash & Raw Error/PII Leak):**
   - `submitContactEnquiry` in `src/modules/contact/service.ts` maintained a separate, ad-hoc `tx.enquiry.create()` implementation that generated references with prefix `ME-C-000001`.
   - Migration `20261011010000_integrity` defines `ADD CONSTRAINT enquiries_reference CHECK (reference ~ '^ME-E-[0-9]{6}$')`, causing every `/contact` submission to fail with PostgreSQL error `23514`.
   - `submitContactEnquiry` also hardcoded `adultCount: 2`, omitted `EnquiryStatusHistory`, omitted `ConsentRecord`, omitted `AuditLog`, omitted `queueEnquiryAcknowledgement`, and caught errors with `return { success: false, reference: "", error: err.message }`, which dumped Prisma's `ConnectorError` (including column values and `submittedSnapshot` JSON containing customer PII) directly into the browser DOM.
2. **F-02 (`404` on `/terms` and `/privacy`):**
   - `src/app/register/page.tsx` linked to `/terms` and `/privacy` next to the mandatory registration checkbox, but neither `src/app/terms/page.tsx` nor `src/app/privacy/page.tsx` existed.
3. **F-03.1 & F-03.5 (Fabricated Reviews):**
   - `src/app/page.tsx` defined a hardcoded `fallbackReviews` array of three invented customer testimonials and used `reviewsData.length >= 2 ? reviewsData : fallbackReviews`. Because `scripts/seed-rich-catalog.ts` seeded only 1 review (`Victoria & Alexander M.`) with the exact same review text as `Elena & Marcus T.`, the homepage displayed `Elena & Marcus T.` while `/reviews` displayed `Victoria & Alexander M.` with identical text.
4. **F-03.2 (Pre-Checked Contact Consent & Missing `ConsentRecord`):**
   - `src/components/contact/contact-form.tsx` set `defaultChecked` on the consent `<input type="checkbox">`, and `submitContactEnquiryAction` / `submitContactEnquiry` never read or validated the `consent` field on the server or created a `ConsentRecord`.
5. **F-03.3 (Unverified Public Claims & Placeholder Contact Defaults):**
   - `DEFAULT_CONTACT_SETTINGS` in `src/modules/contact/types.ts` and fallback expressions (`|| "+960 799 1234"`, etc.) in `src/app/contact/page.tsx` and `src/components/chat/floating-chat-widget.tsx` hardcoded unverified phone numbers, `concierge@xplorer.itnvend.com`, a Malé street address, `"VIA Seaplane Lounge Desk 4B"`, `"24/7"`, and `"Written Quotes Within 4 Hours"` (contradicting `D-003` and `D-014`).
6. **F-03.4 (Misleading `"End-to-End Encrypted"` Badge):**
   - `src/app/login/login-form.tsx` and `src/app/register/page.tsx` rendered a badge labeled `"End-to-End Encrypted"` and `"24/7 Island Concierge"` beneath standard HTTPS authentication forms.
7. **F-09 (Contact Settings Authorization & Audit Gap):**
   - `saveContactSettingsAction` in `src/modules/contact/actions.ts` checked only `Boolean(session?.user?.id && session.user.staff)` without checking role permissions, allowing any staff role (including a read-only `AUDITOR` or `CONSULTANT`) to modify public contact channels, and `saveContactSettings` wrote no `AuditLog` record.

---

## 4. Implementation Approach

1. **Canonical Enquiry Reuse (`src/modules/contact/service.ts`, `src/modules/enquiries/service.ts`):**
   - Extended `submitEnquiry` in `src/modules/enquiries/service.ts` with optional `context.consentSource` (defaulting to `"planner"`) and `context.noticeVersion` so `/plan` behavior is completely unchanged.
   - Rewrote `submitContactEnquiry` in `src/modules/contact/service.ts` to validate contact inputs (including mandatory `consent === true`), construct a canonical `PlannerDraft` with `adultCount = "1"`, `source = "contact_page"`, and `landingPath = "/contact"`, and delegate persistence to `submitEnquiry`.
   - Every valid `/contact` submission now atomically generates a `^ME-E-\d{6}$` reference, creates the initial `EnquiryStatusHistory` (`toStatus: "NEW"`), writes a `ConsentRecord` (`purpose: "ENQUIRY_CONTACT"`, `status: "GRANTED"`, `source: "contact_page"`, `noticeVersion`), records `AuditLog` entries (`enquiry.create`, `consent.grant`) without PII in audit metadata, and queues the transactional acknowledgement via `queueEnquiryAcknowledgement`.
2. **Controlled Contact Form & Explicit Consent (`src/components/contact/contact-form.tsx`, `src/modules/contact/actions.ts`):**
   - Removed `defaultChecked` from `#contact-consent`.
   - Converted form fields to controlled React state so entered values (`name`, `email`, `phone`, `topic`, `dates`, `message`) remain intact if validation or submission fails, and included a per-submission `idempotencyKey` hidden input to prevent duplicate creation on retry.
   - Enforced explicit consent validation on both client and server (`"Consent is required before your enquiry can be sent."`).
3. **Theme Synchronization Fix on Changed Pages (`src/app/globals.css`):**
   - Added `@custom-variant dark (&:where(.dark, .dark *, [data-theme="dark"], [data-theme="dark"] *));` to `src/app/globals.css` so Tailwind v4 `dark:*` utilities match the application's `html.dark` / `html[data-theme="dark"]` state across both light and dark modes.

---

## 5. Security and Privacy Considerations

- **Zero Raw Error or PII Disclosure:** Unexpected errors in `submitContactEnquiry` and `submitContactEnquiryAction` are caught, logged with a fixed non-PII diagnostic (`logError("Contact enquiry submission failed.")`), and return only the general message `"Your enquiry could not be sent right now. Please try again."` (`PUBLIC_CONTACT_ERROR`). Prisma `ConnectorError` strings, constraint names, table/column names, UUIDs, and `submittedSnapshot` PII can never reach the client DOM or server console via raw `err.message`.
- **Audit Metadata Minimization:** Both enquiry creation (`after: { reference, duplicateOf }`), consent grant (`after: { purpose: "ENQUIRY_CONTACT", noticeVersion }`), and contact settings updates (`before` / `after` containing only public channel routing configuration) exclude customer PII and secrets.

---

## 6. Authorization and Audit Changes (Codebase Discrepancy Note)

- **Permission Code Discrepancy Explained:** The prompt referenced `settings.write` *"or the exact equivalent already used by the project"*. Inspection of `src/lib/auth/permissions.ts:38` confirmed that the established permission code in `permissionCodes` is **`"setting.manage"`** (granted to `ADMINISTRATOR`, and withheld from `AUDITOR`, `CONSULTANT`, `CONTENT_EDITOR`, `CONTENT_APPROVER`, and `OPERATIONS_MANAGER`). Rather than inventing a duplicate permission, `saveContactSettings`, `saveContactSettingsAction`, `/admin/settings/contact/page.tsx`, `/admin/layout.tsx`, and `/admin/page.tsx` enforce `userHasPermission(userId, "setting.manage")`.
- **Audit Entity ID Schema Constraint Explained:** Inspection of `prisma/schema.prisma` and live PostgreSQL testing confirmed that `audit_logs.entity_id` has type `@db.Uuid`, whereas `system_settings.key` is a `String` (`"contact.channels"`). Following the existing convention in `src/modules/crm/service.ts:1077-1083`, `saveContactSettings` writes the transactional `AuditLog` row with `actorId`, `action: "setting.update"`, `entityType: "system_setting"`, `entityId: actorId` (valid UUID), and includes `key: "contact.channels"` alongside the public routing fields in `before` and `after`.

---

## 7. Consent-Record Behavior

- `/contact` displays the active notice version (`currentNoticeVersion()`, default `"2026-10-10"`) and links to `/privacy`.
- Server-side `validateContactEnquiryInput` rejects any submission where `consent !== true`.
- When `consent === true`, `submitEnquiry` creates a `ConsentRecord` in the same database transaction with:
  - `subjectType: "CUSTOMER"`
  - `subjectId: customer.id`
  - `purpose: "ENQUIRY_CONTACT"`
  - `status: "GRANTED"`
  - `noticeVersion` (`"2026-10-10"`)
  - `source: "contact_page"`
- Enquiry contact consent is strictly separated from `MARKETING` / newsletter consent.

---

## 8. Public Content Removed or Neutralized

- **Removed from `src/modules/contact/types.ts`, `src/app/contact/page.tsx`, and `src/components/chat/floating-chat-widget.tsx`:**
  - `+960 799 1234` and `+960 332 4500`
  - `concierge@xplorer.itnvend.com`
  - `"Waterfront Executive Building, Boduthakurufaanu Magu, Malé 20026, Maldives"`
  - `"Velana International Airport (VIA) · Seaplane Terminal Private Desk 4B"` / `"Seaplane Lounge Desk 4B"`
  - `"24/7 Island Concierge & Transfer Coordination Desk"`
  - `"Written Quotes Within 4 Hours"`
  - Unconfigured channels now default to disabled/empty in `DEFAULT_CONTACT_SETTINGS` and are hidden until an administrator configures them.
- **Removed from `src/app/page.tsx` and `scripts/seed-rich-catalog.ts`:**
  - Hardcoded `fallbackReviews` (`Elena & Marcus T.`, `David & Claire H.`, `Sophia & Liam K.`) and hardcoded 5-star icons on `/`.
  - Seeded `"Victoria & Alexander M."` review with `verificationStatus: "VERIFIED"` and `"The Maldives Explorer Guarantee"` module in `scripts/seed-rich-catalog.ts`.
- **Removed from `src/app/plan/page.tsx`, `src/app/login/login-form.tsx`, `src/app/register/page.tsx`, `src/app/newsletter/page.tsx`, and `src/app/destinations/page.tsx`:**
  - `"Written Quote in 4 Hours"` / `"Within 4 hours"`
  - `"End-to-End Encrypted"` and `"24/7 Island Concierge"` auth badges, and `"confirmed seaplane vouchers"` login subheading
  - `"100% Verified Flights"` and `"only verified knowledge"`

---

## 9. Policy-Page Limitations (`/terms` and `/privacy`)

- `/privacy` (`src/app/privacy/page.tsx`) and `/terms` (`src/app/terms/page.tsx`) describe only verified, implemented platform behavior (`D-001` consultant-assisted USD quotations, `D-002` `"Price on request"`, `D-004` optional accounts and browser `localStorage` persistence, `D-009` opt-in search analytics and separate newsletter consent, and `D-012` operational recording of export/deletion requests).
- **Pre-commit review change:** the public pages no longer contain internal notes, decision IDs, code identifiers, or any "pending approval" statement. They are limited, noncommittal descriptions of current behavior. They do not state company identity, licence details, legal bases, retention periods, cancellation rights, liability clauses, governing law, or refund rules; those items are tracked only in this document (sections 12 and 13) and in `Persona_Driven_End_to_End_Audit.md`.
- A regression test fails if the rendered pages contain decision IDs, TODO/internal-note markers, "pending"/"legal approval" wording, code identifiers, or governing-law/liability/refund/cancellation terms.
- Neither page claims to be counsel-approved legal text. Because it is not approved, it must not be treated as final legal text before launch (section 13).
- **Search indexing remains disabled (`D-014`):** `publicMetadata()` and the root layout emit `robots: { index: false, follow: false }`, and `src/app/robots.ts` returns `Disallow: /` for all agents. Note: `robots.txt` still advertises `/sitemap.xml`, which is still generated; this is pre-existing, is not a Phase 1 change, and is harmless while `Disallow: /` applies, but should be reviewed together with `D-014` before indexing is enabled.

---

## 9a. Contact Enquiry Party Size (`Enquiry.adultCount`)

- `/contact` does not collect party size, yet `Enquiry.adultCount` is required: the Prisma column is non-null, the `enquiries_party` CHECK requires `adult_count >= 1`, `submitEnquiry` creates one traveler row per adult, and CRM, customer-portal, and quote consumers assume a number.
- **Decision: `adultCount` is not made nullable in this pass.** Doing so needs a migration (dropping the NOT NULL and rewriting the CHECK), a change to traveler-row creation, and a review of every consumer. That is a schema change outside the Phase 1 scope.
- Instead, schema compatibility is kept and the placeholder is marked as not supplied:
  - `submitContactEnquiry` passes `partySupplied: false`; `submitEnquiry` stores `submittedSnapshot.party.supplied` (`true` for `/plan`, `false` for `/contact`). `src/modules/enquiries/party.ts` reads the marker; snapshots without it are treated as supplied (they can only come from `/plan`).
  - CRM staff see **"Not supplied by customer (system placeholder: 1 adult)"** on `/admin/enquiries/[reference]` instead of "1 adults, 0 children", and the placeholder traveler row is not listed.
  - The customer portal shows "Not added" instead of "1" for Adults.
  - `/plan` behavior is unchanged.
- Tests: `src/tests/phase1-remediation.test.tsx` (contact call passes `partySupplied: false`; marker helper distinguishes placeholder from supplied) and `scripts/exercise-enquiry.ts` (PostgreSQL: CRM `readEnquiry` reports `partySupplied === false` with no travelers for the contact enquiry, and `true` with 4 travelers for the planner enquiry).
- Future option: a nullable `adultCount` can be revisited in a dedicated schema change.

---

## 10. Automated Tests Added

1. **`src/tests/phase1-remediation.test.tsx` (15 new Vitest unit & component tests):**
   - Server-side rejection of unchecked contact consent without touching the database.
   - Canonical `ME-E-XXXXXX` creation via `submitContactEnquiry` with `adultCount: "1"`, `source: "contact_page"`, `consentSource: "contact_page"`, and `noticeVersion: "2026-10-10"`.
   - Scrubbed error handling proving simulated Prisma `ConnectorError` exceptions and submitted customer PII never appear in the returned error or server logs.
   - `ContactForm` component test verifying the consent checkbox is unchecked by default, submission without consent shows an alert, and all entered field values are retained for retry.
   - RBAC matrix verification that `setting.manage` is granted to `ADMINISTRATOR` and denied to `AUDITOR`, `CONSULTANT`, `CONTENT_EDITOR`, and `OPERATIONS_MANAGER`.
   - Rejection of unauthenticated users in `saveContactSettings` and `saveContactSettingsAction`.
   - Rejection of staff without `setting.manage` and read-only `AUDITOR` users.
   - Success and transactional `writeAudit` verification for an authorized `ADMINISTRATOR`.
   - Rendering and content verification of `/privacy` and `/terms`, including absence of internal notes, decision IDs, TODO markers, pending-approval wording, code identifiers, and invented legal terms.
   - Placeholder-versus-supplied party size distinction for contact enquiries.
   - `/terms`, `/privacy`, and `robots.txt` keep search indexing disabled.
   - `/register` link resolution to `/terms` and `/privacy` and absence of `"End-to-End Encrypted"` / `"24/7 Island Concierge"` on `/register` and `/login`.
   - Hiding of unconfigured contact channels in `FloatingChatWidget` and `ContactPage` and absence of placeholder phones, emails, addresses, airport desks, and 4-hour SLA claims.
   - Absence of fabricated fallback reviews on `HomePage` when `listTestimonials()` returns empty.
   - Prevention of duplicate `· Maldives Explorer` title suffixes in `publicMetadata`.
2. **`scripts/exercise-enquiry.ts` (PostgreSQL 16 integration assertions):**
   - End-to-end verification against disposable PostgreSQL 16.14 that `submitContactEnquiry` rejects `consent: false`, creates a valid `^ME-E-\d{6}$` enquiry with `adultCount === 1`, `source === "contact_page"`, `statusHistory` (`NEW`), `ConsentRecord` (`ENQUIRY_CONTACT`, `GRANTED`, `source: "contact_page"`), and queued `enquiry.received` acknowledgement, and that `saveContactSettings` rejects an `AUDITOR` while auditing an `ADMINISTRATOR` update.

---

## 11. Full Validation Command Results

Run on Node `v22.23.3`:

| Command | Result |
| --- | --- |
| `npx prisma generate` | Passed (Prisma Client `v6.16.2` generated) |
| `npm run format:check` | Passed (`All matched files use Prettier code style!`) |
| `npm run typecheck` (`tsc --noEmit`) | Passed (0 errors) |
| `npm run lint` (`eslint . --max-warnings 0`) | Passed (0 errors, 0 warnings) |
| `npm test` (`vitest run`) | Passed (`15` test files, `71` tests passed) |
| `npm run docs:validate-schema` | Passed (`schema.prisma is valid`) |
| `npm run build` (`next build`) | Passed (all routes including `/contact`, `/privacy`, `/terms`, and `/admin/settings/contact` compiled cleanly) |
| `node scripts/test-migrations.mjs` | Passed (PostgreSQL 16.14 migrations applied, seed + all 10 stage exercises including the new contact/RBAC assertions passed, dropped, and reapplied) |
| Live Browser Verification (`/contact`, `/privacy`, `/terms`, `/register`, `/`, `/reviews`, `/admin/settings/contact`) | Passed (unchecked consent rejected safely with preserved inputs; checked consent created `ME-E-000001`; `/terms` and `/privacy` returned `200`; fake reviews and placeholder contact claims absent; light and dark modes readable). |

---

## 12. Remaining Management Decisions

1. **Approved Public Contact Channels:** Management must decide which official email address, telephone number, WhatsApp number, Messenger/Telegram handles, office hours, and physical address (if any) should be entered in `/admin/settings/contact`.
2. **Open Owner Decisions (`D-010`, `D-012`, `D-014`):**
   - `D-010`: Staging infrastructure validation prior to production hosting approval.
   - `D-012`: Final data-retention, export, deletion, and anonymization periods.
   - `D-014`: Final brand, domain, and trademark clearance before enabling search indexing.

---

## 13. Items Requiring Qualified Legal Review

1. **Terms of Service (`/terms`):** Corporate entity identification, commercial travel-agency/tour-operator licensing disclosures, payment/deposit terms, cancellation and refund rules, supplier liability boundaries, governing law, and dispute resolution.
2. **Privacy Notice (`/privacy`):** Data controller identity and contact details, jurisdiction-specific lawful bases for processing, international data transfers, third-party processor disclosures, and binding retention/deletion schedules (`D-012`).

---

## 14. Deferred Phase 2 and Phase 3 Work

Per scope instructions, the following audit findings were intentionally deferred to Phase 2 / Phase 3:
- **F-04:** Seeding `ResortTransfer`, `ResortMealPlan`, and `ResortAudience` in `scripts/seed-rich-catalog.ts` and rendering `room.sizeSqm`, `room.maxChildren`, and `resort.checkInNotes` on `/resorts/[slug]` so `/compare` no longer shows `Unknown`.
- **F-05:** Filtering `browser-*` test fixtures on `/guides`, `/faq`, and `/plan` Step 4; replacing hardcoded sample dispatch cards on `/newsletter`.
- **F-06:** Dark-mode styling on `/plan` Step 3 `<select id="tripTypeId">` and `AnalyticsConsent`; adding a `"Remove"` button for child-age inputs on `/plan` Step 3; resolving bottom-right z-index overlap between `CompareTray` and floating widgets; single-photo gallery grid layout on `/resorts/[slug]`; interactive password toggle on `/register`.
- **F-07 & F-08:** Hiding unconfigured Google/Facebook OAuth buttons and cleaning up `scripts/run-dev.mjs`.

---

## 15. Deployment Considerations

- No database schema migration was required for Phase 1; existing constraints (`enquiries_reference`, `audit_logs.entity_id`) are respected natively by the canonical services.
- When deploying to an environment where `scripts/seed-rich-catalog.ts` was previously run, re-running `scripts/seed-rich-catalog.ts` (or deleting the demo review row on `soneva-jani`) removes the previously seeded `"Victoria & Alexander M."` review and updates `TRUST` homepage module copy.
