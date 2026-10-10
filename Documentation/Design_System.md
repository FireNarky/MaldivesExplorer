# Maldives Explorer — Design System

| Field | Value |
| --- | --- |
| Status | Design specification. No application code is included. |
| Version | 1.0 |
| Date | 10 October 2026 |
| Authority | Documentation suite brand and UX rules, then the implementation plan. This document is the UI contract. |
| Base | Tailwind CSS and shadcn/ui on Radix. Tokens below replace default theme colors. |
| Accessibility | WCAG 2.2 AA for public and staff interfaces. |

The interface should feel like an editorial guide with a clear next step: deep ocean, lagoon, sand, and a small amount of coral. It is not a generic booking template. Motion stays short. Copy stays in sentence case. Prices, reviews, and urgency appear only when the content record supplies a source.

Contrast figures in this document were calculated from the stated hex values. A pair is used for text only when the ratio is at least 4.5:1. Non-text boundaries (input borders, icon-only marks, focus rings) are at least 3:1 against the adjacent surface.

## 1. Color

### 1.1 Brand source

These seven values come from the documentation suite. They are the brand. They are not all safe for small text.

| Token | Hex | Role |
| --- | --- | --- |
| `ocean` | `#083B4C` | Headings, premium surfaces, text on sand and white |
| `lagoon` | `#009FB7` | Highlight, illustration, large decorative type |
| `mist` | `#DFF6F4` | Section tint |
| `coral` | `#FF6F59` | Conversion fill behind ink text |
| `sand` | `#FAF8F3` | Editorial page background |
| `ink` | `#20323A` | Body text |
| `white` | `#FFFFFF` | Cards and form surfaces |

Measured pairs that pass for normal text:

| Foreground | Background | Ratio |
| --- | --- | --- |
| `ink` | `white` | 13.30:1 |
| `ink` | `sand` | 12.53:1 |
| `ink` | `mist` | 11.80:1 |
| `ocean` | `white` | 12.07:1 |
| `ocean` | `sand` | 11.37:1 |
| `ocean` | `mist` | 10.70:1 |
| `white` or `sand` | `ocean` | 12.07:1 and 11.37:1 |
| `ink` | `coral` | 4.86:1 |

`lagoon` on white is 3.16:1. That passes for large text and for a graphical object, and it fails for body copy, links, and button labels. `lagoon` on `mist` is 2.80:1 and fails both. White on `coral` is 2.74:1 and fails. Coral is a fill for ink text, not a place for white labels.

### 1.2 Accessible steps

These steps stay in the same hue and are the colors components actually paint for text and controls.

| Token | Hex | Use | Contrast |
| --- | --- | --- | --- |
| `lagoon-ink` | `#006C7C` | Links, primary button fill, focus ring, icons on mist | 6.11:1 white on fill; 5.76:1 on sand; 5.42:1 on mist |
| `lagoon-ink-hover` | `#005F6E` | Primary hover and active | 7.34:1 with white |
| `coral-hover` | `#F56B55` | Conversion hover | 4.51:1 with ink |
| `muted` | `#5E6B71` | Secondary text, placeholders that are not the only label | 5.50:1 on white; 5.18:1 on sand; 4.88:1 on mist |
| `border` | `#7E888D` | Input borders, control outlines, separator when it defines a boundary | 3.62:1 on white; 3.42:1 on sand |
| `border-subtle` | `#D5DEE0` | Decorative dividers inside a card that already has a border | Not a sole boundary |

`lagoon` remains available for fills behind ocean or ink text at display sizes (24px and larger, or 18.5px bold), for maps and illustrations, and for a 3:1 icon on white. It is not the link color and not the primary button.

### 1.3 Semantic status

Status always includes a visible word. Color supports the word.

| Token | Foreground | Surface | Text on surface |
| --- | --- | --- | --- |
| Success | `#0F5C38` | `#E5F4EC` | 7.09:1 |
| Warning | `#6B4500` | `#FBF3E4` | 7.69:1 |
| Danger | `#8E1D1D` | `#FDECEC` | 7.85:1 |
| Info | `#083B4C` | `#E7F1F4` | 10.7:1 class, ocean on a pale ocean tint |

Solid success, warning, and danger fills may carry white text (8.05:1, 8.48:1, and 8.96:1). Coral is not the danger color.

Enquiry and quote badges:

