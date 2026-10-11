# Stage 2 implementation report

| Field | Value |
| --- | --- |
| Date | 11 October 2026 |
| Scope | Stage 2 catalog and CMS foundation |
| Exit | An editor can prepare a resort, an approver can publish it, and it appears on `/resorts` and `/resorts/[slug]` with SEO fields. An empty published homepage module renders an empty state. |

## Result

Catalog and CMS records can be drafted, reviewed, and published by staff. Public resort pages list only `PUBLISHED` resorts. Indicative prices are not rendered. Search, wishlist, planner, CRM, quotes, the customer portal, newsletter sending, reviews, and analytics dashboards were not built. Those modules remain scaffolds.

## Schema changes

None. `prisma/schema.prisma` and the Stage 1 migrations were not changed. Publication dates, slug checks, price completeness, reef source, and article reviewer rules stay in the existing database contract.

## New routes

| Route | Who | Behaviour |
| --- | --- | --- |
| `/admin/catalog/[section]` | `catalog.read` or `catalog.write` | Lists atolls, islands, resorts, room types, dining venues, transfers, amenities, audience tags, experience categories, and experiences. |
| `/admin/catalog/[section]/[id]` | same | Creates (`id` is `new`) or edits a record and moves its publication status. |
| `/admin/content/[section]` | `content.read` or `content.write` | Lists content categories, tags, author profiles, articles, FAQs, collections, homepage modules, and reusable blocks. |
| `/admin/content/[section]/[id]` | same | Creates or edits those records and moves publication status where the record has one. |
| `/admin/media` | `media.read` or `media.write` | Lists files. Writers can upload JPEG, PNG, WebP, MP4, or WebM. |
| `/admin/media/[id]` | same | Edits alt text, caption, and attribution, links a catalog or content owner, and moves status. |
| `/resorts` | public | Lists published resorts. |
| `/resorts/[slug]` | public | Published resort detail. Document title and description use the SEO fields. |
| `/media/[id]` | public | Returns bytes only when the asset is `PUBLISHED`. Anything else is 404. |
| `/` | public | Keeps the heading “Maldives Explorer” and renders published homepage modules, or an empty state. |

`GET /api/media` still requires `media.read`. `GET /api/health` still returns only `status`, `application`, `environment`, and `version`.

The staff navigation is limited to the permissions on the signed-in account. A reader sees the fields without a save control.

## New services

| Module | Responsibility |
| --- | --- |
| `src/modules/publishing` | Allowed status moves, write versus publish permission, separation of duties, and audit inside the same transaction. |
| `src/modules/destinations` | Atoll and island save and publication. Publishing requires an SEO title and description. |
| `src/modules/catalog` | Resorts, room types, dining venues, transfers, amenities, audience tags, and amenity or audience links. Public queries omit indicative price columns. |
| `src/modules/experiences` | Experience categories and experiences. Publishing an experience requires SEO fields. Seasonality still requires a source note and review time. |
| `src/modules/content` | Content categories, tags, author profiles, articles, FAQs, collections, homepage modules, and reusable blocks. |
| `src/modules/media` | List, metadata, status, owner links, and a published-only read. Upload still creates a `DRAFT` asset. |
| `src/modules/admin` | Form actions for the routes above. Staff layout filters navigation. |

Publication moves are `DRAFT` → `IN_REVIEW` → `APPROVED` → `SCHEDULED` or `PUBLISHED` → `UNPUBLISHED` → `ARCHIVED`. `DRAFT` and `IN_REVIEW` need the write permission. Later statuses need the publish permission. When `requireSeparationOfDuties` is true, the creator cannot be the person who sets `PUBLISHED`. Published, scheduled, and archived records must be unpublished before they are edited.

Author profiles exist so an article can name an author. They are not a public expert directory. FAQ owner type `OFFER` is not offered in the form.

## Tests added

