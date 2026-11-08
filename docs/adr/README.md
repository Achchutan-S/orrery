# Architecture decision records

One file per decision, named `adr-NNN-short-description.md`. Numbers are permanent and never reused.

- **Changing a decision:** add a new ADR that says which one it supersedes and why, and change the old one's status line to `superseded by ADR-NNN`. Never rewrite an accepted decision in place. The status line, links and file paths are the only parts of an accepted ADR that may change.
- **Proposed ADRs** may be edited until the owner accepts them.
- **What goes in an ADR:** the decision, the context and alternatives that explain it, and what implementation learned. Procedures belong in the guides under `docs/`; current status belongs in the [tracker](../tracker.md).
- ADR-001 to ADR-010 carry their founding context from blueprint revision 2 under "Founding context". Phase numbers in ADRs are revision 2's; the [blueprint](../blueprint.md#what-changed-from-revision-2) maps them.

| ADR | Decision | Status (see each file for detail) |
| --- | --- | --- |
| [001](adr-001-astro-host.md) | Astro 6 as the host framework | accepted; version pin superseded by ADR-011 |
| [002](adr-002-static-by-default.md) | Static by default; on-demand only for protected and API routes | accepted |
| [003](adr-003-workspace.md) | Private pnpm workspace, one lockfile, no Turborepo | accepted; the repository is public in practice (ADR-022) |
| [004](adr-004-experience-model.md) | Definition in code, release in data, explicit registry, minimal route mounting | accepted |
| [005](adr-005-release-dimensions.md) | Four release dimensions; channels derived; three environments | accepted |
| [006](adr-006-control-center.md) | Control Center as a separate app; V1 local and Git-backed | accepted |
| [007](adr-007-presentation-ownership.md) | Presentation ownership and CSS isolation | accepted |
| [008](adr-008-external-apps.md) | Existing apps stay external, reached by subdomain | accepted |
| [009](adr-009-git-content.md) | Git-based content with collections and MDX | accepted, not built; decision D14 proposes superseding it |
| [010](adr-010-identity-later.md) | Identity, authorization and analytics designed now, built later | accepted |
| [011](adr-011-astro-7.md) | Upgrade the host to Astro 7 | accepted |
| [012](adr-012-platform-layer.md) | Shared platform layer (task 7) | accepted; choices 4 and 7 superseded by ADR-021 |
| [013](adr-013-external-projects-and-samples.md) | KawaiUI and Dev X-Ray as external experiences; Task 8 samples | accepted |
| [014](adr-014-repository-checks.md) | Repository checks in `tools/checks` | accepted; known limit 1 superseded by ADR-022 |
| [015](adr-015-ci.md) | GitHub Actions CI | accepted |
| [016](adr-016-vercel-deployment.md) | Vercel deployment configuration, headers and CSP | accepted; decision 5 superseded by ADR-021 |
| [017](adr-017-control-center-server.md) | Control Center server: cookie session, API shape, file store | accepted |
| [018](adr-018-control-center-ui.md) | Control Center UI: one process, a built UI under CSP, no extra libraries | accepted |
| [019](adr-019-index-and-beacon.md) | The Index at `/` and the Beacon | accepted |
| [020](adr-020-resume-assets.md) | Resume: one content source, generated assets served as release-controlled routes | accepted |
| [021](adr-021-platform-integrity.md) | Platform integrity: implemented chrome only, a permanent island fixture, one Node policy, a committed platform font | accepted |
| [022](adr-022-link-previews-smoke-and-public-repository.md) | Link-preview images from the catalog, environment-aware smoke tests, and what a public repository exposes | accepted |
| [023](adr-023-audit-closure.md) | Audit closure: complete budgets, durable Control Center writes, opener isolation, dependency and hygiene policy | accepted |
| [024](adr-024-experience-contract.md) | The Experience Contract, blueprint revision 3 and the new roadmap | **proposed**, pending the owner |
| [025](adr-025-lazy-chunk-detection.md) | The checks recognise the output of the first immersive experience: lazy chunks written as `` import(`./x.js`) ``, external page-script names | **proposed**, pending the owner |