| State | Surface treatment | Required label |
| --- | --- | --- |
| New, Contact Attempted, Contacted | Info | The state name |
| Qualified, Won | Success | The state name |
| Quoted | `mist` with `lagoon-ink` text | Quoted |
| Negotiation | Warning | Negotiation |
| Lost, Closed, Expired, Withdrawn | `sand` with `muted` text and a `border` | The state name |
| Draft, In Review, Approved, Scheduled | Info or sand, never coral | The state name |
| Published | Success | Published |
| Unpublished, Archived | Muted | The state name |

Publish and enquiry words stay in the badge. Staff must not infer the state from hue.

### 1.4 Surfaces and elevation

| Surface | Color | Where |
| --- | --- | --- |
| Page | `sand` | Public pages |
| Canvas | `white` | Cards, dialogs, inputs, the mobile sheet |
| Inverse | `ocean` | Header on the homepage hero only, footer, quote cover |
| Tint | `mist` | Alternating editorial bands |
| Scrim | `ocean` at 40% opacity | Dialog and sheet backdrop |

Shadows use ocean, not pure black:

| Level | Shadow |
| --- | --- |
| 0 | None. Default for sections and quiet cards. |
| 1 | `0 1px 2px rgb(8 59 76 / 6%)` on resting cards |
| 2 | `0 8px 24px rgb(8 59 76 / 12%)` on popovers, sheets, and dialogs |

Cards that sit on sand use a 1px `border-subtle` plus shadow 1, or a 1px `border` and no shadow. One treatment per region, not both a heavy shadow and a strong border.

### 1.5 How color is applied

- Body copy is `ink` on `sand` or `white`.
- Headings are `ocean`.
- Links are `lagoon-ink`, underlined in prose. In navigation, the current item uses `ocean` and a 2px `lagoon-ink` underline, not color alone.
- Primary actions are white text on `lagoon-ink`.
- The conversion action (“Plan my trip”, “Request a quote”) is ink text on `coral`, one per view. A second coral button in the same view is not allowed.
- Indicative prices use `ink` plus the word “Indicative”. They do not use coral.
- Disabled controls keep `muted` text on `sand` or `mist` without extra opacity. Opacity would drop the muted pair below 4.5:1.
- Focus is a 2px `lagoon-ink` ring, 2px offset, on light surfaces. On `ocean`, the ring is `sand`.

### 1.6 CSS variables

Implementation maps these to Tailwind theme colors. Names are the contract.

```css
:root {
  --color-ocean: #083b4c;
  --color-lagoon: #009fb7;
  --color-lagoon-ink: #006c7c;
  --color-lagoon-ink-hover: #005f6e;
  --color-mist: #dff6f4;
  --color-coral: #ff6f59;
  --color-coral-hover: #f56b55;
  --color-sand: #faf8f3;
  --color-ink: #20323a;
  --color-white: #ffffff;
  --color-muted: #5e6b71;
  --color-border: #7e888d;
  --color-border-subtle: #d5dee0;
  --color-success: #0f5c38;
  --color-success-surface: #e5f4ec;
  --color-warning: #6b4500;
  --color-warning-surface: #fbf3e4;
  --color-danger: #8e1d1d;
  --color-danger-surface: #fdecec;
  --color-info: #083b4c;
  --color-info-surface: #e7f1f4;
  --color-focus: #006c7c;
  --shadow-1: 0 1px 2px rgb(8 59 76 / 6%);
  --shadow-2: 0 8px 24px rgb(8 59 76 / 12%);
}
```

Forced-colors mode uses system `Canvas`, `CanvasText`, `LinkText`, and `ButtonText`. Brand fills drop. Borders become `ButtonBorder`.

## 2. Typography

### 2.1 Families

| Role | Family | Fallbacks |
| --- | --- | --- |
| Display and headings | Fraunces | Iowan Old Style, Palatino, Palatino Linotype, Georgia, serif |
| UI, body, tables, forms | Source Sans 3 | Segoe UI, sans-serif |

Both faces are available under the Open Font License. Fraunces carries the editorial voice. Source Sans 3 carries interface text because it stays clear at 16px and in tables. Data tables, form controls, badges, and the admin chrome use Source Sans 3 only. Fraunces is for page titles, section titles, and the quote document’s welcome heading.

Load the variable fonts. Subset to Latin. `font-display: swap`. A fallback metric override should keep the sand-to-content shift small so layout shift stays under 0.1.

### 2.2 Scale

