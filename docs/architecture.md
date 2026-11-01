---
noteId: "fdcdb954d5de11f1ae605f8c0e08bb6f"
tags: []

---

# Architecture

The design is in [`blueprint.md`](blueprint.md); decisions are in [`adr/`](adr/). This page describes the code as it is now and how it maps to the blueprint.

## Packages

| Path | Role | Depends on |
| --- | --- | --- |
| `packages/platform-schema` | Zod schemas and pure functions: definitions, release state, resolution, validation, patches | `zod` |
| `packages/experience-catalog` | Data-only catalog: `entries/<id>.ts`, one index line each; `parseCatalog()` | `platform-schema` |
| `config/release.json` | Release state (lifecycle, access, discoverability, flag values); `release.schema.json` is generated | — |
| `apps/site` | Astro 7 static site; the `mount-experiences` integration; experiences under `src/experiences/` | `astro`, React, MDX, both packages |

| `tools/checks` | Repository checks and the `config/release.schema.json` generator ([runbook](runbooks/checks.md), ADR-014) | both packages, `zod` |

Not yet built: `apps/control` (see [`tracker.md`](tracker.md)).

## Kernel (`apps/site/src/platform`)

Modules and interfaces are listed in [ADR-012](adr/012-platform-layer.md). An experience page renders `<ExperienceRoot experience="<id>">` (usually through its own `Layout.astro`) and puts its own landmarks inside. Styles go in `@layer experience`, scoped by `[data-experience='<id>']`. Platform-owned pages (`/`, 404) use `src/pages/_PlatformLayout.astro`.

## Experiences today

| id | Kind | Production | Notes |
| --- | --- | --- | --- |
| `kawaiui` | external | listed link | https://kawaiui.vercel.app/ (ADR-013) |
| `devxray` | external | listed link | https://devxray-one.vercel.app/ (ADR-013) |
| `sample-content` | internal, content | mounted | static essay, zero JavaScript |
| `sample-app` | internal, interactive | mounted | lifecycle explorer, in-app router, `inspector` flag (preview only) |
| `canary-draft` | internal | never | leak-check fixture |
| `sample-hostile` | internal | never | CSS isolation fixture |

## platform-schema

| Module | Exports | Blueprint |
| --- | --- | --- |
| `definition.ts` | `ExperienceDefinition`, `defineExperience`, `Experience` (parsed), `ExperienceInput` (authored) | 3.1 |
| `release.ts` | `ReleaseState`, `ReleaseEntry`, `Lifecycle`, `Access`, `defaultReleaseEntry`, `releaseEntryFor`, `channelOf` | 3.2, 3.4 |
| `resolve.ts` | `environmentFrom`, `resolve`, `resolveAll`, `mountedRoutes`, `resolvePlatformFlags`, `PHASE_0` | 3.4–3.7 |
| `validate.ts` | `validateCatalog`, `validateCoverage`, `parseRelease`, `validateRelease`, `validatePlatform` (all of them, used by the build and the checks), `Issue` | 3.8 |
| `patch.ts` / `control.ts` | `canTransition`, `applyPatch`, `ReleasePatch` | 3.4, 4.0 |

Every function is pure. `validateCoverage` takes the folder list and a `fileExists` callback, so the site integration does the filesystem reads. Release state uses strict objects: an unknown key in `release.json` is an error, not silently dropped.

**Resolution in one line:** an experience is *deployable* when its lifecycle and access allow the environment; *mounted* when deployable and internal; *listed* when deployable, `listed`, public and not deprecated. ADR-005 records where this interprets the blueprint.

## Site build

`astro.config.ts` sets `output: 'static'`, `trailingSlash: 'never'`, `build.format: 'file'`, React and MDX. `integrations/mount-experiences.ts`:

1. `environmentFrom(process.env.VERCEL_ENV)` (unknown value: build fails).
2. `planMount()`: validate catalog, `config/release.json` and folder coverage; any issue fails the build with every issue listed.
3. `injectRoute` for each route of each mounted experience. Anything else is never compiled.

The catalog and release state are read only here, at config time, never by client code. Deployment: `vercel.json` (install, build with `PU_DEPLOYMENT=1`, clean URLs, security headers, asset caching) and Astro's CSP; see [runbooks/deploy.md](runbooks/deploy.md) and ADR-016.
