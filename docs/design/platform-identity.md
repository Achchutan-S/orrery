---
noteId: "b13873d0d5e511f1ae605f8c0e08bb6f"
tags: []

---

# Platform identity (task 7)

> Since task 14 the Index experience owns `/` and the platform owns the Beacon ([ADR-019](../adr/019-index-and-beacon.md)); this page records the task 7 design.

The platform owns very little visible surface: accessibility tokens, the focus ring, the optional colophon, and, until the Phase 1 home experience exists, the discovery index at `/` and the 404 page. Everything else belongs to experiences. So the platform's identity has to be quiet enough to sit under any experience and still be recognisable on the few pages it owns.

**Subject.** One engineer's growing body of work: interactive explanations, writing, visualisations, tools. **Audience.** Senior engineers and recruiters who judge craft quickly; curious visitors who browse. **Primary job of the index.** Help someone choose what to open, honestly.

## Three directions

### A. Ephemeris

The index as an astronomical table (the repo is called *orrery*): experiences as bodies, rows of precise figures, tabular numerals, a small static orrery diagram as the one illustration.

- Type: a narrow grotesque with tabular figures. Colour: ink on cold white with one cobalt accent. Dense, ruled, left-aligned.
- Supports variety: yes, a table is neutral about what each row contains.
- Problem: the figures would be invented. There are no meaningful numbers per experience yet, and a table of decorative statistics is exactly what the brief forbids. It also lands on the broadsheet/hairline default.

### B. Specimen sheet

The index set like a type-specimen book: each entry's title in that experience's own typeface, the platform's own type almost invisible. This is the blueprint's own Phase 1 idea ("headlines set in each experience's own typography").

- Type: experience-supplied for titles; one neutral platform face for everything else. Colour: none of its own; each entry carries its experience's palette.
- Supports variety: best of the three, because the variety *is* the design.
- Problem: today no experience has a typeface yet (three fixtures), so it cannot be built honestly in Phase 0. It is the right direction for the Phase 1 home experience, not for the platform layer.

### C. Instrument maker's catalogue

The platform speaks like a maker's catalogue of instruments: plain, exact, and honest about what each piece does and what it costs to use. Each index entry states, in words, what opening it involves: a static page with no JavaScript, an interactive application that loads React, or a separate site on another domain. The platform's single visual signature is its focus ring, because accessibility is the one thing the platform owns everywhere.

- Type: Atkinson Hyperlegible Next, a face designed by the Braille Institute for low-vision readers. One family, used at few sizes. The platform's job is legibility and access, so its voice is a legibility typeface.
- Colour: mineral greens and graphite taken from instrument brass and its oxidation, used flatly.
- Layout: a hanging index (titles in a left column, description and weight line to the right), collapsing to one column on phones.
- Supports variety: yes. It describes experiences without styling them, and the focus ring works on any background.
- Risk: the green/brass pairing could read as steampunk if decorated. Mitigation: no textures, no ornaments, brass used only where it carries meaning (focus).

## Selected: C, with B reserved for the Phase 1 home experience

C is the only direction whose memorable idea comes from real data the platform already has (kind, performance class, external host) and from the platform's real responsibility (access). A is decoration without data; B is right but premature. The Phase 1 home experience can grow into B on top of C's tokens without contradicting it.

**The one memorable thing:** every entry tells you what opening it costs. Everything around it stays quiet.

## Design system

### Colour (platform pages)

| Name | Light | Dark | Use |
| --- | --- | --- | --- |
| Plate | `#EEF2EF` | `#121816` | page background |
| Ink | `#17201D` | `#E2E8E5` | text, headings |
| Graphite | `#4F5B57` | `#A3AFAA` | secondary text |
| Verdigris | `#1F6656` | `#7CC7B4` | links |
| Rule | `#C3CDC8` | `#2E3935` | the one divider under the header |
| Brass | `#F2C14E` | `#F2C14E` | focus ring inner band (platform-wide token) |

All text pairs meet WCAG AA, checked by `apps/site/test/tokens.test.ts`.

### Platform-wide tokens (`apps/site/src/platform/tokens/platform.css`)

Blueprint 3.9 limits shared tokens to focus, motion, contrast, Beacon size and spacing. That is all there is:

- `--pu-focus-inner` `#F2C14E`, `--pu-focus-outer` `#0B1310`, `--pu-focus-width` 3px. A two-band ring: a light band inside a dark band, so at least one band contrasts 3:1 with any background an experience chooses.
- `--pu-duration` 160ms, 0ms under `prefers-reduced-motion`.
- `--pu-target-min` 44px (touch target floor).
- `--pu-space-1…6`: 0.25, 0.5, 1, 1.5, 2.5, 4 rem.
- `--pu-beacon-size` 44px (reserved for task 14).

Platform-page colours and type are *not* platform-wide tokens; they live in `src/pages/_PlatformLayout.astro`.

### Type

Atkinson Hyperlegible Next, self-hosted through Astro's Fonts API (`weights 400 700`, latin), system sans fallback. Scale (classical, 18px body):

| Role | Size | Weight | Line height |
| --- | --- | --- | --- |
| Index title (h1) | `clamp(2.25rem, 1.6rem + 2.6vw, 3.5rem)` | 700 | 1.05 |
| Entry title (h2) | `clamp(1.5rem, 1.25rem + 1vw, 2rem)` | 700 | 1.15 |
| Body | 1.125rem | 400 | 1.5 |
| Weight line, colophon | 1rem | 400 | 1.45 |

