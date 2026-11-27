# Design Specification — Om M. Doddamani Portfolio (`contentarchitecture.dev` Architecture)

Normative visual, typographic, structural, and behavioral specification extracted from `https://contentarchitecture.dev/` and adapted for Om M. Doddamani's personal engineering portfolio.

---

## 1. System Overview & Polarity Contract

- **Visual Thesis**: Monochrome-and-bone editorial engineering showcase built on strict surface alternation, pixel-exact spacing, typographic hierarchy, hairline borders, and four signature geometric motifs.
- **Section Polarity**: Sections alternate strictly between warm off-white (`#f1eee7`, `--color-off-white`) and charcoal-black (`#232323`, `--color-black`), framed by pure-black (`#000000`, `--color-black-deep`) checkerboard bezels.
- **Signal Accent**: A single high-visibility signal orange (`#ff9100`, `--color-accent`) reserved exclusively for micro-signals (`6px` pulsing status dot, `3px` article reading progress bar, minimap viewport frame, and roadmap `In progress` indicator).
- **Surface Mode Discipline**:
  - **Experience** (`/` and `/projects`): Let interactive artifacts, ASCII geometry, and project systems lead from the first viewport.
  - **Read** (`/projects/:slug`, `/about`, `/roadmap`): Narrow editorial columns, generous vertical rhythm, high-contrast prose, and code blocks built for sustained reading.
- **No Theme Switcher / Zero Decorative Bloat**: Polarity is structural per section. Zero unprompted gradients, glowing blurs, floating glassmorphism cards, decorative gradient orbs, or stock icon tiles.

---

## 2. Layout & Grid System

- **Base Spacing Unit**: `--spacing: 0.0625rem` (`1px` at `16px` root font size). Every Tailwind spacing utility (`p-16`, `lg:px-80`, `lg:py-160`, `gap-24`, `h-48`, `size-30`) maps 1:1 to pixels (`calc(var(--spacing) * N)`).
- **Breakpoints & Gutters**:
  - Mobile (`< 64rem` / `< 1024px`): `16px` horizontal gutter (`px-16`).
  - Desktop (`>= 64rem` / `>= 1024px`, Tailwind `lg:`): `80px` horizontal gutter (`lg:px-80`).
- **Primary 12-Column Grid**: `grid-cols-1 gap-x-16 lg:grid-cols-12`.
- **Container Widths**:
  - `max-w-1440`: Projects index (`/projects`) and wide showcase frames.
  - `max-w-960`: `Learn more +` README modal dialog.
  - `max-w-920`: Editorial single-column routes (`/projects/:slug` case studies, `/about`, `/not-found`).
  - `max-w-600`: Showcase section introductory copy.
  - `max-w-440`: Estimate section muted summary column.
  - `max-w-340`: Footer bio paragraph column.
- **Home Page Section Sequence & Geometry**:
  1. `mainHeroSection` (`#f1eee7` + `#232323` split): Left `lg:col-span-5` (`pl-16 lg:pl-80`) copy + 2 split CTAs + scroll cue; Right `lg:col-span-6 lg:col-start-7` dark ASCII vortex stage (`--dive-distance: 200svh`, `--dive-hold: 120svh` on desktop; stacked above `80vh` dark stage on mobile).
  2. `estimateSection` (`#f1eee7`): `lg:col-span-5` sticky headline + `~10` `text-display-10` odometer counter + pill badge; `lg:col-span-6 lg:col-start-7` `max-w-[56ch]` (`w-[round(down,100%,1ch)]`) ASCII `+---+` receipt table.
  3. `benefitsSection#features` (`#232323`): `lg:col-span-5` sticky intro + 10 staggered numbered pillars (`001 /`..`010 /`) in `flex-col gap-64`, `lg:max-w-1/2`, cycling `lg:ml-0`, `lg:ml-[20%]`, `lg:ml-[40%]` on desktop (`ml-0` on mobile).
  4. `ideSection#the-repo` (`#f1eee7` outer -> `#232323` checkerboard IDE): Full-bleed sticky frame (`--repo-distance: 60svh`), `h-48 lg:h-34` top bar, `240px` collapsible file tree sidebar, syntax-highlighted code viewer + minimap, `⌘J` terminal drawer, `⌘K` file search palette, mobile drawer.
  5. `showcaseSection#showcase` (`#232323`): `max-w-600` intro + `grid-cols-1 gap-x-24 gap-y-32 lg:grid-cols-2 lg:gap-y-64`, `aspect-video` (`16:9`) cards linking to `/projects/:slug`.
  6. `pricingSection#pricing` (`#f1eee7`): Header row + `.ticket-notches` `#232323` card (`xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]`) with `Engineering` / `Research` mode toggle, `text-display-10` odometer, 5 `tabular-nums` rows (`01–05`), and split-pill CTA.
  7. `faqSection#faq` (`#232323`): `lg:col-span-4 lg:sticky lg:top-80` left headline + CTA; `lg:col-span-7 lg:col-start-6` hairline-divided accordion list right (`Q.001` expanded by default, `inert` when collapsed).