| Check | Result |
| --- | --- |
| `src/tests/publishing.test.ts` | Draft cannot jump to published. Review then approval then publish stamps `publishedAt`. A schedule without a time is rejected. `catalog.write` cannot publish. `content.write` can move a record to review. |
| `src/tests/catalog-schema.test.ts` | An indicative price without its source fields is rejected. A complete price is accepted. An empty homepage module is valid. |
| `npm test` | 15 tests, 6 files, passed. |
| `scripts/exercise-catalog.ts` via `npm run test:migrations` | On disposable `maldives_stage1` only. An editor creates an atoll, island, and resort and cannot publish. An approver publishes. The public query returns the resort without a price column. Unpublishing removes it. The creator cannot publish their own atoll. An empty homepage module can be published. Audit rows cover catalog create, update, and transition, content create and transition, and media create and transition. Integrity assertions still return zero rows. Migrations were dropped and reapplied. |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed. |
| Playwright `tests/smoke.spec.ts` | 4 passed, including the health payload. |

## Audit coverage

Each successful save or status move writes one audit row in the same transaction as the change.

| Action | Records |
| --- | --- |
| `catalog.create`, `catalog.update`, `catalog.transition` | Atolls, islands, resorts, room types, dining venues, transfers, amenities, audience tags, experience categories, experiences. Amenity and audience links audit as `catalog.update` on the resort. |
| `content.create`, `content.update`, `content.transition` | Categories, tags, author profiles, articles, FAQs, collections, homepage modules, reusable blocks. Categories and tags have no status, so they are create and update only. |
| `media.create`, `media.update`, `media.transition`, `media.link` | Uploads, metadata, status, and owner links. |

## RBAC coverage

| Permission | Used for |
| --- | --- |
| `catalog.read` | Catalog lists and read-only editor. |
| `catalog.write` | Catalog drafts and moves to `DRAFT` or `IN_REVIEW`. |
| `catalog.publish` | Catalog moves to `APPROVED`, `SCHEDULED`, `PUBLISHED`, `UNPUBLISHED`, or `ARCHIVED`. |
| `content.read` | Content lists and read-only editor. |
| `content.write` | Content drafts and moves to `DRAFT` or `IN_REVIEW`. |
| `content.publish` | Content publication moves. |
| `media.read` | Media list and `GET /api/media`. |
| `media.write` | Upload, metadata, links, and media status. |

`CONTENT_EDITOR` can write and cannot publish. `CONTENT_APPROVER` can write and publish. The seeded separation setting blocks a person from publishing a record they created. `AUDITOR` can read and cannot save.

## Verification

Checked in the browser against a disposable database, not `.env.local`. A content editor enrolled staff MFA, created an atoll, island, and resort, and could move them only as far as review. An approver enrolled MFA, approved and published that resort, and published an empty featured-offers homepage module. The approver’s own approved atoll stayed approved and the page showed “Another person must publish this record.”

`/resorts` listed “Browser resort” with the published island and atoll. `/resorts/browser-resort` used the SEO title, showed the property type, and said “An indicative price is not published.” No price amount was on the page. `/` kept one `h1` and showed the empty module state “Nothing is selected for this module.” `GET /api/health` returned the four public fields. `GET /media/{unknown}` returned 404.

## Open defects

A Next.js development overlay reported a hydration attribute mismatch on the staff layout while the automation browser was attached. Saving, review, and publication still completed. It was not confirmed as a broken control outside that session.

## Remaining Stage 2 work

- `SCHEDULED` is stored. No job promotes it to `PUBLISHED` when the time arrives.
- Collection records can be published. Collection items are not edited.
- FAQ owner is a typed id, not a picker of the resort, island, atoll, experience, or article.
- Reusable blocks are stored. Public pages do not insert them.
- The media form edits alt text, caption, and attribution. It does not edit a video transcript. A caption is enough to publish a video.
- Public pages for atolls, islands, experiences, articles, FAQs, and collections are not built. Those discovery pages belong to later stages.
- Preview URLs, search, sitemap, redirects, the filter panel, map view, and JSON-LD are not built. `mapView` stays disabled.
- D-002 is still provisional, so a complete indicative price can be stored and is not shown. D-014 is still provisional, so the site stays `noindex`.

Stage 3 was not started.
