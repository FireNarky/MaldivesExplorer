# Production decisions required

| Field | Value |
| --- | --- |
| Date | 17 October 2026 |
| Authority | `Documentation/Decisions.md` |
| Rule | This file lists only decisions that are still unresolved or provisional. It does not change a decision. |

Recorded decisions are not repeated here. D-001, D-002, D-003, D-004, D-005, D-006, D-007, D-008, D-009, D-011, and D-013 are recorded in `Documentation/Decisions.md`.

## D-010 Hosting, storage, email, and monitoring

| | |
| --- | --- |
| Status | Provisionally approved for staging. Not a production decision. |
| What must be decided | Whether the preferred staging stack is approved for production, after staging has proved it. |
| Preferred staging stack | Cloudflare DNS, CDN, and WAF. Cloudflare Turnstile. Cloudflare R2. A Cloudflare-compatible Next.js runtime. Managed PostgreSQL 16. Resend for transactional email. GitHub and GitHub Actions. Sentry or equivalent monitoring. |
| What staging must prove | Compatibility with Auth.js, Prisma, PostgreSQL, jobs, PDF generation, media storage, and shared rate limiting. |
| Current application behavior | No vendor is hard-wired. Media uses the local disk adapter. Email delivery is not configured: delivery rows stay `QUEUED`, and `email.deliver` marks the job `FAILED`. A row is not marked `SENT` without provider confirmation. Turnstile runs only when `TURNSTILE_SECRET_KEY` is set, and the widget is not rendered. Sign-in, enquiry, newsletter, analytics, and customer-message limits are counters in the current Node process. |
| Launch consequence | Production has no approved host, database, object storage, email provider, bot check, or monitoring sink. More than one application process would not share the current rate limits. |
| Recommended option | Prove the preferred stack in staging, including a shared rate limiter. Accept that proof before treating D-010 as the production decision. |
| Alternatives | Reject the staging stack after the proof and choose different services. Do not treat this provisional approval as permission to deploy production. |
| Blocks production | Yes. |

Staging email, once Resend is configured for that environment, still needs a server-side API key that is not committed and is not written to logs or `GET /api/health`, a from-address on a domain the owner controls, and a provider response before any row is marked `SENT`. That configuration does not approve Resend for production.

## D-012 Retention, export, deletion, and anonymization

| | |
| --- | --- |
| Status | Open. |
| What must be decided | The retention, export, deletion, and anonymization policy for production personal data. No retention period is approved. |
| Current application behavior | No production retention job deletes or anonymises rows. A privacy export request and a privacy deletion request are stored. Their jobs confirm that the customer exists. They do not produce an export file and they do not close the account. |
| Launch consequence | Production personal data would be kept without an approved policy. A request would be presented as a completed export or deletion if those jobs were treated as the outcome. |
| Recommended option | Approve the policy before any production personal data is collected. Until then, staging uses synthetic or test personal data only. |
| Alternatives | Delay production until the policy exists. Do not adopt the earlier unapproved period suggestions. |
| Blocks production | Yes. |

## D-014 Brand, domain, and indexing

| | |
| --- | --- |
| Status | Provisional. |
| What must be decided | Name, domain, and brand clearance, and whether production indexing may be enabled. |
| Current provisional instruction | The working brand remains Maldives Explorer. The application stays noindex. The descriptor “Your Maldives, beautifully planned.” is not published as a claim. |
| Current application behavior | `robots.txt` disallows `/`. Public metadata sends `noindex, nofollow`. |
| Launch consequence | Enabling production indexing, or publishing the descriptor as a claim, would launch an uncleared brand. |
| Recommended option | Keep noindex until name, domain, and brand clearance is recorded. |
| Alternatives | Record clearance and then allow indexing in a later change. Do not enable production indexing under this provisional row. |
| Blocks production | Yes for a public indexed launch. |