- **Secondary Routes**:
  - `/projects`: `#232323` surface (`max-w-1440`) with `#f1eee7` `.ticket-notches` `7fr/5fr` cards.
  - `/projects/:slug`: `#232323` surface (`max-w-920`) with `3px` fixed `#ff9100` top reading progress bar.
  - `/about`: `#232323` surface (`max-w-920`) editorial profile.
  - `/roadmap`: `#232323` surface with 3 equal flex columns (`lg:flex-row gap-16`: `Shipped`, `In progress`, `Planned`).
  - `*` (404): `#232323` surface (`max-w-920`) structured recovery map.
- **Seam & Footer Rhythm**:
  - `--seam: 360px` mobile, `520px` at `>= 64rem` (`1024px`).
  - Footer resurface: `100svh + 80svh` ASCII seam resurface reveal into `#f1eee7` `lg:grid-cols-12` footer (`max-w-340` bio, `h-48` quick-contact input + split CTA, 2 mono link columns).

---

## 3. Color & Surface Tokens

### 3.1 Core 8-Token Palette

| Token | Hex | Role |
|---|---|---|
| `--color-off-white` | `#f1eee7` | Primary light surface & dark-surface inverse pill ink |
| `--color-black` | `#232323` | Primary dark surface & light-surface primary ink |
| `--color-black-deep` | `#000000` | Checkerboard bezels (`header`, `IDE`), primary CTA hover, dialog backdrop |
| `--color-white` | `#ffffff` | Dark-surface primary ink & secondary CTA hover |
| `--color-dark-grey` | `#5b5a56` | Secondary/muted ink on light (`#f1eee7`) surfaces ONLY |
| `--color-ghost-grey` | `#dedede` | Secondary/muted ink on dark (`#232323`) surfaces, ticker bar, light pill bg |
| `--color-mid-grey` | `#cbcbcb` | Neutral mid hairline border & muted placeholder |
| `--color-accent` | `#ff9100` | Signal orange: `6px` pulsing status dot, `3px` progress bar, minimap frame |

### 3.2 Hairline Borders & Utility Colors

- Hairlines: `border-white/10`, `border-white/12`, `border-white/15`, `border-black/20`, `border-current/15`, `border-current/20`, `border-current/30`.
- Validation / noscript error: `#dc2626`.
- High-contrast text selection (`::selection`): `background-color: #d4d4d4; color: #0000a8;`.

### 3.3 Contrast Matrix (WCAG Enforcement)

