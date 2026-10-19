# Maldives Explorer — Luxury UI & Design System Pack (v2.0)

This design pack contains the design tokens, color directions, vector swatches, and component specifications created for the Maldives Explorer luxury travel marketplace.

---

## Pack Contents

| File | Purpose |
| --- | --- |
| [`tokens.json`](tokens.json) | Complete W3C design tokens for all 6 WCAG AA palettes, typography scales, elevation shadows, radii, and breakpoints. |
| [`palettes.css`](palettes.css) | Drop-in CSS custom properties for all 6 design directions with `@theme` Tailwind 4 mappings. |
| [`swatches.svg`](swatches.svg) | Vector color swatch sheets showing all hex codes, roles, and contrast validation. |
| [`components.md`](components.md) | Component architecture and props guide for `PaletteSwitcher`, `QuickSearchDialog`, `ResortCard`, `DestinationCard`, `ExperienceCard`, `GuideCard`, and `OfferCard`. |

---

## The 6 Production Palettes

Every palette strictly adheres to **WCAG 2.2 Level AA** contrast standards (all ratios ≥ 4.5:1 for body copy and ≥ 3.0:1 for large text/controls).

| Palette | Name | Direction & Vibe | Primary Ocean | Accent Action | Background Sand |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Ocean** | **Ocean & Coral** | Flagship classic brand | `#083b4c` | `#ff6f59` | `#faf8f3` |
| **2. Sunset** | **Sunset Atoll** | Romantic dusk & papaya | `#1b2a4e` | `#ffa14a` | `#fcf7ef` |
| **3. Midnight** | **Midnight Resort** | Ultra-luxury & champagne gold | `#0b1f33` | `#e2b45f` | `#f6f7f8` |
| **4. Daylight** | **Lagoon Daylight** | High-noon bright turquoise | `#0a4a5c` | `#ff7a5c` | `#fbfcfb` |
| **5. Reef** | **Coral Reef** | Energetic green-teal & hibiscus | `#0a3d3f` | `#ff7f9c` | `#faf8f4` |
| **6. Palm** | **Tropical Palm** | Lush jungle & sun gold | `#12372a` | `#ffc233` | `#f9f7ee` |

---

## Live Interactive Palette Switching

The web application includes a floating client-side **Design Palette Switcher** (`src/components/layout/palette-switcher.tsx`) fixed at the bottom of the screen.

- Click the **Theme** pill or open the selector to toggle between any of the 6 palettes in real time without refreshing.
- Selection is remembered across sessions via `localStorage` and smoothly transitions with CSS `var(--duration-overlay)`.

---

## Keyboard-First Navigation

- Press <kbd>/</kbd> or <kbd>Cmd</kbd> + <kbd>K</kbd> anywhere on the site to trigger the **Quick Search Dialog** (`src/components/layout/quick-search-dialog.tsx`) with instant debounced suggestions.
- Press <kbd>Esc</kbd> to dismiss modals or drawers.

---

## Visual Preview

Open [`swatches.svg`](swatches.svg) in any browser or SVG viewer to inspect color swatches and contrast levels.
