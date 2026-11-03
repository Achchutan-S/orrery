---
noteId: "bd24c580d5fa11f1ae605f8c0e08bb6f"
tags: []

---

# Deploying to Vercel

One Vercel project serves `apps/site` as static files ([ADR-002](../adr/002-static-by-default.md), [ADR-016](../adr/016-vercel-deployment.md)). No adapter, no functions, no server runtime.

The Control Center server (`apps/control`) is never deployed: no Vercel project points at it, it refuses to start when `VERCEL` or `CI` is set, and it binds only to 127.0.0.1 ([control-center.md](../control-center.md)). A deployed Control Center needs owner identity and its own origin (Phase 4a).

## What is in the repository (automatic)

`apps/site/vercel.json` and `apps/site/package.json` carry everything that can live in code:

| Setting | Value | Why it is in code |
| --- | --- | --- |
| Framework | `astro` | deterministic, not dashboard detection |
| Install | `pnpm install --frozen-lockfile` | a stale lockfile fails the build |
| Build | `PU_DEPLOYMENT=1 pnpm -w run build:deployment` | the build refuses to run without `VERCEL_ENV` (see below); production is gated on the checks ([Production build gate](#production-build-gate)) |
| Output | `dist` | |
| Node | `engines.node: ">=22.23.4 <23"` in `apps/site/package.json` (the same range everywhere, ADR-021) | Vercel deploys the latest 22.x for this range (it maps a semver range to its major); Astro's CLI itself refuses anything below 22.23.4, so an older 22.x patch fails the build instead of shipping |
| URLs | `cleanUrls: true`, `trailingSlash: false` | `/x.html` and `/x/` redirect (308) to `/x` |
| Headers, caching | see [Headers and caching](#headers-and-caching) | |

## What needs the dashboard (manual, once)

1. **Import** the GitHub repository as a new project. **Root Directory:** `apps/site`. Keep **Include files outside the root directory in the Build Step** on: the build reads `config/release.json` and the workspace packages.
2. **Environment variables** (Production and Preview): `ENABLE_EXPERIMENTAL_COREPACK=1`, so pnpm comes from the root `packageManager` (`pnpm@10.34.9`) instead of Vercel's lockfile guess. No application secrets exist.
3. **System Environment Variables:** keep **Automatically expose System Environment Variables** on. `VERCEL_ENV` decides what is mounted; with `PU_DEPLOYMENT=1` a build without it fails rather than defaulting to development and mounting drafts.
4. **Deployment Protection:** Vercel Authentication on previews (Standard Protection). Previews contain drafts. Protection is a convenience, not access control (blueprint 3.5a): a leaked shareable link exposes the whole preview. The repository is public as well, so drafts are readable on GitHub whatever the release state says ([ADR-022](../adr/022-link-previews-smoke-and-public-repository.md)); nothing that must stay private goes into a commit.
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

### Today's addresses

From the current `config/release.json` (verified against local production and preview builds on 3 November 2026; the smoke test derives the same lists itself, so this table is for reading, not for the test):

| Address | Production | Preview |
| --- | --- | --- |
| `/` (Index), `/journal` and its 8 chapters (`/journal/idea` … `/journal/ahead`) | 200 | 200 |
| `/sample-content` | 200 | 200 |
| `/sample-app`, `/sample-app/states`, `/sample-app/states/<lifecycle>` (7) | 200, inspector panel off | 200, inspector panel on |
| `/favicon.svg`, `/og.png` (platform files from `public/`) | 200 | 200 |
| `/resume`, `/resume/resume.pdf`, `/resume/og.png` (draft, owner only, unlisted) | **404** | 200 |
| `/canary-draft`, `/sample-hostile` (permanent fixtures) | **404** | 200 |
| `/kawaiui`, `/devxray`, any unknown path | 404 (the site's Not found page) | 404 |

A 404 is the site's own Not found page (`404.html`), served with status 404, noindex and `no-referrer`.

## Production build gate

`build:deployment` runs `tools/checks/src/deploy-build.ts`, which reuses the root scripts:

| `VERCEL_ENV` | Steps, in order; the first failure stops the build with exit status 1 |
| --- | --- |
| `production` | `typecheck`, `check:boundaries`, `build` (validates the catalog, release state and route paths, then builds), `check:metadata`, `check:leaks`, `check:budgets` |
| `preview`, unset | `build` only, as before |
| missing with `PU_DEPLOYMENT=1`, or unknown | fails before any step |

A failed step fails the Vercel build, so Vercel does not deploy it and production keeps serving the previous deployment. Reproduce locally with `VERCEL_ENV=production PU_DEPLOYMENT=1 pnpm build:deployment`.

What the gate does not cover: unit and browser tests (`pnpm test`, `pnpm test:browser`) run only in CI. This is repository-side gating only. GitHub CI is not a deployment gate: Vercel builds a push to `main` in parallel with CI, and `main` has no branch protection. Making CI a required check (branch protection, or Vercel's deployment checks) is a separate change in the GitHub and Vercel dashboards, not made here.

## Deployment procedure

1. Local gate: `pnpm typecheck && pnpm test && pnpm check && pnpm test:browser` (what CI runs).
2. Push a branch. Vercel builds a preview. In the build log, confirm: `node v22.x` (22.23.4 or later), `pnpm 10.34.9`, `deploy build (preview): build`, and `[pu:mount-experiences] preview: mounted index, journal, sample-content, sample-app, resume, canary-draft, sample-hostile` (today's release state).
3. Smoke-test the preview (bypass secret exported if protected):
   ```sh
   pnpm smoke https://<preview-url> --env preview
   ```
4. **Production gate**, all required: Task 9 checks pass (the production build also enforces them, see above); GitHub Actions CI passed on the commit; the preview smoke test passed; no leak reported; the owner approves.
5. Merge to `main`. In the production build log, confirm `deploy build (production): typecheck → check:boundaries → build → check:metadata → check:leaks → check:budgets`, `[pu:mount-experiences] production: mounted index, journal, sample-content, sample-app` (today's release state) and `✔ deploy build (production): all steps passed`. Then:
   ```sh
   pnpm smoke https://<production-url> --env production --external
   ```
   `--external` also requests KawaiUI and Dev X-Ray; leave it off when only this site is under test.

## Smoke test (`tools/checks/src/smoke.ts`)

Real HTTP requests, with expectations derived from the catalog, `config/release.json` and `vercel.json` ([ADR-022](../adr/022-link-previews-smoke-and-public-repository.md)):

- `/` answers 200 with Astro's CSP `<meta>`.
- Every route of every experience mounted in the target environment answers 200; every route of everything else answers 404 with the site's Not found page. Enumerated views are found by following the experience's own links; one is retried with a query string; an unknown view and an unknown path must be 404.
- **Media types**, by extension (a `; charset=…` parameter is allowed): pages and 404s `text/html`; file routes as what they are (`application/pdf`, `image/png`); `_astro` scripts `text/javascript` (or `application/javascript`), styles `text/css`, fonts `font/woff2`; `/favicon.svg` `image/svg+xml`, `/og.png` `image/png`. An asset answered with an HTML fallback fails.
- The platform files in `public/` (`PLATFORM_FILES` in `leaks.ts`) answer 200; every `og:image` a page names answers 200 as an image.
- `/<id>` of each external experience is 404; the index links its exact URL.
- **Vercel only:** every header in `vercel.json` at its exact value on every page and 404 response; pages, 404s and platform files revalidate (`max-age=0`); every `/_astro/` asset is `max-age=31536000, immutable`; `/<page>.html`, `/<page>/` and `/<page>/?q` answer 308 to the clean URL, keeping the query.
- Flags: a marker (`data-pu-flag`) for a flag that is off must not appear; one that is on must appear. In production, no page may contain the canary token, including pages that wrongly answered 200.
- A network error (reset, DNS, TLS) is retried once, then reported as `path: request failed twice (<cause>)…` and the run stops; HTTP answers are never retried.

Exit status 0 on success, 1 with `path: reason` lines on failure (the heading names the environment and target), 2 for bad arguments. `PU_SMOKE_URL` and `PU_SMOKE_ENV` can replace the arguments.

### Against a local build (`--local`)

`astro preview` serves the files but none of Vercel's headers, redirects or caching. To check everything else locally:

```sh
pnpm build:production                     # or: VERCEL_ENV=preview pnpm build, with --env preview below
pnpm --filter @pu/site preview            # http://localhost:4321; stop it with Ctrl+C or `astro preview stop`
pnpm smoke http://localhost:4321 --env production --local
```

`--local` skips exactly the Vercel-only checks above and prints that it did; it is refused for any host but localhost, so a deployment is always checked in full. A local pass is not a Vercel pass. On 3 November 2026 both local runs passed (production and preview builds); the same servers checked without `--local` failed only the Vercel-only checks.

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
| `public/` files (`favicon.svg`, `og.png`) | Vercel's default (revalidate) | stable names; add explicit rules only for hashed names |

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
| Smoke against `localhost`: every header missing, 308s answered 200 or 404, cache-control wrong | Expected: `astro preview` is not Vercel. Add `--local`, which skips only those checks. |
| Smoke: `request failed twice (ECONNRESET)` | A network error, not an answer from the site; re-run. |

## Custom domains later

- **This site:** add the domain to this project (Settings → Domains). `VERCEL_PROJECT_PRODUCTION_URL` then becomes the domain, so canonical URLs follow without a code change. Consider HSTS `preload` only after every subdomain serves HTTPS.
- **KawaiUI and Dev X-Ray:** add `uilab.<domain>` and `devxray.<domain>` in *their own* Vercel projects (ADR-008); nothing is built or proxied here. Then change `url` in `packages/experience-catalog/src/entries/{kawaiui,devxray}.ts`, run `pnpm check`, and smoke-test with `--external`.

  Status on 1 November 2026: no domain is owned (tracker decision 1), so no subdomain exists; the catalog keeps `https://kawaiui.vercel.app/` and `https://devxray-one.vercel.app/`, both answering 200. Steps once the domain exists, per project (KawaiUI shown):
  1. In the KawaiUI Vercel project: Settings → Domains → Add `uilab.<domain>`.
  2. At the DNS provider: the CNAME record Vercel shows for that name (usually `cname.vercel-dns.com`), or Vercel's nameservers for the whole domain.
  3. Wait until Vercel shows the domain as valid with a certificate; `curl -I https://uilab.<domain>/` answers 200.
  4. Here: set `url` in `entries/kawaiui.ts`, run `pnpm test` (the external-URL test pins the address) and `pnpm check`, commit, and after deploying run `pnpm smoke <url> --env production --external`.
  Neither project's code changes.

## Experience files (PDF, images)

An experience's files (today the resume's PDF and link-preview image) are routes of that experience, so they deploy only with it (ADR-020). They are served with Vercel's default revalidating cache, like pages, because their paths are stable and their content changes when regenerated. Deploying only with the experience concerns the website: the committed files are in the public repository regardless (ADR-022).

## Link-preview images

Every page names an absolute `og:image` on the production origin (`VERCEL_PROJECT_PRODUCTION_URL`, set in previews too): its experience's catalog `ogImage` (one of its own routes, so it is built only where the experience is) or the platform card `/og.png`. `check:metadata` fails the production build gate if a page has none, or names one that is not a PNG or JPEG in the build. In a preview, a draft's image is at the preview URL, not the production origin its `og:image` names.
