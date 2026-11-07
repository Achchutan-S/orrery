# Architecture

The design is in [`blueprint.md`](blueprint.md); decisions are in [`adr/`](adr/). This page describes the code as it is now and how it maps to the blueprint.

## Packages

| Path | Role | Depends on |
| --- | --- | --- |
| `packages/platform-schema` | Zod schemas and pure functions: definitions, release state, resolution, validation, patches | `zod` |
| `packages/experience-catalog` | Data-only catalog: `entries/<id>.ts`, one index line each; `parseCatalog()` | `platform-schema` |
| `config/release.json` | Release state (lifecycle, access, discoverability, flag values); `release.schema.json` is generated | — |
| `apps/site` | Astro 7 static site; the `mount-experiences` integration; experiences under `src/experiences/` | `astro`, React, MDX, both packages |
| `apps/control` | Control Center: `server/` is the local Hono API over `config/release.json` (ADR-017); `web/` is the React UI served by Vite preview with an `/api` proxy (ADR-018). `pnpm control` runs both in one process ([control-center.md](control-center.md)) | `hono`, `@hono/node-server`, `zod`, `react`, `vite`, both packages |
| `tools/checks` | Repository checks and the `config/release.schema.json` generator ([runbook](runbooks/checks.md), ADR-014) | both packages, `zod` |

The Control Center is local only and never deployed.

## Kernel (`apps/site/src/platform`)

Modules and interfaces are listed in [ADR-012](adr/012-platform-layer.md). An experience page renders `<ExperienceRoot experience="<id>">` (usually through its own `Layout.astro`) and puts its own landmarks inside. Styles go in `@layer experience`, scoped by `[data-experience='<id>']`. The only platform-owned page is 404 (`src/pages/_PlatformLayout.astro`); `/` is the `index` experience. `ExperienceRoot` and the 404 layout render the Beacon. `SeoHead` writes each page's metadata: title and description (the catalog's unless the page overrides them), canonical and `og:url` for listed pages, and an absolute `og:image`, which is the catalog entry's `ogImage` (one of the experience's own image routes) or the platform card `public/og.png` ([ADR-022](adr/022-link-previews-smoke-and-public-repository.md)).

## Experiences today

| id | Kind | Production | Notes |
| --- | --- | --- | --- |
| `index` | internal, content | mounted at `/` | The Index front page (ADR-019); lists every other listed experience; chrome `beacon` |
| `kawaiui` | external | listed link | https://kawaiui.vercel.app/ (ADR-013) |
| `devxray` | external | listed link | https://devxray-one.vercel.app/ (ADR-013) |
| `journal` | internal, content | mounted | The Orrery Journal: platform history in MDX chapters, each passage marked with its standing (intent, implemented, verified, deployed, planned). Withdraw it by editing its entry in `config/release.json` (access `owner`, or `discoverability: unlisted`); its content stays. The Inventory and orrery diagram list only publicly listed experiences. |
| `sample-content` | internal, content | mounted | static essay, zero JavaScript |
| `sample-app` | internal, interactive | mounted | lifecycle explorer, in-app router, `inspector` flag (preview only) |
| `resume` | internal, content | yes (published 3 November 2026) | `/resume`, its PDF and link-preview image as routes; one content source ([resume.md](resume.md), ADR-020) |
| `canary-draft` | internal | never | leak-check fixture |
| `sample-hostile` | internal | never | CSS isolation fixture |

## Index and Beacon

**Data.** Both read only `publicDiscoveryIndex(experiences, releaseState, env)` (`src/platform/discovery/`): experiences whose resolution in this build's environment is *listed* (deployable, `listed`, public, not deprecated), in catalog order. Drafts, owner-only, unlisted and deprecated entries never reach it, in any environment. External entries keep their `url`; hosted entries link to their first parameter-free route.

**The Index** (`src/experiences/index/`, ADR-019). `front-page.ts` turns the entries into a front page:

| Slot | Rule |
| --- | --- |
| Masthead edition line | counts only: experiences, hosted here, elsewhere (no dates: none are reliable) |
| Lead | first entry in catalog order (excluding the Index itself) |
| Worth the detour | the entry that would otherwise sit last; only with three or more entries |
| Sections | Engineering, Civic, Thinking, Labs, then "Also here" for entries without `section`; empty ones hidden; shown as columns |
| Headline face | catalog `headline`: `literary` serif, `technical` monospace, `expressive` heavy sans, `plain` (default) platform face; system stacks, no font downloads |
| Marginalia | "Also on *tag*": other entries sharing a catalog tag, at most three per tag |

