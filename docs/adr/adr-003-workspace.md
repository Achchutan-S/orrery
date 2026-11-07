# ADR-003 — Private pnpm workspace, one lockfile, no Turborepo

Status: accepted; in practice the repository is public (tracker decision 5), and [ADR-022](adr-022-link-previews-smoke-and-public-repository.md) records what that exposes

**Decision:** `apps/site`, `apps/control` (Phase 1), `packages/platform-schema`, `packages/experience-catalog`; one `pnpm-lock.yaml`.

**Implementation notes**
- `packageManager: pnpm@10.34.9` via Corepack. pnpm 12 exists; 10 is kept until Vercel's support for the newer lockfile format is confirmed.
- Workspace packages export TypeScript source (`exports: ./src/index.ts`); Vite and Node type stripping both load it without a build step (blueprint open question 6).
- Unit tests use `node:test`, not a test framework: the schema needs nothing more.
- `pnpm-workspace.yaml` carries one `packageExtensions` entry to work around a missing peer in `@astrojs/astro2tsx@0.1.3`. Re-checked on Astro 7 (ADR-011): still needed. Delete it when astro2tsx declares the dependency.

## Founding context

As written in blueprint revision 2 § 6 on 30 October 2026 ("Private pnpm workspace: two apps, one package, no Turborepo"); phase numbers are revision 2's ([blueprint phase table](../blueprint.md#what-changed-from-revision-2)). Facts implementation later changed are recorded in the status line and later ADRs.

- **Context:** the site, the Control Center and CI must share schemas, rules and experience metadata without the Control Center importing site code; drafts and opinions must not be public before release.
- **Decision:** a private repository with `apps/site`, `apps/control`, `packages/platform-schema` and `packages/experience-catalog`, one pnpm lockfile.
- **Alternatives:** single package (the Control Center would import site internals or duplicate rules); Turborepo (task caching irrelevant at this size); public repo (drafts exposed in history).
- **Trade-offs:** slightly more setup; the code is not publicly browsable. If public code is valuable for recruiters, publish a curated mirror or a "how this site works" experience instead.
- **Consequences:** every experience in the site shares one resolved version of each dependency; Vercel deploys from a private personal-account repo.
- **Revisit when:** more than three apps exist or builds exceed \~5 minutes (consider task orchestration).
