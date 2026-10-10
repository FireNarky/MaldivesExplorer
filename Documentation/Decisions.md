# Maldives Explorer — Decision log

| Field | Value |
| --- | --- |
| Status | Owner record. A proposed default is not a decision. |
| Date | 10 October 2026 |
| Owner | Naais Mohamed |
| Authority | This file is the first source of truth for decisions D-001 through D-014. The suite remains the product source where this file has no final decision. |

Approval of Implementation Plan version 1.1 does not approve legal, commercial, retention, tax, SLA, hosting, or review policies. Rows marked Provisional keep their proposed default as a placeholder only.

| ID | Current status | Proposed default | Owner approval required | Dependent stage | Final decision | Decision date |
| --- | --- | --- | --- | --- | --- | --- |
| D-001 | Accepted for the MVP boundary | Agent-assisted enquiry and quotation. No payment and no supplier confirmation in the MVP. | Recorded by approval of the MVP boundary. Phase 2 booking still requires the diagram pack’s executive gates. | Releases A–C. Phase 2 booking is outside this decision. | The MVP is an editorial marketplace plus consultant-assisted enquiry and quotation. Direct booking is not in Releases A–C. | 10 October 2026 |
| D-002 | Provisional | Editorial indicative price entered by staff, with currency, occupancy basis, inclusion flags, a source note, and a mandatory review date. No price is public without those fields. | Yes. Commercial policy. | Release A, before any indicative price is published. | Not decided. | — |
| D-003 | Provisional | Manual assignment by Operations or an Administrator. Round-robin stays off. A 2-business-hour first-response target is measured inside the CRM and is not a public promise. | Yes. SLA policy. | Release B. | Not decided. | — |
| D-004 | Accepted | An account is optional. The wishlist works anonymously. Quotes and messages require an account. Planner submission creates a customer record and emails a claim link. | Recorded by approval of the plan’s identity default. | Release A for anonymous save and enquiry capture. Release C for quotes and messages. | Optional accounts, as proposed. | 10 October 2026 |
| D-005 | Provisional | A second approver is required when the discount exceeds 10% of the pre-discount subtotal, or when the grand total exceeds 25,000 USD. | Yes. Commercial policy. | Release B, before a quote is sent. | Not decided. | — |
| D-006 | Provisional | USD for display and quotes. `NUMERIC(12,2)`. Tax and fee lines are explicit. The system does not invent statutory rates. | Yes. Tax and currency policy. | Release B, before a quote is sent. | Not decided. | — |
| D-007 | Accepted for MVP | English only. Content rows store `locale`, default `en`. Further languages are Phase 2. | Recorded for MVP scope. A translation workflow is not approved. | Release A. | MVP content is English. | 10 October 2026 |
| D-008 | Accepted | Auth.js with email and password, email magic link as a second customer method, and TOTP for every staff role. Sessions use HTTP-only secure cookies. | Recorded as the authentication approach. | Stage 1, inside Release A. | Auth.js, customer password and magic link, staff TOTP. | 10 October 2026 |
| D-009 | Provisional | First-party analytics rows. Non-essential analytics wait for opt-in. Categories: necessary, analytics, marketing. | Yes. Privacy policy. | Before non-essential analytics are enabled. Launch gate. | Not decided. | — |
| D-010 | Provisional | Node host with preview deployments, Neon PostgreSQL, Cloudflare R2, Cloudflare DNS and WAF, Resend, and Turnstile. | Yes. Hosting policy. | Stage 0 preview may use a temporary host. Production hosting waits on this decision. | Not decided. | — |
| D-011 | Provisional | A review is first-party only after the customer account accepted a quote that later reached Won, or when an editor records written permission. Other testimonials are labeled editorial. | Yes. Review policy. | Stage 9, before a review is called verified. | Not decided. | — |
| D-012 | Provisional | Enquiries and quotes kept 7 years after closure. Marketing consent evidence kept 3 years after withdrawal. Server access logs kept 90 days. Analytics events kept 14 months. | Yes. Retention and legal policy. | Before production data and retention jobs. | Not decided. | — |
| D-013 | Open | Atoll, island, and resort records come from an owner-approved dataset. Engineering does not invent them. | Yes. Data ownership and import method are not decided. | Release A, before catalog import. | Not decided. | — |
| D-014 | Provisional | The working name is configuration. Public launch waits until trademark, domain, and handle clearance is recorded. The descriptor “Your Maldives, beautifully planned.” is not published as a claim. | Yes. Brand and legal clearance. | Before public launch and before any brand claim. | Not decided. | — |
