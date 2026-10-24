# UI review and gaps

Date: 19 October 2026. Basis: repo at `c069c34`, the architecture diagram, and the Stage 10 readiness checklist.

## What changed in this UI pass

| Area | Change |
| --- | --- |
| Header | Active-page underline, Search icon, coral "Plan my trip" from `lg`, mobile menu (Escape closes, focus returns) |
| Mobile | Fixed Search / Plan my trip action bar (Design_System §4.1); compare tray sits above it |
| Footer | Three link columns, newsletter in a white card (contrast-safe on ocean) |
| Homepage | Full-bleed ocean hero, explore cards, three-step planning band. CMS modules still render below |
| Resorts list | Card grid (1/2/3 columns), lead photo, location, price disclosure. New `listLeadResortImages` (one query) |
| Resort detail | Gallery, overview facts, card grids for rooms/dining/transfers, badges, sticky "Plan a stay here" panel |
| Patterns | `PageHeader`, `ResortCard`, `PriceDisclosure` in `components/patterns` |

No invented prices, reviews, claims or the unapproved descriptor (D-002, D-011, D-014). Typecheck and lint pass. No horizontal overflow at 390px and 1440px on home, resorts and resort detail (checked with placeholder seed data).

## Gaps found (not fixed here)

### Blocked on owner decisions
- D-010 hosting, email, storage, shared rate limiter: no email is sent; quotes and acknowledgements stay QUEUED.
- D-013 catalog data: the site is empty until staff publish real records.
- D-014 domain, brand, indexing: site is `noindex`.
- D-012 retention: privacy export and deletion do nothing yet.
- D-002 / D-006 prices and currency: no public prices.

### Security and quality (from the checklist)
- Claim link token stored in `jobs.payload` (FAIL).
- `npm audit`: 11 findings (10 high).
- No WCAG 2.2 AA audit, no Core Web Vitals measurement, backup/restore untested.
- In-process rate limits only; no bot check rendered.

### UI and product gaps
1. Analytics consent renders in page flow above the footer. It should be a dismissible banner with a footer "Cookie settings" link.
2. No legal pages: privacy, cookies, terms, accessibility (Design_System requires footer links).
3. Global search is a page, not the specified dialog. No filters, sort or chips on resorts, offers or search.
4. No map (`MapWithList`), no lightbox gallery, no skeleton/loading states.
5. Other listing pages (destinations, offers, experiences, guides, collections, islands, atolls) still use the old plain list. Apply `PageHeader` and card patterns.
6. Empty-state pages use `h2` instead of `h1` (checklist FAIL). Fixed for resorts only.
7. Homepage has no featured resort/destination modules until CMS content exists, and no hero photography (needs licensed media with alt text).
8. Contact options missing: phone/WhatsApp, business address, company registration. Response-time wording stays internal (D-003).
9. No payment or booking step. Confirm quote-led is intended.
10. No multi-language or currency switcher; no seasonal, ferry or transfer-availability info.
11. Custom icon set (atoll, speedboat, seaplane, water-villa, reef) not drawn; Lucide stand-ins used.
12. Compare is device-local and resort-only.
13. Video transcript editor missing in admin.

## Suggested order
1. Owner decisions D-010, D-013, D-014 (unblock real content and email).
2. Cookie banner, legal pages, accessibility audit.
3. Roll cards and `PageHeader` to remaining listing pages; add filters.
4. Photography and map.
