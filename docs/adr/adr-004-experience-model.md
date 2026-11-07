# ADR-004 — Definition in code, release in data, explicit registry, minimal route mounting

Status: accepted, spike complete; the Vercel checks (d) passed in the production smoke test of 1 November 2026 (tracker task 11)

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
| (d) Vercel `cleanUrls`, `trailingSlash: false`, real 404 status | **Not yet verified** — needs a Vercel project. | [deploy runbook](../deployment.md) (`pnpm smoke`) |

Conclusion: the integration is justified and works; build on it.

## Task 6 implementation

`mount-experiences` takes no options. At `astro:config:setup` it reads the catalog, `config/release.json` and the experience folders, runs `planMount()` (catalog, release and coverage validation, then `mountedRoutes()`), throws listing every issue, and injects the rest. It watches `release.json`, so the dev server restarts when the file changes. Any issue mounts nothing.

## Founding context

As written in blueprint revision 2 § 6 on 30 October 2026 ("Experience = definition in code + release entry in data; explicit registry; minimal route mounting"); phase numbers are revision 2's ([blueprint phase table](../blueprint.md#what-changed-from-revision-2)). Facts implementation later changed are recorded in the status line and later ADRs.

- **Context:** experiences need clear boundaries; lifecycle must actually control what ships; the Control Center needs metadata without site code; no speculative framework.
- **Decision:** catalog entries in `packages/experience-catalog` (data only, explicit index), implementation folders in the site, `config/release.json` for release state, and a \~40-line integration that calls `injectRoute` only for experiences mounted in the current environment.
- **Alternatives:** definitions inside experience folders (the Control Center would have to import site code); conventional `src/pages` only (cannot exclude drafts from builds); filesystem auto-discovery (implicit publication); a generator (premature).
- **Trade-offs:** an experience's metadata and implementation live in two places, kept consistent by the catalog-coverage check; one small custom integration to own.
- **Consequences:** adding an experience is one folder, one catalog file and one index line. `exclusiveImports` records which packages belong to which experience; it does not isolate versions. **Graduation criteria:** an experience leaves the host when it needs a different framework or a version of a shared dependency the host cannot adopt, dominates build time, needs long-running or scheduled compute, embeds untrusted third-party code, or needs its own release cadence.
- **Revisit when:** Astro supports data-driven route exclusion natively, or the copied skeleton stabilises (add a generator).
