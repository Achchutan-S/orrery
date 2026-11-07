# Architecture review

7 November 2026 · Phase 1 of the [revised roadmap](blueprint.md#11-roadmap) · Outcomes: [Experience Contract](experience-contract.md), [blueprint revision 3](blueprint.md), [ADR-024](adr/adr-024-experience-contract.md). Amended the same day: see [Amendment pass](#amendment-pass-7-november-2026).

## Scope and method

Reviewed against the working tree at commit `c7ec5cd` (clean): blueprint revision 2, ADR-001 to ADR-023, `AGENTS.md`, `architecture.md`, `tracker.md`, `control-center.md`, the runbooks and the design notes; and the source of `platform-schema` (definition, release, resolve, validate, control), every catalog entry, `config/release.json`, the `mount-experiences` integration, `astro.config.ts`, `vercel.json`, every kernel module, every experience's layout, the boundary, leak and budget checks, and the browser suites' page lists. Hosted CI status for `c7ec5cd` was read from the GitHub API. No code was changed.

Status words: **verified** (a test, check, CI run or live request shows it), **implemented, not fully verified**, **partial**, **documented only**, **proposed**.

## What exists today

| Area | Status | Evidence |
| --- | --- | --- |
| Workspace, one lockfile, Node policy | verified | CI on `c7ec5cd` passed both jobs; `node-policy.test.ts` |
| Catalog, release state, resolution, route mounting | verified | `resolve.test.ts`, `pipeline.test.ts`; production mounts exactly index, journal, sample-content, sample-app, skills, resume |
| Validation rules | verified | `validate.test.ts`: reserved prefixes, unique ids and routes, entry route, entrypoint ownership, alpha non-public, deprecated unlisted, archived target, phase-gated access and on-demand routes, request flags, `experimental` under `/labs`, `api` on-demand, `ogImage` routes, exclusive-import owners, variant base |
| `archived` lifecycle | partial | validated (`archivedTo` required); no redirect or snapshot is generated |
| Kernel: `ExperienceRoot`, `SeoHead`, layers and tokens, Beacon and palette, colophon, discovery, `flag()` | verified, deployed | `platform.test.ts`, browser suites, live site |
| `track()` | implemented as a no-op; no callers | `analytics/track.ts` |
| `authorize()` | implemented as a deny-all stub; no callers | `access/authorize.ts` |
| Catalog `events` field | documented only | declared in the schema; nothing reads it |
| `variantOf` | implemented, unused | validated; no experience uses it |
| `exclusiveImports`, `budgetOverrides` | implemented, unused | consumed by `check:boundaries` and `check:budgets`; no entry sets them |
| Experiences | verified, deployed | Index, Journal, resume, Skills Archive, sample-content, sample-app live; KawaiUI and Dev X-Ray linked; fixtures absent from production |
| Checks: boundaries, metadata, leaks, budgets; production build gate | verified | `tools/checks` tests; they gate every Vercel production build |
| CI | verified | GitHub Actions on `c7ec5cd`: "Typecheck, tests and guardrails" and "Browser (Playwright and axe)" succeeded |
| Deployment, headers, CSP | verified | production smoke test passed on 7 November 2026 |
| Preview protection | documented only (dashboard setting) | not checked in this review |
| Automated accessibility | verified for the listed pages | browser suites; the Archive's own suite |
| Manual accessibility checklist | not done | [accessibility.md](accessibility.md) |
| Control Center V1 | verified locally and in CI; never deployed, by design | server and UI tests, browser tests |
| Writing collection, RSS, sitemap, search | not built | no `content/` folder; `src/pages` has only the 404 page |
| Analytics, Speed Insights, privacy page | not built | — |
| Custom domain, subdomains | not built | no domain chosen |
| Identity, grants, protected delivery | documented only | blueprint § 6.4; reserved schema values |
| Lighthouse and Core Web Vitals gate | not built | manual lab runs only |
| Design methodology, skills and aesthetic registry (Phase 2A) | not started | `docs/design/platform-identity.md` records one three-direction exploration; `.claude/skills/frontend-design` and `web-design-guidelines` are vendored tools, not a methodology; no Art Director or Experience Builder skill exists |
| Design Laboratory (Phase 2B) | not built | no local visual experimentation environment exists |
| Experience-owned Beacon presentation | documented only | contract § 3.5; the Beacon has one `!important` default presentation |

## What is missing

1. A written agreement between the platform and experiences. **Now drafted:** the Experience Contract.
2. An accurate architecture document. Revision 2 described an unbuilt system. **Now:** revision 3.
3. Automated accessibility coverage for every page: the suites use hand-written lists, so a new experience is unchecked until its author adds it (contract gap G7, decision D12).
4. A supported way for an experience to ship its own web fonts and in-page images (gaps G2, G3; decision D11).
5. A mechanism through which an experience presents the Beacon its own way while the platform keeps its function (contract § 3.5, gap G1, decision D4).
6. CI as a deployment gate (decision D16).
7. A design methodology, its two skills and an aesthetic registry (Phase 2A), and a local Design Laboratory (Phase 2B).
8. Explicit prerequisites before a new experience is published. **Now drafted:** contract § 8.5.

## Strengths

- **Release state controls the build, and that is tested.** Unmounted experiences are never compiled; the leak check proves it from the output, including prose, bytes and base64 of unreleased files.
- **One definition of the rules.** The build, the checks and the Control Center call the same `platform-schema` functions.
- **Real visual independence.** Six experiences with unrelated designs share only the shell, the Beacon and the focus ring; a hostile stylesheet fixture proves isolation.
- **Accessibility guarantees experiences cannot remove**: the focus ring and CSS motion clamping are `!important` in the first layer.
- **Small kernel**, with the two-consumer rule followed in practice (the error boundary stayed in `sample-app`).
- **Honest documentation habits**: the tracker separates implemented, committed, deployed and manually verified; ADRs record deviations.
- **No runtime attack surface** in production: every request is a static file under a strict CSP.

## Risks

| # | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| R1 | The repository is public; release state is mistaken for privacy. History already holds removed material (resume history, commit `99b70f6`) | high | Contract M15 and blueprint § 6.3; protected content never committed; history rewrite is the owner's decision |
| R2 | Contract requirements without automation (accessibility on unlisted pages, CSS layering, error boundaries) erode as experiences are added | medium | D12 before Phase 3; publishing prerequisites P1 and P2; review checklist |
| R3 | Visual autonomy friction: fonts, images, Beacon, WebAssembly, third-party resources | medium | Gaps G1–G5, fixed only when a prototype needs them; asset requirements in contract § 3.6 |
| R3a | Experience independence is mistaken for security isolation (shared origin, build, dependency graph and CSP) | medium | Contract § 7 and blueprint § 5.1 say it is not; untrusted code goes to a separate origin |
| R4 | CI does not gate production: a failing unit or browser test can deploy | medium | D16; until then a manual publishing prerequisite (contract § 8.5, P3) |
| R5 | The `immersive` class and its budgets have never been exercised | medium | Phase 3 exit criterion |
| R6 | Experiences can import any kernel file; internal changes can break them | low | Contract § 6.2 supported surface; tests |
| R7 | One dependency graph and one build: a heavy library or conflicting major affects everyone | low | `exclusiveImports`; graduation criteria |
| R8 | Phase labels in code ("Phase 4") no longer match the roadmap | low | Mapping in the blueprint header and ADR-024 |
| R9 | Documentation drift (below) | low | Listed for the owner |
| R10 | Control Center session cookie is not port-scoped (audit F20) | low | Pending the owner's decision; local only |

## Conflicts between documentation and implementation

Resolved in blueprint revision 3 (revision 2 said otherwise):

1. Astro 6 → Astro 7.4.4 ([ADR-011](adr/adr-011-astro-7.md)).
2. Private repository → public ([ADR-022](adr/adr-022-link-previews-smoke-and-public-repository.md), tracker decision 5).
3. `chrome: 'full'` → rejected by the schema ([ADR-021](adr/adr-021-platform-integrity.md)).
4. `ogImage` as a path in the experience folder → the pattern of one of its image routes (ADR-022).
5. A platform-owned `writing` collection in `apps/site/content` → none exists; the Journal and the Archive own their content (decision D14).
6. ESLint and dependency-cruiser → a custom boundary checker ([ADR-014](adr/adr-014-repository-checks.md)).
7. Control Center token in the URL fragment → HttpOnly cookie; different endpoints ([ADR-017](adr/adr-017-control-center-server.md)).
8. `archived` redirects or snapshots → validated, not implemented.
9. Lighthouse gates in CI → none.
10. Delete `sample-app` at first release → permanent fixture (ADR-021).
11. Analytics, privacy page and Speed Insights in revision 2's Phase 1 → not built.

Out of date elsewhere at the time of the review. Items 12–16 were fixed by the [amendment pass](#amendment-pass-7-november-2026); item 17 is still open:

12. `docs/tracker.md`: task 6 lists four production experiences (there are six); outstanding decision 2 and the Phase D row say Phase D is uncommitted, but it is in `f209de4` (7 November 2026), including the `prompt.md` deletion F18 calls pending; there is no row for the Skills Archive.
13. `docs/architecture.md` § Index and Beacon: "The resume … exists today as a draft" (published 3 November 2026).
14. `docs/deployment.md` § Today's addresses: no `/skills` routes.
15. ADR status lines: ADR-007 "not started" (implemented in task 7, ADR-012); ADR-015 and ADR-016 say no Vercel project or deployment exists (deployed since 1 November 2026). Status lines are the one part of an ADR the README allows to change.
16. `AGENTS.md` § Deferred uses revision 2's phase numbers ("all Phase 4", "Phase 4a", "Phase 2").
17. **Still open.** The Journal's chapter "Ahead" (`apps/site/src/experiences/journal/chapters/08-ahead.mdx`) summarises revision 2's roadmap. It is published experience content; changing it is the owner's decision.

## Decisions made

Recorded in [blueprint § 12](blueprint.md#12-decision-register). Settled by accepting this phase (documentation only), none accepted yet: D1 visual freedom, D2 optional components, D3 experience-owned tokens, D5 capability declarations, D6 isolation, D8 schema sufficiency and no contract-version field, D9 methodology separate from implementation, D13 the supported kernel surface. Direction set, implementation later: D4 the Beacon (function platform-owned, presentation experience-owned, mechanism later), D7 the access model, D15 the Control Center.

## Decisions that need the owner

- **Accept the contract, blueprint revision 3 and ADR-024** (D10: new roadmap, legacy labels kept).
- **D11:** allow experience-owned hashed fonts and images in the production output.
- **D12:** derive browser-test page lists from the build before Phase 3.
- **D14:** content belongs to experiences; supersede ADR-009 if accepted.
- **D16:** make CI a deployment gate.
- Whether to update items 12–17 above, especially the Journal chapter and `AGENTS.md`.

## Deferred

Identity provider, custom domain, analytics vendor and privacy obligations, repository visibility and history, the cookie port scope, CI performance gates, graduation (blueprint § 13).

## Recommended next phase

Phase 2A can begin as soon as the contract is accepted. It needs no code change and no platform decision beyond D9: it produces documents under `docs/design/` (the Art Director and Experience Builder methodologies, the critique workflow and the aesthetic registry), the two matching skills under `.claude/skills/`, and one dry run on a written brief. It is not the Design Laboratory: that is Phase 2B, the first tooling, which starts after 2A and begins with an ADR on where it lives. D11, D12 and D16 are best decided during Phase 2, so Phase 3 prototypes start knowing how fonts and images ship, with full accessibility coverage and a gated deployment.

## Amendment pass (7 November 2026)

The owner accepted these findings of the review; they are now in the documents. No code, schema, release state or configuration changed, the contract stays proposed at version 1.0, and decisions D10, D11, D12, D14 and D16 stay open.

| Finding | Where it is now |
| --- | --- |
| Experience independence is creative and organisational, not a security boundary: one repository, build graph, origin, CSP and kernel | contract § 1, § 7; blueprint § 1 principle 9, § 5.1, § 9; ADR-024 decision 6 |
| The Beacon: function, keyboard behaviour and accessibility guaranteed; presentation, placement and treatment experience-owned; no single fixed treatment required | contract § 3.3, § 3.5 (B1–B8), § 10, gap G1; blueprint § 3, § 5, D4; ADR-024 decision 7 |
| Phase 2 split: 2A methodology, skills, registry and one dry run; 2B the local Design Laboratory | blueprint § 11; tracker § Roadmap phases; ADR-024 decisions 4 and 8 |
| Requirements for experience-owned assets and fonts: safe handling, budgets, output validation | contract § 3.6; blueprint § 3, D11; add-experience.md step 6 |
| Accessibility and CI/deployment gates as explicit prerequisites before publishing a new experience | contract § 8.5 (P1–P6), § 12; blueprint § 10; add-experience.md step 10, deployment.md step 4, accessibility.md § Manual checklist; AGENTS.md |
| Security limitations stated accurately: `owner` is not authentication, `unlisted` is not private, the Control Center is local-only, public Git source stays readable, no private delivery or identity exists | contract § 4.6, § 7; blueprint § 6.3, § 9 |
| Stale documents (conflicts 12–16) | tracker (task 6, Phase D, Skills Archive row, decisions 2 and 7, F18, F23), architecture.md, deploy.md, ADR-007 and ADR-016 status lines, AGENTS.md, README, control-center.md, add-experience.md, ADR README |

Later the same day the documentation was consolidated: `architecture.md` was dissolved into the contract (route paths), the tracker and code comments; the runbooks moved to `docs/`; `control-center.md` became `apps/control/README.md`; ADR files were renamed `adr-NNN-…`. Paths above that name the old files describe the tree as reviewed.

Not changed: accepted ADR bodies (read through the blueprint's phase table), the Journal's chapter "Ahead" (experience content, owner's decision), ADR-015's status line (its "no Vercel project" note is in the body, describing the deviation at the time).