The root size is the browser default, expected at 16px. The product never sets a root font size below 100%. Body text never goes below 16px. Secondary meta may use 14px when the contrast pair is at least 4.5:1 and the text is not an instruction, a price, or a form label.

| Token | Size | Line height | Weight | Tracking | Family |
| --- | --- | --- | --- | --- | --- |
| `display` | `clamp(2.5rem, 1rem + 4vw, 4.25rem)` | 1.12 | 560 | -0.02em | Fraunces |
| `h1` | `clamp(2rem, 1rem + 2.2vw, 3.25rem)` | 1.18 | 560 | -0.015em | Fraunces |
| `h2` | `clamp(1.625rem, 1rem + 1.2vw, 2.25rem)` | 1.25 | 560 | -0.01em | Fraunces |
| `h3` | `clamp(1.25rem, 1rem + 0.4vw, 1.5rem)` | 1.3 | 560 | 0 | Fraunces |
| `h4` | `1.125rem` | 1.4 | 600 | 0 | Source Sans 3 |
| `body-lg` | `1.125rem` | 1.6 | 400 | 0 | Source Sans 3 |
| `body` | `1rem` | 1.6 | 400 | 0 | Source Sans 3 |
| `label` | `1rem` | 1.4 | 600 | 0 | Source Sans 3 |
| `button` | `1rem` | 1.2 | 600 | 0 | Source Sans 3 |
| `meta` | `0.875rem` | 1.45 | 400 | 0 | Source Sans 3 |
| `price` | `1.125rem` | 1.3 | 600 | 0 | Source Sans 3, tabular numbers |

`body-lg` is the size of public prose from the `lg` breakpoint up. Below that, prose is `body`. Headings use the clamp at all widths so they scale with the viewport without a jump.

Prices, quote totals, and reference codes use `font-variant-numeric: tabular-nums`.

### 2.3 Measure and hierarchy

- Prose blocks cap at `65ch`.
- One `h1` per page.
- Heading levels step by one. A card title inside an `h2` section is an `h3`, not a styled div.
- Hero display type may be a `<p>` when the visible page title is a separate `h1`. The hero does not skip the page heading.
- Uppercase is limited to meta labels of one or two words (for example “Indicative”). Tracking on those labels is `0.04em`. Buttons, navigation, and headings stay in sentence case.
- Bold inside prose is Source Sans 3 at 600, used for the label in a definition, not for whole sentences.

### 2.4 Quote document

The portal quote and the PDF share this order and these styles: welcome in `h1`, overview in `body-lg`, then accommodation, transfers, activities, pricing, terms, and next steps as `h2` sections. Totals use `price`. Currency codes sit in `meta` beside the amount. The PDF embeds Fraunces and Source Sans 3 so the file does not fall back to a different face.

## 3. Spacing

The base unit is `0.25rem` (4px at a 16px root). Components use the semantic names. Raw steps exist so a one-off layout does not invent an off-scale value.

### 3.1 Scale

| Token | rem | px at 16px root |
| --- | --- | --- |
| `space-0` | 0 | 0 |
| `space-1` | 0.25rem | 4 |
| `space-2` | 0.5rem | 8 |
| `space-3` | 0.75rem | 12 |
| `space-4` | 1rem | 16 |
| `space-5` | 1.25rem | 20 |
| `space-6` | 1.5rem | 24 |
| `space-8` | 2rem | 32 |
| `space-10` | 2.5rem | 40 |
| `space-12` | 3rem | 48 |
| `space-16` | 4rem | 64 |
| `space-20` | 5rem | 80 |
| `space-24` | 6rem | 96 |
| `space-32` | 8rem | 128 |

### 3.2 Semantic spacing

| Token | Value | Use |
| --- | --- | --- |
| `inline` | `space-2` | Icon to label |
| `stack-tight` | `space-2` | Label to control, badge groups |
| `stack` | `space-4` | Paragraphs, card text blocks |
| `stack-loose` | `space-6` | Related groups inside a card |
| `inset-control-y` | `space-3` | Button and input padding, block axis |
| `inset-control-x` | `space-4` | Button and input padding, inline axis |
| `inset-card` | `space-4`, `space-6` from `lg` | Card padding |
| `gutter` | `space-4`, `space-6` from `md`, `space-8` from `xl` | Page padding and grid gap |
| `section` | `space-12`, `space-20` from `lg` | Vertical rhythm between page regions |
| `cluster` | `space-2` | Chips and toolbar actions |

