# Stage 4 implementation report

| Field | Value |
| --- | --- |
| Date | 11 October 2026 |
| Scope | Stage 4 saved list, compare, recently viewed, anonymous persistence, and account merge |
| Exit | A visitor can save resorts, offers, experiences, and guides on this device, and those saves move onto the account at sign-in. Compare holds up to three resorts and prints Unknown for a missing fact. Recently viewed stays on this device with a configured limit. |

## Result

Anonymous saves, compare selections, and recently viewed listings stay in `localStorage`. Signing in merges the saved list into `saved_items`. Compare selections and recently viewed listings stay in the browser.

The saved list accepts `RESORT`, `OFFER`, `EXPERIENCE`, and `ARTICLE`. The device list holds 50 items. The account list is the `saved_items` table and is not cut off at 50. A note can be 500 characters. Merge uses the key `entityType:entityId`, keeps the earlier `savedAt`, joins distinct notes in `localeCompare` order, and skips a target id that has no row. A published offer can be stored. There is still no public offer page, so a published offer on the saved list shows its title and summary without a link and without a price.

Compare is resorts only, three at most. A fourth add stays disabled and the tray says “Compare holds 3 resorts.” A missing fact reads “Unknown”. Every published column’s indicative price reads “An indicative price is not published.” An unpublished or missing resort column is named “Unavailable” and its facts read “Unknown”. The public compare query does not select `indicativeFromPrice`.

Recently viewed uses `localStorage`. The limit is `recentlyViewed.limit` when that system setting is a positive number, and 12 when it is absent. The oldest view is dropped past the limit. Views are recorded on the published resort, experience, guide, atoll, island, and collection pages.

Trip planner, customer portal, CRM, quotes, newsletter, reviews, and analytics dashboards were not built.

## Schema changes

None. `prisma/schema.prisma` and the migrations were not changed. `saved_items` and `customers` were already in the database contract. `prisma/seed.ts` now inserts `recentlyViewed.limit` with value `12` for a new seed. An existing database that has no row still uses the code fallback of 12. `.env.local` was not migrated.

## New routes

| Route | Who | Behaviour |
| --- | --- | --- |
| `/wishlist` | public, and the signed-in account | Device list from `localStorage`, or the account list from `saved_items`. Notes and removal are on the page. |
| `/compare` | public | Up to three resort ids from `?ids=`. Stacked attributes below `lg`, a table from `lg`. |
| `/recently-viewed` | public | Device history, limited by `recentlyViewed.limit`. |
| `POST /api/shortlist/resolve` | public | Resolves up to 50 ids to published names. A draft name is not returned. |

The header links to Saved. The footer links to Saved, Compare, and Recently viewed. Save is on the published resort, experience, and guide pages. Compare is on the resort page. Recently viewed is recorded on those pages and on atoll, island, and collection pages.

`GET /api/health` still returns only `status`, `application`, `environment`, and `version`. The homepage heading remains “Maldives Explorer”. Robots stay `noindex` because D-014 is still provisional.

## Wishlist behaviour

| Store | Rule |
| --- | --- |
| Device | Key `me.wishlist.v1`. Invalid JSON and non-UUID rows are dropped. The 51st save returns “The saved list on this device holds 50 items.” |
| Account | `saved_items` unique on `(customerId, entityType, entityId)`. A second save of the same target is a no-op. Adding requires the target to be `PUBLISHED`. |
| Unavailable row | The account and device lists say “This listing is not currently published.” The draft name is not shown. |
| Note | Optional, labelled, 500 characters. The account form is a server action. The device form writes `localStorage`. |

The first account save creates a `customers` row for the user, or links an existing customer with the same email when that row has no user. If that email is already linked to a different user, the save stops with “That email is already linked to another account.”

## Merge behaviour

Sign-in redirects before the browser can send `localStorage`. After a signed-in page loads, the client posts the device list once, clears that device list, and refreshes. A second post of the same items does not insert a duplicate row.

| Rule | Behaviour |
| --- | --- |
| Key | `entityType:entityId` |
| Time | The earlier `savedAt` is kept |
| Notes | Distinct notes are ordered with `localeCompare`, joined by a newline, and clipped to 500 characters. Identical notes stay one note. |
| Missing target | The id is skipped. A saved row is not inserted, so the integrity query for a saved item with no target stays at zero rows. |
| Draft target | The row may be stored. The public list does not show its name. |
| Cap | Incoming device items are capped at 50 before they join the account list. Existing account rows are kept, so the account list can pass 50. |

Compare and recently viewed are not merged onto the account.

## Compare behaviour

