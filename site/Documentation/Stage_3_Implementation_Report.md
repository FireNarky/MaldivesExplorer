# Stage 3 implementation report

| Field | Value |
| --- | --- |
| Date | 11 October 2026 |
| Scope | Stage 3 discovery layer |
| Exit | Published atolls, islands, experiences, guides, collections, and questions have public pages. Search uses PostgreSQL full-text on published rows only. Pages carry metadata, canonical URLs, Open Graph, breadcrumbs, and structured data. The sitemap lists published URLs. An active redirect is applied. |

## Result

Public discovery pages read `PUBLISHED` records. Search uses the generated `search_vector` columns and `websearch_to_tsquery('english', …)`, and it does not return drafts. Suggestions use `pg_trgm` `similarity()` on published names and titles. Search analytics rows are written only when analytics consent is granted. The site remains `noindex` because D-014 is still provisional.

Wishlist, compare, trip planner, CRM, quotes, the customer portal, newsletter, reviews, and analytics dashboards were not built.

The implementation-plan Stage 3 row also names offers and an expiry exit. Offers were not in the authorized list for this stage, so offer pages, offer search, and offer expiry were not built.

## Schema changes

None. `prisma/schema.prisma` and the existing migrations were not changed. Search vectors, trigram indexes, redirects, content relations, collection items, and `analytics_events` were already in the database contract. Application code does not write `search_vector`.

## New routes

| Route | Who | Behaviour |
| --- | --- | --- |
| `/destinations` | public | Lists published atolls. |
| `/atolls/[slug]` | public | Published atoll, its published islands, resorts, experiences, related guides, and questions. |
| `/islands/[slug]` | public | Published island. The parent atoll is linked only when that atoll is published. |
| `/experiences` | public | Lists published experiences. |
| `/experiences/[slug]` | public | Published experience, linked published resorts and islands, related guides, and questions. |
| `/guides` | public | Lists published articles. |
| `/guides/[slug]` | public | Published guide. Canonical path uses `canonicalPath` when it is set. |
| `/collections` | public | Lists published collections. |
| `/collections/[slug]` | public | Published collection. Items are included only when the target record is published. |
| `/faq` | public | Published global questions. |
| `/search` | public | Grouped search. `q` and `type` stay in the URL. |
| `/api/search/suggestions` | public | Published-name suggestions. Drafts are not returned. |
| `/sitemap.xml` | public | Published hubs and published detail URLs. |
| `/admin/redirects` | `content.read` or `content.write` | Lists redirects. Writers can save or deactivate one. Unsigned visitors go to `/login`. |

Existing `/`, `/resorts`, and `/resorts/[slug]` now include breadcrumbs, canonical URLs, Open Graph, and structured data. Resort detail also lists published related experiences, guides, and questions. `GET /api/health` still returns only `status`, `application`, `environment`, and `version`.

`/guides/[category]` from the application outline was not added. A dynamic category segment would occupy the same path as `/guides/[slug]`. The guide page shows the category name instead.

## Search implementation

`src/modules/search` queries PostgreSQL directly.

| Group | Query |
| --- | --- |
| Resorts, atolls, islands, experiences | `status = 'PUBLISHED'` and `search_vector @@ websearch_to_tsquery('english', $1)`, ordered by `ts_rank`. |
| Guides | Same full-text predicate on `articles`. |
| Collections | `status = 'PUBLISHED'` and `ILIKE` on title or summary. Collections have no generated `search_vector`. |

Suggestions run `similarity(name, $1) > 0.2` or `similarity(title, $1) > 0.2` against published resorts, atolls, islands, experiences, and guides. The search field requests `/api/search/suggestions` while typing and still submits without that list.

An empty query shows the search form. A query with no published match shows an empty state and links to resorts, destinations, and guides. Recent searches are kept in the `me_recent` cookie, five at most.

Indexing is the generated column already maintained by PostgreSQL. There is no separate reindex job and no Meilisearch adapter.

## SEO implementation

`publicMetadata` sets the document title, description, canonical URL, Open Graph title, description, and URL, and `robots` `noindex, nofollow`. The canonical origin is the `AUTH_URL` origin, or `http://127.0.0.1:3000` when that value is absent. Guide canonical URLs use `canonicalPath` when the published article has one. A published Open Graph image is added only when `ogMedia` is `PUBLISHED`.

`src/app/robots.ts` still disallows all crawling and now points at `/sitemap.xml`. `src/app/sitemap.ts` is dynamic and lists `/`, the public hubs, and published atoll, island, resort, experience, guide, and collection paths. Drafts are omitted.

Visible breadcrumbs use `nav` with `aria-label="Breadcrumb"`. The current page is `aria-current="page"`.

## Structured-data coverage

| Page | JSON-LD |
| --- | --- |
| `/`, `/search` | `WebSite` with `SearchAction` |
| Atoll, island | `Place`, plus `GeoCoordinates` when both coordinates exist, and `BreadcrumbList` |
| Resort | `LodgingBusiness` without a price, and `BreadcrumbList` |
| Experience | `TouristAttraction` and `BreadcrumbList` |
| Guide | `Article`, author only when the author profile is `PUBLISHED`, and `BreadcrumbList` |
| Collection | `CollectionPage` with `ItemList`, and `BreadcrumbList` |
| `/faq` and owner question lists that have rows | `FAQPage` |
| Detail and hub pages | `BreadcrumbList` |

