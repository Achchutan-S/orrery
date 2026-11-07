# Personal Universe — agent guide

A personal platform of independent "experiences" (writing, interactive apps, visualisations, resume) on one static Astro site. Not a portfolio template.

## Sources of truth

One authoritative document per subject; link to it instead of repeating it.

| Subject | Document |
| --- | --- |
| Architecture, roadmap, decision register | `docs/blueprint.md` (revision 3, **proposed**: where it differs from an accepted ADR, the ADR governs until the owner accepts it) |
| What every experience must provide and may do | `docs/experience-contract.md` (version 1.0, **proposed**) |
| Decisions and what implementation learned | `docs/adr/` (index and rules in `docs/adr/README.md`; supersede, never rewrite) |
| What is live, open work, decisions waiting for the owner | `docs/tracker.md` (mark `complete` only when acceptance evidence passes) |
| Procedures | `docs/add-experience.md`, `docs/repository-checks.md`, `docs/deployment.md`, `docs/accessibility.md` |
| Component detail | `apps/control/README.md` (Control Center), `docs/resume.md`, `docs/claude-skills/publication-decisions.md` |

**Documentation rules.** Lowercase kebab-case filenames; ADRs are `docs/adr/adr-NNN-short-description.md`; no dates or `final`/`new`/`v2` in names. Update the existing document for a subject instead of adding one; no per-task reports. Detail about one component lives in that component's README. Status and evidence go in the tracker, not in guides.

## Workspace

```
apps/site                  Astro 7 static site (React islands, MDX)
  integrations/            mount-experiences: injects only mounted routes
  src/experiences/<id>/    one folder per experience (implementation only)
  src/pages/               platform routes only (404, later rss, sitemap)
packages/platform-schema   zod schemas + pure resolve/validate/patch functions
packages/experience-catalog  data-only entries/<id>.ts + one index line each
apps/control/server        Control Center API: local Hono server over config/release.json (apps/control/README.md)
apps/control/web           Control Center UI: React + Vite, proxies /api to the server
tools/checks               repository checks (leaks, budgets, metadata, boundaries)
config/release.json        release state; release.schema.json is generated
```

## Commands

Node 22.23.4 (`.nvmrc`; Astro 7 minimum; `nvm use`), pnpm via Corepack (`corepack enable`). Every `engines.node` is `>=22.23.4 <23` and `engineStrict` is on, so `pnpm install` fails under any other Node, including 24 (ADR-021).

| Command | Does |
| --- | --- |
| `pnpm install` | install the workspace (one lockfile) |
| `pnpm dev` | site dev server |
| `pnpm build` | site build; `VERCEL_ENV=production pnpm build` reproduces production |
| `pnpm test` | all tests (`node:test`, TypeScript via type stripping) |
| `pnpm typecheck` | `tsc` for packages, `astro check` for the site |
| `pnpm test:browser` | Playwright + axe against a production build (first run `pnpm --filter @pu/site exec playwright install chromium`); then the Control Center UI against a temporary release file; screenshots in `apps/site/test-results/` and `apps/control/test-results/` |
| `pnpm check` | all repository checks: boundaries, production build, metadata, leaks, budgets (see `docs/repository-checks.md`) |
| `pnpm check:boundaries`, `check:metadata`, `check:leaks`, `check:budgets` | one check each; the last three need `pnpm build:production` |
| CI | `.github/workflows/ci.yml` runs `typecheck`, `test`, `check` and `test:browser` on pull requests and pushes to `main`; see `docs/repository-checks.md` § CI |
| `pnpm control` | Control Center: builds the UI, serves it on `127.0.0.1:4317` and starts the API on `127.0.0.1:4318` in one process |
| `pnpm control:server` | Control Center API alone (`PU_CONTROL_PORT`); never in CI or on Vercel |
| `pnpm --filter @pu/site resume:assets` | regenerate the resume PDF and link-preview image after changing `experiences/resume/content.ts` (a test fails until you do; docs/resume.md) |
| `pnpm build:deployment` | what Vercel runs (`vercel.json`): with `VERCEL_ENV=production`, typecheck, boundaries, build, metadata, leaks and budgets, stopping at the first failure; otherwise only the build (docs/deployment.md § Production build gate) |
| `pnpm smoke <url> --env production\|preview` | HTTP smoke test of a deployment (see `docs/deployment.md`); add `--local` only for `astro preview` on localhost, which skips the Vercel-only header, redirect and cache checks |
| `pnpm --filter @pu/site og:platform` | regenerate the platform link-preview card `public/og.png` (ADR-022) |
| `pnpm gen:release-schema` | regenerate `config/release.schema.json` after changing the release schema |

## Rules

**Imports**
- `platform-schema` imports only `zod`. `experience-catalog` imports only `platform-schema`.
- An experience never imports another experience, by import, `import.meta.glob()` or CSS `@import`/`url()`. Platform code (kernel, `src/pages`, `integrations/`, `astro.config.ts`) never imports an experience. Packages in an entry's `exclusiveImports` are imported only from that experience.
- The catalog and `config/release.json` are read only by `.astro` frontmatter, the kernel and build code — never island/client code. Anything passed to an island as props is public.
- `apps/site` never imports `apps/control`; `apps/control` imports only the two packages; its browser code (`web/src`) imports only `platform-schema` and gets everything else from the API.
- All of the above are enforced by `pnpm check:boundaries`.
- Flag-gated UI marks its root element `data-pu-flag="<experience>:<flag>"`, so the leak scan can prove it is not rendered in production.

