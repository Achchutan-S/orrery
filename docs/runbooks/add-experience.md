---
noteId: "9d78acd0d6a711f1ae605f8c0e08bb6f"
tags: []

---

# Adding an experience

The short path, and the ownership rules `pnpm check:boundaries` enforces. Architecture: [architecture.md](../architecture.md); checks: [checks.md](checks.md).

## Steps

1. **Folder:** `apps/site/src/experiences/<id>/` (lowercase, `[a-z][a-z0-9-]`). Routes live in `routes/`; everything else (layout, components, styles, content, assets) beside them.
2. **Catalog entry:** `packages/experience-catalog/src/entries/<id>.ts` with `defineExperience({ … })`, and one line in `packages/experience-catalog/src/index.ts`. `title` and `summary` are also the default page title and description. `chrome` is `minimal` (Beacon and colophon) or `beacon` (Beacon only); `full` is not implemented and fails validation (ADR-021). Optional `section` and `headline` place it on the Index.
3. **Release:** nothing. With no entry in `config/release.json` the experience is an owner-only, unlisted draft: built locally and in previews, never in production, never listed. Publish later through the Control Center (`pnpm control`) or a reviewed edit to the release file. Remember that the repository is public: a draft is off the website, not private ([ADR-022](../adr/022-link-previews-smoke-and-public-repository.md)).
4. **Routes:** canonical paths ([architecture.md § Route paths](../architecture.md#route-paths)) under the experience's own prefix; every entrypoint is `<id>/…/<file>.astro|ts`. One route must have no parameters (discovery links to it). Dynamic routes use `[param]` or `[...path]` with `getStaticPaths`. A file the experience serves (PDF, image) is a route too, never a `public/` file (ADR-020).
5. **Platform contracts:** pages render `<ExperienceRoot experience="<id>">` from `src/platform/root/` (pass `title`/`description` only to override the catalog's). Read flags with `flag()` from `src/platform/release/` in frontmatter and mark flag-gated UI `data-pu-flag="<id>:<flag>"`. Call `track()` freely (a no-op until Phase 3). Link to other destinations only through `publicDiscoveryIndex()`.
6. **Styling and ownership:** styles in `@layer experience`, scoped by `[data-experience='<id>']`; fonts, theme and layout are the experience's own. Follow the [ownership rules](#ownership-rules) below.
7. **Metadata and link preview:** every page gets title, description, Open Graph and Twitter tags from `ExperienceRoot`. Without an `ogImage` the page uses the platform card `/og.png`. For its own 1200×630 image, serve it as one of the experience's routes (for example `/<id>/og.png` from `routes/og.ts`) and set `ogImage: '/<id>/og.png'` in the catalog entry; validation rejects any other value, so the image exists only where the experience is built.
8. **Tests:** the suites that pin the catalog need the new id: `tools/checks/src/metadata.test.ts` (the catalog's ids) and `apps/site/test/pipeline.test.ts` (`folders`, and `PAGES` with the pages the experience builds). Add the experience's own assertions to the pipeline test (pages built, scripts allowed) and, for anything interactive, a browser test with axe. Add it to `fixtureRelease()` only if a synthetic test needs it.
9. **Boundaries:** `pnpm check:boundaries`.
10. **Release behaviour:** `pnpm build:production` must log `[pu:mount-experiences] production: mounted …` without the new id while it is a draft, and `pnpm check` (metadata, leaks, budgets) must pass; `VERCEL_ENV=preview pnpm build` must include it. Never add a release entry just to see it: previews and `pnpm dev` already build drafts.
11. **Build and smoke:** `pnpm typecheck && pnpm test && pnpm check && pnpm test:browser` (what CI runs), then a local smoke test of each build (`pnpm smoke http://localhost:4321 --env production --local` against `pnpm --filter @pu/site preview`, [deploy runbook](deploy.md#against-a-local-build---local)), and after pushing, the Vercel preview smoke test without `--local`.

## Checklist

- [ ] Folder, catalog entry, index line; `pnpm test` passes with the new id added to the pinned lists.
- [ ] No release entry (or an explicit draft) until the owner approves publishing.
- [ ] Every route canonical and owned; files served as routes.
- [ ] `ExperienceRoot` on every page; styles layered and scoped; no inline `style="…"` (CSP).
- [ ] Link preview: platform card, or `ogImage` naming the experience's own image route.
- [ ] Islands wrapped in an error boundary; no catalog or release imports in browser code.
- [ ] `pnpm check` and `pnpm test:browser` pass; production build does not mount the draft.
- [ ] Nothing committed that must stay private: the repository is public.

## Ownership rules

- **Your folder only.** Import your own files, the kernel (`src/platform/`, except `release/` and `access/` from browser code), `@pu/platform-schema` and npm packages. Never another experience's files, by any spelling: relative, `..`-normalised, backslashed, root-relative (`/src/experiences/…`) or with a query (`?inline`).
- **Globs stay inside.** `import.meta.glob()` patterns must be string literals under your folder (`'./chapters/*.mdx'`). `'../*/x.ts'` can reach every experience and fails.
- **CSS too.** `@import` and `url()` may reach your files and the platform tokens, not another experience's stylesheet, font or image.
- **Platform code never reaches in.** `src/pages/`, the kernel, `integrations/` and `astro.config.ts` never import an experience; discovery comes from the catalog.
- **Islands are public.** A component with `client:*` (in `.astro` or `.mdx`) and everything it imports ship to the browser: no catalog, `config/`, `platform/release`, `platform/access`, `integrations/` or `node:` imports there. Pass values as props from frontmatter.
- **Island errors stay in the island.** Wrap an island's root in an error boundary with an accessible fallback that shows no error details; `sample-app/ErrorBoundary.tsx` is the pattern. Boundaries catch errors thrown while rendering, in lifecycle methods and effects; not errors in event handlers, async code or server rendering, which the component must handle itself. Copy the pattern into your experience; it moves to the kernel when a second island uses it.
- **Files are routes.** A PDF or image the experience serves is a route of the experience (ADR-020), never a `public/` file.

## Permanent fixtures

`canary-draft` and `sample-hostile` are drafts that must never be promoted. `sample-app` is the React-island regression fixture (ADR-021): published, and not to be deleted until another island covers React-only loading, in-app routing, flags, the interactive budget and the error boundary.
