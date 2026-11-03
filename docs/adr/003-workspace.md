---
noteId: "e68a5f06d5de11f1ae605f8c0e08bb6f"
tags: []

---

# ADR-003 — Private pnpm workspace, one lockfile, no Turborepo

Status: accepted; in practice the repository is public (tracker decision 5), and [ADR-022](022-link-previews-smoke-and-public-repository.md) records what that exposes · Source: [blueprint §6 ADR-003](../blueprint.md#adr-003--private-pnpm-workspace-two-apps-one-package-no-turborepo)

**Decision:** `apps/site`, `apps/control` (Phase 1), `packages/platform-schema`, `packages/experience-catalog`; one `pnpm-lock.yaml`.

**Implementation notes**
- `packageManager: pnpm@10.34.9` via Corepack. pnpm 12 exists; 10 is kept until Vercel's support for the newer lockfile format is confirmed.
- Workspace packages export TypeScript source (`exports: ./src/index.ts`); Vite and Node type stripping both load it without a build step (blueprint open question 6).
- Unit tests use `node:test`, not a test framework: the schema needs nothing more.
- `pnpm-workspace.yaml` carries one `packageExtensions` entry to work around a missing peer in `@astrojs/astro2tsx@0.1.3`. Re-checked on Astro 7 (ADR-011): still needed. Delete it when astro2tsx declares the dependency.
