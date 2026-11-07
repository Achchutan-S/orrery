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
- **No content of an unreleased experience**, with or without a canary. Every internal experience not mounted in production (draft, owner-only, alpha, archived, preview-only fixtures: whatever `resolveAll()` says) is protected, file by file from `apps/site/src/experiences/<id>/`:
  - *bytes:* no output file may have the SHA-256 of any protected file (the resume PDF and image, but also a copied `.ts` or `.mdx`), wherever it is placed, including `_astro/`;
  - *base64:* no text file may contain a protected binary file as base64 (how Vite inlines `?inline` imports and data URLs);
  - *prose:* no text file may contain a phrase from a protected source file. A phrase is a run of text between quotes, tags, braces and similar code syntax, at least 32 characters and five words long, so code and short labels do not count; comments do.
  - A file identical to a kernel or platform-page source (`src/platform`, `src/pages`), and a phrase that one of those or a released experience also contains, is public and not protected. `public/` never counts: copying a draft's file there does not make it public. Limitation: prose deliberately copied into a released experience's source is that experience's content and is not reported. Findings name the source file only, never the protected text, so CI logs do not repeat it.
- **Encodings.** Summaries, titles, flag markers and phrases are also searched in a decoded copy of each text file: JSON and JavaScript escapes (`\"`, `\\`, `\/`, `\n`, `\uXXXX`, `\u{…}`, `\xXX`), then HTML entities (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`, `&nbsp;`, decimal and hexadecimal numeric references), then whitespace collapsed. One pass of each: text escaped twice (`&amp;#39;`), base64 of text, compression, other named entities and typographic substitutions (`'` turned into `’` by Markdown) are not decoded. Matching is case-sensitive, as before.
- **Output allowlist.** Every file in `dist/` must be one of: a file a released route produces (the exact file of a static route; `.html` pages under a dynamic page route's folder; any file under a dynamic file route's folder); a platform file listed in `PLATFORM_FILES` in `leaks.ts` (`404.html`, and `favicon.svg` from `public/`); or a content-hashed asset, `_astro/<name>.<8-character hash>.js|css` or `_astro/fonts/<16 hex>.woff2`. Adding a file to `public/`, or a new kind of asset (an image import), fails until it is added there on purpose. Files under allowed paths are still subject to every other rule.
- No `.map` file and no `sourceMappingURL` reference.
- Every route of every published experience was built, and the index links every listed experience (the Index itself through the Beacon's link to `/`) and no experience that is not listed. A route ending in a file extension (`/resume/resume.pdf`) produces that file, not an `.html` page, and counts as the experience's output like its pages.

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
- **Per page, initial load:** inline `<script>` + referenced JS + their static imports; inline `<style>` + CSS files; fonts, from preloads, inline `@font-face` and `url()` inside CSS; images, from `<img src|srcset>`, `<source srcset>`, the icon and CSS `url()`; transfer = HTML + all of those. A shared chunk counts on every page that loads it, because a first visit to either downloads it.
- **Lazy:** the largest chunk a page loads later through `import("./x.js")`, with its own static imports, minus what the page already loaded: 100 KB for interactive pages (blueprint 3.12), nothing for content and platform pages, the declared transfer cap (8 MB) for immersive ones.
- **Images:** provisional caps (10 KB platform, 100 KB content and interactive, 250 KB immersive) until the first real image; every `<img>` must declare `width` and `height`.
- **Files no page loads** are budgeted by kind in `FILE_BUDGETS`: link-preview images (`og.png` and every catalog `ogImage`) 150 KB, documents (`.pdf`) 400 KB, text downloads (`.md`, `.py`, `.json`, `.txt`: a skill's original files) 64 KB, archives (`.zip`: a skill's package) 100 KB. Any other emitted file that no page loads is a finding, and so is a page that references a file the build did not emit (ADR-023).
- **Beacon:** the Beacon's script is measured as its own metric, `beacon` (15 KB on every page, blueprint 3.12), not as the page's `js`. It is recognised by `BEACON_MARKER` (the palette template's selector), inline or as a file. Content pages therefore keep a 0 KB `js` budget with the Beacon on them.
- **Per experience:** the worst page for each metric is judged. Pages belong to the experience whose route made them (`index.html` to the `index` experience); `404.html` to the platform.
- Exactly at budget passes; one byte over fails.

## Repository hygiene (`tools/checks/src/hygiene.test.ts`, part of `pnpm test`)

Fails when any Markdown or MDX file Git would commit has `noteId` front matter, which a notes extension adds when it opens a file (GitHub shows it as a table on every document). Remove the `noteId` and `tags` lines and turn the extension off for this folder.

## Resume content and assets (`apps/site/test/resume.test.ts`)

The resume's PDF and link-preview image are committed, generated from `content.ts` (docs/resume.md). The tests fail when `source.sha256` no longer matches `content.ts`, when any statement in `content.ts` is missing from the PDF's extracted text, when an e-mail other than the approved one, a phone number, an internal address or the word "rating" appears, when a term from the owner's private list appears (only with `PU_PRIVATE_TERMS` set; docs/resume.md § Privacy check), when a link leaves the verified list, or when prototype work is listed as production. Fix by editing `content.ts` and running `pnpm --filter @pu/site resume:assets`.

Last full verification (engineering audit Phase D, 7 November 2026, Node 22.23.4, local, uncommitted working tree): typecheck 0 errors, warnings and hints; tests schema 45, catalog 20, checks 85, Control Center 76, site 55 (54 passed, 1 skipped: the private-term test, which passed separately with `PU_PRIVATE_TERMS`); browser site 61, Control Center 12; `pnpm check` boundaries (124 files), metadata, leaks (34 files) and budgets (42 page limits, 34 emitted files) passed; `build:deployment` passed for production and preview and refused a deployment build without `VERCEL_ENV`; `pnpm audit` found nothing. Hosted CI has not run on this tree. Earlier record (Phase C, 3 November 2026): typecheck 0 errors, warnings and hints; tests schema 45, catalog 20, checks 78, Control Center 71, site 55 (54 passed, 1 skipped: the private-term test, which passed separately with `PU_PRIVATE_TERMS`); browser site 55, Control Center 11; `pnpm check` boundaries (123 files), metadata, leaks (30 files) and budgets (25 limits) passed; `build:deployment` passed for production and preview and refused a deployment build without `VERCEL_ENV`. Hosted CI has not run on this tree. Earlier record, for history: (task 15.1, 2 November 2026, Node 22.23.4, local): typecheck 0 errors; tests schema 40, catalog 16, checks 50, Control Center 71, site 48; browser site 52, Control Center 11; `pnpm check` boundaries, metadata, leaks and budgets passed; the production build contains no resume file and no file naming the owner; `config/release.json` unchanged (resume still `draft`, `owner`, `unlisted`).

## Metadata (`tools/checks/src/metadata.ts`)

1. `validatePlatform()` from `platform-schema`, the same function the site build runs: schema (ids, non-blank title and summary, https external URLs, routes, capabilities), cross-entry rules, lifecycle and access rules, and folder coverage.
2. Every production page, as built: `lang`, non-empty title, description, og:type, og:title, og:description; an `og:image` that is an absolute URL on the site's origin (`https://$VERCEL_PROJECT_PRODUCTION_URL`, else `http://localhost:4321`, as in `astro.config.ts`) naming a PNG or JPEG in the build (the catalog's `ogImage` or the platform card `/og.png`, ADR-022); `twitter:card` `summary_large_image`. Pages of listed experiences and the index: a canonical URL equal to og:url and to the page's own address, not noindex. Unlisted pages and 404: noindex, `referrer: no-referrer`, no canonical.
3. In the catalog, `ogImage` must name one of the experience's own `.png`/`.jpg` routes (`og-image-route`, from `validateCatalog`), so a draft's image is never built into production.

## Boundaries (`tools/checks/src/boundaries.ts`)

| Rule | Why |
| --- | --- |
| `client-server-only` | Browser code (island components and their imports, Astro `<script>` blocks) may not import the catalog, `config/`, `platform/release`, `platform/access`, `integrations/` or `node:` modules. Anything in a browser bundle is public. Type-only imports are allowed (erased). |
| `experience-isolation` | An experience never imports another experience's files. |
| `kernel-independence` | Platform code never depends on an experience: the kernel (`src/platform/`), platform pages (`src/pages/`), the build integration (`integrations/`) and `astro.config.ts`. |
| `glob-literal` | `import.meta.glob()` takes string-literal patterns only, so its reach can be checked (Vite requires that too). |
| `schema-deps` | `platform-schema` imports only zod and its own files. |
| `catalog-deps` | `experience-catalog` imports only `platform-schema` and its own files: data only, no Astro, React or site code. |
| `exclusive-imports` | A package in an entry's `exclusiveImports` is imported only from that experience. |
| `site-control` | The public site never imports `apps/control`. |
| `control-deps` | `apps/control` imports only `@pu/platform-schema`, `@pu/experience-catalog`, npm packages, Node built-ins and its own files. |

**What is read** (`tools/checks/src/boundaries.ts`): `.ts`, `.tsx`, `.astro`, `.mdx` and `.css` under `apps/site/{src,integrations,scripts}`, `apps/control/{server,web/src}`, both packages, `tools/checks/src` and `config/`, plus `apps/site/astro.config.ts`, `apps/control/vite.config.ts` and `apps/control/web/ui-config.ts`. In those files:

- static imports, `export … from`, side-effect imports and `import()` (Astro: frontmatter and `<script>`; MDX: top-level `import`/`export` lines);
- `import.meta.glob()`: each pattern's directory before its first wildcard (`'./chapters/*.mdx'` → `./chapters/`); negative `!` patterns are ignored; a pattern reaching `src/experiences/` itself or above can match every experience and fails in an experience or in platform code;
- CSS `@import` and relative `url()` in `.css` files and Astro `<style>` blocks (fonts and images count as dependencies; `data:` and absolute URLs do not);
- islands: components used with `client:*` in `.astro` and `.mdx` files, and everything they import, are browser code.

Specifiers are normalised before the rules run: `..` segments, backslashes, query and hash suffixes (`x.pdf?inline`) and root-relative paths (`/src/…`, resolved from the app's root). Limits: no tsconfig `paths` or Vite aliases exist (add them to `resolve()` if that changes); a specifier built at run time (`import(name)`) cannot be resolved and is not reported; `import`-like text inside a string literal is read as an import (a false positive, never a miss).

Allowed direction: experiences → kernel → `platform-schema`; build code (frontmatter, integration, kernel `release/`) → `experience-catalog` → `platform-schema` → zod. External experiences have no folder at all (folder coverage). Test files are not checked.

## Real and synthetic release tests

Tests read release state in one of two ways:

- **Real configuration** (`config/release.json`): the builds in `apps/site/test/pipeline.test.ts` and the browser suite, and `packages/experience-catalog/src/release.test.ts` where it says "the real release file". They derive what must be built, listed and linked from the file with `resolveAll()` (or, in the catalog test, from the rule written out independently), so publishing or withdrawing an experience does not break them. The only fixed facts about the real file are invariants: `canary-draft` and `sample-hostile` are never in production.
- **Synthetic** (`fixtureRelease()` from `@pu/experience-catalog/fixture-release`, resume a draft and samples published): exact layouts, leak-scan, smoke and front-page fixtures. The catalog test "every release combination for the resume" walks lifecycle, access and discoverability combinations through it. Never read by the build.

A publish simulation (the resume set to `published`, `public`, `listed` in a scratch copy) passed `pnpm test`, `pnpm check` and the site browser suite on 2 November 2026.

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

**CI does not:** deploy, talk to Vercel, use secrets (the token is read-only, `contents: read`), run on `pull_request_target`, lint formatting (no formatter is configured), or test against a Vercel preview URL (ADR-015). Builds use the committed platform font (ADR-021) and need no network.
