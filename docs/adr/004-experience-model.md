---
noteId: "e68a5f04d5de11f1ae605f8c0e08bb6f"
tags: []

---

# ADR-004 — Definition in code, release in data, explicit registry, minimal route mounting

Status: accepted, spike complete; the Vercel checks (d) passed in the production smoke test of 1 November 2026 (tracker task 11) · Source: [blueprint §6 ADR-004](../blueprint.md#adr-004--experience--definition-in-code--release-entry-in-data-explicit-registry-minimal-route-mounting)

**Decision:** catalog entries in `packages/experience-catalog`, implementation in `apps/site/src/experiences/<id>`, release state in `config/release.json`, and `apps/site/integrations/mount-experiences.ts` injects only mounted routes.

## Spike results (task 2, 1 November 2026, Astro 6.4.8; re-run on Astro 7.4.4)

First automated in `routing.test.ts` against a spike fixture. In task 6 the fixture was replaced by the real sample experiences and the checks moved to `apps/site/test/pipeline.test.ts` (run `pnpm --filter @pu/site test`). The off-flag result is recorded here and not kept as a test: it describes Astro, not our code; the flag acceptance test comes with task 8.

| Question | Result | Evidence |
| --- | --- | --- |
| (a) Data-driven exclusion of a `src/pages` file | **None exists.** `astro:route:setup` can only set `prerender`; `astro:routes:resolved` is read-only. Only the `_` filename prefix excludes, which is not data-driven. | Astro 6.4.8 `dist/types/public/integrations.d.ts` |
| (b) `injectRoute` with entrypoints outside `src/pages` | **Works** in `astro dev` and `astro build`. | test: *injectRoute mounts…*, *dev server serves…* |
| Enumerated static catch-all | **Works.** `/spike/[...path]` with `getStaticPaths` emits `spike/a.html` and `spike/b/c.html`, each with its own title. | test: *each enumerated path…* |
| Query strings | Serve the same file (dev, `astro preview`). | test + manual `curl` |
| Unknown path | `404.astro` with status 404 (dev, `astro preview`). | test + manual `curl` |
| (c) Island behind an "off" build flag | **Its chunk is still emitted** to `dist/_astro/` (not referenced by the page). Confirms the rule: build flags are release management, not secrecy. | test: *an island behind an off build flag…* |
| Unmounted experience | **Absent.** A route that is never injected leaves no HTML, no island chunk and no canary in `dist/`. Mutation-tested: injecting it fails the test. | test: *an unmounted route…* |
| Source maps | None in `dist/` by default. | test: *no source maps* |
| (d) Vercel `cleanUrls`, `trailingSlash: false`, real 404 status | **Not yet verified** — needs a Vercel project. | [deploy runbook](../runbooks/deploy.md) (`pnpm smoke`) |

Conclusion: the integration is justified and works; build on it.

## Task 6 implementation

`mount-experiences` takes no options. At `astro:config:setup` it reads the catalog, `config/release.json` and the experience folders, runs `planMount()` (catalog, release and coverage validation, then `mountedRoutes()`), throws listing every issue, and injects the rest. It watches `release.json`, so the dev server restarts when the file changes. Any issue mounts nothing.