**Adding an experience** — one folder in `apps/site/src/experiences/<id>/`, one catalog file, one index line. No release entry = owner-only draft (local and preview only). The build fails if a folder has no entry or an entry's entrypoint is missing. `canary-draft` and `sample-hostile` are permanent test fixtures: never promote them. `sample-app` is the permanent React-island fixture: published, never deleted without moving its coverage (ADR-021). External projects (KawaiUI, Dev X-Ray) are `external` entries only: never copy, build or modify their code here. Steps: `docs/add-experience.md`; rules: `docs/experience-contract.md`.

**Experience pages** render `<ExperienceRoot experience="<id>">` from `src/platform/root/` and own everything inside `<body>`; the platform adds only the colophon (`minimal`) and the Beacon (`minimal` and `beacon`); those are the only chrome values (`full` fails validation, ADR-021). An island wraps its root in an error boundary (pattern: `sample-app/ErrorBoundary.tsx`). `/` is the `index` experience: it and the Beacon's palette list exactly `publicDiscoveryIndex()`, so never hand-write a list of experiences or links to routes that do not exist. Place an entry on the Index with the catalog's optional `section` and `headline`. Link previews: every page gets the platform card `/og.png` unless its catalog entry sets `ogImage` to one of its own image routes (ADR-022); `check:metadata` requires a valid `og:image` on every production page. Put styles in `@layer experience`, scoped by `[data-experience='<id>']`. Read flags with `flag()` from `src/platform/release/` in frontmatter only. Call `track()` freely; it is a no-op until the platform intelligence phase. The platform focus ring cannot be overridden (ADR-013). The Beacon's function (link to `/`, palette, keyboard and accessibility) is the platform's; its presentation is the experience's by the contract, but no mechanism exists yet, so do not restyle it (contract § 3.5, decision D4).

**Design** — experiences own layout, fonts, assets, theme and navigation ([docs/experience-contract.md](docs/experience-contract.md)). The platform owns only the Beacon's function, accessibility tokens and the optional colophon. Fonts and images follow contract § 3.6 (self-hosted, in the experience's folder, licensed for a public repository); hashed font and image files are rejected by the leak allowlist until decision D11. Independence is not a security boundary: every experience shares one repository, build, origin, CSP and kernel. Use the `frontend-design` skill for UI work and audit with `web-design-guidelines`. No templated hero/card/gradient defaults without a reason.

**Accessibility** — semantic HTML, keyboard reachable, visible focus, reduced motion, contrast, touch targets, reflow at 320 px (wide tables scroll in their own focusable region). Not negotiable for any experience. Never publish a new experience before the prerequisites in contract § 8.5 are met: its pages in the browser suites, a recorded manual check, hosted CI passed on the publishing commit, a passing preview smoke test. Automated checks and the manual checklist: `docs/accessibility.md`; never record a manual check as done unless a person did it.

**Budgets** — `pnpm check:budgets` measures every emitted file: page JS, CSS, fonts, images and lazy chunks per performance class, plus `FILE_BUDGETS` for files no page loads. An `<img>` needs `width` and `height`; a new kind of emitted file needs a page that loads it or a `FILE_BUDGETS` entry (ADR-023).

**Hygiene** — the repository is public. No editor metadata in committed files (`noteId` front matter fails `hygiene.test.ts`), no task prompts or scratch files at the root.

**Security**
- Nothing non-public in production `dist/`: no drafts, no non-public titles or summaries, no source maps, no secrets.
- The repository is public: release state keeps drafts off the website, not off GitHub or out of Git history (ADR-022). Never commit anything that must stay private, and never describe a draft as "not publicly accessible".
- Feature flags are not secrecy: an "off" island's JavaScript is still emitted (ADR-004 spike).
- A folder is not a security boundary; a path is not an origin.
- No admin endpoint on the primary origin, ever.
- The Control Center server writes `config/release.json` only through `FileReleaseStore`, binds only to 127.0.0.1, and never prints or logs its session token. Never deploy it, add CORS to it (Vite's included), or loosen its Host/Origin checks. Control Center UI calls go through `web/src/api.ts`; writes are previewed, confirmed and never retried automatically.
- Pages run under a strict CSP (ADR-016): no inline `style="…"` attributes or unhashed inline scripts.
- Files that belong to an experience (PDFs, images) are served by its own routes, never from `public/`, which ships to every build regardless of release state (ADR-020). A platform file added to `public/` must also be listed in `PLATFORM_FILES` in `tools/checks/src/leaks.ts`, the production output allowlist.

**Deferred — do not build early:** auth, database, on-demand rendering, Vercel adapter, a deployed Control Center (the Identity phase; code and older ADRs call it Phase 4 or 4a); search, RSS (carried-over backlog); the Design Laboratory (Phase 2B, after 2A); Turborepo, CMS, microservices, Module Federation (never without a real need). Roadmap: `docs/blueprint.md` § 11.

## Working agreement

Inspect before editing. Run what you change. Do not commit or push without the owner's approval. Keep the kernel small: a new kernel module needs two experiences that use it.
