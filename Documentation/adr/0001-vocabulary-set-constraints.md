# ADR 0001 — Vocabulary set constraints

| Field | Value |
| --- | --- |
| Status | Accepted for the database contract |
| Date | 10 October 2026 |
| Engine | PostgreSQL 16.14 |

## Context

`vocabulary_items` stores every business taxonomy in one table. A foreign key can point at any row, so the design also has to require a particular `set`. The first contract used `CHECK` constraints that call `vocabulary_item_in_set`, which reads `vocabulary_items`.

That function reads another table. PostgreSQL does not treat that kind of `CHECK` as a supported constraint. On PostgreSQL 16.14 the write-time check worked: a resort could store a `PRICE_BAND` id and rejected a `MEAL_PLAN` id. After `vocabulary_items_set_immutable` was disabled, changing that row’s `set` to `MEAL_PLAN` succeeded, and the resort still pointed at it. The `CHECK` did not recheck the referenced row.

## Decision

Do not use a cross-table `CHECK` for vocabulary sets.

Enforce the set with `BEFORE INSERT OR UPDATE` triggers. Each trigger calls `vocabulary_item_in_set` for one column and one expected set. `vocabulary_items_set_immutable` still rejects a change to `set`.

Typed vocabulary tables were considered. They would give each set its own foreign key target, which `pg_dump` understands. They were not adopted. The taxonomy is one administered list, and the triggers cover the measured failure without a second family of tables.

## Consequences

- A wrong set is rejected when the referencing row is written.
- A vocabulary row cannot change set while the immutability trigger is enabled.
- Disabling triggers is a privileged operation and bypasses this rule, as it would bypass any trigger.
- Restore of a consistent database replays the foreign key, so `vocabulary_items` is loaded before the rows that point at it. The set trigger then sees the vocabulary row.
- Assertion queries in `Database_Design.md` §6.4 remain the check for drift.

## Evidence

Measured on a disposable PostgreSQL 16.14 cluster created only for this validation. The application migration directory was not changed.