To move an entry, change `section` (or `headline`) in its catalog file; to reorder the front page, change the catalog order in `packages/experience-catalog/src/index.ts`.

**The Beacon** (`src/platform/beacon/`). A fixed pill at the end of the document: a link to `/` (marked `aria-current` on the Index) and a "Go to ⌘K / Ctrl K" button. The palette is a `<template>` holding a native `<dialog>` with a filter `<input role="combobox">` and a listbox of real links, one per public destination. `palette.ts` (1.0 KB gzip, inline, CSP-hashed) filters by every word against title, id, kind, section, host and tags; ↑/↓ move the selection (wrapping), Enter follows the selected link, Escape or a backdrop click closes and returns focus to the button, ⌘K/Ctrl+K toggles it except while typing in a field or with Alt/Shift. Without JavaScript the button stays hidden and nothing of the palette renders; every page still has its links. Styles are `!important` in `platform.chrome` so experience styles cannot break it (ADR-019).

**Adding a destination.** Add or publish an experience: a listed catalog entry with a release entry is on the Index and in the palette in the next build. Platform pages that are not experiences (a future writing index) are added the same way when they exist; nothing is listed before it exists. The resume is an experience like any other: it exists today as a draft and is listed once its release entry says so.

## platform-schema

| Module | Exports | Blueprint |
| --- | --- | --- |
| `definition.ts` | `ExperienceDefinition`, `defineExperience`, `Experience` (parsed), `ExperienceInput` (authored) | 3.1 |
| `release.ts` | `ReleaseState`, `ReleaseEntry`, `Lifecycle`, `Access`, `defaultReleaseEntry`, `releaseEntryFor`, `channelOf` | 3.2, 3.4 |
| `resolve.ts` | `environmentFrom`, `resolve`, `resolveAll`, `mountedRoutes`, `resolvePlatformFlags`, `PHASE_0` | 3.4–3.7 |
| `validate.ts` | `validateCatalog`, `validateCoverage`, `parseRelease`, `validateRelease`, `validatePlatform` (all of them, used by the build and the checks), `Issue` | 3.8 |
| `patch.ts` / `control.ts` | `canTransition`, `applyPatch`, `ReleasePatch`, `serializeRelease` (canonical release-file format), the Control Center API contract (`PatchRequest`, `API_ERRORS`, response types) | 3.4, 4.0 |

Every function is pure. `validateCoverage` takes the folder list and a `fileExists` callback, so the site integration does the filesystem reads. Release state uses strict objects: an unknown key in `release.json` is an error, not silently dropped.

### Route paths

A route's `entrypoint` (relative to `apps/site/src/experiences/`) and `pattern` are accepted only in canonical form, so the schema, the filesystem, Vite and the URL layer read them the same way:

- `/`-separated lowercase ASCII segments, each starting with a letter, digit or underscore. That rules out `.` and `..`, empty segments (`a//b`, a trailing `/`), backslashes, absolute paths, percent-encoding and look-alike Unicode characters.
- An entrypoint is `<id>/…/<file>.astro|ts`, and its first segment must be the experience's own id. `validateCoverage` compares whole segments, not a string prefix: `sample-content/../resume/routes/pdf.ts` starts with `sample-content/` but is the resume's file, and is rejected.
- Pattern segments may also be Astro parameters (`[chapter]`, `[...path]`).
- The entrypoint must be a regular file at exactly that path: the site integration and the checks refuse a symlink anywhere below `src/experiences/`, which could point into another experience's folder.

Any violation is a catalog issue, so `planMount()` mounts nothing and the build fails.

**Resolution in one line:** an experience is *deployable* when its lifecycle and access allow the environment; *mounted* when deployable and internal; *listed* when deployable, `listed`, public and not deprecated. ADR-005 records where this interprets the blueprint.

## Site build

`astro.config.ts` sets `output: 'static'`, `trailingSlash: 'never'`, `build.format: 'file'`, React and MDX. `integrations/mount-experiences.ts`:

1. `environmentFrom(process.env.VERCEL_ENV)` (unknown value: build fails).
2. `planMount()`: validate catalog, `config/release.json` and folder coverage; any issue fails the build with every issue listed.
3. `injectRoute` for each route of each mounted experience. Anything else is never compiled.

The catalog and release state are read only here, at config time, never by client code. Deployment: `vercel.json` (install; build with `PU_DEPLOYMENT=1` through `tools/checks/src/deploy-build.ts`, which gates production on the checks; clean URLs, security headers, asset caching) and Astro's CSP; see [runbooks/deploy.md](runbooks/deploy.md) and ADR-016.
