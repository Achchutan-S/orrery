# Scraps — direction record

Experience id: `scraps` · Status: published on the owner's instruction of 16 November 2026; a permanent Orrery experience (see [The permanent contract](#the-permanent-contract) and [The owner's fourth instruction](#the-owners-fourth-instruction-16-november-2026))

**How this record came to be.** Scraps is the second attempt at one commission: a place that makes people want to think and make things. The first, [Soundings](soundings.md), was rejected by the owner on 16 November 2026 as "too abstract, too complicated, too emotionally distant". The owner's second instruction, the same day, asked for a different interpretation, built as a functioning first version without approval at each decision. That is why a whole first version exists before any review. It is not an approval: no review the [creative process](../creative-process.md) requires has been held, and contract P0 is unmet. The experience is an unreleased draft.

## The permanent contract

Scraps is a permanent Orrery experience: maintained and improved, never replaced. Any change to it is held to these eight rules. A change that breaks one is rejected, however good it looks.

1. **It stays.** Scraps is not an experiment to retire. It is improved in place.
2. **Its identity is physical paper, spontaneity and personal expression.** A cutting mat, scraps of coloured paper, a jar, a drawer, a pencil. It is not a notes application, a productivity tool, a task manager, a dashboard or an AI writing assistant, and nothing is added that would make it read as one.
3. **New things deepen the one object.** There are only scraps. A new capability is something else you can do to a piece of paper (or that the place can do with your paper), never a new kind of thing with its own screen, type or setting to learn.
4. **Fewer, findable things beat more things.** Before adding, ask what can be removed or folded into something already there. The hand's first two buttons and the table's four tools are not added to lightly.
5. **What a person made is kept.** Every scrap, copy file and letter link made by any released version opens in every later one. The rules for changing what is stored are in the [README](../../../apps/site/src/experiences/scraps/README.md#changing-what-is-stored), and frozen files from past formats are tested on every run. Nothing with words on it is destroyed by one press.
6. **Accessibility and performance are part of the design.** Keyboard for every gesture, a name for every control, AA contrast on every mat, no motion for those who ask for none, 44 px targets, 320 px reflow; and the `interactive` budget as it stands. A change that cannot meet these is not finished.
7. **No manufactured dependency.** No streaks, scores, counts shown as achievement, notifications, reminders, scarcity, feeds, followers or comparison. Nothing plays, moves or asks unless the visitor just did something. No AI writes for the visitor. Refused, not deferred.
8. **The core is not a test bench.** Saying something, picking it up, turning it over, the drawer, and the saving underneath them are the stable core. Anything experimental sits beside it, can be removed without touching stored scraps, and never ships if it makes the core less reliable.

## Brief

1. **Subject and thesis.** A table for whatever you have got. Its claim: people will say more when what they say is immediately made into something worth keeping. So a sentence becomes a small typeset piece of coloured paper the moment it is said, and everything else is something you do to paper.
2. **Audience.** Someone with nothing to say; someone with an idea and no notion how to develop it; someone who writes often. None of them is asked to learn a model first: everything on the screen is paper on a table.
3. **The one thing.** "That looked good, and I made it." Pride in something small, within ten seconds.
4. **References.**
   - Matisse's paper cut-outs (see [Tate's introduction](https://www.tate.org.uk/art/artists/henri-matisse-1593/matisse-cut-outs)): flat saturated shapes, cut edges, no modelling. The palette and the icons come from here.
   - A self-healing cutting mat: the dark green ground and its grid, which make coloured paper look brighter and say "work happens here".
   - Letterpress job printing and gig posters: one sentence set large in one or two faces as a finished object. The five "looks" come from here.
   - A pencil note left on a workbench: how the place itself speaks, as opposed to how your words are set.
5. **Must avoid.** Anything that needs decoding (the first attempt's failure); a corkboard of identical yellow sticky notes; a wooden-desk photograph or any photoreal texture; rounded cards with soft shadows; a sidebar, a document list, a dashboard, a chat panel; counts presented as achievement; any sentence that tells the visitor how to think.
6. **Typography.** Three voices, one face each, all SIL OFL 1.1 and committed in `fonts/` with their licences (latin subsets from Fontsource 5.x): **Bricolage Grotesque** (variable, 200–800) shouts: the name, posters, buttons, headings. **Fraunces** (variable weight, upright only) reads: the softer looks and all long writing, at 19 px on 1.68 leading in a 66-character column. **Kalam** (400) is the place's pencil: every word the studio says to the visitor. The visitor's own words are never pencil unless a look chooses it. No italics exist: Fraunces italic would break the 110 KB font budget (100 KB used), so quotations are marked with a rule.
7. **Colour.** One scheme; paper has no dark mode. Mat `#1d4a3a` with grid `#28594a` / `#32705b`. Papers and inks: cream `#fff5e1`, mustard `#f5bd3d`, tomato `#ee5a3a`, pink `#f6a6c1`, sky `#a5d6e8` (each with ink `#1c1814`), cobalt `#2c4fd0` (with cream). The writing page is `#fdf8ec` with ink. Every pair passes WCAG AA. Colour never carries meaning: which paper a scrap gets is play, not category.
8. **Composition.** The mat fills the viewport and does not scroll. Scraps lie where they are put, slightly turned, overlapping like real paper; the most recently touched is on top. Fixed points: the name (a scrap) top-left, the drawer's handle top-right, three tools bottom-left, a paper strip to type on bottom-centre. The table holds twelve piles (six on a phone); the oldest slide into the drawer. Nothing is a card: no rounded corner and no blurred shadow anywhere; shadows are hard offsets, like paper lifted off a mat.
9. **Imagery.** None committed. Three icons (a jar of sparks, a pencil, a sheet) and a paperclip, drawn as flat SVG shapes.
10. **Motion.** Each motion is paper doing what paper does, in answer to an action: a new scrap lands from the strip (0.55 s); a picked-up scrap comes to the hand; a spark slip unfolds; the sheet turns over; the drawer slides. A scrap found again on return wiggles three times. With reduced motion everything is simply in place.
11. **Sound.** None.
12. **Phone, tablet, desktop.** Phone: the strip moves to the top, under the name, so the keyboard never covers it and scraps land from above; scraps are 9.5 rem instead of 13; the table holds six; tool labels shorten to one word. Desktop: typing with nothing focused goes to the strip; the writing page gets a margin beside it from 76 rem. Everything in the hand is one centred column on both.
13. **Beacon.** Bottom-right, default presentation; the strip and tools stay clear of it. Its dark capsule sits acceptably on the dark mat.
14. **Acceptance statements.**
    - [ ] On a first visit at 1280 px, without scrolling: one scrap of paper with a friendly sentence, a strip to type on with a pencilled hint, and three tools with pencilled names. No paragraph of instructions anywhere.
    - [ ] Typing a sentence and pressing Enter, with no click first, puts a typeset coloured scrap on the table within a second.
    - [ ] Six different sentences produce scraps that do not all look alike: at least three different compositions and three different papers.
    - [ ] A scrap in the hand offers "Give it a new look", and five presses show five different compositions of the same words.
    - [ ] Nothing on any screen is a rounded card, a blurred shadow or a gradient.
    - [ ] Every sentence the place itself says is in pencil, and none of it contains "should", "must", "streak", "score" or a count presented as an achievement.
    - [ ] The writing page shows no colour except paper, ink and one rule for quotations, and a line of body text holds 60 to 75 characters at 1280 px.
    - [ ] At 360 px the strip, at least one whole scrap and the three tools are visible without scrolling, and nothing scrolls sideways.
    - [ ] A person who has never seen it can say what the three tools do before pressing them.

**The slice.** The first ten seconds: the first visit, one sentence typed, the scrap landing, picking it up and giving it a new look. If a typeset scrap does not make someone want to type a second sentence, nothing after it matters. It was built first and not reviewed before the rest (see the note at the top).

## The owner's third instruction (16 November 2026)

After the first version the owner gave a third instruction, the same day. It is quoted here because it is the only thing a person has said about Scraps; it is **not** a direction approval or a review under the [creative process](../creative-process.md), and contract P0 stays unmet until the owner records one.

> "The current version has a soul: the cutting mat, paper scraps, sparks jar, drawer, clipping, doodling, long-form writing and tactile visual language. […] The current concept is the foundation, not something to replace. […] Do not merely make Scraps more feature-rich. Make the experience of being inside Scraps extraordinary."

It asked for the existing experience to be preserved and deepened in four stages (foundation, immersion, discovery, connection), without approval at each decision, and for the experience to stay unreleased. What was built in answer, and where it departs from the brief above:

| Brief item | As first written | Now |
| --- | --- | --- |
| 7. Colour | One scheme | Still one paper palette. The mat can be green (the default), blue, plum or slate: the visitor's choice in "your studio". Every mat was checked by axe with the whole table on it |
| 8. Composition | Scraps of one size | Paper comes in three sizes and can be tilted, taped down (it then never slides into the drawer) and given a gold star. Tools: four (a picture joins the jar, the pencil and the sheet). The table is its own layer under the tools |
| 9. Imagery | None | The visitor's own pictures, shrunk in the browser to at most 900 px and kept as data. A fourth icon (a photograph) in the same flat cut shapes |
| 10. Motion | Paper doing what paper does | Unchanged, plus one new motion: the writing page's bar slides away while typing and returns with the pointer. "Keep everything still" in the studio turns all of it off, whatever the device says |
| 11. Sound | None | Optional paper noises, **off until asked for**, synthesised in the browser (no audio files). They approximate paper; nobody has judged whether they sound like it |
| 12. Phone, tablet, desktop | Two layouts | A third, between 48 and 72 rem: the tools stand on the strip instead of beside it |

**Engagement, on purpose.** Nothing counts, scores, streaks, notifies or reminds. Rediscovery is one slip that can be dismissed with one press. The jar never opens itself. Sound is off by default. Every mechanism added answers "yes" to the six questions in the owner's § 11, or it was not built; the ones refused are listed in the README under "Not built".

**Further acceptance statements** (drafted by the agent; unreviewed):

- [ ] Twenty pulls of the jar give at least five different kinds of spark, each named in pencil on its slip, and once there are scraps on the table some sparks are made from them.
- [ ] After typing one sentence on the back, nothing is on screen but the page and the mat; moving the mouse brings the bar back.
- [ ] Anything binned can be found again in the drawer for thirty days, and Ctrl or Cmd+Z takes back the last thing done on the table.
- [ ] A pile sent as a zine opens for its reader as "For (name)", in order, signed, with one button that keeps it and offers to write back.
- [ ] No screen shows a count presented as achievement, a streak, or a reminder.
- [ ] With sound on, no sound plays that was not caused by something the visitor just did.

## The owner's fourth instruction (16 November 2026)

The owner's decision to keep and publish Scraps, in the owner's words. It is the authority for publishing; it is recorded as what was said, and not as a slice review or a final design review held under the [creative process](../creative-process.md), because neither was held as such.

> "Scraps is an existing creative experience at `/scraps`. Scraps 3 has been built and verified as an unreleased draft. Its creator loves the experience and has explicitly decided that Scraps should remain a permanent part of Orrery, continuously maintained and improved over time. […] Make Scraps better without making it less like Scraps. […] Ensure `/scraps` is included in the public production release."

What that leaves open against contract § 8.5, said plainly: **P0** (no slice review was held before the bulk was built; the owner's decision came after the whole was built) and **P7** (no review naming captures and devices) rest on this instruction alone. **P2** (a person running the manual accessibility checklist) has not been done by anyone and is open in the [tracker](../../tracker.md). The same was true of Divya Chakshu when the owner published it.

What changed in answer, all within the contract above: a carried scrap lifts and the pile beneath shows it will take it; ordinary words are never broken across lines; the line being written stays clear of the window's bottom edge; the jar does not repeat itself and pairs unlike scraps; an addressed letter waits in an envelope for its reader to open; a zine can have a name and numbers its pages; tearing up takes two presses; the drawer has "around now, other years" and says when a copy was last kept; a database or copy from a later version is never mistaken for an empty one. One claim in the brief above was false until this pass: item 10 said "with reduced motion everything is simply in place", and nothing in the stylesheet did that. It does now, and a test holds it.

## Directions considered

Scored by the agent against the owner's eight criteria (warmth, immediate comprehension, originality, visual distinctiveness, desire to explore, willingness to create, long-term pull, quality of the creative interactions).

| Direction | The idea | Outcome | Why |
| --- | --- | --- | --- |
| A — Paper table | Whatever you say becomes a typeset scrap of coloured paper on a cutting mat; you pick up, restyle, doodle on, turn over, clip together | built (not approved) | Nothing to decode: paper on a table. The reward is instant and is the visitor's own words looking good. Warm by material. Depth comes from doing more to the same object |
| B — Cabinet of instruments | A shelf of odd creative machines (a sentence stretcher, an opposite-maker, a collage box), each its own toy | not built | Delightful for a minute and then a menu: every instrument has to be learned, and what you make in one does not live anywhere |
| C — Curiosity doors | Every thought opens doors to questions, each question to more | not built | It instructs: the place does the thinking and the visitor follows. Also the first attempt's problem in a new coat: a structure to understand |
| D — Living room | An illustrated room that fills with objects as you make things | not built | Warm, but the room is decoration around an ordinary editor, and it needs illustration this repository cannot source honestly |
| E — Sea chart (Soundings) | Thoughts as islands | **rejected by the owner** | [Its record](soundings.md) |

Direction approved by: the owner, by the instruction of 16 November 2026 quoted above (given after the experience was built, not at a direction review).

## Reviews

No slice review and no final design review was held under the creative process. The owner's two statements about the built experience are quoted under the third and fourth instructions above; they are the owner's decision to keep and publish it.

### Agent critique (never an outcome)

Prepared by the building agent on 16 November 2026 from headless Chromium screenshots at 1440, 1280 and 390 px of the preview build. No person has reviewed this, and no real phone or GPU was used.

- **Likely to hold.** The first typed sentence landing as a poster is the strongest ten seconds either attempt produced. Looks differ enough to feel like a toy. The place's pencil voice and the visitor's typeset voice never get confused. The writing page is calm.
- **Weak.** (1) A first visit is one scrap on a large green field: friendly, but emptier than it should be for someone with nothing to say; the jar is the answer and it is small. (2) Scraps land where there is room, which on a phone can still mean on top of each other. (3) The platform focus ring frames the writing field in amber and black while typing (ADR-013); padded, still a frame. (4) Headings show their `#` while writing and are typeset only in "Read it back". (5) Clipping by dragging is discoverable only by accident or through "Clip it to another". (6) Long sentences in the cut-out look fall back to a rounded rectangle and are the least handsome combination.
- **Unknown.** Whether dragging paper feels good on a real phone; whether twelve piles is the right size of table; whether "the drawer" is found without being told.

**After the third instruction** (the same agent, 16 November 2026, headless Chromium at 320, 375, 768, 1024, 1280 and 1440 px; still no person, no real phone, no ears):

- **Likely to hold.** The jar is now the best reason to come back: an odd pair made from two of your own scraps is the most surprising thing the place does. The zine received as "For Mira … from Ash" is the first screen that feels made for someone. The writing page with the bar gone is calmer than before.
- **Weak.** (1) "More to do with it" is a second row of eight pencilled actions: honest, but a list, and the hand now offers sixteen things. (2) The picture scrap is a plain bordered photograph; it does not yet get the five looks words get. (3) The platform focus ring still frames the writing field (ADR-013). (4) Short words can still break mid-word in the cut-out look ("strin/g"). (5) The four mats were chosen for contrast, not looked at by anyone. (6) A zine's pages are the scraps one after another: reading order, not a designed spread.
- **Unknown.** Whether the sounds are pleasant or irritating: they were never heard. Whether the bar leaving while typing feels like calm or like something going missing. Whether sealing is used.
