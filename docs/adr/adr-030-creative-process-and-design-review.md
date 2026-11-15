# ADR-030 — A creative process and a design review gate (contract 1.1)

Status: accepted (13 November 2026) · Delivers blueprint Phase 2A in a smaller form and defers Phase 2B · Amends the Experience Contract to version 1.1 · Written by an agent after the decision it implements; the owner accepts this text by merging the pull request that adds it

## Context

Every gate the platform had was technical. A History of Seeing (branch `feat/seeing`: an opening, nine chapters, 119 files) was reported green on every one of them and was rejected by the owner on aesthetic grounds; the only record of that is a commit message. Nothing had said beforehand what "good" meant, nothing stopped the work after one chapter, and nothing recorded why it failed. Blueprint revision 3 planned two methodology documents, two agent skills, an aesthetic registry and a local Design Laboratory application for this.

## Decision

1. **One process document**, [`docs/design/creative-process.md`](../design/creative-process.md): brief, references, competing directions, selection, a slice, slice review, build, final review.
2. **A registry**, `docs/design/registry/`: one record per experience, holding its brief, the directions considered (rejected ones included, with reasons) and its review records. Rejected work keeps its record.
3. **Two review checkpoints, decided by the owner alone.** A *slice review* of one representative screen or sequence before the rest is built; a *final review* before publishing. Each lists the brief's acceptance statements with yes or no, the reviewer, the date, the captures looked at and one outcome: approved, revise, or rejected. An agent may prepare a critique; it never records an approval.
4. **Contract 1.1** adds two publishing prerequisites to § 8.5: **P0**, an approved direction record exists before the bulk of the experience is built, and **P7**, a final design review is recorded as approved. Both are **review**-enforced, and say so.
5. **Evidence by `pnpm capture <id>`** (`apps/site/scripts/capture.ts`): the experience's pages at 360, 768, 1280 and 1920 px, in each colour scheme, with motion on and reduced, with a contact sheet. Ignored by Git; a review record names the capture set it looked at.
6. **No Design Laboratory application, no Art Director or Experience Builder skill.** Draft experiences in preview builds are already a place to look at a direction; the vendored `frontend-design` and `web-design-guidelines` skills remain tools. Phase 2B is deferred until the capture-and-review loop has been used on two experiences and found insufficient.

## Alternatives considered

- *Blueprint Phase 2A and 2B as written:* two skills and a second local application before the process has been used once.
- *A CI gate on design:* quality of this kind cannot be computed; pixel comparison on WebGL and font rendering is noise.
- *No gate, rely on the owner declining to merge:* that is what happened with Seeing, after nine chapters.

## Consequences

- A technically complete experience can be formally rejected, and the next attempt starts from the reasons.
- The gate is only as strong as the habit of using it. ADR-029 routes every release through a pull request whose template asks for the review record.
- Existing published experiences predate the process. Their records in the registry are reconstructions and say so; they are not retroactive approvals.