| Foreground | Background | Ratio | Rule |
|---|---|---|---|
| `#232323` (`black`) | `#f1eee7` (`off-white`) | ~13.4:1 (AAA) | Primary ink on light surfaces |
| `#ffffff` (`white`) | `#232323` (`black`) | ~15.6:1 (AAA) | Primary ink on dark surfaces |
| `#dedede` (`ghost-grey`) | `#232323` (`black`) | ~11.7:1 (AAA) | Secondary/body ink on dark surfaces |
| `#cbcbcb` (`mid-grey`) | `#232323` (`black`) | ~9.8:1 (AAA) | Secondary labels/metadata on dark surfaces |
| `#5b5a56` (`dark-grey`) | `#f1eee7` (`off-white`) | ~5.9:1 (AA+) | Muted body/caption ink on `#f1eee7` |
| `#5b5a56` (`dark-grey`) | `#232323` (`black`) | ~2.1:1 (FAIL) | **PROHIBITED** for readable prose on `#232323` — always use `text-ghost-grey`, `text-mid-grey`, or `text-white` |

### 3.4 Syntax Highlighting Tokens (`sugar-high` One Dark on `#232323`)

- `--sh-class: #61afef`
- `--sh-comment: #56b6c2`
- `--sh-entity: #e5c07b`
- `--sh-identifier: #abb2bf`
- `--sh-jsxliterals: #c678dd`
- `--sh-keyword: #e06c75`
- `--sh-number: #61afef`
- `--sh-property: #98c379`
- `--sh-sign: #e06c75`
- `--sh-string: #98c379`

---

## 4. Typography Scale & Rules

### 4.1 Font Families

- `--font-sans`: `'Geist Variable', 'GeistSans Fallback', ui-sans-serif, system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`
- `--font-mono`: `'Geist Mono Variable', ui-monospace, monospace`
- `'GeistSans Fallback'`: `@font-face` mapping `local('Arial')` with `ascent-override: 94.56%`, `descent-override: 27.76%`, `size-adjust: 106.28%` to eliminate layout shift before WOFF2 swap.
- Loaded locally via `@fontsource-variable/geist` (`100 900`) and `@fontsource-variable/geist-mono` (`100 900`, including `U+2500-259F` box-drawing glyphs).

### 4.2 Fluid Scale (`375px–1600px`, `1400px–1920px` for `headline-20`)

`--fluid-slope: calc((100vw - calc(var(--spacing) * 375)) / (1600 - 375))`

| Token Class | Size Formula / Value | Weight | Line Height | Tracking | Computed @ 1440px |
|---|---|---|---|---|---|
| `text-ui` | `12px` (`calc(var(--spacing) * 12)`) | `400` | `1.25` | `normal` | `12.00px` |
| `text-ui-20` | `16px` (`calc(var(--spacing) * 16)`) | `400` | `1.25` | `normal` | `16.00px` |
| `text-caption-10` | `clamp(12px, 12px + 2 * var(--fluid-slope), 14px)` | `400` | `1.25` | `normal` | `13.7388px` |
| `text-caption-20` | `clamp(14px, 14px + 2 * var(--fluid-slope), 16px)` | `400` | `1.25` | `normal` | `15.7388px` |
| `text-body-10` | `clamp(14px, 14px + 2 * var(--fluid-slope), 16px)` | `400` | `1.25` | `normal` | `15.7388px` |
| `text-body-20` | `clamp(14px, 14px + 4 * var(--fluid-slope), 18px)` | `400` | `1.25` | `normal` | `17.4776px` |
| `text-body-30` | `clamp(16px, 16px + 8 * var(--fluid-slope), 24px)` | `400` | `1.25` | `normal` | `22.9551px` |
| `text-headline-10` | `clamp(32px, 32px + 16 * var(--fluid-slope), 48px)` | `400` | `1.1` | `normal` | `45.9102px` |
| `text-headline-20` | `clamp(40px, 40px + 40 * ((100vw - 1400px) / 520), 80px)` | `400` | `1.0` | `normal` | `43.0769px` |
| `text-display-10` | `clamp(168px, 168px + 112 * var(--fluid-slope), 280px)` | `500` | `0.82` | `-0.045em` | `265.3714px` |

### 4.3 Typographic Craft Rules

