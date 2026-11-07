# ADR-012 — Shared platform layer (task 7)

Status: accepted (1 November 2026); choice 1 resolved by [ADR-019](019-index-and-beacon.md); choices 4 and 7 superseded by [ADR-021](021-platform-integrity.md) · Implements blueprint §2 "Shell versus experience boundary", 3.5a, 3.9 and ADR-007.

**Decision:** the kernel lives in `apps/site/src/platform/` (no new package). Design rationale: [`docs/design/platform-identity.md`](../design/platform-identity.md).

| Module | Interface |
| --- | --- |
| `root/ExperienceRoot.astro` | `experience`, optional `title`, `description`, `lang`; slot `head` for experience fonts. Owns `<html>`, metadata, platform CSS and the chrome the catalog entry chooses |
| `root/SeoHead.astro` | `title`, `description`, `listed`, optional `image` |
| `tokens/platform.css` | layer order, reset, `--pu-*` tokens, focus ring, colophon styles |
| `colophon/Colophon.astro` | rendered for `chrome: 'minimal'`; experiences position it in their own layer |
| `release/index.ts` | server-only `env`, `experiences`, `releaseState`, `internalExperience()`, `resolutionOf()`, `flag()` |
| `discovery/index.ts` | pure `publicDiscoveryIndex(experiences, state, env)`, `weightOf()`, `weightLine()` |
| `analytics/track.ts` | `track(experienceId, event, props)`: no-op |
| `access/authorize.ts` | `authorize(subject, experienceId, action)`: always `{ allowed: false, reason: 'not-implemented' }` |

**Choices where the blueprint was open, and deviations**

1. **The discovery index is a platform page at `/`** (`src/pages/index.astro`), not the Phase 1 `home` experience. The Foundation checklist needs a page that renders the external entry as a link, and `/` is the public entry point. When the home experience arrives (task 14) it takes over `/` and this page is deleted. The 404 page shares its layout, `src/pages/_PlatformLayout.astro`.
2. **Layer order is emitted inline as the first `<style>` in `<head>`** by `SeoHead`. Astro hoists page styles above imported stylesheets, so a page's `@layer experience` block could otherwise be declared before the platform layers and lose to them. Tested on every built page.
3. **Reduced motion is enforced with `!important` in `platform.reset`.** Important declarations in the first layer outrank all later layers, so no experience can opt out of reduced motion for CSS animation. JavaScript motion must still check the media query.
4. **`chrome: 'full'` fails the build** until an experience needs the shared header; building it now would be a header with no consumer.
5. **Canonical URLs use `VERCEL_PROJECT_PRODUCTION_URL`**, falling back to `http://localhost:4321` until a domain exists. Pages that are not listed (drafts, unlisted, 404) emit `noindex`, `no-referrer` and no canonical.
6. **`authorize()` fails closed.** In Phases 0–3 access is decided at build time; nothing calls `authorize()`, and an accidental early caller is denied rather than granted.
7. **Fonts:** the platform pages self-host Atkinson Hyperlegible Next through Astro's Fonts API (one 34 KB woff2, preloaded). It is referenced only by platform pages; experiences bring their own type.
8. **Browser tests** use `playwright` and `@axe-core/playwright` (dev dependencies, `pnpm test:browser`). Nothing already in the repository can drive a browser or run WCAG rules; this is the Playwright the blueprint plans for task 10, arriving early.

**Revisit when:** the home experience exists (delete the platform index page), or a second experience needs shared header chrome.
