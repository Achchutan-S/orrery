---
noteId: "bd24c580d5fa11f1ae605f8c0e08bb6f"
tags: []

---

# Deploying to Vercel

One Vercel project serves `apps/site` as static files ([ADR-002](../adr/002-static-by-default.md), [ADR-016](../adr/016-vercel-deployment.md)). No adapter, no functions, no server runtime.

## What is in the repository (automatic)

`apps/site/vercel.json` and `apps/site/package.json` carry everything that can live in code:

| Setting | Value | Why it is in code |
| --- | --- | --- |
| Framework | `astro` | deterministic, not dashboard detection |
| Install | `pnpm install --frozen-lockfile` | a stale lockfile fails the build |
| Build | `PU_DEPLOYMENT=1 pnpm run build` | the build refuses to run without `VERCEL_ENV` (see below) |
| Output | `dist` | |
| Node | `engines.node: "22.x"` in `apps/site/package.json` | Vercel can pin only the major; Astro's CLI itself refuses anything below 22.23.4, so an older 22.x patch fails the build instead of shipping |
| URLs | `cleanUrls: true`, `trailingSlash: false` | `/x.html` and `/x/` redirect (308) to `/x` |
| Headers, caching | see [Headers and caching](#headers-and-caching) | |

## What needs the dashboard (manual, once)

1. **Import** the GitHub repository as a new project. **Root Directory:** `apps/site`. Keep **Include files outside the root directory in the Build Step** on: the build reads `config/release.json` and the workspace packages.
2. **Environment variables** (Production and Preview): `ENABLE_EXPERIMENTAL_COREPACK=1`, so pnpm comes from the root `packageManager` (`pnpm@10.34.9`) instead of Vercel's lockfile guess. No application secrets exist.
3. **System Environment Variables:** keep **Automatically expose System Environment Variables** on. `VERCEL_ENV` decides what is mounted; with `PU_DEPLOYMENT=1` a build without it fails rather than defaulting to development and mounting drafts.
4. **Deployment Protection:** Vercel Authentication on previews (Standard Protection). Previews contain drafts. Protection is a convenience, not access control (blueprint 3.5a): a leaked shareable link exposes the whole preview, so nothing private ever goes into the repository.
5. Optional, for smoke tests against protected previews: generate **Protection Bypass for Automation** and keep its value in your shell or CI secret store as `VERCEL_AUTOMATION_BYPASS_SECRET`. Never commit it.

## Production versus preview

`VERCEL_ENV` (set by Vercel) selects the release resolution in `platform-schema`:

| | Production (`main`) | Preview (every other branch) |
| --- | --- | --- |
| Mounted | experiences `published`/`frozen`/`deprecated`/`beta` with public access | everything except `archived`, including drafts (`canary-draft`, `sample-hostile`) |
| Build flags | `production` values (`inspector` off) | `preview` values (`inspector` on) |
| Listed on `/` | public, listed, not deprecated | the same: drafts are never listed |
| Not mounted | a real 404 | — |

External experiences (KawaiUI, Dev X-Ray) are links in every environment and never routes here (`/kawaiui` is a 404).

## Deployment procedure

1. Local gate: `pnpm typecheck && pnpm test && pnpm check && pnpm test:browser` (what CI runs).
2. Push a branch. Vercel builds a preview. In the build log, confirm: `node v22.x` (22.23.4 or later), `pnpm 10.34.9`, and `[pu:mount-experiences] preview: mounted sample-content, sample-app, canary-draft, sample-hostile`.
3. Smoke-test the preview (bypass secret exported if protected):
   ```sh
   pnpm smoke https://<preview-url> --env preview
   ```
4. **Production gate**, all required: Task 9 checks pass; GitHub Actions CI passed on the commit; the preview smoke test passed; no leak reported; the owner approves.
5. Merge to `main`. In the production build log, confirm `[pu:mount-experiences] production: mounted sample-content, sample-app`. Then:
   ```sh
   pnpm smoke https://<production-url> --env production --external
   ```
   `--external` also requests KawaiUI and Dev X-Ray; leave it off when only this site is under test.

## Smoke test (`tools/checks/src/smoke.ts`)

Real HTTP requests, with expectations derived from the catalog, `config/release.json` and `vercel.json`:

- `/` answers 200 with every header in `vercel.json` at its exact value, and Astro's CSP `<meta>`.
- Every route of every experience mounted in the target environment answers 200 (`text/html`, never `immutable`); every route of everything else answers 404 with the site's Not found page. Enumerated views are found by following the experience's own links; one is retried with a query string; an unknown view and an unknown path must be 404.
- `/<id>` of each external experience is 404; the index links its exact URL.
- `/<page>.html`, `/<page>/` and `/<page>/?q` answer 308 to the clean URL, keeping the query.
- Every `/_astro/` asset referenced by those pages answers 200 with `max-age=31536000, immutable`.
- Flags: a marker (`data-pu-flag`) for a flag that is off must not appear; one that is on must appear. In production, no page may contain the canary token, including pages that wrongly answered 200.

Exit status 0 on success, 1 with `path: reason` lines on failure. `PU_SMOKE_URL` and `PU_SMOKE_ENV` can replace the arguments.

## Headers and caching

Every response (`/(.*)`):

| Header | Value | Reason |
| --- | --- | --- |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | HTTPS only. No `preload` until a custom domain exists and its subdomains are all HTTPS (preloading is hard to undo). |
| `X-Content-Type-Options` | `nosniff` | |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Unlisted pages tighten it to `no-referrer` with a `<meta>`. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()` | No experience uses these; deny until one does (then scope it to that experience's paths). |
| `Content-Security-Policy` | `frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'` | Only directives that do not restrict scripts or styles: a second policy is combined with Astro's, so a header `script-src` would block the hashed inline scripts Astro allows. `frame-ancestors` cannot be set by `<meta>`. |
| `X-Frame-Options` | `DENY` | For browsers without `frame-ancestors`. |

Astro's `<meta>` CSP on every page: `default-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'`, plus `script-src`/`style-src` with the SHA-256 of every inline script and style Astro emits and of the inline layer-order statement. No `'unsafe-inline'`. The browser suite fails on any CSP violation and proves an injected inline script is blocked.

CSP limits: experiences cannot use inline `style="…"` attributes (render styles in stylesheets), third-party scripts need their hashes or hosts added in `astro.config.ts`, and Markdown syntax highlighting is off until Prism or pre-highlighted HTML is chosen (Shiki needs inline styles).

Caching:

| Files | Cache-Control | Why |
| --- | --- | --- |
| `/_astro/*` (JS, CSS, fonts) | `public, max-age=31536000, immutable` (from `vercel.json`) | file names are content hashes, so a change gets a new URL |
| HTML pages | Vercel's default for static files (revalidate on every request) | HTML names never change; a deploy must show immediately |
| 404 responses | Vercel's default | never long-cached, so a page published later appears |
| `public/` files | Vercel's default | none exist; add explicit rules only for hashed names |

## Rollback

- **Bad deployment:** in the Vercel dashboard, Deployments → the last good production deployment → **Instant Rollback** (or **Promote to Production**). Takes effect without a build. A rollback restores that deployment's release state too, so re-apply intended release changes afterwards.
- **Bad commit:** `git revert` it on a branch, let CI and the preview smoke test pass, merge.
- **Something unreleased reached production:** roll back first, then fix `config/release.json` (or the code), and run `pnpm check` and the production smoke test before merging. A leaked file stays in old deployment URLs: delete those deployments in the dashboard.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `PU_DEPLOYMENT is set but VERCEL_ENV is not` | System Environment Variables are off in the project; turn them on. |
| `Node.js v22.x is not supported by Astro` | Vercel's 22.x image is older than 22.23.4; redeploy later or move `engines.node` to `24.x` with an ADR. |
| Build cannot find `config/release.json` or `@pu/*` | "Include files outside the root directory" is off, or Root Directory is wrong. |
| Wrong pnpm version in the log | `ENABLE_EXPERIMENTAL_COREPACK=1` missing. |
| Smoke: `status 200, expected 404` for a draft | A preview URL was tested with `--env production`, or `VERCEL_ENV` was wrong at build time. |
| Smoke: header missing | `vercel.json` not picked up: Root Directory must be `apps/site`. |

## Custom domains later

- **This site:** add the domain to this project (Settings → Domains). `VERCEL_PROJECT_PRODUCTION_URL` then becomes the domain, so canonical URLs follow without a code change. Consider HSTS `preload` only after every subdomain serves HTTPS.
- **KawaiUI and Dev X-Ray:** add `uilab.<domain>` and `devxray.<domain>` in *their own* Vercel projects (ADR-008); nothing is built or proxied here. Then change `url` in `packages/experience-catalog/src/entries/{kawaiui,devxray}.ts`, run `pnpm check`, and smoke-test with `--external`.
