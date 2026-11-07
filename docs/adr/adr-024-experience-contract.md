# ADR-024 — The Experience Contract, blueprint revision 3 and the new roadmap

Status: proposed (7 November 2026), pending the owner's approval; amended the same day by the architecture amendment pass (decisions 6–10) · Builds on ADR-004, ADR-007, ADR-010, ADR-012, ADR-019, ADR-021, ADR-022. Supersedes no ADR. Reference: [experience-contract.md](../experience-contract.md), [blueprint.md](../blueprint.md), [architecture-review.md](../architecture-review.md).

## Context

Blueprint revision 2 (30 October 2026) was written before any code. Implementation since then changed many of its facts, each recorded in an ADR, but the blueprint itself was never updated, and nothing stated in one place what an experience must provide and what it may do freely. The next phases (design methodology, then several visually unrelated prototypes) depend on that agreement being explicit.

## Decision

1. **The [Experience Contract](../experience-contract.md) governs the platform–experience relationship.** Version 1.0 describes the platform as built: each requirement names how it is enforced, and gaps are listed rather than fixed in advance. The schema is the machine-checked part of the contract; where they differ, the contract is corrected.
2. **Contract versions are `MAJOR.MINOR` in the document only.** No per-experience version field: every experience lives in one repository and one build, so a breaking change lands together with its migration.
3. **Blueprint revision 3 replaces revision 2 as the architecture description.** Revision 2 stays readable at commit `c7ec5cd`; its ADR-001 to ADR-010 context, first kept as an appendix, now lives unchanged in each of those ADR files under "Founding context". A section map translates revision 2 section numbers, which code comments cite.
4. **New roadmap:** Phase 1 architecture and contract; Phase 2A design methodology, the Art Director and Experience Builder skills and the aesthetic registry, with one dry run; Phase 2B the local Design Laboratory; Phase 3 independent prototypes; Phase 4 Control Center evolution; then Identity and protected access (revision 2's Phases 4a and 4b) and platform intelligence. Unfinished revision 2 work is kept as an unscheduled backlog.
5. **Legacy phase labels stay in code.** Rule ids and messages such as `access-phase-4`, `on-demand-phase-4` and `PHASE_0` keep their names; the blueprint maps them to the Identity phase and to `PlatformOptions.protectedRendering`, and maps every other revision 2 phase number used in accepted ADRs.

Amendments (7 November 2026), from the accepted findings of the architecture review:

6. **Independence is not isolation.** Experiences own their visual identity, assets, typography, layout and interactions, but share one repository, one build and dependency graph, one origin, one CSP and one kernel. The documents never describe experience independence as a security boundary (contract § 7, blueprint § 5.1).
7. **The Beacon's function is the platform's; its presentation is the experience's.** The return link to `/`, the palette, keyboard behaviour and accessibility are guaranteed on every page (contract § 3.5, B1–B8); placement, colour, type, size and treatment belong to the experience. No presentation mechanism exists yet: it is chosen with the first prototype that needs it (decision D4, contract gap G1). This refines the option [ADR-019](adr-019-index-and-beacon.md) item 6 anticipated and supersedes nothing; until the mechanism exists, the default presentation stays `!important`.
8. **Phase 2 is two phases.** 2A produces documents and skills only; 2B builds the local Design Laboratory. No document describes the methodology as an interactive laboratory.
9. **Experience-owned assets and fonts have written requirements** (contract § 3.6): self-hosted, in the experience's folder, licensed for a public repository, free of private metadata, budgeted, and validated by the output checks. Allowing hashed fonts and images in production output stays decision D11.
10. **Publishing prerequisites.** A new experience is published only after automated accessibility coverage, a recorded manual accessibility check, a passing hosted CI run on the publishing commit, a passing preview smoke test, the production build gate and the owner's approval (contract § 8.5). These are manual steps until D12 and D16 are decided; they do not decide them.

## Alternatives considered

- *Append a new roadmap to revision 2:* leaves contradictions (Astro 6, private repository, `chrome: 'full'`) in the main architecture document.
- *Delete revision 2's ADR context:* breaks the links in ADR-001 to ADR-010 and loses their alternatives and trade-offs.
- *Renumber phases in code and ADRs:* churn with no behaviour change, and edits to accepted records.
- *A machine-readable contract version per experience:* solves a problem one build cannot have.

## Consequences

- New experiences are reviewed against the contract's checklist.
- The decision register in blueprint § 12 holds the open proposals (D10, D11, D12, D14, D16); the amendments above leave all five open. Each one that is implemented gets its own ADR. D14, if accepted, supersedes ADR-009.
- The amendment pass updated the living documents that used revision 2's phase numbers (`AGENTS.md`, README, the runbooks and the Control Center document). The Journal's chapter "Ahead" is published experience content and still describes revision 2's roadmap until the owner changes it; accepted ADRs keep their wording and are read through the blueprint's phase table.
