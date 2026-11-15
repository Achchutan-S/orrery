# A History of Seeing — direction record

Experience id: `seeing` · Status: **rejected** by the owner (commit `441e642`, 12 November 2026: "seeing tried but should be better"). Lives only on branch `feat/seeing`, shelved, never merged, never in production.

This is a retrospective, written after the fact from the branch and its README. The experience had no brief and no review; this record exists so the next attempt does not repeat it.

## What was attempted

An atlas of how people have learned to see: 17 art and design movements, 7 interior aesthetics and 22 internet aesthetics planned; an opening (a camera obscura), nine chapters built (Gothic, Renaissance, Art Nouveau, Bauhaus, Brutalism, Wabi-sabi, Cyberpunk, Frutiger Aero, Weirdcore), a ten-way "Reframing the world" room, a map of sourced relationships, five comparison pages, a lab and a sources page. The stated direction, from its README:

- **Thesis.** The world changes when the way we look at it changes.
- **Continuity.** One element, the aperture, carried across pages by View Transitions; each chapter decides what it is.
- **Three reading modes.** Encounter, Understand, Study.
- **Each chapter in its own visual language**, with its own typefaces (25 font files from 13 families) and palette.

## What worked technically

- 119 files; build-time SVG, CSS `:has()` interactions that work without JavaScript, raw WebGL2 for two scenes, no npm dependencies.
- Reported locally green on typecheck, unit tests, browser tests and `pnpm check` (the branch's own tracker row; not re-run, the branch has no hosted CI run).
- Sources, fonts and images each have a record with a licence; tests fail on a missing one.
- It was the first experience with its own fonts and images, served through file routes.

## Why it was rejected

**The owner's reasons are not yet recorded.** The repository holds only the commit message. Asked on 13 November 2026:

1. What looked generic or wrong (typography, colour, composition, imagery, motion, pacing)?
2. Was the idea wrong, or was the idea right and the rendering weak?
3. Did any chapter or screen work?
4. What quality or feeling was missing?
5. One or two references that have what it lacked.

When answered, sort the reasons here into **brief**, **direction** and **execution** failures ([creative process § Review](../creative-process.md#review)).

## What the process got wrong (from the repository's evidence, not the owner's taste)

- **Nothing said what good meant.** No brief, no references, no acceptance statements. The README's "Direction" section was written alongside the build.
- **Breadth before depth.** Nine chapters "each art-directed on its own" were built before any one was judged. Nine visual languages at once is nine experiences' worth of art direction.
- **Engineering evidence stood in for quality.** Every recorded check is a test or a budget. None is a person looking at a screen against an intention.
- **The text was a placeholder.** The README calls all chapter text "draft … none of it comes from the owner's earlier narration". The design was judged around words that were not the real ones.
- **No checkpoint.** The first recorded judgement came after everything was built.

## What is kept

- Four tooling fixes, ported to `main` by hand (smoke test: WebP media type, no query-string probe on file routes, and their test; Control Center browser test: first row derived from the catalog).
- The lesson behind [ADR-028](../../adr/adr-028-experience-owned-fonts-and-images.md): experiences need real typefaces and images without a workaround.
- The branch itself, as reference. Nothing else is merged.

## The next attempt

Blocked on the owner's reasons above; a brief written without them would guess at the owner's taste. What is already fixed by the process:

- It starts from a brief using [`_template.md`](_template.md), in this file, with acceptance statements.
- The slice is **one chapter and its first viewport**, with the owner's real text for that chapter. Not the opening plus nine chapters.
- Nothing else is built until the owner approves the slice review.
- The owner decides after the slice whether to continue, revise or stop.

## Directions considered

None were recorded before the build. The built direction is described above and is rejected.

## Reviews

### Final review 0 — 12 November 2026 (reconstructed)

- Reviewer: the owner
- Captures: none kept
- Acceptance statements: none existed
- **Outcome:** rejected
- Reasons: "seeing tried but should be better" (commit message). Detail pending, above.