Measure: 62ch for running text. Left-aligned throughout, ragged right; no justification, no centring.

### Layout

Single column below 48rem. From 48rem, a two-column hanging grid: `minmax(12rem, 1fr) minmax(0, 2fr)`, titles hanging left. Page gutter `clamp(1rem, 4vw, 3rem)`, max width 72rem. No cards, no shadows, no radius.

### Surfaces and motion

Flat plate. One rule under the header. No motion except what the visitor causes: link underline thickness changes on hover, the focus ring appears on keyboard focus. Nothing animates on load.

## Wireframes

Discovery index, wide:

```
┌──────────────────────────────────────────────────────────────────┐
│ Personal Universe                                                 │  h1
│ Things built, written and still in progress. Each entry says      │  lede, 62ch
│ what opening it involves.                                         │
│ ────────────────────────────────────────────────────────────────  │  rule
│                                                                   │
│ Sample content        Phase 0 fixture: a static content           │  h2 | summary
│                       experience that ships no JavaScript.        │
│                       Static page. No JavaScript of its own.      │  weight line
│                                                                   │
│ Sample app            Phase 0 fixture: a React application on     │
│                       prerendered, enumerated routes.             │
│                       Interactive. Loads its own JavaScript.      │
│                                                                   │
│ External fixture ⧉    Phase 0 fixture: an independently deployed  │  icon + dashed underline
│                       app, linked and never mounted.              │
│                       Leaves this site for example.com.           │
│                                                                   │
│ Static HTML; this page runs no JavaScript. Set in Atkinson        │  colophon (footer)
│ Hyperlegible Next, a typeface designed for readers with low vision.│
└──────────────────────────────────────────────────────────────────┘
```

Phone: the same order in one column; titles above summaries.

Shared wrapper (`ExperienceRoot`), every experience page:

```
<html lang="en" data-experience="<id>" style="color-scheme: …">
  <head>  charset · viewport · SeoHead · platform.css · <slot name="head"> (experience fonts, styles)
  <body>
    [chrome=full]    <header> link to the index </header>
    <slot />         ← the experience's own layout, landmarks and <main>
    [chrome=full|minimal]  <Colophon />  (footer landmark)
    [chrome=beacon]  nothing yet; the Beacon arrives in task 14
```

## Critique before building

Checked against the frontend-design skill's list of defaults:

- *Cream background with serif display:* avoided; cool mineral plate, a humanist sans chosen for a reason.
- *Near-black with one acid accent:* the dark scheme is green-graphite with a muted green link colour, no neon.
- *Broadsheet hairlines:* the first draft ruled every entry. Cut to one rule under the header; spacing separates entries.
- *SaaS cards:* no cards, no shadows, no radius.
- *Template chrome:* no eyebrows, no all caps, no middle-dot meta strings, no monospace labels, no arrows appended to link text. External entries carry three independent signals so none relies on colour or a glyph alone: the conventional external-link icon (hidden from assistive technology), a dashed underline, and the words "Leaves this site for example.com", which are also the link's accessible description; the link's accessible name ends "(external site)".
- *Accenting one word in the headline:* none.
- *Decorative numbers:* rejected direction A for this reason.

Removed after the mirror check: a tagline under each title, hover backgrounds on entries, and a "last updated" date with no real data behind it.

## External projects (task 8)

KawaiUI and Dev X-Ray sit in the same list as hosted experiences, with no separate card treatment. Three signals mark them, none relying on colour: the external-link icon, a dashed instead of solid underline, and the weight line "Leaves Personal Universe for <host>" with the host kept on one line (`white-space: nowrap`, `translate="no"`), because a break at the hyphen in `devxray-one.vercel.app` misread the address on phones. Screenshot review also showed wrapped titles aligning to their last line: an `inline-block` link's baseline is its last line. The title link is now inline, with padding for the 44px hit area, and summary and weight line share one grid cell.

## After building

Screenshot review (Playwright, `apps/site/test-results/`) led to two changes: titles and summaries are aligned on their first baseline on desktop (they were offset by the link's enlarged hit area), and `sample-content` positions the colophon in its own reading column (the colophon is opt-in chrome; the experience decides where it sits).

## Web Interface Guidelines audit (vercel-labs/web-interface-guidelines, fetched 1 November 2026)

Files: `src/pages/index.astro`, `src/pages/404.astro`, `src/pages/_PlatformLayout.astro`, `src/platform/**`, sample layouts.

Fixed:
- `_PlatformLayout.astro`: no `theme-color` for light and dark; added both.
- `index.astro`: entry titles not balanced; added `text-wrap: balance`. Long unbroken words could overflow the title column; added `overflow-wrap: break-word`.
- `index.astro`, `Colophon.astro`: brand name not opted out of translation; added `translate="no"`.
- `sample-app/routes/index.astro`: stacked view links below the 24px target size (found by axe `target-size`); spaced in the experience's layout.
- `index.astro`: entry links 43.6px tall on phones; set `min-block-size: var(--pu-target-min)`.

Deliberately not followed:
- *Title Case headings:* the frontend-design brief asks for sentence case; consistent sentence case is kept.
- *Skip link:* the platform pages have no navigation before `<main>`; the first Tab already lands on the first entry. The shared header (chrome `full`) will need one.

Passing: focus states (`:focus-visible`, two-band ring, never removed), reduced motion, no blanket transitions, real links for all navigation, URL-addressable state, preloaded critical font, dark `color-scheme`, empty state on the index, no images without dimensions (there are none).