| Rule | Behaviour |
| --- | --- |
| Type | Resorts only |
| Cap | `comparison.maxItems` is seeded as 3. The device list and the compare query both stop at 3. |
| Device | Key `me.compare.v1`. The tray shows the count, a link to `/compare`, and Clear. |
| Unknown | Island, atoll, transfer, price band, meal plans, villa types, audiences, house reef, and editorial positioning print “Unknown” when the fact is missing. |
| Transfer | A known type with no minutes reads “type, Unknown”. |
| House reef | `null` is Unknown, `true` is Yes, `false` is No. |
| Indicative price | “An indicative price is not published.” on a published column. “Unknown” on an unavailable column. |
| Parents | Island and atoll names appear only when those records are `PUBLISHED`. Meal plans and villa types come from `PUBLISHED` venues and room categories. Audience tags have no status, so linked names are shown. |

Below `lg` the attributes are stacked and the table is `display: none`. From `lg` the table is shown and the stacked group is hidden, so one presentation is in the accessibility tree.

## Recently viewed behaviour

Key `me.recent.v1`. A repeat view moves to the front. The list is cut to `recentlyViewed.limit`, or 12 when that setting is missing or not a positive number. The page resolves published names through `POST /api/shortlist/resolve`. An unpublished id reads “This listing is not currently published.”

## RBAC and ownership

A saved row can be added, noted, removed, or merged only when the actor user id equals the customer’s user id and both are non-empty. Another account receives “That saved list belongs to another account.” `canReadSavedItem` is also true when the actor’s permissions include `customer.read`. There is no staff screen that lists another customer’s saved items.

Unsigned visitors save on the device. Account writes require a session. Device writes are not audit rows.

## Audit coverage

| Action | When |
| --- | --- |
| `customer.create` | The first account save creates the customer. |
| `customer.link` | An existing customer with the same email and no user is linked. |
| `wishlist.add` | An account save creates a `saved_items` row. |
| `wishlist.remove` | An account item is removed. |
| `wishlist.note` | An account note changes. The audit stores the previous and next note. |
| `wishlist.merge` | One row on the customer id. `before` is the previous count. `after` includes the merged notes. |

## Tests added

| Check | Result |
| --- | --- |
| `src/tests/wishlist.test.ts` | Merge keeps the earlier time and both notes. A duplicate save does not grow the list. The 51st device save is refused. Compare stops at 3. Recently viewed drops the oldest item. Ownership requires the same user id. `customer.read` can read. Missing compare facts are Unknown. The indicative price sentence is fixed, and `src/modules/compare/service.ts` does not select `indicativeFromPrice`. |
| `npm test` | 27 tests, 8 files, passed. |
| `scripts/exercise-wishlist.ts` via `npm run test:migrations` | On disposable `maldives_stage1` only. A published resort is saved. A draft cannot be added through the published-only add. Another user cannot remove or change the note. Merge keeps “Account note” and “Device note”, stores the draft without a public name, skips a missing id, writes `wishlist.merge` and `customer.create`, and a second merge does not duplicate the resort. Integrity queries stay at zero rows. Migrations were dropped and reapplied. |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed. |
| Playwright `tests/smoke.spec.ts` | 4 passed, including the homepage heading, the health payload, and the skip link. |

## Verification

Checked in the browser against a disposable database, not `.env.local`.

Saving Browser Resort stored it on the device and `/wishlist` linked “Browser Resort” with the note “Window note”. Compare added the resort and the tray read “1 of 3 resorts”. `/compare` with that resort and two unknown ids showed “Browser Resort”, two “Unavailable” columns, “Unknown” for missing facts, and “An indicative price is not published.” At 1920px the table was shown and the stacked group was hidden. At 390px the stacked group was shown, the table was hidden, and the page did not overflow. Recently viewed listed Browser Resort at 390px without overflow. `/resorts/browser-draft-resort` returned 404 and did not show the draft name. With three other ids already selected, Compare on Browser Resort was disabled and the page said “Compare holds 3 resorts.”

Creating an account signed the visitor in, cleared the device saved list, and `/wishlist` showed Browser Resort with “Window note” from the account. The homepage heading stayed “Maldives Explorer”. At 390px the homepage and the saved page did not overflow.

The disposable database and the Next.js process were stopped afterward, and `.data` was removed.

## Open defects

Stored redirect codes `301` and `302` are still applied as `308` and `307`. That defect is unchanged from Stage 3.

A Next.js development overlay can report a hydration mismatch while the automation browser is attached. The attribute involved is the browser’s `data-cursor-ref`. Saving, compare, recently viewed, and account merge still completed.

## Remaining items

- Offer pages are still not built. A published offer can be saved and listed, and it has no public URL and no price.
- Compare and recently viewed stay on the device after sign-in. They are not copied into the database.
- There is no staff list of saved items.
- Trip planner, customer portal, CRM, quotes, newsletter, reviews, and analytics dashboards were not built.
- D-014 is still provisional, so robots disallow the whole site. D-002 is still provisional, so indicative prices stay off public pages, including compare.
- Stage 3 leftovers remain: collection full-text search, Meilisearch, tag pages, `SCHEDULED` promotion, the collection-item editor, the FAQ owner picker, reusable blocks, video transcripts, the filter panel, and map view. `mapView` stays disabled.

Stage 5 was not started.
