# Divya Chakshu — direction record

Experience id: `divya-chakshu` · Status: published 8 November 2026 (`b9555cc`), before the creative process existed; reconstructed from the built experience and its [README](../../../apps/site/src/experiences/divya-chakshu/README.md). **No design review has been recorded.**

## Brief (reconstructed from the code)

1. **Subject and thesis.** Bhagavad Gita chapter 11: Arjuna asks to see Krishna's universal form and is given divine sight. Krishna does not make himself smaller to be seen; he changes how Arjuna sees.
2. **Audience.** Not recorded.
3. **The one thing.** Not recorded. The page's own framing: verses carry their numbers; everything else is narration, an interpretation, not scripture.
4. **References.** Not recorded.
5. **Must avoid.** Not recorded. One rule is visible in the stylesheet: "a soft local shadow behind every passage, not a card: the image stays continuous."
6. **Typography.** System stacks only, because decision D11 was open: a Didone (Didot, Bodoni) for monumental lines, an old-style serif for reading, a Devanagari face for Sanskrit, a quiet sans for controls and notes. What a visitor sees therefore depends on their system. D11 is now decided ([ADR-028](../../adr/adr-028-experience-owned-fonts-and-images.md)); owning these faces is an open option, not a commitment.
7. **Colour.** A sequence of palettes across nine sequences: dust and aged gold, indigo and molten light, cosmic gold and crimson, ember, the cold gold of the wheel of time, a lamp, a peacock morning. Dark throughout.
8. **Composition.** One continuous scroll of beats, each close to a full viewport, text centred or as marginalia over a fixed full-screen image.
9. **Imagery.** Generated: six full-screen WebGL2 fragment programs and four point programs; one composed CSS still per sequence as the first paint and the fallback. No photographs or illustrations.
10. **Motion.** Scroll position drives the scenes. Reduced motion: one still frame per beat. A pause control stops scene time.
11. **Sound.** A synthesised soundscape (noise, a plucked drone, FM bells), off until the visitor turns it on.
12. **Phone, tablet, desktop.** One column on phones with controls reduced to icons. No sideways scroll from 320 to 1440 px (tested since 13 November 2026; before that, the passage halos added 90 px of scrollable width at 768 px in production).
13. **Beacon.** `chrome: 'beacon'`; default presentation, bottom inline end, beside the experience's own control bar at bottom inline start.
14. **Acceptance statements.** None were written.

## Revision of 13 November 2026

**The owner's observations** (their words, after looking at it locally):

- "Why does the landing page now have a needless glitter? … it's all good after the 1000 suns phase; before that the flittery part is there."
- "The chariot could have been better as well; now it's all hazy, both landing page and the chariot."
- "Scrolling it back isn't going to how things were; it's only now one way for the chariot."
- "The representation of God can be more spectacular in the IV phase, the universe within. It's good now, but it's inside a circle of glow in the middle; it becomes more visually immersive when wonder becomes terror."
- In the brief that followed: the moths' transition is disconnected; "I am Time" looks grainy; the friend and the infinite could be stronger.

**What was found** (captured at 39 positions on a real GPU before changing anything):

| Observation | Cause |
| --- | --- |
| Glitter, grain | Every scene added noise of nearly three 8-bit levels, re-rolled each frame, drawn at half resolution and stretched. On the opening, 2,400 additive dust points also drifted over the plain from the first scroll, although they exist for divine sight. On the wheel of Time, 4,000 sparks. |
| Haze | The canvas started at one pixel per CSS pixel and could rise only when a frame took under 14.5 ms, which a 60 Hz display never reports: a 2× screen was drawn at half its resolution for good. The chariot also carried a wide glow around its whole outline. |
| One-way | Divine sight was a timer started by its button and never cleared, so the bent world and the small chariot stayed after scrolling back. |
| A circle of glow | The form's rim was a fixed radius; only terror widened it. |
| Moths disconnected | The form faded to a flat orange wash, and moths appeared in a ring around a small flame with nothing leading to it. |
| Time's smears | Each ring's marker was a soft blob a twentieth of the screen wide, and the hand dragged a filled wedge. |