- Apply `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;` once on `html` root.
- Keep `font-weight >= 400` below `18px`; use `font-medium` (`500`) on `h1` and `h2` display headings.
- Apply `text-wrap: balance` on `h1, h2, h3` and `text-wrap: pretty` on `p`.
- Apply `font-variant-numeric: tabular-nums` (`.tabular-nums`) on all counters, indices (`001 /`, `01–05`), dates, vote counts, and ASCII table cells.
- Enforce `>= 16px` computed font size on `<input>` on mobile viewports (`text-ui-20 lg:text-body-10`) to prevent iOS Safari auto-zoom.
- Use typographic quotation marks (`“` `”`), proper ellipsis (`…`), em-dashes (`—`), and non-breaking spaces (`⌘\u00a0K`).

---

## 5. Four Signature Geometric Motifs

1. **Checkerboard Bezel (`.checkerboard-bezel`)**
   - `#000000` base with `repeating-conic-gradient(rgba(255, 255, 255, 0.22) 0% 25%, transparent 0% 50%)` tiled at `4px 4px`.
   - Frames the floating top pill header (`ring-1 ring-white/10 rounded-4 p-4`) and the sticky full-bleed IDE explorer frame (`p-8`).
2. **Split-Pill Concave Connector (`[data-connector]`) + Odometer Hover (`[data-odometer]`)**
   - Split CTA buttons (`h-48 px-20 lg:px-24 rounded-8`): primary (`bg-black text-white`, hover `bg-black-deep`) and secondary (`bg-ghost-grey text-black`, hover `bg-white`).
   - Two rounded halves joined by a `6px`-wide (`26px`-tall) concave SVG `clip-path` bridge (`path("M0 0H1C1 1.1046 1.8954 2 3 2C4.1046 2 5 1.1046 5 0H6V4H0Z")` top, mirrored bottom).
   - Odometer text renders a vertical stack of 6 `[data-odometer-glyph]` spans per character inside a `1em` clipped column; on `@media (hover: hover)` trigger hover, glyphs translate `-5em` over `520ms cubic-bezier(0.23, 1, 0.32, 1)` with `28ms` per-column stagger.
3. **Ticket Notches (`.ticket-notches`) & Perforated Tear Line (`.ticket-perforation`)**
   - `7fr / 5fr` desktop split cards (`xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]`), stacked vertically on mobile.
   - `mask-image` composes two `radial-gradient` circular cutouts (`--notch: 12px` mobile / `14px` desktop) via `mask-composite: intersect` at the seam (`0 58%` & `100% 58%` mobile; `58.3333% 0` & `58.3333% 100%` desktop).
   - Dashed perforation (`repeating-linear-gradient(..., currentColor 0 5px, transparent 5px 10px)`) runs horizontally on mobile (`1px` height) and vertically on desktop (`1px` width).
4. **ASCII `+---+` Receipt Tables & Seam Transitions**
   - `max-w-[56ch]` (`w-[round(down,100%,1ch)]`) monospace tables bordered with `+---+` / `|`, dotted `data-fill` leaders (`text-current/35`), and inverted active rows.
   - Deterministic `<canvas>` ASCII vortex in `mainHeroSection` and ASCII seam transitions (`h-[calc(var(--seam)+2px)]`) bridging `#f1eee7` and `#232323` sections.

---

## 6. Motion Curves, Keyframes & Reduced Motion

- **Easings**:
  - `--ease-in: cubic-bezier(0.4, 0, 1, 1)`
  - `--ease-out: cubic-bezier(0, 0, 0.2, 1)`
  - `--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)`
  - Odometer roll: `cubic-bezier(0.23, 1, 0.32, 1)` (`520ms`)
- **Explicit Property Transitions**: Never write `transition: all`. Only animate `transform`, `opacity`, `background-color`, `color`, or `border-color`.
- **Keyframes**:
  - `fadeIn` (`0.4s ease-in-out`)
  - `cursorBlink` (`0.9s steps(1, end) infinite`)
  - `statusPing` (`1.8s cubic-bezier(0, 0, 0.2, 1) infinite`, `scale(1) -> scale(2.6)`)
  - `heroScrollCue` (`1.44s steps(8, end) infinite`)
  - `minimapScan` / `minimapScanCounter` (`5s ease-in-out infinite`)
