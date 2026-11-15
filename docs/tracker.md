# Tracker

What is live, what is open, and what waits for a decision. Update it in the same change that alters any of them. An item is `complete` only when its acceptance evidence passes.

Evidence words, used only in this sense: **implemented** (the code exists), **locally verified** (tests and checks passed on the owner's machine), **committed** (in a pushed commit, named), **hosted CI passed** (a GitHub Actions run passed on that commit), **deployed** (the live site serves it), **manually verified** (a person checked it by hand). Nothing here is manually verified unless it says so.

## Live (checked 13 November 2026)

Production is https://orrery-teal.vercel.app, built from `main` at `b9555cc`, which passed hosted CI (run 42458956688) and has GitHub commit status "Vercel: success". On 13 November 2026 every page and hashed asset of a local production build of `b9555cc` matched production, and `pnpm smoke https://orrery-teal.vercel.app --env production --external` passed.

| Experience | Production | Notes |
| --- | --- | --- |
| `index` | `/`, listed | the Index front page ([ADR-019](adr/adr-019-index-and-beacon.md)) |
| `journal` | `/journal` and 8 chapters, listed | the platform's history; chapter "Ahead" still describes blueprint revision 2's roadmap (replacement text drafted, waiting for the owner; see Open work) |
| `resume` | `/resume`, its PDF and link-preview image, listed since 3 November 2026 | [resume.md](resume.md); certification title confirmation not recorded |
| `skills` | `/skills`, listed since 7 November 2026 | the Claude Skills Archive; [claude-skills/publication-decisions.md](claude-skills/publication-decisions.md) |
| `divya-chakshu` | `/divya-chakshu`, listed since 8 November 2026 (`b9555cc`) | published before its manual accessibility check and preview smoke test (contract P2, P4), both still open; never checked on a real GPU or phone; [record](design/registry/divya-chakshu.md) |
| `sample-content`, `sample-app` | listed | permanent fixtures: static essay; React-island regression fixture ([ADR-021](adr/adr-021-platform-integrity.md)) |
| `kawaiui`, `devxray` | listed links | external projects, never built here; subdomains wait for a domain |
| `canary-draft`, `sample-hostile` | never (404) | permanent test fixtures; never promote |
| Control Center | never deployed, by design | local only ([apps/control/README.md](../apps/control/README.md)) |

**Not in production and not on `main`:** A History of Seeing, branch `feat/seeing` (`441e642`). Rejected by the owner on aesthetic grounds, shelved, never merged; `/seeing` is a 404. [Retrospective](design/registry/seeing.md).

## Waiting for the owner

Nothing below can be done by an agent.

| # | Action | Why | How |
| --- | --- | --- | --- |
| O1 | **Protect `main`** | Until this is on, CI is not a gate and contract P3 is a manual check ([ADR-029](adr/adr-029-ci-as-the-release-gate.md)) | [deployment.md § Protecting main](deployment.md#protecting-main-once) |
| O2 | **Turn off the editor's notes extension for this folder** (audit F18) | It stamped `noteId` front matter into fourteen new Markdown files on 13 November 2026 within minutes of their creation; `hygiene.test.ts` fails on any stamped file, so CI would fail | editor settings; then delete any front matter it left |
| O3 | **Say what failed in A History of Seeing** | The retrospective and any new brief wait for it; an agent must not guess | five questions in the [record](design/registry/seeing.md#why-it-was-rejected) |
| O4 | **Manual accessibility check of Divya Chakshu**, on a real phone and GPU, and its preview smoke test | Contract P2 and P4, unmet since publication | [accessibility.md](accessibility.md) checks 20–23; record a row in § Results |
| O5 | **Approve or edit the Journal's new "Ahead" text** | Published content; the live chapter describes an abandoned roadmap | proposed text: `docs/reports/journal-ahead-proposed-text.md`; not applied |
| O6 | **Rollback drill** | Never performed; deferred to a quiet time (the recommended position, taken on the owner's general instruction of 13 November 2026) | [deployment.md § Rollback drill](deployment.md#rollback-drill) |
| O7 | **Decide what happens to `docs/reports/`** | `AGENTS.md` allows no per-task reports; the audit was kept until the programme closed | delete, or keep as a record |

## Open work

| Item | Status | Where |
| --- | --- | --- |
| Manual accessibility checks (audit F12, decision 3) | **not performed** for any experience; automated checks pass, which is not proof | [accessibility.md](accessibility.md) |
| Hosted preview smoke run (audit F17) | not recorded; production smoke runs passed (latest 13 November 2026) | [deployment.md § Smoke test](deployment.md#smoke-test-toolscheckssrcsmokets) |
| Design reviews of the published experiences | none recorded; their direction records are reconstructions, not approvals | [design/registry/](design/registry/README.md) |
| First use of the creative process | not yet used on a new experience; blueprint Phase 2A's dry-run exit criterion is unmet until the Seeing retrospective is completed (O3) | [design/creative-process.md](design/creative-process.md) |
| Scheduled production smoke | workflow written (`.github/workflows/smoke.yml`); **no run yet**: it first runs after it is merged to `main` | [deployment.md](deployment.md#scheduled-smoke-test) |
| Dependabot | configured (`.github/dependabot.yml`); active once merged | [repository-checks.md § CI](repository-checks.md#ci-githubworkflowsciyml) |
| Beacon presentation mechanism (contract gap G1) | not built, on purpose: no approved direction has needed it | [contract § 3.5](experience-contract.md#35-the-beacon-platform-function-experience-presentation) |

## The 13 November 2026 programme

The platform audit of 13 November 2026 (`docs/reports/orrery-platform-audit-and-readiness.md`) and the programme that followed it. Everything in this table is **implemented and locally verified, not committed**: the owner commits.

| Task | Outcome | Evidence |
| --- | --- | --- |
| A-1 owner decisions | recorded, **on one instruction**: asked for each decision separately, the owner answered "proceed with the safe and recommended step" (13 November 2026). That was taken as choosing every recommended position: blueprint revision 3, contract 1.0, ADR-024 and ADR-025 accepted; D10 keep labels, D11 allow, D12 derive, D14 accept, D16 require CI with no administrator bypass; `feat/seeing` shelved; sitemap built; rollback drill deferred. The owner did not state any of these individually, and has not read ADR-026 to ADR-030 or the contract's 1.1 amendments, which were written afterwards: merging the pull request that carries them is the acceptance | status lines; [blueprint § 12](blueprint.md#12-decision-register); ADR-026 to ADR-030 |
| A-2 CI as the release gate | **blocked on O1.** Decision, ADR-029, pull request template and documents done; the GitHub setting and the proof that a failing pull request cannot merge are the owner's | [ADR-029](adr/adr-029-ci-as-the-release-gate.md) |
| A-3 correct the record | done | this file, README, blueprint § 2.3, contract § 3.2 and § 8.2, the `divya-chakshu` release note |
| A-4 Divya Chakshu publishing debt | **open (O4).** Checklist rows written; no person has run them | [accessibility.md](accessibility.md) |
| A-5 tooling fixes from `feat/seeing` | done, re-implemented by hand: WebP media type; no query-string probe on a file route; the Control Center's first-row test derived from the catalog | `smoke.test.ts` "a dynamic route that serves files…" (fails without the fix) |
| B-1 experience-owned fonts and images | done | [ADR-028](adr/adr-028-experience-owned-fonts-and-images.md); `leaks.test.ts`; end-to-end run below |
| B-2 derived coverage | done; it found one real defect on its first run (Divya Chakshu's controls outside any landmark), fixed | [ADR-027](adr/adr-027-derived-page-coverage.md); `routes.test.ts`; browser suite |
| B-3 Beacon presentation | not built: no creative direction has called for it | — |
| B-4 Divya Chakshu sideways scroll | done. Cause: the passage halos bleed past the text, and `overflow-x: clip` on `<body>` propagates to the viewport, where they still counted as scrollable width. The clip moved to the text container. Captures before (production) and after show the same composition | `divya-chakshu.test.ts` "no sideways scroll from phone to desktop" at 320, 360, 768, 1024, 1280, 1440 px |
| C-1 brief and registry | done | [design/creative-process.md](design/creative-process.md), [design/registry/](design/registry/README.md) |
| C-2 design review gate | done as a **review**-enforced gate: contract 1.1, P0 and P7; the pull request template asks for the record | [ADR-030](adr/adr-030-creative-process-and-design-review.md) |
| C-3 review captures | done: `pnpm capture <id>`; run on Divya Chakshu locally and against production | `apps/site/scripts/capture.ts`, `capture.test.ts` |
| C-4 Seeing retrospective and new slice | **partly done, blocked on O3.** What was attempted, what worked, what the process got wrong and what is kept are recorded; the owner's reasons, the new brief and any slice are not | [record](design/registry/seeing.md) |
| D-1 scheduled smoke | workflow written; first run after merge | `.github/workflows/smoke.yml` |
| D-2 declared events | done: Divya Chakshu declares its four events; a test keeps `track()` calls and the catalog in step. `track()` is still a no-op | `platform.test.ts` |
| D-3 rollback drill | deferred (O6; recommended position, see A-1); steps written | [deployment.md](deployment.md#rollback-drill) |
| D-4 sitemap and robots.txt | done: built from `publicDiscoveryIndex()`; a preview's robots.txt disallows everything | `pipeline.test.ts`; `apps/site/src/pages/` |
| D-5 dependency and private-terms hygiene | done: Dependabot configured; the private-terms check documented as a local step before publishing a resume change | `.github/dependabot.yml`; [resume.md § Privacy check](resume.md#privacy-check) |
| D-6 editor stamping | **open (O2)**: still active | — |
| DOC-1 fold the audit into the standing documents | done | this file, the blueprint, the contract, `AGENTS.md`, the guides |
| DOC-2 Journal chapter "Ahead" | **open (O5)**: text proposed in `docs/reports/journal-ahead-proposed-text.md`, not applied | — |

**End-to-end proof for B-1 and B-2 (13 November 2026).** A throwaway experience with one imported WOFF2 and one CSS `url()` image, added with only a folder, a catalog entry and an index line: `pnpm typecheck`, `pnpm test`, `pnpm check` and `pnpm test:browser` passed with no other file edited, and the browser suite visited its page. Its preview build scanned as production failed `check:leaks` on both hashed assets ("is a copy of … which belongs to … (not released to production)"). With a temporary release entry, `pnpm check` passed with both assets in `dist/_astro/`, counted by the budget check (fonts 33.3 KB, images 79.3 KB). The experience and the release entry were then removed.

## Roadmap phases

From [blueprint § 11](blueprint.md#11-roadmap) (revision 3, accepted). A phase is `complete` only when its exit criteria pass.

| Phase | Status | Depends on |
| --- | --- | --- |
| 1 — Architecture and Experience Contract | **complete** (accepted 13 November 2026) | — |
| 2A — Creative process, registry, design review, captures | built in the reduced form of ADR-030; **exit criterion open**: one dry run recorded (waits for O3) | Phase 1 |
| 2B — Design Laboratory application | deferred by ADR-030 | two experiences through the capture-and-review loop, and a need |
| 3 — Independent experience prototypes | not started | Phase 2A's dry run; `main` protected (O1) |
| 4 — Control Center evolution | not started | Phase 3 |
| Identity and protected access; platform intelligence | not started, deliberately | triggers in blueprint § 11 |

## Decisions waiting for the owner

No architecture decision is open: D10, D11, D12, D14 and D16 were decided on 13 November 2026 ([blueprint § 12](blueprint.md#12-decision-register)).

Operational decisions keep the numbers ADRs cite ("tracker decision 5"). Decisions 2, 3, 4 and 7 are resolved (7 by ADR-029, pending action O1).

- **Decision 1 — Domain name.** Needed only for custom subdomains ([deployment.md § Custom domains later](deployment.md#custom-domains-later)).
- **Decision 5 — Repository visibility.** The repository is public; ADR-003 planned it private. Release state never made repository files private ([ADR-022](adr/adr-022-link-previews-smoke-and-public-repository.md)).
- **Decision 6 — Git history.** Earlier pushed commits contain text later removed ([resume.md § Privacy check](resume.md#privacy-check)); history has not been rewritten.
- **Audit F20 — Control Center cookie not port-scoped:** documented, acceptance pending ([apps/control/README.md § CSRF](../apps/control/README.md#csrf)).

## Deliberately not built

Each waits for its trigger; none is a failed task. Do not build one because it appears in the blueprint.

| Not built | Build when |
| --- | --- |
| Sign-in, OAuth, authorization, on-demand rendering, private content, grants, audit log, a deployed Control Center | the first content that must be shared with named people ([ADR-010](adr/adr-010-identity-later.md)) |
| Analytics, a privacy page, Speed Insights, error reporting | a stated question the data would answer, and a vendor and privacy decision |
| Content search, RSS, tag pages, a shared writing collection | far more experiences, or two experiences presenting one corpus (ADR-026) |
| A Design Laboratory application; Art Director and Experience Builder skills | the capture-and-review loop proves insufficient (ADR-030) |
| An experience scaffold or generator | adding an experience still takes more than a folder, an entry and a line |
| A shared component library or platform colour and type tokens | never by default ([ADR-007](adr/adr-007-presentation-ownership.md)) |
| Lighthouse or Web Vitals gates; visual regression as a CI gate | recorded regressions that a person missed |
| Archive redirects, budget overrides for fonts and images (G4), WebAssembly in the CSP (G5), transformed images (G3) | the first experience that needs each |
| Custom domain | a domain is chosen (decision 1) |

## History

Blueprint revision 2's Foundation tasks 1–15 and the engineering audit (findings F01–F23) are complete except where listed above. Task 16 ("first public release") was overtaken: the samples stay as fixtures (ADR-021) and analytics moved to the backlog. What each step learned is in [ADR-011 to ADR-030](adr/README.md); the full task-by-task evidence table, which ADRs cite as "tracker task N", is in this file's history (last at [commit `c7ec5cd`](https://github.com/Achchutan-S/orrery/blob/c7ec5cd/docs/tracker.md)).