Touch spacing around a 24px inline control is at least `space-2` on every side so the WCAG 2.2 target-size minimum is met. Primary and icon-only controls use a 44px box instead, defined in §5.

## 4. Layout

### 4.1 Page shell

Every public page is a column of:

1. Skip link, first in the tab order, visually hidden until focused.
2. Header landmark.
3. `main` landmark with an `h1`.
4. Footer landmark.
5. On viewports below `lg`, a fixed action bar for Search and Plan my trip.

The header holds the wordmark, primary navigation from `lg` up, and Search. Below `lg` the header holds the wordmark, a menu button, and Search. Plan my trip lives in the action bar so it stays in thumb range.

The action bar is `space-16` tall plus `env(safe-area-inset-bottom)`. `main` has matching padding at the end so the bar does not cover content. The bar hides from `lg` up, where both actions sit in the header.

Admin uses the same shell without the coral conversion bar. Its header is staff context: product name, environment if not production, and the signed-in person. Navigation is the permission-filtered admin list.

### 4.2 Widths

Content is centered. Extra viewport beyond the cap becomes margin. Cards and line length do not grow to fill an ultra-wide monitor.

| Token | Width | Holds |
| --- | --- | --- |
| `measure` | `65ch` | Prose, planner step copy, quote narrative |
| `reading` | `48rem` | A guide column with no rail |
| `copy-rail` | `72rem` | Guide plus a 20rem complementary rail from `lg` |
| `catalog` | `80rem` | Listings, compare, account |
| `frame` | `90rem` | Absolute cap for header, footer, and homepage bands |

### 4.3 Grid

Twelve columns from `lg` up. Below `lg` the grid is one or two tracks, not twelve narrow ones.

| Region | Below `md` | `md` to `lg` | `lg` and up |
| --- | --- | --- | --- |
| Homepage bands | 1 column | 1 column, featured cards in 2 | 12 columns, band-specific spans |
| Resort and offer cards | 1 | 2, only when each card is at least `18rem` wide | 3 |
| Catalog with filters | 1, filters in a sheet | 1, filters in a sheet | `18rem` filter column plus fluid results |
| Detail page | Stacked | Stacked | 8 columns of content, 4 columns of sticky summary |
| Compare | Stacked attribute groups | Stacked attribute groups | Table, one column per item, max 3 |
| Admin tables | Stacked definition lists | Horizontal scroll on the table region only | Full table inside `catalog` |
| Planner | 1 column | 1 column, `measure` wide | 1 column, `measure` wide |

Gutters use the `gutter` token. Columns collapse before type shrinks. A region that cannot fit its minimum card width drops a column.

### 4.4 Regions on a detail page

Order in the document, top to bottom, including on large screens:

1. Title, location, and indicative price disclosure.
2. Gallery.
3. Overview.
4. Rooms.
5. Dining.
6. Transfer.
7. Reef and experiences, when the record has them.
8. Map with the list alternative immediately after it.
9. Offers.
10. FAQs.
11. Related guides.
12. Alternatives.

From `lg` up, a summary card may be sticky in the last four columns. It repeats the price disclosure, shortlist, and quote action. It does not become the only place those facts exist. On smaller screens those actions are a sticky bar using the same components, not a different feature.

### 4.5 Radius

| Token | Value | Use |
| --- | --- | --- |
| `radius-s` | `0.25rem` | Badges, inputs |
| `radius-m` | `0.5rem` | Buttons, menus |
| `radius-l` | `0.75rem` | Cards, sheets, dialogs |
| `radius-full` | `999px` | Avatars only |

Buttons are not pills. Coral and lagoon fills stay on the `radius-m` shape.

### 4.6 Layers

| Token | Value | Use |
| --- | --- | --- |
| `z-base` | 0 | Page |
| `z-sticky` | 10 | Header, detail action bar, compare tray |
| `z-overlay` | 20 | Sheet, dialog, search modal |
| `z-toast` | 30 | Toasts |
| `z-skip` | 40 | Focused skip link |

The mobile action bar and the header share `z-sticky`. A sheet covers both.

## 5. Breakpoints and responsive rules

Breakpoints are minimum widths in rem so they follow the user’s font size.

