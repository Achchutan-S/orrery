# Tracker

What is live, what is open, and what waits for a decision. Update it in the same change that alters any of them. An item is `complete` only when its acceptance evidence passes.

Evidence words, used only in this sense: **implemented** (the code exists), **locally verified** (tests and checks passed on the owner's machine), **committed** (in a pushed commit, named), **hosted CI passed** (a GitHub Actions run passed on that commit), **deployed** (the live site serves it), **manually verified** (a person checked it by hand). Nothing here is manually verified unless it says so.

## Live (checked 7 November 2026)

Production is https://orrery-teal.vercel.app, built from `main`. The latest commit, `0934115`, passed hosted CI (run 42386038962) and has GitHub commit status "Vercel: success".

| Experience | Production | Notes |
| --- | --- | --- |
| `index` | `/`, listed | the Index front page ([ADR-019](adr/adr-019-index-and-beacon.md)) |
| `journal` | `/journal` and 8 chapters, listed | the platform's history; chapter "Ahead" still describes blueprint revision 2's roadmap (owner's decision to update) |
| `resume` | `/resume`, its PDF and link-preview image, listed since 3 November 2026 | [resume.md](resume.md); certification title confirmation not recorded |
| `skills` | `/skills`, listed since 7 November 2026 | the Claude Skills Archive; [claude-skills/publication-decisions.md](claude-skills/publication-decisions.md) |
| `sample-content`, `sample-app` | listed | permanent fixtures: static essay; React-island regression fixture ([ADR-021](adr/adr-021-platform-integrity.md)) |
| `kawaiui`, `devxray` | listed links | external projects, never built here; subdomains wait for a domain |
| `canary-draft`, `sample-hostile` | never (404) | permanent test fixtures; never promote |
| Control Center | never deployed, by design | local only ([apps/control/README.md](../apps/control/README.md)) |

## Open work

| Item | Status | Where |
| --- | --- | --- |
| Manual accessibility checks (audit F12, decision 3) | **not performed** for any experience; automated checks pass, which is not proof | [accessibility.md](accessibility.md) |
| Hosted preview smoke run (audit F17) | not recorded; production smoke runs passed | [deployment.md § Smoke test](deployment.md#smoke-test-toolscheckssrcsmokets) |
| Editor `noteId` stamping (audit F18) | the notes extension is still on: it stamped this file when it was edited on 7 November 2026. `hygiene.test.ts` passes only while no stamped file is left; remove the front matter after every edit until the extension is off | turn the extension off for this folder |
| Divya Chakshu (`/divya-chakshu`) publication | **prepared, not committed** (8 November 2026): release entry published, public, listed in `config/release.json`; typecheck, unit and browser tests, `pnpm check` and the production build pass locally. Contract § 8.5 still open: **P2** manual accessibility check (not performed), **P3** hosted CI on the publishing commit, **P4** preview smoke test, **P6** the owner's commit. Not yet checked on a real GPU or phone | [README](../apps/site/src/experiences/divya-chakshu/README.md), [ADR-025](adr/adr-025-lazy-chunk-detection.md) |
| Phase 1 documents | contract 1.0, blueprint revision 3, the architecture review and ADR-024 are committed (`0934115`) and **not accepted**; waiting for the owner | [blueprint § 11](blueprint.md#11-roadmap) |

## Roadmap phases

From [blueprint § 11](blueprint.md#11-roadmap) (revision 3, proposed). A phase is `complete` only when its exit criteria pass.

| Phase | Status | Depends on |
| --- | --- | --- |
| 1 — Architecture and Experience Contract | drafted, amended and committed; waiting for the owner | owner acceptance and decision D10 |
| 2A — Design methodology, Art Director and Experience Builder skills, aesthetic registry, one dry run | not started | Phase 1 |
| 2B — Design Laboratory (local visual experimentation) | not started; nothing built | 2A; its location is its first decision |
| 3 — Independent experience prototypes | not started | 2A, 2B; the owner deciding D11, D12 and D16 |
| 4 — Control Center evolution | not started | Phase 3 |
| Identity and protected access; platform intelligence | not started | triggers in blueprint § 11 |

## Decisions waiting for the owner

Architecture decisions are in the [blueprint's decision register](blueprint.md#12-decision-register): D10 roadmap and phase labels, D11 experience-owned fonts and images, D12 derived accessibility coverage, D14 content ownership, D16 CI as a deployment gate.

Operational decisions keep the numbers ADRs cite ("tracker decision 5"). Decision 2 (committing audit Phase D) and decision 4 (link-preview images, ADR-022) are resolved; decision 3 (manual accessibility checks) is under [Open work](#open-work).

- **Decision 1 — Domain name.** Needed only for custom subdomains ([deployment.md § Custom domains later](deployment.md#custom-domains-later)).
- **Decision 5 — Repository visibility.** The repository is public; ADR-003 planned it private. Release state never made repository files private ([ADR-022](adr/adr-022-link-previews-smoke-and-public-repository.md)).
- **Decision 6 — Git history.** Earlier pushed commits contain text later removed ([resume.md § Privacy check](resume.md#privacy-check)); history has not been rewritten.
- **Decision 7 — CI as a deployment gate** (blueprint D16). Vercel builds `main` in parallel with CI and `main` has no branch protection. Until it changes, a passing CI run on a commit that publishes a new experience is checked by hand ([contract § 8.5](experience-contract.md#85-prerequisites-for-publishing-a-new-experience)).
- **Audit F20 — Control Center cookie not port-scoped:** documented, acceptance pending ([apps/control/README.md § CSRF](../apps/control/README.md#csrf)).

## History

Blueprint revision 2's Foundation tasks 1–15 and the engineering audit (findings F01–F23) are complete except where listed above. Task 16 ("first public release") was overtaken: the samples stay as fixtures (ADR-021) and analytics moved to the backlog. What each step learned is in [ADR-011 to ADR-023](adr/README.md); the full task-by-task evidence table, which ADRs cite as "tracker task N", is in this file's history (last at [commit `c7ec5cd`](https://github.com/Achchutan-S/orrery/blob/c7ec5cd/docs/tracker.md)).
