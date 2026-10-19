# Maldives Explorer Component Design Specifications

This guide details the anatomy, accessibility contracts, and props for the redesigned UI component library.

---

## 1. `PaletteSwitcher` (`components/layout/palette-switcher.tsx`)

### Purpose
Floating live theme controller allowing instant switching between all 6 WCAG AA compliant design directions.

### Anatomy
- **Trigger Pill**: Positioned fixed at `bottom-20 right-4` (mobile, above action bar) and `bottom-6 right-6` (desktop). Shows current theme swatch dot, current theme name, and palette icon.
- **Theme Popover Dialog**: Modal drawer showing list of 6 palettes, each with a 3-color swatch cluster (Ocean, Accent, Sand), theme title, positioning tagline, and active checkmark.

### Behavior & Storage
- Applies `data-palette="[id]"` directly to `document.documentElement`.
- Persists user selection in `localStorage.setItem("mdv-palette", id)`.
- Respects reduced-motion settings with CSS transition suppression.

---

## 2. `QuickSearchDialog` (`components/layout/quick-search-dialog.tsx`)

### Purpose
Command-style global search dialog for keyboard-first navigation and instant discovery.

### Shortcuts
- **Open**: Press `/` anywhere on the page (unless focused in an input), or press `Cmd+K` / `Ctrl+K`.
- **Close**: Press `Escape` or click the backdrop.

### Anatomy
- **Input Field**: Auto-focused search input with instant debounced queries to `/api/search/suggestions?q=...`.
- **Category Icons**: Unique Lucide iconography for Resorts (`Waves`), Atolls (`MapPin`), Experiences (`Compass`), and Guides (`FileText`).
- **Quick Links**: Default curated shortcuts to top resorts (Soneva Jani, Soneva Fushi, Ritz-Carlton) and guides when input is empty.

---

## 3. `ResortCard` (`components/patterns/resort-card.tsx`)

### Purpose
Primary card pattern for displaying resorts on catalog lists and the homepage.

### Anatomy
- **Lead Image**: Aspect ratio `3:2` with Next.js unoptimized local image loading from `/media/[id]`.
- **Location Tag**: Icon + combined island and atoll name (e.g. `Kunfunadhoo, Baa Atoll`).
- **Resort Title**: Fraunces serif heading with full-card clickable surface via `after:absolute after:inset-0`.
- **Summary**: Up to 3 lines of editorial summary text.
- **Price Disclosure**: Mandatory statement clarifying price on application per owner decision D-002.

---

## 4. `DestinationCard` (`components/patterns/destination-card.tsx`)

### Purpose
Displays geographic atolls on `/destinations` with location metadata and marine highlights.

### Features
- Atoll badge pill
- Geographic coordinates display (e.g. `5.13°N, 72.97°E`)
- Clean serif title and descriptive text
- Hover lift animation (`-translate-y-1` with shadow elevation)

---

## 5. `ExperienceCard` (`components/patterns/experience-card.tsx`)

### Purpose
Displays signature adventures (Hanifaru Bay mantas, whale sharks, undersea dining).

### Features
- 16:10 lead photograph with zoom on hover
- Category tag pill (e.g. `Manta Rays`, `Scuba Diving`)
- Duration guidance (`Clock` icon)
- Seasonality information (`Sparkles` icon)

---

## 6. `GuideCard` (`components/patterns/guide-card.tsx`)

### Purpose
Editorial magazine-style cards for travel insights and planning guides.

### Features
- 16:9 lead image
- Topic category badge
- Author credit with `User` icon
- Excerpt with clamp and direct read link

---

## 7. `OfferCard` (`components/patterns/offer-card.tsx`)

### Purpose
Promotional luxury package cards on `/offers`.

### Features
- Special Offer badge
- Expiration date notice
- Resort name link
- Transfer inclusion badge (`Transfers Included`)
- Minimum stay badge