| Name | Min width | Suite viewport | Layout behavior |
| --- | --- | --- | --- |
| `base` | 0 | Small mobile | One column. Sheets for filters, search, and navigation. Action bar visible. |
| `sm` | `40rem` | Large mobile | Two cards only when each remains at least `18rem`. Type size stays on the mobile scale. |
| `md` | `48rem` | Tablet | Two-column catalogs. Tables become stacked groups or a contained scroll, not a scaled-down desktop grid. |
| `lg` | `64rem` | Desktop | Navigation moves into the header. Filters become a sidebar. Action bar goes away. Sticky summary appears on detail pages. |
| `xl` | `80rem` | Desktop | Gutter increases. Catalog hits its reading width. |
| `2xl` | `96rem` | Wide | Frame caps at `90rem`. Additional space is outside the frame. |

### 5.1 Behavior that changes with width

- Primary navigation is a dialog from the menu button below `lg`, and a horizontal list from `lg`.
- Global search is a full-screen dialog below `lg` and a centered dialog from `lg`.
- Filters are a sheet below `lg` and a sidebar from `lg`. Applied filters stay visible as chips in both.
- Compare is stacked groups below `lg` and a table from `lg`. The three-item cap is the same at every width.
- The map is beside its list from `lg` and above its list below `lg`. The list is complete in both arrangements.
- Homepage display type uses the clamp. It does not get a separate mobile headline.
- Hover styles exist only at `(hover: hover)`. Touch devices do not depend on hover to reveal price, transfer, or actions.
- Horizontal page scroll is a defect. The only horizontal scroll allowed is an admin table inside its region, with a keyboard-accessible scroll and a caption that says the table scrolls.

### 5.2 Targets, pointer, and input

| Control | Minimum size |
| --- | --- |
| Primary button, conversion button, icon-only button, menu row, action-bar item | `2.75rem` by `2.75rem` (44px) |
| Inline text control with surrounding `space-2` | `1.5rem` (24px), meeting WCAG 2.2 AA target size |
| Text field | Full width of its column, at least `2.75rem` tall |

Inputs use the device’s 16px body size so mobile browsers do not zoom the page on focus. Date, email, telephone, and number fields set the matching input mode.

### 5.3 Motion

| Duration | Use |
| --- | --- |
| `120ms` | Color and border on hover |
| `200ms` | Sheet, dialog, accordion |
| `0ms` | Anything under `prefers-reduced-motion: reduce` |

Easing is `cubic-bezier(0.2, 0, 0, 1)`. There is no parallax, no looping hero motion, and no carousel autoplay. When reduced motion is requested, a carousel renders as a stack, sheets appear without a slide, and the focus ring remains.

## 6. Icon strategy

### 6.1 Library

UI icons are Lucide, the set shadcn/ui already uses. Stroke is `currentColor` so the icon inherits an accessible text color. Default stroke width is 1.75 on a 24px grid, drawn at the sizes below.

| Size token | px | Use |
| --- | --- | --- |
| `icon-s` | 16 | Inside meta text and compact badges |
| `icon-m` | 20 | Buttons and inputs |
| `icon-l` | 24 | Icon-only controls and list markers |
| `icon-xl` | 32 | Empty and error states |

Icons sit on the text baseline with `inline` spacing. They do not replace a heading.

### 6.2 Meaning and accessibility

- An icon next to a visible label is `aria-hidden`.
- An icon-only control has an `aria-label` in the product voice (“Save resort”, “Close search”, “Open menu”).
- Status icons repeat the badge word. The icon is not the only signal.
- Decorative illustration may use `lagoon` on white. Informative icons use `ink`, `ocean`, or `lagoon-ink`, including on `mist`.
- Emoji are not interface icons.
- Icons are not taken from the reference site, from a resort’s brand art, or from a map pin set that implies a live booking.

### 6.3 Product mapping

| Action or object | Lucide name |
| --- | --- |
| Search | `Search` |
| Plan my trip | `Compass` |
| Save | `Heart` |
| Saved | `Heart` filled, still with the text “Saved” |
| Compare | `Columns2` |
| Map | `Map` |
| Close | `X` |
| Menu | `Menu` |
| Next and back | `ChevronRight`, `ChevronLeft` |
| External legal or source link | `ExternalLink` |
| Success | `CircleCheck` |
| Warning | `TriangleAlert` |
| Error | `CircleX` |
| Information | `Info` |
| Sort | `ArrowUpDown` |
| Filter | `SlidersHorizontal` |
| Share | `Share` |
| Document | `FileText` |

