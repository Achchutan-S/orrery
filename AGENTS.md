---
noteId: "fdcdb951d5de11f1ae605f8c0e08bb6f"
tags: []

---

# Personal Universe — agent guide

A personal platform of independent "experiences" (writing, interactive apps, visualisations, resume) on one static Astro site. Not a portfolio template.

## Sources of truth

- `docs/blueprint.md` — architecture. Follow it unless evidence proves it wrong; then write an ADR.
- `docs/adr/` — decisions and what implementation learned. Supersede, never rewrite (see `docs/adr/README.md`).
- `docs/tracker.md` — task status. Mark `complete` only when acceptance evidence passes.
- `docs/architecture.md` — how the code maps to the blueprint.

## Workspace

```
apps/site                  Astro 7 static site (React islands, MDX)
  integrations/            mount-experiences: injects only mounted routes
  src/experiences/<id>/    one folder per experience (implementation only)
  src/pages/               platform routes only (404, later rss, sitemap)
packages/platform-schema   zod schemas + pure resolve/validate/patch functions
packages/experience-catalog  data-only entries/<id>.ts + one index line each
apps/control/server        Control Center API: local Hono server over config/release.json (docs/control-center.md)
tools/checks               repository checks (leaks, budgets, metadata, boundaries)
config/release.json        release state; release.schema.json is generated
```
Planned: `apps/control/web`, the Control Center frontend (task 13).

## Commands

Node 22.23.4 (`.nvmrc`; Astro 7 minimum), pnpm via Corepack (`corepack enable`).

| Command | Does |
| --- | --- |
| `pnpm install` | install the workspace (one lockfile) |
| `pnpm dev` | site dev server |
| `pnpm build` | site build; `VERCEL_ENV=production pnpm build` reproduces production |
| `pnpm test` | all tests (`node:test`, TypeScript via type stripping) |
| `pnpm typecheck` | `tsc` for packages, `astro check` for the site |
| `pnpm test:browser` | Playwright + axe against a production build (first run `pnpm --filter @pu/site exec playwright install chromium`); screenshots in `apps/site/test-results/` |
| `pnpm check` | all repository checks: boundaries, production build, metadata, leaks, budgets (see `docs/runbooks/checks.md`) |
| `pnpm check:boundaries`, `check:metadata`, `check:leaks`, `check:budgets` | one check each; the last three need `pnpm build:production` |
| CI | `.github/workflows/ci.yml` runs `typecheck`, `test`, `check` and `test:browser` on pull requests and pushes to `main`; see `docs/runbooks/checks.md` § CI |
| `pnpm control:server` | Control Center API on `127.0.0.1:4318` (`PU_CONTROL_PORT`); never in CI or on Vercel |
| `pnpm smoke <url> --env production\|preview` | HTTP smoke test of a deployment (see `docs/runbooks/deploy.md`) |
| `pnpm gen:release-schema` | regenerate `config/release.schema.json` after changing the release schema |

## Rules

**Imports**
- `platform-schema` imports only `zod`. `experience-catalog` imports only `platform-schema`.
- An experience never imports another experience. Packages in an entry's `exclusiveImports` are imported only from that experience.
- The catalog and `config/release.json` are read only by `.astro` frontmatter, the kernel and build code — never island/client code. Anything passed to an island as props is public.
- `apps/site` never imports `apps/control`; `apps/control` imports only the two packages.
- All of the above are enforced by `pnpm check:boundaries`.
- Flag-gated UI marks its root element `data-pu-flag="<experience>:<flag>"`, so the leak scan can prove it is not rendered in production.

**Adding an experience** — one folder in `apps/site/src/experiences/<id>/`, one catalog file, one index line. No release entry = owner-only draft (local and preview only). The build fails if a folder has no entry or an entry's entrypoint is missing. `canary-draft` and `sample-hostile` are permanent test fixtures: never promote them. External projects (KawaiUI, Dev X-Ray) are `external` entries only: never copy, build or modify their code here. Runbook arrives with task 8.

**Experience pages** render `<ExperienceRoot experience="<id>">` from `src/platform/root/` and own everything inside `<body>`. Put styles in `@layer experience`, scoped by `[data-experience='<id>']`. Read flags with `flag()` from `src/platform/release/` in frontmatter only. Call `track()` freely; it is a no-op until Phase 3. The platform focus ring cannot be overridden (ADR-013).

**Design** — experiences own layout, fonts, theme and navigation. The platform owns only the Beacon, accessibility tokens and the optional colophon. Use the `frontend-design` skill for UI work and audit with `web-design-guidelines`. No templated hero/card/gradient defaults without a reason.

**Accessibility** — semantic HTML, keyboard reachable, visible focus, reduced motion, contrast, touch targets. Not negotiable for any experience.

**Security**
- Nothing non-public in production `dist/`: no drafts, no non-public titles or summaries, no source maps, no secrets.
- Feature flags are not secrecy: an "off" island's JavaScript is still emitted (ADR-004 spike).
- A folder is not a security boundary; a path is not an origin.
- No admin endpoint on the primary origin, ever.
- The Control Center server writes `config/release.json` only through `FileReleaseStore`, binds only to 127.0.0.1, and never prints or logs its session token. Never deploy it, add CORS to it, or loosen its Host/Origin checks.
- Pages run under a strict CSP (ADR-016): no inline `style="…"` attributes or unhashed inline scripts.

**Deferred — do not build early:** auth, database, on-demand rendering, Vercel adapter (all Phase 4); a deployed Control Center (Phase 4a); search, RSS (Phase 2); Turborepo, CMS, microservices, Module Federation (never without a real need).

## Working agreement

Inspect before editing. Run what you change. Do not commit or push without the owner's approval. Keep the kernel small: a new kernel module needs two experiences that use it.
