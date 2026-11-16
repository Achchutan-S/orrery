# Soundings — direction record

Experience id: `soundings` · Status: **rejected** by the owner on 16 November 2026 (see Reviews); the code is an unreleased draft, kept until the owner says to remove it

**How this record came to be.** On 15 November 2026 the owner gave one written instruction for a new creative environment: explore concepts, choose one, and build a functioning first version without stopping for approval at each decision. That instruction is the reason the whole first version exists before any review. It is not an approval of the brief, the direction or a slice: none of the reviews the [creative process](../creative-process.md) requires has been held, and contract P0 is unmet. The experience is an unreleased draft. If the owner rejects it, the record of why belongs under Reviews.

## Brief

1. **Subject and thesis.** A place to think in fragments. Its claim: people do not think in documents, so the unit is a single mark (a sentence, a question, a link, a drawing) and writing at length is something a mark grows into, not where it starts.
2. **Audience.** Anyone with a half-formed thought: a student, a scientist, someone who cannot yet say what they feel. They know how to type one sentence. They are not asked to know anything else.
3. **The one thing.** "What I put down became something, and I can see it." A visitor who typed one sentence should leave having seen it become land, and wanting to see what a second one does.
4. **References.**
   - [Admiralty and NOAA nautical charts](https://www.charts.noaa.gov/) (public domain for NOAA): the palette (pale water, bluer shoals, buff land, black engraving, magenta for what was added later), the depth contours around land, and the lettering convention that land is upright and water is italic.
   - [Swisstopo national maps](https://www.swisstopo.admin.ch/en/national-maps): contour lines as the only relief, and a typographic halo so a name reads over any ground.
   - A ship's log: one chronological list beside the chart, written in plain sentences.
   - A printed essay page (Literata was designed for long reading on screens): the measure, leading and margin notes of the writing page.
5. **Must avoid.** A document list with a sidebar; a dashboard; a grid of rounded cards; a chat panel; a blank page with a toolbar; an antique "treasure map" (parchment, burnt edges, a script face); a night sky of glowing nodes joined by lines; streaks, counts as scores, or anything that reports how little was written.
6. **Typography.** One family, Literata (variable, SIL OFL 1.1, Google Fonts' latin subset from `@fontsource-variable/literata` 5.3.0, committed in `fonts/` with its licence). Upright 650 for marks written at length, italic 400 for captures, questions adrift and everything the chart says. Writing page: 19 px on 1.66 leading (18 px on phones), a 34.5 rem measure (about 66 characters), title 26–38 px at 600. No second family: a chart is lettered by one hand, and the two font files already use 104 of the 110 KB budget.
7. **Colour.** Day chart: water `#e7eeec`, shoal `#c9dfe4`, depth lines `#7fa6b4`, land `#ebdda6`, coast and ink `#1b2022` / `#2a2f31`, contours `#a8894e`, paper `#f8faf8`, quiet text `#4a5a60`. Magenta `#b0176b` means "the chart, not you": routes, the question flare, the release flag, and every suggestion the chart makes. Night chart (follows the system setting): the same roles on `#0d1a20` water with `#3b3622` land and `#f08cc4` magenta. Every text pair passes WCAG AA.
8. **Composition.** The chart is the whole viewport; nothing scrolls. A thin top margin holds the name, the capture line and the two views. The helm (compass, zoom, tide) sits bottom-left; the note for a selected mark docks top-right. No surface is a card: the only boxed things are the note, a slip from the chart, and dialogs, each a square-cornered sheet with a hairline rule and no shadow. The writing page has no chart at all: a centred column with marginalia to its right.
9. **Imagery.** None committed. The land is computed: each mark raises a smooth bump in a height field, and the coast, shoal and contours are level sets of it drawn on a canvas. Symbols are small inline SVGs after chart convention (position dot, light, anchorage, flag).
10. **Motion.** Three moments, each answering an action: a new mark's land rises out of the water over 0.9 s; the compass needle swings once when asked for a heading; panning and zooming follow the hand. Nothing moves unasked. With reduced motion the land appears at full size and the needle jumps.
11. **Sound.** None.
12. **Phone, tablet, desktop.** Phone: the capture line gets its own row; the note is a bottom sheet and the chart moves the selected mark up into what is left; new marks are placed closer together; pinch to zoom, so the zoom buttons and the tide are left out; a tap in open water brings that place up above the keyboard. Desktop: an empty chart opens with a caret already in the water; typing anywhere captures; the writing page gains a true margin from 72 rem.
13. **Beacon.** Bottom-right, default presentation. The helm keeps to the left and the phone sheet pads its last 4.5 rem so nothing sits under it. Its dark capsule is foreign to a day chart but does not fight it; no presentation mechanism is requested.
14. **Acceptance statements.**
    - [ ] With the name covered, the first viewport is recognisably a sea chart: water, a graticule, and (once anything is typed) land with a coast and contours.
    - [ ] On an empty chart at 1280 px, a visitor can type a sentence and press Enter without clicking anything first, and land appears where the caret was.
    - [ ] At 360 px the capture line, at least three questions adrift and the compass are visible without scrolling, and nothing scrolls sideways.
    - [ ] No surface on the chart is a card: no rounded or shadowed rectangle groups content.
    - [ ] A mark written at length is visibly larger land than a bare capture beside it, and its name is upright where the capture's is italic.
    - [ ] Everything the chart suggests (questions adrift, a heading, an echo) is italic and quiet or magenta-ruled, and none of it is on the chart as a mark until the visitor keeps it.
    - [ ] On the writing page no chart, symbol or control is inside the text column, and a line of body text holds 60 to 75 characters at 1280 px.
    - [ ] In the night chart every name on land and on water is readable without a hover.
    - [ ] The words "streak", "score", "productivity" and any count of days appear nowhere.

**The slice.** The riskiest part is the first minute: an empty chart, one sentence typed, the land rising, a second mark, a route between them, and the writing page for one of them. If computed land reads as blobs rather than as a chart, or the writing page is worse than a text editor, nothing else matters. The first version was built in that order, and the slice was not reviewed before the rest (see the note at the top).

## Directions considered

| Direction | The idea | Outcome | Why |
| --- | --- | --- | --- |
| A — Sea chart | Thoughts surface as islets in open water; writing grows land; routes join related marks; a log beside the chart | built (not approved) | Unfinished things are natural on a chart (most of it is water); growth is visible without a score; one drawing covers capture, connection and time; the palette is a real one, not a default |
| B — Night observatory | Thoughts as stars, connections as constellations | not built | It is the platform's own name and the most expected answer; glowing nodes on black is what every "graph view" already looks like, and reading names on it is poor |
| C — Water column | The newest thoughts float at the surface and older ones sink; rediscovery is something surfacing | not built | Strong for memory, weak for arrangement: the visitor cannot put two thoughts side by side, and long-form writing has no place to stand. Its best idea (things resurfacing) was kept as the echo |
| D — Hanging mobile | Thoughts balance on a kinetic mobile that tilts as they gain weight | not built | Memorable for ten marks and unreadable at eighty; motion would be constant rather than an answer to an action |
| E — Darkroom | Captures are undeveloped prints that sharpen as they are worked on | not built | A good picture of development but nothing for connection, and it makes unfinished work look deficient |

Direction approved by: (blank: the owner has not approved a direction.)

## Reviews

### Final review 1 — 16 November 2026

- Reviewer: the owner
- Captures: none named. The owner looked at the running first version (uncommitted working tree on `main` at `5ba541c`); devices not stated.
- Acceptance statements: not answered one by one.
- **Outcome:** rejected
- Reasons, in the owner's words: "The previous direction did not work. It became too abstract, too complicated, too emotionally distant. It made the user feel like they needed to understand the product before they could enjoy it."
- What the next attempt must do differently, in the owner's words: start again without keeping "the previous visual language, navigation assumptions, interaction patterns or conceptual structure"; the visitor should feel "welcomed, not evaluated; curious, not confused; inspired, not instructed; playful, not pressured"; the experience "must be immediately understandable through interaction, visual cues and natural discovery", with no conceptual model to learn; a first-time visitor "should be able to start creating within seconds".

The next attempt is a separate experience with its own record: [scraps.md](scraps.md).

#### Agent's reading of the rejection (never an outcome)

Sorted the way the process asks, by the agent, for the owner to correct:

- *Direction.* A chart is a metaphor that has to be decoded: islands stand for thoughts, land for effort, routes for links. Nothing on the first screen was a thing a person already knows how to use. The palette and the lettering were a survey office's: precise and cold.
- *Brief.* The brief asked for "recognisably a sea chart" and never asked for warmth, play or instant comprehension. Its acceptance statements could all pass on an experience nobody wanted to stay in.
- *Execution.* Pan, zoom, a tide slider, kinds of mark, a log and a note panel were all present at once: more to understand than to enjoy.
- *Process.* The whole experience was built before the owner saw one screen, on the owner's instruction, and the cost of the rejection was the whole build, as the creative process predicts.

### Agent critique (never an outcome)

Prepared by the building agent on 15 November 2026 from Chromium screenshots at 1440, 1280 and 390 px, day and night, of the preview build. No person has reviewed this, and no real phone or GPU was used.

- **Likely to hold.** The land reads as a chart at first glance; merged coasts where marks sit close are the most convincing thing on the page. The upright/italic distinction is legible. The writing page is calm and the measure is right.
- **Weak.** (1) The platform focus ring frames the whole writing field in amber and black for as long as someone types; the field is padded so the frame stands off the text, but it is still a frame around the page, and only a platform decision could change it (ADR-013). (2) Headings and quotations show their `#` and `>` while writing and are only typeset in Read: honest, but plainer than the rest. (3) Names of neighbouring marks overlap when marks are placed close together; nothing resolves collisions. (4) The Beacon's capsule is the one element not in the chart's hand. (5) An empty chart on a phone is five italic questions on pale water: quieter than the desktop opening, which has the caret.
- **Unknown.** How panning and the rise feel on a real GPU and a real phone; whether five questions adrift invite or clutter; whether the compass reads as a control without its label.