### 6.4 Original icons

Lucide does not cover five Maldives-specific objects. Those are an original set, drawn on the same 24px grid and 1.75 stroke, named:

| Name | Depicts |
| --- | --- |
| `atoll` | A simple ring of reef, not a map trademark |
| `speedboat` | Side view, single hull |
| `seaplane` | High-wing float plane |
| `water-villa` | Pavilion on a short jetty |
| `reef` | A compact coral head |

Until that set exists, the interface uses the Lucide stand-ins `Circle`, `Ship`, `Plane`, `House`, and `Waves`, always with a text label. The stand-in is not described as a custom illustration.

Photos, resort logos, and map tiles are content or vendor assets. They are not part of the icon set and they need alt text, attribution, and a license recorded on the media row.

## 7. Component catalog

Components live in two layers. Primitives in `components/ui` are themed shadcn/ui pieces with no travel wording. Patterns in `components/patterns` compose primitives and carry product rules. A pattern is the only place a price disclosure, a shortlist heart, or a quote action is allowed to appear.

Every interactive control implements the states that apply to it: default, hover, focus-visible, active, loading, disabled, error, and empty. Hover never reveals the only copy of a fact.

### 7.1 Primitives

| Component | Variants | Rules |
| --- | --- | --- |
| `Button` | Primary, secondary, tertiary, conversion, destructive | Primary: white on `lagoon-ink`, hover `lagoon-ink-hover`. Secondary: ink text, `border`, white fill. Tertiary: ink text, no fill, underline on hover. Conversion: ink on `coral`, hover `coral-hover`, one per view. Destructive: white on danger. Loading replaces the label with a spinner and “Loading” for assistive tech, and sets `aria-busy`. Disabled uses `muted` and does not submit. |
| `IconButton` | Same intents | 44px square, `radius-m`, required accessible name. |
| `Input` | Text, email, telephone, password, search | Visible `label`, optional hint, error text in `danger` with `CircleX`. Border is `border`. Focus ring replaces the border color. Error border is `danger`. Placeholder is `muted` and is not the label. |
| `Textarea` | Default | Same label and error rules. Minimum height `6rem`. |
| `CurrencyInput` | Amount | Shows the ISO code as text, not a symbol alone. Uses tabular numbers. |
| `DateRange` | Check-in and check-out | Two labeled fields. The end date cannot be read as selected before the start date. Keyboard entry remains available. |
| `Combobox` | Single | Listbox pattern. The selected value is visible in the field. |
| `MultiSelect` | Default | Selected items appear as removable chips with text. |
| `Checkbox`, `Radio`, `Switch` | Default | Label is beside the control, hit area at least 44px on the row. Switch state includes the words on or off when the label does not already say the outcome. |
| `Select` | Native or listbox | A native select is preferred for short vocabularies on mobile. |
| `Dialog` | Default, search | Focus moves inside, returns on close, Escape closes, scrim click closes unless the dialog is a destructive confirm. Title is required. |
| `Sheet` | Bottom on small screens, side from `md` for filters | Same focus rules as a dialog. The close button is in the first row. |
| `Menu` | Header, overflow | Current page uses `aria-current="page"` and the underline. |
| `Popover` | Default | Not used for information that must be available without hover. |
| `Tabs` | Default | Arrow keys move between tabs. The selected tab is exposed with `aria-selected`. |
| `Accordion` | Default | The question or label is a button. Collapsed content is not the only copy of a price or a warning. |
| `Tooltip` | Default | Supplemental only. Not used on touch as the sole label. |
| `Table` | Data | Column headers, row headers where a comparison needs them. Caption required when the table scrolls. |
| `Pagination` | Default | “Previous” and “Next” are words. The current page is text, not color alone. |
| `Badge` | Status, filter | Text is always present. Color comes from §1.3. |
| `Skeleton` | Text, card, media | Announces as busy if it replaces a region for more than a moment. Shape matches the loaded block so layout shift stays low. |
| `Separator` | Subtle, strong | Strong when it separates controls. Subtle inside a card. |
| `Avatar` | Image, initials | Initials are text. The image has an empty alt when the name is next to it. |
| `Breadcrumb` | Default | Present on hierarchical public pages. The current crumb is text, not a link. |
| `Toast` | Success, warning, error, info | A live region, `polite` for success and info, `assertive` for error. Auto-dismiss is at least 6 seconds and does not apply to errors. A close control is present. |
| `Carousel` | Media only | Reduced motion renders a stack. Controls are buttons. Position is text (“2 of 8”). |