- **Reduced Motion**:
  - Both `@media (prefers-reduced-motion: reduce)` and `html[data-motion="reduce"]`:
    - Force `scroll-behavior: auto`.
    - Disable keyframe animations (`animation: none !important`).
    - Disable odometer glyph transitions (`transition: none !important; transform: none !important; --odometer-progress: 0`).
    - Collapse `--dive-distance: auto` and `--repo-distance: auto` so dive/IDE sections flow statically without scroll-jacking.

---

## 7. Content Cadence & Word-Count Budgets

| Route / Section | Container | Target Word Budget | Structural Rhythm |
|---|---|---|---|
| **Header Nav** | Fixed checkerboard pill | 6 links (1–2w each) | `Approach`, `Systems`, `Projects`, `Focus` (orange dot), `Q&A`, `Work` |
| **README Modal** | `max-w-960` | ~190w (3 sections) | `001 / Why this exists`, `002 / Why instruments matter`, `003 / Who am I` |
| **Home: Hero** | `col-span-5` | 50–62w total | Eyebrow (5 tokens), 2-line `h1` (4–6w), body (28–36w), 2 CTAs + cue |
| **Home: Estimate** | `col-span-5` + `56ch` table | 125–155w total | `h2` (8–11w), body (15–20w), `~10` odometer, 5-stage ASCII receipt |
| **Home: Pillars** | `col-span-5` + 10 staggered | 380–460w total | Intro (55–75w) + `001 /`..`010 /` items (22–46w each) |
| **Home: IDE Explorer** | Full-bleed sticky | 5 public repos | Real paths & verified snippets (`README.md` + `src/`) + `⌘J`/`⌘K` |
| **Home: Showcase** | 2-col `16:9` grid | 32–42w intro + 8 cards | 16:9 canvas-to-preview hover + mono `h3` title |
| **Home: Focus Ticket** | `7fr/5fr` notched card | 120–145w total | `h2` (5–7w), 2 modes (`Engineering`/`Research`), `01–05` rows, footnote |
| **Home: Q&A** | `4/7` grid | 12 Q&As (40–75w each) | Sticky heading + CTA left; hairline-divided accordion right (`Q.001` open) |
| **Projects Index** | `max-w-1440` | 45–60w per card | `#f1eee7` `.ticket-notches` cards (`Entry 001`..`008`) |
| **Case Study** | `max-w-920` | 350–650w per article | Back link, `h1`, `[ROLE]`/`[STACK]`/`[REPO]`/`[STATUS]`, sections + code |
| **About** | `max-w-920` | 550–700w total | Bio, VVCE & Cerenetics, Newton/Leibniz essay, research & EVA/SOMU notes |
| **Roadmap** | 3 equal columns | 15–22w per card | `Shipped`, `In progress`, `Planned` with category badge + upvote count |

---

## 8. Accessibility & Anti-Slop Checklist

- Semantic landmarks (`<header>`, `<nav>`, `<main id="main-content">`, `<footer>`), skip-link to `#main-content`, strict `h1`–`h3` hierarchy, `[id] { scroll-margin-top: 96px; }`.
- Native `<button type="button">` for actions, `<a href>`/`<Link to>` for navigation, `aria-label` on icon-only controls, `aria-hidden="true"` on decorative SVGs/canvases.
- Visible `:focus-visible` `2px` `#ff9100` outline (`outline-offset: 2px`), `Escape` closes modals/drawers with focus restoration, `inert` on collapsed FAQ panels, `overscroll-behavior: contain` on dialogs.
- `overflow-x: clip` on `html, body` (prevents horizontal overflow while preserving `position: sticky`).
- Zero AI clichés (`"passionate"`, `"visionary"`, `"seamless digital experiences"`), zero fabricated metrics, zero private-repo leaks (`vocals` gated strictly inside `TODO_FIELDS.vocalsPublicDisclosure`), and explicit `TODO_FIELDS` registry in `src/data/portfolio.ts`.