**What changed.** The opening has a low horizon under a tall sky and nothing drifting in it; the chariot is redrawn (a team of four, an eight-spoked wheel, a domed canopy, the charioteer and the archer) as a dark figure with an edge of light and a cast shadow; divine sight is read from the scroll position; the small world has a skin of air. The universal form is first seen whole, then its rim leaves the frame and the reader is inside it, with the light at its heart and the near rings in shadow. At 11.29 the burning form draws in to one point, the flame is lit there, and the moths come in from beyond the frame on the rivers' spiral. Time's markers are small bodies and its hand a line. The friend's lamp has ground under it. Asked to be gentle again, the form recedes to a disc seen from outside before it folds into the feather. The thousand suns are untouched apart from resolution.

**Status: implemented by an agent, not reviewed.** Captures before and after exist for all 39 positions (ignored by Git; regenerate with `pnpm capture divya-chakshu`). No slice or final review has been recorded; the owner looks next.

**Statements a review could use** (drafted, not approved):

- [ ] Nothing on the opening or the plain flickers or drifts before divine sight.
- [ ] The chariot reads as horses, wheel, canopy and two figures at a glance, at 360 px and at 1440 px.
- [ ] Scrolling from the thousand suns back to the chariot shows the plain as it first was.
- [ ] At "Not in front of him. Within him." no edge of the form is visible in the frame.
- [ ] The flame of 11.29 stands where the burning form drew in, and no moth appears from nowhere.
- [ ] On the wheel of Time no mark is a smear and nothing crawls.
- [ ] The friend's scene has one light.

## Amplification of 15 November 2026

The owner asked for the strongest discoveries of the two exploration labs (scratch, outside the repository) to be added to the experience without removing anything. Added, by an agent, not yet reviewed:

- **Recognition (lab 2, experiment 2).** Bhishma, Drona and Karna are shown and labelled in the ranks in sequence I, and the same three stand among the teeth when the two armies become the jaws in sequence V.
- **The world is watching (experiment 1).** In sequence II the plain's surface becomes eyes before the great eye opens.
- **The whole universe in one place (experiment 4).** Between the thousand suns and the universal form, a small world over the plain holds every army and the sky in one point; the view flies into it and the form unfolds from it.
- **The sun and moon are eyes (experiment 5).** At 11.19.
- **The turn (experiments 2 and 5).** At 11.51 the charioteer looks back.

Left out on purpose: the real-time death counter (experiment 3), whose tone is the owner's decision; the field of eye-and-flame bodies (lab 1); the scroll lock (lab 1); the first-person faces (rejected in the lab).

**Statements a review could use** (drafted, not approved): the three names are legible on the plain and among the teeth at 1440 and 390 px; the eyes in sequence II open away from the pointer and then look at it; the small world in the sky is visible above the title of sequence IV; no grey frame between the white and the form; nothing earlier in the experience is missing.

## Directions considered

Not recorded.

## Reviews

None recorded. Open before any claim of quality: the manual accessibility checklist (section F in [accessibility.md](../../accessibility.md)), and a look on a real GPU and a real phone, which has never happened (the README says so).

### Agent critique (13 November 2026; never an outcome)

Observations from the audit, for whoever reviews it:

- The title fades in: a capture taken at the instant of page load at 360 × 740 shows the scene and controls with no text; one taken 1.5 s later shows the title. Check on a phone that the wait does not read as an empty page.
- In the 768 px capture the legend under "Enter the experience" ("Verses carry their numbers…") sits left of the centred title block rather than under it. Intended or not is the owner's call.
- The default Beacon is a dark pill with a mint accent beside a gold-on-night control bar. Whether that fights the design is the owner's call; if it does, it is the first real case for the Beacon presentation mechanism (contract gap G1).
- Statements a final review could use, drafted from the built experience and **not approved**: every verse shows its number; Sanskrit is never smaller than its translation; with motion off each sequence is a composed picture; no passage sits in a bordered or filled panel; the title is legible over the first still at 360 px.
