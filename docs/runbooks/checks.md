---
noteId: "7bf69490d5f411f1ae605f8c0e08bb6f"
tags: []

---

# Repository checks

Guardrails from task 9 ([ADR-014](../adr/014-repository-checks.md)). No network, no credentials. All four run after a clean `pnpm install --frozen-lockfile`.

| Command | What it checks | Needs |
| --- | --- | --- |
| `pnpm check` | All four, in order: boundaries, production build, metadata, leaks, budgets | — |
| `pnpm check:boundaries` | Import boundaries in source files | nothing |
| `pnpm build:production` | `VERCEL_ENV=production` build of the site into `apps/site/dist` | — |
| `pnpm check:metadata` | Catalog + release + folder coverage, then head tags of every built page | production build |
| `pnpm check:leaks` | Nothing unreleased in the production output | production build |
| `pnpm check:budgets` | Per-class size budgets | production build |
| `pnpm --filter @pu/checks test` | The checkers' own tests (fixtures, passing and failing) | nothing |

Each prints one `✔` line on success. On failure it prints `✖ <check>: N problems`, then one line per problem as `<file>: <reason>`, and exits with status 1.

## Leaks (`tools/checks/src/leaks.ts`)

Against production output, using the catalog and `config/release.json`:

- No file produced by a route of an experience that is not mounted in production (`canary-draft.html`, anything under a dynamic route's folder). Route-aware: `canary-draft-notes.html` is not a route of `canary-draft`.
- No canary token (`CANARY` from the catalog) in any text file.
- No exact summary of any experience that is not public in production; no title longer than three words (shorter titles are too generic to be signals).
- No rendered `data-pu-flag="<experience>:<flag>"` marker for a flag that is off in production.
- No `.map` file and no `sourceMappingURL` reference.
- Every route of every published experience was built, and the index links every listed experience (the Index itself through the Beacon's link to `/`). A route ending in a file extension (`/resume/resume.pdf`) produces that file, not an `.html` page, and counts as the experience's output like its pages.

Example failure (a preview build scanned as if it were production):

```
✖ leaks: 13 problems
  sample-hostile.html: route /sample-hostile of "sample-hostile" is not released to production (is this a development or preview build? run `pnpm build:production`)
  canary-draft.html: contains the canary token
  canary-draft.html: contains the summary of "canary-draft", which is not public in production
  sample-app/states.html: renders UI for build flag sample-app:inspector, which is off in production
```

## Budgets (`tools/checks/src/budgets.ts`)

The table `BUDGETS` at the top of that file is the only place limits live; an experience may raise its own with `budgetOverrides` (and a written reason) in its catalog entry.

- **Unit:** gzip level 9 bytes, 1 KB = 1024 bytes, for everything including fonts. No raw or brotli sizes.
- **Per page, initial load:** inline `<script>` + referenced JS + their static imports (not `import()`); inline `<style>` + CSS files; fonts; transfer = HTML + external JS, CSS and fonts. A shared chunk counts on every page that loads it, because a first visit to any of them downloads it.
- **Beacon:** the Beacon's script is measured as its own metric, `beacon` (15 KB on every page, blueprint 3.12), not as the page's `js`. It is recognised by `BEACON_MARKER` (the palette template's selector), inline or as a file. Content pages therefore keep a 0 KB `js` budget with the Beacon on them.
- **Per experience:** the worst page for each metric is judged. Pages belong to the experience whose route made them (`index.html` to the `index` experience); `404.html` to the platform.
- Exactly at budget passes; one byte over fails.

## Resume content and assets (`apps/site/test/resume.test.ts`)

The resume's PDF and link-preview image are committed, generated from `content.ts` (docs/resume.md). The tests fail when `source.sha256` no longer matches `content.ts`, when any statement in `content.ts` is missing from the PDF's extracted text, when an e-mail other than the approved one, a phone number, an internal Verizon name or the internal performance rating appears, when a link leaves the verified list, or when prototype work is listed as production. Fix by editing `content.ts` and running `pnpm --filter @pu/site resume:assets`.

Last full verification (task 15.1, 2 November 2026, Node 22.23.4, local): typecheck 0 errors; tests schema 40, catalog 16, checks 50, Control Center 71, site 48; browser site 52, Control Center 11; `pnpm check` boundaries, metadata, leaks and budgets passed; the production build contains no resume file and no file naming the owner; `config/release.json` unchanged (resume still `draft`, `owner`, `unlisted`).

## Metadata (`tools/checks/src/metadata.ts`)

1. `validatePlatform()` from `platform-schema`, the same function the site build runs: schema (ids, non-blank title and summary, https external URLs, routes, capabilities), cross-entry rules, lifecycle and access rules, and folder coverage.
2. Every production page: `lang`, non-empty title, description, og:title, og:description. Pages of listed experiences and the index: canonical and og:url, not noindex. Unlisted pages and 404: noindex, `referrer: no-referrer`, no canonical.

## Boundaries (`tools/checks/src/boundaries.ts`)

| Rule | Why |
| --- | --- |
| `client-server-only` | Browser code (island components and their imports, Astro `<script>` blocks) may not import the catalog, `config/`, `platform/release`, `platform/access`, `integrations/` or `node:` modules. Anything in a browser bundle is public. Type-only imports are allowed (erased). |
| `experience-isolation` | An experience never imports another experience's files. |
| `kernel-independence` | `src/platform/` never imports an experience. |
| `schema-deps` | `platform-schema` imports only zod and its own files. |
| `catalog-deps` | `experience-catalog` imports only `platform-schema` and its own files: data only, no Astro, React or site code. |
| `exclusive-imports` | A package in an entry's `exclusiveImports` is imported only from that experience. |
| `site-control` | The public site never imports `apps/control`. |
| `control-deps` | `apps/control` imports only `@pu/platform-schema`, `@pu/experience-catalog`, npm packages, Node built-ins and its own files. |

Allowed direction: experiences → kernel → `platform-schema`; build code (frontmatter, integration, kernel `release/`) → `experience-catalog` → `platform-schema` → zod. External experiences have no folder at all (folder coverage). Test files are not checked.

## Fixing a failure

- *route … is not released to production* on a fresh build: you scanned a development or preview build; run `pnpm build:production`. Otherwise an unpublished experience was mounted: check `config/release.json`.
- *contains the summary of …*: non-public metadata reached a page; find the import that put it there (often a list built from the catalog instead of `publicDiscoveryIndex()`).
- *over its … budget*: shrink, lazy-load (`client:visible`), or add a justified `budgetOverrides`.
- *[client-server-only]*: pass the value from `.astro` frontmatter as a prop instead of importing it in the island.

## CI (`.github/workflows/ci.yml`)

**Triggers:** pull requests into `main`, pushes to `main`, and manual runs (Actions → CI → Run workflow). A newer push to a pull request cancels its older run. No path filters: every change is verified.

**Two parallel jobs** on `ubuntu-24.04`, Node from `.nvmrc` (22.23.4), pnpm from `packageManager` (10.34.9) through Corepack, `pnpm install --frozen-lockfile`:

| Job | Steps | Local equivalent |
| --- | --- | --- |
| `verify` | `pnpm typecheck`, `pnpm test` (schema, catalog, checks, site; the site tests build production and preview output), `pnpm check` (boundaries, production build, metadata, leaks, budgets), then fail if any file in the working tree changed | the same commands, in that order |
| `browser` | install headless Chromium with its Linux libraries, then `pnpm test:browser` with `PU_TRACE=1` | `pnpm --filter @pu/site exec playwright install --only-shell chromium`, then `PU_TRACE=1 pnpm test:browser` |

The browser suite starts its own `astro preview` servers in-process: each is awaited until it listens and stopped in `after()`, so CI has no separate server step or sleep.

**Failed browser tests:** download the `browser-results` artifact from the run's summary page (kept 14 days). It holds screenshots, `browser.junit.xml`, and one Playwright trace per browser context in `traces/` (including the context of the failing test). Open a trace with `pnpm --filter @pu/site exec playwright show-trace <file.zip>`. A failed `verify` job uploads `production-dist` (the built site, kept 7 days) for leak and budget investigation; checker output itself is in the job log as `file: reason` lines.

**CI does not:** deploy, talk to Vercel, use secrets (the token is read-only, `contents: read`), run on `pull_request_target`, lint formatting (no formatter is configured), or test against a Vercel preview URL (ADR-015). Builds download the platform font from Google Fonts through Astro's Fonts API, so the runner needs outbound HTTPS.