No rating, review, or price is added to the structured data.

## Search analytics coverage

| Event | When it is stored |
| --- | --- |
| `search.query` | Consent cookie `me_analytics=granted` and the query has at least one published hit. |
| `search.no_results` | Same consent and the query has no published hit. |

`DENIED` and `UNKNOWN` do not insert a row. The granted cookie can also set `me_anon`, which is stored as `anonymousKey`. Properties are the query text and the result count. There is no analytics dashboard. The choice is the banner “Search analytics stays off until you allow it.” with Allow and Decline.

## Related content

Related guides come from `content_relations` whose article is `PUBLISHED`. A guide’s own relations resolve only when the target resort, experience, article, island, or atoll is `PUBLISHED`. Offer relations are skipped because there is no public offer page. Islands and atolls also list published resorts and experiences linked in the catalog. Empty relation lists are omitted. An empty collection shows an empty state.

## Redirect engine

Changing the slug of an atoll, island, resort, experience, guide, or collection writes an active `301` from the old public path to the new one inside the same save transaction. A reverse row is removed so the two paths do not point at each other. Staff with `content.write` can also save or deactivate a redirect at `/admin/redirects`. Paths under `/admin`, `/api`, `/login`, and `/media` are rejected.

The root layout reads `x-pathname` from middleware and applies an active redirect. Next.js sends stored `301` and `308` through `permanentRedirect`, which responds `308`. Stored `302` and `307` go through `redirect`, which responds `307`.

## Tests added

| Check | Result |
| --- | --- |
| `src/tests/discovery.test.ts` | Full-text SQL requires `PUBLISHED` and `search_vector`. Suggestions require `PUBLISHED`. Consent is recorded only when granted. Canonical and Open Graph metadata stay `noindex`. Redirects cannot capture `/admin`. |
| `npm test` | 22 tests, 7 files, passed. |
| `scripts/exercise-discovery.ts` via `npm run test:migrations` | On disposable `maldives_stage1` only. Published full-text search finds the exercise atoll. A draft resort named `draftonlytoken` is absent from search and suggestions. A slug change stores `/atolls/discovery-old` → `/atolls/discovery-new`. A draft atoll is not returned by the public query. Denied and unknown consent add no analytics row. Granted consent adds one `search.query` row. A published question is public and a draft question is not. The sitemap includes the published atoll and excludes the draft resort and draft atoll. Migrations were dropped and reapplied. |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed. |
| Playwright `tests/smoke.spec.ts` | 4 passed, including the health payload and the skip link. |

## Verification

Checked in the browser and with HTTP requests against a disposable database, not `.env.local`.

Published pages for the atoll, island, resort, experience, guide, collection, destinations hub, and questions returned 200 with a canonical URL, `noindex, nofollow`, and JSON-LD. The resort page showed “An indicative price is not published.” and linked the published experience and guide. `/resorts/browser-draft-resort` returned 404. Search for “Browser Resort” listed that resort. Search for `browserdrafttoken` showed “No published matches” and did not link the draft. Suggestions for that draft token did not include the draft href. `/sitemap.xml` listed the published paths and omitted the draft resort. `/atolls/browser-old` responded `308` to `/atolls/browser-atoll`. `GET /api/health` returned the four public fields. `/admin/redirects` redirected unsigned visitors to `/login`.

A search with `me_analytics=granted` stored one `search.query` row. A later search with `me_analytics=denied` did not add a row.

At a 390px viewport, the atoll, search, and resort pages had no horizontal overflow. The search form submitted “Browser Resort”, kept it as a recent search, and showed the resort result.

## Open defects

Stored redirect codes `301` and `302` are applied as `308` and `307`. Next.js App Router redirect helpers do not emit `301` or `302` from the layout.

A Next.js development overlay reported a hydration mismatch on breadcrumbs while the automation browser was attached. The diff was the browser’s `data-cursor-ref` attribute. Search submission and the resort page still completed.

## Remaining Stage 3 items

- Offer pages, offer search, and offer expiry are not built. The plan’s Stage 3 exit, “expired offers vanish from lists,” was outside this authorization.
- Collections are not in the generated full-text index. Their published search is `ILIKE`. Suggestions do not include collections.
- Meilisearch remains a later adapter. This stage uses PostgreSQL.
- `301` and `302` are stored and applied as `308` and `307`.
- Result clicks are not a separate analytics event. `search.query` and `search.no_results` are the stored events.
- `/guides/[category]` was not added, because it would collide with `/guides/[slug]`.
- Tag landing pages were not added.
- `SCHEDULED` promotion, the collection-item editor, the FAQ owner picker, reusable blocks on public pages, video transcript editing, the filter panel, and map view remain unbuilt. `mapView` stays disabled.
- D-014 is still provisional, so robots disallow the whole site even though the sitemap and per-page metadata exist. D-002 is still provisional, so indicative prices stay off public pages. D-009 still limits analytics to an explicit grant.

Stage 4 was not started.
