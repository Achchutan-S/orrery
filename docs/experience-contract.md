# Orrery Experience Contract

Version 1.0 · 7 November 2026 · **proposed, pending the owner's approval** ([ADR-024](adr/adr-024-experience-contract.md)) · amended the same day by the architecture amendment pass (experience independence, the Beacon, assets and fonts, publishing prerequisites); amendments made before acceptance do not change the version number

This is the agreement between Orrery (the platform) and every experience it hosts. It says what an experience must provide, what it may do freely, what the platform guarantees in return, and how the agreement changes over time. Version 1.0 describes the platform as it is built today: every requirement names how it is enforced, and anything that does not exist yet is marked as such.

Related documents: [blueprint](blueprint.md) (the architecture), [add-experience.md](add-experience.md) (the step-by-step procedure), [accessibility.md](accessibility.md), [repository-checks.md](repository-checks.md). If one of them contradicts this contract, the contract describes intent and the code describes fact; fix whichever is wrong.

## 0. How to read this contract

**MUST** is a requirement: an experience that does not meet it does not ship. **SHOULD** is expected unless there is a written reason. **MAY** is a freedom.

Each requirement names its enforcement:

| Label | Meaning |
| --- | --- |
| **build** | `mount-experiences` (or `validatePlatform()` in `platform-schema`) fails the site build |
| **check** | a repository check fails: `pnpm check:boundaries`, `check:metadata`, `check:leaks`, `check:budgets` (all part of `pnpm check`, CI, and Vercel's production build gate) |
| **test** | a unit or browser test fails (`pnpm test`, `pnpm test:browser`; CI runs both, but CI does not yet gate Vercel deployments, see [blueprint § 10](blueprint.md#10-performance-accessibility-and-quality-strategy)) |
| **CSP** | the browser refuses it at runtime under the site's Content Security Policy |
| **review** | no automation; the owner checks it when reviewing the change |
| **planned** | not enforced today; the gap is listed in [§ 11](#11-known-gaps-and-proposed-changes) |

The platform's parts referred to below: the **catalog** (`packages/experience-catalog`), **release state** (`config/release.json`), the **schema** (`packages/platform-schema`), the **kernel** (`apps/site/src/platform/`), the **Beacon** (the platform's way back to Orrery: a link to `/` and the ⌘K navigation palette; its function is the platform's, its presentation is the experience's, § 3.5) and the **Index** (the `index` experience at `/`).

## 1. The agreement in one paragraph

The platform gives every experience a document of its own, an address, a release lifecycle, honest metadata, a way back to the rest of Orrery, and a set of gates that stop mistakes before they ship. In return, an experience registers itself in the catalog, lives entirely in its own folder, renders through `ExperienceRoot`, keeps its styles in its own cascade layer, meets the accessibility outcomes in § 5, and passes the quality gates in § 8. Inside `<body>` the experience decides everything else: how it looks, reads, moves and sounds, including how the Beacon is presented. The platform deliberately has no visual theme to impose. This independence is creative and organisational, not a security boundary: every experience shares one repository, one build, one origin, one Content Security Policy and one platform kernel (§ 7).

## 2. Experience identity

An experience is three things with different owners and change rates:

| Part | Lives in | Says | Changed by |
| --- | --- | --- | --- |
| Catalog entry | `packages/experience-catalog/src/entries/<id>.ts`, plus one line in that package's `index.ts` | what it is: identity, routes, capabilities, presentation hints | code change, reviewed |
| Implementation | `apps/site/src/experiences/<id>/` | how it works and looks | code change, reviewed |
| Release entry | `config/release.json` → `experiences.<id>` | who gets it, where, and whether it is advertised | the Control Center or a reviewed edit |

### 2.1 Catalog fields

The schema is `packages/platform-schema/src/definition.ts`. Fields an internal experience declares:

| Field | Status | Rule | Consumed by |
| --- | --- | --- | --- |
| `kind: 'internal'` | required | — | everything |
| `id` | required, stable | `^[a-z][a-z0-9-]{1,39}$`; equals the folder name; never reused for something else | build, release state, CSS scoping, URLs |
| `title` | required | 1–60 characters, not blank | page title default, Index, Beacon, link previews |
| `summary` | required | 1–160 characters, not blank | page description default, Index, link previews |
| `capabilities` | required, at least one | closed set: `content`, `interactive`, `visualization`, `geospatial`, `multimedia`, `data`, `downloads`, `api`, `experimental` | validation only: `experimental` requires every route under `/labs/`; `api` requires an on-demand route (not available yet). Nothing else reads them today |
| `routes` | required, at least one | canonical patterns and entrypoints (§ 2.3); each entrypoint inside the experience's own folder; one route without parameters; unique across the catalog; no reserved prefix (`/_platform`, `/auth`, `/i`, `/me`, `/api`) | build (route mounting) |
| `performanceClass` | required | `content`, `interactive` or `immersive` | budgets; the Index's "what opening this costs" line |
| `chrome` | optional, default `minimal` | `minimal` (Beacon and colophon) or `beacon` (Beacon only) | `ExperienceRoot` |
| `colorScheme` | optional, default `light-dark` | `light`, `dark`, `light-dark` or `custom` (no `color-scheme` meta at all) | `ExperienceRoot` |
| `ogImage` | optional | the pattern of one of the experience's own `.png`/`.jpg` routes | `SeoHead`; otherwise the platform card `/og.png` |
| `tags` | optional, at most 8 | free text | Index marginalia, palette filter |
| `section`, `headline` | optional | `section`: `engineering`, `civic`, `thinking`, `labs`, `profile`; `headline`: `literary`, `technical`, `expressive`, `plain` | the Index's placement and the typeface family it echoes |
| `flags` | optional | declared build flags with a description | `flag()`, release state validation, leak scan |
| `exclusiveImports` | optional | npm packages only this experience may import; one owner per package | `check:boundaries` |
| `budgetOverrides` | optional | `jsKb`, `cssKb`, `transferMb`, with a `reason` of at least 20 characters | `check:budgets` |
| `variantOf` | optional | the id of an existing experience | validation only |
| `events` | reserved | event names | nothing yet; `track()` is a no-op (§ 6) |

An **external** experience (`kind: 'external'`) declares `id`, `title`, `summary`, `capabilities`, optional `tags`, `section`, `headline`, and an `https:` `url`. It has no folder and no routes; it is a link on the Index and in the Beacon, and it is never built here (KawaiUI and Dev X-Ray, [ADR-013](adr/adr-013-external-projects-and-samples.md)).

### 2.2 Identity rules

- The `id` **MUST** be stable once the experience has been published: it is the release key, the CSS scope (`[data-experience='<id>']`) and, by convention, the URL prefix. **build**
- Routes **SHOULD** sit under `/<id>` (the Index at `/` is the exception). Only uniqueness and reserved prefixes are enforced: **review**.
- Ownership is the folder. Everything the experience serves (pages, PDFs, images, downloads) comes from routes whose entrypoints are inside `apps/site/src/experiences/<id>/`. **build** (entrypoint owner and symlink checks)
- A new experience **MUST NOT** add a release entry to see itself: with no entry it is an owner-only, unlisted draft, built locally and in previews and never in production. **review**

### 2.3 Route paths

A route's `entrypoint` (relative to `apps/site/src/experiences/`) and `pattern` are accepted only in canonical form, so the schema, the filesystem, Vite and the URL layer read them the same way:

- `/`-separated lowercase ASCII segments, each starting with a letter, digit or underscore. That rules out `.` and `..`, empty segments (`a//b`, a trailing `/`), backslashes, absolute paths, percent-encoding and look-alike Unicode characters.
- An entrypoint is `<id>/…/<file>.astro|ts`, and its first segment must be the experience's own id. `validateCoverage` compares whole segments, not a string prefix: `sample-content/../resume/routes/pdf.ts` starts with `sample-content/` but is the resume's file, and is rejected.
- Pattern segments may also be Astro parameters (`[chapter]`, `[...path]`).
- The entrypoint must be a regular file at exactly that path: the site integration and the checks refuse a symlink anywhere below `src/experiences/`, which could point into another experience's folder.

Any violation is a catalog issue, so `planMount()` mounts nothing and the build fails.

## 3. Visual autonomy

### 3.1 What the experience owns

Inside `<body>`, and through its own additions to `<head>`, an experience defines its own:

- design language and art direction;
- typography and type hierarchy;
- colour palette and semantic design tokens (its own custom properties, under its own prefix);
- layout, composition, grid and spatial behaviour;
- materials, textures and visual treatments;
- interaction patterns, motion and sound;
- illustrations, photography, diagrams and other media;
- content presentation and information architecture, including its own navigation;
- responsive behaviour;
- its own assets: fonts, images, icons, sound and video, held in its own folder (§ 3.6);
- the presentation of the Beacon: placement, colour, type, size, material and treatment, within the Beacon's guarantees (§ 3.5);
- the way it meets the accessibility outcomes in § 5.

### 3.2 What the platform does not require

An experience is **not** required to use the platform's fonts, colours, spacing scale, components, page layout, card patterns, navigation design or visual theme. None of these exist as mandatory platform assets, and the contract will not add them. Shared UI components are opt-in only ([ADR-007](adr/adr-007-presentation-ownership.md): a component moves to an opt-in kernel folder only after three experiences copy it, and no experience is ever made to use it).

The six experiences built so far already look unrelated: a broadsheet front page (Index), a mineral-toned archive (Journal), a typeset dossier (resume), a forest reading room with a day and night scene (Skills Archive), a serif essay (sample-content) and a dark tool surface (sample-app). Each declares its own tokens (`--i-*`, `--j-*`, `--r-*`, the Archive's own, `--sc-*`, `--sa-*`).

### 3.3 What the platform does impose, and why

Only these touch an experience's pages, and each exists because it serves every visitor regardless of design:

| Imposed | Where | Can the experience change it? |
| --- | --- | --- |
| The document: `<html lang data-experience>`, `<head>` metadata, the platform stylesheet | `ExperienceRoot`, `SeoHead` | adds to `<head>` through the `head` slot; sets `lang`, `title`, `description` through props |
| Cascade layer order `platform.reset, platform.tokens, platform.chrome, experience` | `SeoHead` (first `<style>`) | no; the experience layer always wins over platform defaults |
| A small reset: `box-sizing: border-box`, `body { margin: 0 }`, `img, video { max-inline-size: 100%; block-size: auto }` | `platform.reset` | yes, any experience rule overrides it |
| The two-band focus ring | `platform.reset`, `!important` | no; it can add to it, never remove it ([ADR-013](adr/adr-013-external-projects-and-samples.md)) |
| Reduced motion clamps CSS animation and transition durations | `platform.reset`, `!important` | no |
| The Beacon's function: a link to `/`, the ⌘K palette and its accessible pattern (§ 3.5) | `ExperienceRoot`, `platform/beacon/` | no; the function and its guarantees are the platform's |
| The Beacon's presentation | today `platform.chrome`, `!important`: one treatment, fixed at the inline end of the viewport, its own colours and system font | yes by this contract (§ 3.5), but no mechanism exists yet, so every experience shows the default (gap G1, decision D4) |
| The colophon, with `chrome: 'minimal'` | `platform.chrome`; inherits the experience's colour and type | the experience positions and styles it in its own layer, or chooses `chrome: 'beacon'` |
| Integration tokens: `--pu-focus-*`, `--pu-duration`, `--pu-target-min`, `--pu-space-1`…`6` | `platform.tokens` | MAY use them; never required |

### 3.4 Current limits on autonomy

Honest limits of version 1.0, each with a proposed change in § 11:

- **Web fonts.** The requirements for experience-owned fonts are in § 3.6; what works today is narrower. An experience can use system font stacks (the Index's headlines, the Archive, sample-content) or the platform face (`--font-platform`). A web font of its own needs either an entry in `apps/site/astro.config.ts` (a platform file) or a font file served through one of its own routes. A font file imported from the experience's CSS would be emitted as `_astro/<name>.<hash>.woff2`, which the production output allowlist in `tools/checks/src/leaks.ts` does not accept (gap G2; found by reading the allowlist, not by a build).
- **Images.** The same allowlist rejects images imported through `astro:assets` or CSS `url()`. Images served by the experience's own routes work (the resume's and Archive's link-preview cards; gap G3).
- **Third-party resources.** The CSP allows only the site's own origin for scripts, styles, fonts, images, media, frames and connections (`default-src 'self'`). Everything must be self-hosted; third-party embeds, CDNs and remote APIs are not available.
- **WebAssembly and `eval`.** The CSP's `script-src` has no `'wasm-unsafe-eval'` or `'unsafe-eval'`, so an experience cannot compile WebAssembly (gap G5).
- **The Beacon** cannot yet be moved, re-toned or minimised by an experience: § 3.5 permits it, but the only presentation implemented is the platform default (gap G1).

### 3.5 The Beacon: platform function, experience presentation

The Beacon is how a visitor gets back to Orrery from any experience. Its function is mandatory and identical everywhere; its look is not. The contract does not require one fixed visual treatment across experiences.

**The platform guarantees, and an experience can never remove** (each is a requirement on whatever presentation mechanism D4 adds):

| # | Guarantee | Verified today by |
| --- | --- | --- |
| B1 | Present on every experience page, for both chrome values, and on the 404 page | **test** (pipeline and browser suites) |
| B2 | A link to `/` whose accessible name contains "Orrery" (`aria-current="page"` on the Index) | **test** |
| B3 | The palette: a "Go to" button, ⌘K or Ctrl+K, a modal `<dialog>` with a combobox over a listbox of real links, listing exactly `publicDiscoveryIndex()` | **test** |
| B4 | Keyboard: reachable by Tab at a predictable point in the focus order, operable with Enter, Escape returns focus to the button, focus never escapes the open palette | **test** |
| B5 | Visible without hover or scrolling, never covered by experience content, and never covering content the visitor needs at 320 CSS px or 400% zoom | **test** (reflow) partly; **review** |
| B6 | The platform focus ring; targets at least 44 × 44 px; WCAG 2.2 AA contrast against whatever it sits on; visible in forced colours | **test** for the default presentation |
| B7 | Without JavaScript it degrades to the link alone; motion respects `prefers-reduced-motion` | **test** |
| B8 | Its script stays within the 15 KB Beacon budget and the CSP | **check** (budgets); **CSP** |

**The experience may own** its placement (which edge or corner, or a position inside its own header or toolbar), colour and tone, typeface, size above the 44 px minimum, shape, material and texture, a compact or expanded form, and transitions that respect reduced motion. It may not hide it, remove it, rename the link, reorder or filter the palette, or reimplement the palette's behaviour.

**How presentation will be configured is not decided** (decision D4, gap G1). Two shapes are on the table: a documented set of Beacon custom properties and placement values that the experience sets in its own layer, while the platform keeps its `!important` guarantees for focus, size and visibility; or an experience-rendered trigger that the platform wires to the same palette. Either way the guarantees B1–B8 are tested for every presentation, not only the default. Until a mechanism exists, `platform.chrome` keeps the Beacon's styles `!important` ([ADR-019](adr/adr-019-index-and-beacon.md) item 6) and every experience shows the default.

### 3.6 Experience-owned assets and fonts

An experience's fonts, images, icons, audio, video and downloads are part of its identity and live in its own folder. These requirements apply to every such file, whichever way it is delivered.

**Requirements**

- **Self-hosted.** Every file comes from the site's own origin; the CSP refuses third-party fonts, images, media and scripts. **CSP**
- **In the experience's folder.** Source files live under `apps/site/src/experiences/<id>/`, never in `apps/site/public/` (which ships in every build regardless of release state, [ADR-020](adr/adr-020-resume-assets.md)) and never in another experience's folder. **check** (leak allowlist, boundaries)
- **Licensed for a public repository.** The repository is public, so committing a font or image publishes its source file, not only the rendered page. Only files whose licence allows redistribution of the file itself may be committed; a font licensed for web embedding only, or an image licensed for display only, cannot be. **review**
- **Nothing private in the file.** Strip camera, location and author metadata from images; no personal documents or unreleased material (M15). **review**
- **Offline and deterministic.** Files are committed; the build never downloads a font or image ([ADR-021](adr/adr-021-platform-integrity.md)). **review**
- **Efficient.** Fonts as subsetted WOFF2 with an explicit `font-display`; raster images sized for their largest display and compressed; every `<img>` has `width` and `height` ([ADR-023](adr/adr-023-audit-closure.md)). **check** (budgets, `<img>` dimensions); **review**
- **Accessible.** Informative images have text alternatives; decorative ones have empty `alt` or are CSS backgrounds; text is never rendered as an image. **test** (axe) on covered pages
- **Safe file types.** SVG files served as routes contain no scripts or event handlers, because a directly opened SVG runs on the site's origin. **review**

**Budgets.** Fonts count against 110 KB per page in every class; images against 100 KB (`content`, `interactive`) or 250 KB (`immersive`); files no page loads against `FILE_BUDGETS` (§ 8.2). `budgetOverrides` cannot raise font or image limits today (gap G4).

**Delivery today**

| Route | Works today | Notes |
| --- | --- | --- |
| A file route of the experience (`/<id>/og.png` from `routes/og.ts`, the resume's PDF, the Archive's ZIPs) | yes | built only where the experience is mounted; counted by page budgets when a page loads it, otherwise by `FILE_BUDGETS` |
| Imported from the experience's CSS or components, emitted by Vite as `_astro/<name>.<hash>.<ext>` | no for fonts and images: the production output allowlist accepts only hashed `.js` and `.css` and the platform's own font files (gaps G2, G3) | the natural route for web fonts and in-page images |
| The platform face, `--font-platform` | yes | optional, never required |
| An entry in `apps/site/astro.config.ts` | yes, but it is a platform file | not a supported route for an experience |

**Output validation an implementation of D11 must keep.** If hashed fonts and images are allowed, the leak check must still prove that every emitted asset belongs to an experience mounted in that build, that no unreleased experience's asset bytes (raw or base64) appear in production output, and that each asset is counted by a page budget or `FILE_BUDGETS`. Allowing a file type without those three proofs would turn the allowlist into a hole.

## 4. Platform integration

### 4.1 Mandatory requirements

Every internal experience **MUST**:

| # | Requirement | Enforcement |
| --- | --- | --- |
| M1 | Have exactly one folder `apps/site/src/experiences/<id>/`, one catalog entry and one index line; no folder without an entry and no entry without its entrypoint files | **build** (`validateCoverage`) |
| M2 | Have a catalog entry that parses and passes the cross-entry rules (§ 2.1) | **build** (`validateCatalog`) |
| M3 | Use only canonical routes whose entrypoints are regular files in its own folder (no symlinks, no `..`) | **build** |
| M4 | Serve every file it publishes (PDF, image, download, data) from one of its own routes, never from `apps/site/public/` ([ADR-020](adr/adr-020-resume-assets.md)) | **check** (leak output allowlist) |
| M5 | Render every page through `<ExperienceRoot experience="<id>">`, which owns `<html>`, `<head>` metadata, the platform stylesheet and the chrome | **check** (`check:metadata` fails a page without complete metadata); **review** |
| M6 | Not emit its own `robots`, canonical, `og:*` or `twitter:*` tags; pass `title`/`description` to `ExperienceRoot` instead | **review** |
| M7 | Put its styles in `@layer experience`, scoped by `[data-experience='<id>']` | **review** (unlayered styles cannot break the focus ring or Beacon, which are `!important`, but they bypass the layering the contract relies on) |
| M8 | Use no inline `style="…"` attributes, no inline event handlers and no unhashed inline scripts or styles; use Astro-processed `<script>` and `<style>` blocks | **CSP**; **test** for pages the browser suites visit |
| M9 | Import only its own files, the supported kernel surface (§ 6.2), `@pu/platform-schema` and npm packages; never another experience, by any spelling, glob or CSS `url()` | **check** (`check:boundaries`) |
| M10 | Keep catalog, release state, `platform/release`, `platform/access`, `integrations/` and `node:` modules out of browser code (anything with `client:*` and what it imports) | **check** |
| M11 | Wrap every React island's root in an error boundary with an accessible fallback that shows no error details (pattern: `sample-app/ErrorBoundary.tsx`) | **review**; **test** for `sample-app` only |
| M12 | Mark flag-gated UI with `data-pu-flag="<id>:<flag>"` and read flags with `flag()` in frontmatter only | **check** (leak scan) for marked UI; **review** for marking |
| M13 | Meet the accessibility outcomes in § 5 | partly **test**, partly **review**, see § 5 |
| M14 | Pass every quality gate in § 8 for its performance class | **check**, **test** |
| M15 | Contain nothing that must stay private: the repository is public, and release state keeps a draft off the website, not off GitHub or out of Git history ([ADR-022](adr/adr-022-link-previews-smoke-and-public-repository.md)) | **review** |
| M16 | Behave correctly when not mounted: no other experience or platform page links to its routes by hand; discovery comes only from `publicDiscoveryIndex()` | **check** (the leak check fails if the Index links an unlisted experience); **review** |

### 4.2 Lifecycle, access and SEO behaviour an experience inherits

An experience declares nothing in code about its release; release state decides. What follows is platform behaviour, not an experience obligation:

- **Mounting.** In production an experience is built when its lifecycle is `beta`, `published`, `frozen` or `deprecated` and its access is `public`. Locally and in previews everything except `archived` is built ([blueprint § 6](blueprint.md#6-catalog-lifecycle-discoverability-and-access)).
- **Listing.** Listed experiences appear on the Index and in the Beacon's palette. Listed pages get a canonical URL; every other page is `noindex` with `no-referrer`.
- **Link previews.** Every page gets `og:*` and `twitter:*` tags with an absolute image URL: the experience's own `ogImage` route or the platform card.
- **Unmounted means absent.** A route that is not mounted is never compiled: its pages, scripts and files do not exist in that build, and the address is the site's 404.

### 4.3 Errors and fallbacks

- Every page **MUST** be meaningful before and without JavaScript: content in the HTML, interactive parts with a static fallback. Islands render on the server (`client:load`, `client:visible`, `client:idle`); `client:only` needs a fallback slot that names what would load. **review**; **test** where the browser suites run with JavaScript off.
- Unknown addresses within an experience's path space are the site's 404 (status 404). An in-app router **MUST** render its own not-found view for client-side navigation to an unknown view, and **MUST NOT** turn unknown paths into 200 pages unless the experience owns a rewrite that is `noindex` ([blueprint revision 2 § 3.11](https://github.com/Achchutan-S/orrery/blob/c7ec5cd/docs/blueprint.md#311-routing-application-experiences-statically)).
- A build-time failure (a missing source file, a failed integrity check) **SHOULD** throw with a message naming the file, so the build fails rather than shipping a broken page (the Archive's SHA-256 check is the pattern).

### 4.4 Build and deployment compatibility

- Static only: every route is prerendered (`render: 'on-demand'` fails validation until protected rendering exists). **build**
- Dynamic routes enumerate their paths with `getStaticPaths`; addressable app views are real files ([blueprint revision 2 § 3.11](https://github.com/Achchutan-S/orrery/blob/c7ec5cd/docs/blueprint.md#311-routing-application-experiences-statically)).
- No build-time network access: builds run offline (fonts are committed, [ADR-021](adr/adr-021-platform-integrity.md)). **review**
- Builds are deterministic for the same inputs (the Archive's ZIPs and the resume's committed assets are the pattern). **review**
- Node `>=22.23.4 <23` and the workspace's single dependency graph ([ADR-021](adr/adr-021-platform-integrity.md)).

### 4.5 Optional capabilities

An experience **MAY**:

| Capability | How |
| --- | --- |
| Own presentation in full | § 3 |
| Choose its chrome | `chrome: 'minimal'` or `'beacon'` |
| Choose its colour scheme | `colorScheme` |
| Publish its own link-preview image | an image route plus `ogImage` |
| Be placed on the Index | `section`, `headline`, `tags` |
| Use build flags | declare in `flags`, set values in release state, read with `flag()` |
| Use React islands | `client:*` directives; React loads only on pages with an island |
| Own npm packages exclusively | `exclusiveImports` |
| Raise its JavaScript, CSS or transfer budget | `budgetOverrides` with a written reason (§ 8.3) |
| Exist as a variant of another experience | `variantOf`, with its own id, routes, lifecycle and access |
| Serve downloads and generated files | file routes (`/<id>/x.pdf`, `/<id>/x/package.zip`) |
| Use the platform face or integration tokens | `<Font cssVariable="--font-platform" />` in the `head` slot; `var(--pu-*)` |

### 4.6 Reserved, not available yet

These exist in the schema so that adding them later needs no migration, and validation rejects them today: `render: 'on-demand'`; access `signed-in` and `policy`; request-evaluated flags and flag audiences; the `api` capability. Owner access already works, with one meaning: "not built in production". It is not authentication: no sign-in exists, and nothing checks who is asking. Nothing in this contract makes an experience private (§ 7).

## 5. Accessibility without visual uniformity

Accessibility is the one place where freedom stops. The platform defines outcomes, not a look: an experience reaches each outcome in its own visual language.

| Outcome | The platform provides | The experience must | Verified by |
| --- | --- | --- | --- |
| Keyboard operability | a keyboard-reachable Beacon and palette | make every interactive thing reachable and operable by keyboard in a sensible order; no keyboard traps; custom widgets follow the matching ARIA pattern | **test** where suites cover the page; manual checklist |
| Visible focus | the two-band ring, which it cannot remove | not hide focus with overflow or stacking; manage focus after in-app navigation and in dialogs (focus the new heading; return focus on close) | **test** (forced-colours and focus checks on covered pages) |
| Semantic structure | `lang` and `<title>` on every page | one `h1`, one `main`, landmarks, no skipped heading levels; a skip link when navigation precedes `main` | **test** on covered pages (`axe` best practices, heading checks) |
| Screen-reader support | the palette's combobox and listbox pattern; polite announcements | name every control; announce asynchronous results in a live region; describe visual-only content (a canvas, a diagram, a scene) in text or mark it decorative | **test** (axe) partly; manual checklist |
| Reduced motion | a CSS clamp on animation and transition durations | stop or replace JavaScript, canvas and WebGL motion when `prefers-reduced-motion: reduce`; never autoplay motion longer than five seconds without a pause control | **review**; **test** for the Index and Archive |
| Contrast and readability | a focus ring that contrasts with any background | meet WCAG 2.2 AA contrast in every colour scheme it offers, against its own palette; text must survive WCAG text-spacing overrides | **test** (axe, light and dark; text spacing on covered pages) |
| Reflow and zoom | — | no sideways page scrolling at 320 CSS px; wide tables and code scroll inside their own focusable region | **test** on covered pages |
| Touch targets | `--pu-target-min: 44px` | interactive targets at least 44 × 44 px on touch screens | **test** on covered pages |
| Forced colours | the Beacon stays visible | not convey state by colour or background images alone | **test** on covered pages |
| Works without JavaScript | the Beacon degrades to a link | content readable without scripts | **test** on covered pages |

**Coverage today.** The browser suites run these checks on a hand-written list of pages (`apps/site/test-browser/browser.test.ts`) and on the Archive's own suite. A new experience is covered only when its author adds its pages (runbook step 8). Deriving the list from the build is gap G7.

**Manual evidence.** Automated checks are not proof. The manual checklist in [accessibility.md](accessibility.md) has not yet been performed by a person, and no document may record it as done until someone has.

**In an experience's own language.** A sky experience can draw its focus as a halo in addition to the platform ring; an immersive scene can offer a "still" mode that is a composed static image with the same information in text; a data-dense observatory can give every chart a table in a disclosure; a minimalist product page can keep its single-colour palette as long as every pair passes contrast. The outcome is fixed; the expression is the experience's.

## 6. Shared platform services

### 6.1 Services

| Service | Status | How an experience uses it | Optional? |
| --- | --- | --- | --- |
| Document shell and SEO head | built | `<ExperienceRoot>` | mandatory |
| Beacon (the way back to Orrery and the ⌘K palette) | built, default presentation only | rendered by `ExperienceRoot` for both chrome values | function mandatory; presentation experience-owned by § 3.5, mechanism not built (gap G1) |
| Colophon | built | `chrome: 'minimal'` | yes (`chrome: 'beacon'`) |
| Public discovery index | built | `publicDiscoveryIndex(experiences, releaseState, env)` in frontmatter, to list or link other experiences (the Journal's inventory does this) | yes |
| Build flags | built | `flag(id, name)` in frontmatter | yes |
| Link-preview image | built | `ogImage` | yes (platform card otherwise) |
| Integration tokens and platform face | built | `var(--pu-*)`; `--font-platform` | yes |
| Usage events, `track()` | stub: a no-op that sends and stores nothing | call freely; it will start working without changes | yes |
| Authorization, `authorize()` | stub: always denies | do not call before protected rendering exists | — |
| Search | not built (carried-over backlog, [blueprint § 11](blueprint.md#11-roadmap)) | — | — |
| Page analytics, performance telemetry | not built | — | — |
| Access auditing | not built (identity phase) | — | — |
| RSS, sitemap | not built | — | — |

### 6.2 Supported kernel surface

Experiences may import these and rely on them; everything else under `src/platform/` is internal and may change without notice:

- `platform/root/ExperienceRoot.astro`: props `experience`, `title?`, `description?`, `lang?`; slot `head`.
- `platform/release/index.ts`: `flag()`; `env`, `experiences` and `releaseState` only to pass to `publicDiscoveryIndex()`. Server-side frontmatter only.
- `platform/discovery/index.ts`: `publicDiscoveryIndex()`, `weightOf()`, `weightLine()`.
- `platform/analytics/track.ts`: `track()`.
- The custom properties in `platform/tokens/platform.css` (read, never redefine).
- `@pu/platform-schema`: types and pure functions (sample-app computes its facts with them at build time).

Not supported for experience use: `Beacon.astro`, `palette.ts`, `Colophon.astro`, `SeoHead.astro`, `access/authorize.ts`.

### 6.3 Rules for platform elements

- The platform never adds visible elements to an experience's page beyond the Beacon and, when chosen, the colophon. Both take their presentation from the experience where the contract allows it (the colophon today; the Beacon once D4's mechanism exists).
- The Beacon lists only `publicDiscoveryIndex()`: an experience cannot add itself, hide others or reorder it; catalog order and release state do.
- A new shared service follows the kernel rule: it is added only when two experiences need it, and it is optional unless it is an accessibility, metadata or security guarantee.

## 7. Isolation and dependencies

**Independence is not a security boundary.** Experiences are independent in design, assets, typography, layout and interaction, and the rules below keep them from depending on each other by accident. They are not isolated from each other in any way an attacker would respect. Every experience shares:

| Shared | Consequence |
| --- | --- |
| One public repository and its Git history | every committed file of every experience, draft or not, is readable by anyone |
| One build and one dependency graph | a failing experience fails the whole site's build; a compromised or broken npm package reaches every experience that imports it, and every page that loads it |
| One origin (`orrery-teal.vercel.app` today) | any script on any page can read same-origin storage, cookies and caches, and can fetch every other page; a path is not an origin and a folder is not a boundary |
| One Content Security Policy | a directive added for one experience (for example `'wasm-unsafe-eval'`, gap G5) applies to every page |
| One platform kernel | a kernel change reaches every experience at once |

What the release model and the platform do **not** provide, today:

- **`owner` is not authentication.** It means "never built in production". Locally and in every preview build the experience is present.
- **`unlisted` is not private.** An unlisted page is public to anyone with the address; it is only left out of discovery and marked `noindex`.
- **Draft and unbuilt are not private.** The source is in the public repository and in every preview.
- **The Control Center is local-only.** It edits `config/release.json` on the owner's machine; it is not an access-control system and has no deployed form.
- **No identity system and no private content delivery exist.** There is no sign-in, no per-request authorization, no protected route and no private content store. Until the Identity phase builds them ([blueprint § 6.4](blueprint.md#64-the-protected-access-model-designed-not-built)), nothing that must stay private belongs in this repository.

Code the owner cannot review, or anything that needs real isolation, runs on a separate origin (§ 7.5).

### 7.1 Imports

| An experience may import | An experience must not import |
| --- | --- |
| its own files, including `import.meta.glob()` with literal patterns inside its folder | another experience's files, by relative path, `..`, root-relative path, backslash, query suffix or glob |
| the supported kernel surface (§ 6.2) | kernel internals outside § 6.2 |
| `@pu/platform-schema` | `@pu/experience-catalog` or `config/release.json` directly (use `platform/release`) |
| npm packages in the workspace's lockfile | packages listed in another experience's `exclusiveImports` |
| `astro:*` virtual modules; `node:*` in server-only code | anything server-only from browser code (§ 4.1 M10) |

Platform code (the kernel, `src/pages`, `integrations/`, `astro.config.ts`) never imports an experience. All of this is **check** (`check:boundaries`), with the known limit that the checker reads static import strings only ([ADR-014](adr/adr-014-repository-checks.md)).

### 7.2 Dependencies

- An experience **MAY** depend on any npm package added to `apps/site`, and **SHOULD** list packages that only it uses in `exclusiveImports`, so no other experience starts depending on them silently.
- `exclusiveImports` controls who may import a package. It does not isolate versions: the site has one dependency graph, one lockfile and one version of React, Astro and every shared package.
- An experience that needs a different framework, a conflicting major version, long-running compute or its own release cadence **graduates**: it becomes its own project and returns as an `external` entry ([ADR-004](adr/adr-004-experience-model.md) graduation criteria).

### 7.3 CSS isolation

Three mechanisms, in order of strength:

1. **One document per page.** Navigation between experiences is a full page load. An experience's stylesheet is imported only by its own pages, so it is never present on another experience's pages.
2. **Cascade layers.** Platform layers come first; `experience` comes last and wins without `!important`. The focus ring, reduced motion and the Beacon are `!important` in earlier layers, so they win over every experience rule, including the experience's own `!important` declarations and `all: unset`.
3. **Scoping.** Global styles are written as `[data-experience='<id>'] …`, so a selector that somehow reaches another document still does not match.

`sample-hostile` (a permanent draft whose stylesheet is `* { all: unset }`) proves it: browser tests compare other experiences' computed styles after visiting it with a build that does not contain it.

### 7.4 Scripts and React islands

- Scripts are Astro-processed `<script>` blocks (bundled or inlined and hashed into the CSP). `is:inline` scripts and styles are not hashed automatically and are not available to experiences.
- React is opt-in per island (`client:*`). React's runtime is referenced only by pages that contain an island (**test**). Islands on one page are separate roots and cannot share React context.
- Anything passed to an island as props is public.
- Plain TypeScript is the default for small behaviours (the Beacon's palette and the Archive's copy and search scripts ship no framework).

### 7.5 External experiences and origins

An external experience is a catalog entry with an `https:` URL. It has no folder (a folder for it fails the build), it is never built, and it runs on its own origin. Linking it never modifies its repository or deployment. Any experiment that runs code the owner cannot review belongs on a separate origin, not in this site ([blueprint § 9](blueprint.md#9-security-and-privacy-boundaries)).

## 8. Quality gates

### 8.1 Gates

| Gate | Command | Runs in CI | Gates a Vercel production build |
| --- | --- | --- | --- |
| Type safety | `pnpm typecheck` (`tsc`, `astro check`) | yes | yes |
| Boundaries | `pnpm check:boundaries` | yes | yes |
| Catalog, release and coverage validation | the build itself | yes | yes |
| Metadata (title, description, Open Graph, canonical consistency, image present) | `pnpm check:metadata` | yes | yes |
| Leaks (unreleased routes, canaries, non-public metadata and prose, output allowlist, source maps, off flags) | `pnpm check:leaks` | yes | yes |
| Performance budgets per page and per file kind | `pnpm check:budgets` | yes | yes |
| Unit and integration tests | `pnpm test` | yes | no (decision D16) |
| Browser tests: accessibility, routing, CSP, isolation | `pnpm test:browser` | yes | no (decision D16) |
| Deployment smoke test | `pnpm smoke <url> --env production\|preview` | no (manual after deploy) | no |
| Manual accessibility checklist | [accessibility.md](accessibility.md) | no | no |

The last four rows do not stop a production deployment automatically, which is why § 8.5 makes them explicit prerequisites before a new experience is published.

### 8.2 Budgets by performance class

KB gzip per page, from `tools/checks/src/budgets.ts`. The Beacon has its own 15 KB JavaScript budget on every page.

| Class | JS | CSS | Fonts | Images | Lazy chunk | Transfer |
| --- | --- | --- | --- | --- | --- | --- |
| `content` | 0 | 30 | 110 | 100 | 0 | 160 |
| `interactive` | 150 | 50 | 110 | 100 | 100 | 330 |
| `immersive` | 250 | 50 | 110 | 250 | 8,192 | 430 |

Files no page loads have their own limits (`FILE_BUDGETS`: link-preview images, documents, text downloads, archives). A new kind of emitted file needs a page that loads it or a `FILE_BUDGETS` entry ([ADR-023](adr/adr-023-audit-closure.md)). The image limits are provisional, and the `immersive` class has never been exercised by a real experience.

### 8.3 Exceptions

Different experiences need different budgets; the class is the first answer and an override the second.

1. Choose the class that describes the experience honestly. A heavier class is not an exception.
2. If the class still does not fit, set `budgetOverrides` (`jsKb`, `cssKb`, `transferMb`) with a `reason` of at least 20 characters saying what the bytes buy. The owner approves it in review.
3. Anything else (fonts, images, lazy chunks, a new file kind, a CSP directive) is a platform change: a schema or check change with an ADR.
4. Accessibility and leak gates have no exceptions.

### 8.4 Tests appropriate to the experience

| The experience | Minimum tests |
| --- | --- |
| any | its pages in the pipeline test's `PAGES`; its id in the pinned catalog lists (`metadata.test.ts`, `pipeline.test.ts`); axe and structure checks on its main page types |
| content only | the above; JavaScript-off rendering if it has any script |
| interactive | unit tests for its logic; browser tests for each interaction with keyboard; error-boundary fallback for each island |
| with build-time data or generated files | a test that fails when the source and the generated file disagree (the resume's content hash, the Archive's SHA-256 manifest) |
| immersive | reduced-motion and "still" behaviour; a static poster or fallback as the first paint; budget evidence |
| downloads | content type and bytes of each file route (the smoke test checks media types by extension) |

### 8.5 Prerequisites for publishing a new experience

Publishing means a release-state change that makes the experience mounted in production (lifecycle `beta`, `published`, `frozen` or `deprecated` with `public` access). Because CI does not gate Vercel deployments and accessibility coverage is hand-listed, these are explicit prerequisites. Each **MUST** be met and recorded before the publishing commit reaches `main`:

| # | Prerequisite | Evidence | Until the decision lands |
| --- | --- | --- | --- |
| P1 | Every page type of the experience is covered by the automated browser accessibility checks (axe light and dark, structure, reflow, text spacing, forced colours, keyboard), and they pass | the browser suites name its pages | coverage is added by hand (runbook step 8); D12 proposes deriving it from the build |
| P2 | A person has run the manual accessibility checklist on its page types | dated results in [accessibility.md § Results](accessibility.md#results); never recorded unless a person did it | — |
| P3 | Hosted CI passed both jobs on the exact commit that publishes it | the GitHub Actions run, named in the tracker | the owner checks it before merging; D16 proposes making CI a required deployment check |
| P4 | The Vercel preview of that commit passes `pnpm smoke <url> --env preview` with the experience mounted | the smoke output | — |
| P5 | The production build gate passes (typecheck, boundaries, validation, metadata, leaks, budgets) | automatic on Vercel | — |
| P6 | The owner approves the release-state change | the commit | — |

Existing published experiences predate P2 and have no recorded manual check (audit F12); that debt is tracked in the tracker, not waived by this section.

## 9. Contract evolution

### 9.1 Versions

The contract has a version number, `MAJOR.MINOR`, in its heading.

- **Minor:** a new optional capability, a new enforcement of an existing requirement, a clarification. Existing experiences keep working unchanged.
- **Major:** a requirement that existing experiences must change to meet. A major version lands in the same change as the migration of every existing experience, because every experience lives in this one repository and is built in one build.

There is no per-experience contract-version field. With one repository and one build, an experience cannot stay on an older contract; the version number tells readers what changed, and the migration travels with the change. Revisit this only if an experience graduates to its own deployment and still wants platform integration.

### 9.2 How a capability is added

1. A real experience needs it (the first-consumer rule for schema values: [ADR-021](adr/adr-021-platform-integrity.md) removed `chrome: 'full'` because nothing used it).
2. A kernel module needs two consuming experiences; a schema option needs one, plus the rule or code that consumes it.
3. It is added as optional, with validation and a test, documented here in a minor version, and recorded in an ADR if it changes a decision.

### 9.3 Deprecation and removal

A capability is deprecated in a minor version: the contract marks it, and the schema gives a message naming the replacement where it can. It is removed in the next major version, together with the migration of any experience still using it. Nothing is removed silently.

### 9.4 Experiments without destabilising others

- **Drafts and previews:** a draft is built locally and in protected previews only.
- **Build flags:** small differences inside a published experience; release management, not secrecy (an off flag's code can still ship).
- **Variants:** a large rewrite as a separate experience with `variantOf`, its own routes and lifecycle; promotion merges it back and archives the variant.
- **Labs:** the `experimental` capability requires every route under `/labs/`, so experiments are recognisable by address.
- **Graduation:** anything that needs different infrastructure leaves the build.
- **Contract experiments:** a proposed capability is tried by one draft experience first; it becomes part of the contract only when that experience is accepted.

## 10. Example: an experience that looks nothing like Orrery

*Hypothetical.* "Cumulus", a sky experience about how clouds form. It is not built; the code shows what conforming looks like.

**Catalog entry** (`packages/experience-catalog/src/entries/cumulus.ts`, plus one index line):

```ts
import { defineExperience } from '@pu/platform-schema';

export default defineExperience({
  kind: 'internal',
  id: 'cumulus',
  title: 'Cumulus',
  summary: 'How a cloud forms, rises and rains, told across one afternoon sky.',
  capabilities: ['visualization', 'interactive'],
  tags: ['weather', 'physics'],
  section: 'labs',
  headline: 'expressive',
  routes: [
    { pattern: '/cumulus', entrypoint: 'cumulus/routes/index.astro' },
    { pattern: '/cumulus/[stage]', entrypoint: 'cumulus/routes/stage.astro' },
    { pattern: '/cumulus/og.png', entrypoint: 'cumulus/routes/og.ts' },
  ],
  chrome: 'beacon',
  colorScheme: 'custom',
  ogImage: '/cumulus/og.png',
  performanceClass: 'immersive',
});
```

**Folder:**

```
apps/site/src/experiences/cumulus/
  Layout.astro            ExperienceRoot plus the sky's own tokens and type
  routes/index.astro      the afternoon, as a scrolling sky with text beside it
  routes/stage.astro      one prerendered page per stage (getStaticPaths)
  routes/og.ts            the link-preview card
  sky/scene.ts            canvas drawing; pauses under reduced motion
  sky/stages.ts           the single table of stages, shared by routes and scene
  styles/sky.css          @layer experience, [data-experience='cumulus']
  assets/og.png
```

**Layout:**

```astro
---
import ExperienceRoot from '../../platform/root/ExperienceRoot.astro';
import './styles/sky.css';
interface Props { title?: string; description?: string }
---
<ExperienceRoot experience="cumulus" title={Astro.props.title} description={Astro.props.description}>
  <a class="skip" href="#sky">Skip to the sky</a>
  <slot />
  <script>import './sky/scene.ts';</script>
</ExperienceRoot>
```

```css
/* styles/sky.css */
@layer experience {
  [data-experience='cumulus'] {
    --cu-zenith: #12355b;
    --cu-horizon: #f4cfa8;
    --cu-ink: #0b1a2b;
    --cu-type: 'Avenir Next', 'Segoe UI', system-ui, sans-serif;
  }
  [data-experience='cumulus'] body {
    background: linear-gradient(var(--cu-zenith), var(--cu-horizon)) fixed;
    color: var(--cu-ink);
    font: 400 1.125rem/1.6 var(--cu-type);
  }
}
```

**What it inherits from Orrery:** a document, metadata and link previews, the Beacon, the focus ring, reduced-motion clamping of CSS, its place on the Index (in its own headline family, without its fonts loading there), and the gates. **What it does not inherit:** any font, colour, layout or component. Nothing in it resembles the Index or the Journal.

**What it must still do:** describe each stage in text beside the canvas; stop the canvas animation under reduced motion and show a composed still; keep the canvas `aria-hidden` with the text as the accessible content; check every text colour against both ends of its gradient; add its pages to the browser suites; and stay a draft (no release entry) until the owner publishes it, after meeting P1–P6 (§ 8.5).

**How it would present the Beacon (once D4's mechanism exists):** as a thin cloud-white tab at the top inline-end corner, set in its own typeface, with a dark label for contrast against the pale horizon. The link to `/`, the palette, the keyboard behaviour and the 44 px target stay the platform's (§ 3.5).

**Where version 1.0 would push back today:** a web font of its own hits gap G2 (it uses a system stack instead here); an image imported through `astro:assets` hits gap G3; the Beacon presentation above has no mechanism yet (gap G1), so it would show the default; a physics engine compiled to WebAssembly hits gap G5, and allowing it would change the CSP for every page (§ 7).

## 11. Known gaps and proposed changes

Each is a candidate for a minor version. None is implemented by this document; each waits for the first experience that needs it (blueprint Phase 3) and needs the owner's approval.

| Gap | Today | Proposed change | Implement when |
| --- | --- | --- | --- |
| G1 Beacon presentation | one default presentation, `!important` in `platform.chrome`; § 3.5 permits experience-owned presentation | a mechanism through which an experience sets the Beacon's placement and treatment (D4: custom properties and placement values, or an experience-rendered trigger), with B1–B8 tested for every presentation | the first prototype whose design needs its own Beacon presentation |
| G2 Experience-owned web fonts | system stacks, the platform face, or an `astro.config.ts` entry | allow content-hashed font files emitted from a mounted experience's own folder in the leak allowlist, keeping the output validation in § 3.6 (D11); budgets already count fonts | the first experience with its own web font |
| G3 Experience-owned images | image routes only; `astro:assets` output rejected by the allowlist | allow content-hashed images emitted from a mounted experience's folder, keeping the output validation in § 3.6 (D11) | the first experience with in-page raster images |
| G4 Budget overrides | `jsKb`, `cssKb`, `transferMb` only | add `fontsKb`, `imagesKb`, `lazyKb` with the same reason rule | the first justified need |
| G5 WebAssembly | blocked by the CSP | add `'wasm-unsafe-eval'` to `script-src` for the pages of an experience that declares it, or site-wide, by ADR; the CSP is shared, so the ADR weighs every page (§ 7) | the first experience that needs it |
| G6 Kernel surface | documented here only | no code change; if it grows, a single kernel entry module | — |
| G7 Accessibility coverage | browser suites use hand-written page lists | derive the pages from the build (as the smoke test derives routes), so every production and preview page gets axe and structure checks (D12) | proposed before Phase 3 prototypes are built; until then P1 is met by hand |
| G8 CSS layering | review only | a check that experience stylesheets declare `@layer experience` | only if a layering mistake actually happens |

## 12. Conformance checklist

- [ ] Folder, catalog entry, index line; no release entry until the owner publishes.
- [ ] Routes canonical, under `/<id>`, one without parameters; files served as routes.
- [ ] Every page through `ExperienceRoot`; no hand-written SEO tags.
- [ ] Styles in `@layer experience`, scoped by `[data-experience='<id>']`; no inline styles or scripts.
- [ ] Imports only from its folder, the supported kernel surface, the schema and npm.
- [ ] Islands with an error boundary; nothing private in props.
- [ ] Accessibility outcomes met in its own design; its pages added to the browser suites.
- [ ] Assets and fonts in its folder, self-hosted, licensed for a public repository, stripped of private metadata, within budget (§ 3.6).
- [ ] The Beacon present and unobstructed; any presentation of its own keeps B1–B8 (§ 3.5).
- [ ] `pnpm typecheck && pnpm test && pnpm check && pnpm test:browser` pass; production build does not mount it while it is a draft.
- [ ] Nothing committed that must stay private.
- [ ] Before publishing: P1–P6 met and recorded (§ 8.5).