### 7.2 Patterns

| Pattern | Contents | States |
| --- | --- | --- |
| `ResortCard` | Image, name, island and atoll, one positioning line, audience tags, `PriceDisclosure`, save, quote | Default, skeleton, unavailable. Unavailable keeps the name and says the listing is not currently published, with a link back to resorts. |
| `OfferCard` | Image if present, title, resort name, validity, meal plan, `PriceDisclosure`, save | Default, skeleton, expired. Expired cards are not rendered in listings. A direct visit uses `UnavailableState`. |
| `ExperienceCard` | Name, category, season line only when a review date exists, save | Default, skeleton |
| `GuideCard` | Title, excerpt, category, reading time if stored | Default, skeleton |
| `ExpertCard` | Portrait or initials, name, title | Default. Years and counts render only when the profile has them. |
| `PriceDisclosure` | Amount, currency, “Indicative”, occupancy basis, and whether transfer and tax are included | Missing amount renders “Price on request” in `body`, not a zero. |
| `GlobalSearch` | Input, grouped results, recent searches, no-result recovery with links to resorts, guides, and the planner | Loading, empty, error. Full screen below `lg`, dialog from `lg`. Keyboard moves through results. |
| `FilterPanel` | Groups for the listing’s real facets, clear, result count | Sheet below `lg`, sidebar from `lg`. Chips show the applied filters in both. |
| `CompareTray` | Up to 3 names and a link to compare | The fourth add is disabled and the tray says the limit is 3. |
| `CompareView` | One attribute group per row from the approved set | Missing values read “Unknown”. Stacked below `lg`, table from `lg`. |
| `MediaGallery` | Grid, lightbox, caption, attribution | Empty state when the resort has no approved image. Video includes captions or a transcript link. |
| `MapWithList` | Map plus the same places as links | The list is in tab order and is complete if the map fails to load. |
| `Planner` | Progress, one step, back, next, save indicator | Error summary at the top of the step and messages on the fields. Progress is text (“Step 2 of 5”). |
| `QuoteDocument` | Welcome, overview, accommodation, transfers, activities, pricing, terms, next steps | The portal and the PDF use this order and these tokens. |
| `StatusBadge` | Word plus optional icon | Colors from §1.3. |
| `DataTable` | Sort, filter, pagination | Empty, error, and loading states. Bulk actions render only when the role has the permission. |
| `CookieConsent` | Accept all, reject non-essential, manage categories | Choices can be reopened from the footer. Rejecting analytics leaves necessary cookies only. |
| `EmptyState` | Title, one sentence, one action | Used when a list or module has no records. |
| `ErrorState` | What failed, in plain language, and one recovery action | No stack traces. |
| `UnavailableState` | The offer or resort name, why it is hidden, and links to alternatives | Used for expired offers and unpublished direct URLs. |
| `SiteHeader` | Wordmark, nav, search | Current section exposed. |
| `ActionBar` | Search, Plan my trip | Visible below `lg` only. |
| `SiteFooter` | Plan action, explore links, legal links, cookie settings | Legal links include privacy, cookies, terms, and accessibility. |

### 7.3 Forms

- Every field has a visible label.
- Hints sit between the label and the field and stay visible.
- On submit, focus moves to the error summary. The summary links to each field.
- Required fields say “Required” in the label. Optional fields say “Optional”.
- The planner marks optional fields explicitly and does not use a placeholder as the instruction.
- A successful save of a planner draft says “Draft saved on this device” in a polite live region.

### 7.4 Admin density

Admin uses the same color, type, and target rules. Tables may use `meta` (14px) for cell text because `muted` and `ink` both clear 4.5:1 at that size. Row actions stay 44px. Fraunces is not used in tables. The page title remains `h1` in Fraunces so the staff UI still belongs to the product.

## 8. Implementation notes

When the application is built, primitives are generated from shadcn/ui and then recolored with the variables in §1.6. Patterns are written against those primitives. Tailwind breakpoints match §5: `sm` `40rem`, `md` `48rem`, `lg` `64rem`, `xl` `80rem`, `2xl` `96rem`.

A component is ready when its hover, focus, loading, empty, and error states exist, its text pairs meet the ratios in §1, and it still works with reduced motion and at the `base` breakpoint without horizontal scroll.
