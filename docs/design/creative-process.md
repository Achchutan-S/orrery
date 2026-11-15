# Creative process

How an experience gets from an idea to something worth publishing. The [Experience Contract](../experience-contract.md) says what an experience must satisfy; this says how its look and feel are decided, checked and, when necessary, rejected ([ADR-030](../adr/adr-030-creative-process-and-design-review.md)). Records live in the [registry](registry/README.md).

**Why this exists.** A History of Seeing passed every engineering check and was rejected for how it looked ([record](registry/seeing.md)). Nothing had said in advance what it should look like, and nine chapters were built before anyone judged one. A green test suite says an experience works. It says nothing about whether it is any good.

**Who decides.** The owner approves directions and reviews. An agent can research, propose directions, build, capture and write a critique. An agent never records an approval, and never records a person's review that the person did not make.

## The steps

| # | Step | Produces | Who |
| --- | --- | --- | --- |
| 1 | **Brief** | The brief in the experience's record: one page, the template's fourteen sections | owner, or an agent's draft the owner edits |
| 2 | **References** | In the brief: each reference with one sentence on what is taken from it | anyone |
| 3 | **Directions** | Two or three genuinely different directions, each a paragraph and, where it helps, a rough static sketch | anyone |
| 4 | **Selection** | One direction chosen, the others kept in the record with why they lost. The brief's acceptance statements are final from here. **Contract P0** | owner |
| 5 | **Slice** | One representative screen or sequence, built for real as a draft experience, to the contract | builder |
| 6 | **Slice review** | A review record. Approved, revise or rejected | owner |
| 7 | **Build** | The rest of the experience. Only after an approved slice | builder |
| 8 | **Final review** | A review record against the whole experience. **Contract P7** | owner |
| 9 | **Publish** | The remaining prerequisites of [contract § 8.5](../experience-contract.md#85-prerequisites-for-publishing-a-new-experience) | owner |

Nothing substantial is built before step 6 passes. If the slice is rejected, the cost is one screen.

## Writing a brief

Keep it to one page. Every section is a decision with a reason, not a mood. "Warm and elegant" is not a decision; "body text in a wide old-style serif at 19 px or more, because the visitor reads for ten minutes" is.

- **Choose the slice before building.** It is the part where the idea is most at risk: usually the first viewport and the first moment the experience does the thing only it does.
- **References are specific.** A film title sequence, a book's page, a museum wall, a poster. Say what is borrowed: the pacing, the margin, the palette, the way type meets image. Link to them; do not commit third-party images unless their licence allows redistribution ([contract § 3.6](../experience-contract.md#36-experience-owned-assets-and-fonts)).
- **Say what it must not be.** The defaults an unbriefed build drifts to are known: a centred headline over a gradient, a grid of cards, an interchangeable hero, rounded panels with soft shadows, a display typeface chosen because it is available. Name the ones this experience must avoid, and any that are specific to its subject.
- **Motion, WebGL and sound are choices, not quality.** State what each is for. An experience may need none.
- **Typefaces and images are the experience's own** ([ADR-028](../adr/adr-028-experience-owned-fonts-and-images.md)). A system font stack is a decision to be justified, not a default.
- **The Beacon.** Say where it sits and whether its default look fights the design. If it does, that is the trigger for the Beacon presentation mechanism (contract gap G1); record it rather than restyling the Beacon.

### Acceptance statements

The brief ends with five to ten statements a reviewer can answer yes or no by looking at a capture or the running page. They are the standard the reviews use. Good statements are observable:

- "At 360 px the title and one full line of body text are visible without scrolling."
- "No surface on the page is a card: no bordered or shadowed rectangle groups content."
- "Sanskrit is set in a Devanagari face at least as large as its translation."
- "With motion off, every sequence still reads as a composed picture, not as a blank background."
- "A reader shown the first viewport with the title covered could tell which experience this is."

Statements a reviewer cannot answer ("feels premium", "is immersive") do not belong.

## Review

Two checkpoints, same form. The record goes in the experience's registry file.

1. Run `pnpm capture <id> --label <slice-1 | final-1>` and open the contact sheet (§ Evidence). Look at the running page too, on a real phone and a real GPU when the experience uses motion or WebGL.
2. Answer every acceptance statement yes or no. A "no" needs a sentence.
3. Record the outcome:
   - **Approved:** the build continues (slice) or the experience may be published once the other prerequisites are met (final).
   - **Revise:** named changes, then another review. The label counts up (`slice-2`).
   - **Rejected:** the reasons, sorted into *brief* (it was never said), *direction* (the idea was wrong) and *execution* (the idea was right and the rendering weak), and what the next attempt must do differently. The record stays in the registry; the code stays a draft or is removed. Rejection is a normal outcome, not a failure of the process.
4. The reviewer is a person, named, with the date.

An agent's critique is useful input: it can check each statement against the captures and point out drift from the brief. It is recorded as a critique, under its own heading, and is never the outcome.

## Evidence

```sh
pnpm capture <id>                       # every page of the experience, from a local preview build
pnpm capture <id> --label slice-1       # a named set, kept beside earlier ones
pnpm capture <id> --url https://<preview> --paths /x,/x/y   # a deployed preview instead
```

Writes `apps/site/test-results/capture/<id>/<label>/`: for every page, the first viewport and the full page at 360, 768, 1280 and 1920 px, in each colour scheme the experience offers, with motion on and reduced, plus `index.html`, a contact sheet that opens offline. Git ignores the folder; nothing is committed. A review record names the label it looked at and the commit it was captured from, so the set can be regenerated.

Captures are review aids, not proof. Headless Chromium draws WebGL with a software renderer and does not show real frame rates, real font rendering on other systems, or how a page feels to scroll.

## What this is not

- Not a theme, a component library or shared tokens. The process produces one experience's direction; it never becomes a look the platform imposes ([ADR-007](../adr/adr-007-presentation-ownership.md), blueprint D1–D3, D9). The catalog never references a record.
- Not a Design Laboratory application (blueprint Phase 2B, deferred by ADR-030).
- Not a CI gate. The reviews are enforced by the owner, at the pull request that publishes ([ADR-029](../adr/adr-029-ci-as-the-release-gate.md)).
