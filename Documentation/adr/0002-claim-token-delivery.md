# ADR 0002 — Claim token delivery

| Field | Value |
| --- | --- |
| Status | Accepted for Stage 10.1 |
| Date | 17 October 2026 |
| Decision | D-004 still requires a claim link. D-010 does not approve production email. |

## Context

An unlinked trip plan needs a one-time link so the customer can attach it to an account. The first implementation stored the raw link in `jobs.payload` and only the hash in `verification_tokens`. The job could finish while the email stayed queued, so the bearer token remained in the database. A later worker cannot rebuild a raw token from a hash.

## Decision

Do not persist the raw claim token.

1. The acknowledgement job stores the enquiry id, the reference, and whether a claim is required. It does not store a token or a claim URL.
2. `verification_tokens.token` stores only the SHA-256 hash.
3. The raw token is minted in memory when a configured email provider is about to accept the message. It is placed only in that outbound body.
4. If the provider refuses, or does not return a provider message id, the hash is deleted before the delivery is marked `FAILED`. The delivery is marked `SENT` only after a provider message id is returned.
5. Redeeming a token deletes the hash. An expired token is deleted on the redeem attempt and is not accepted.
6. Migration `20261017000000_stage10_1_staging` deletes existing `claim:` verification rows. Those development and test tokens are retired.
7. Audit rows for the enquiry do not include the token. Logs pass through a scrubber. `GET /api/health` does not grow new fields.

The same mint-at-send rule is used for password reset, magic link, and newsletter confirmation tokens. Those raw values are not job payload fields.

A capture provider exists only outside staging and production so the integration exercise can read a confirmation link from process memory. Staging startup rejects that provider.

## Consequences

- A claim link is not created until a provider accepts the acknowledgement. With email unconfigured, no claim hash is left behind.
- A crash after the provider accepts and before the process exits can leave a hash whose raw value was only in the sent message. That token still expires and is single use.
- Staging email must use an allowlist so a test send cannot go to an arbitrary customer.
