# A History of Seeing

An atlas of how people have learned to see: 17 art and design movements, 7 interior aesthetics and 22 internet aesthetics, each chapter built in its own visual language. Owner-only draft at `/seeing` (no entry in `config/release.json`): built locally and in previews, never in production. Status and evidence are in the [tracker](../../../../../docs/tracker.md).

## Direction (Stage 2 decisions)

- **Thesis.** The world changes when the way we look at it changes. The opening is a camera obscura whose controls change the instrument, never the world outside.
- **The aperture is continuity, not a template.** Every page names one element `see-aperture` for cross-document View Transitions, so the frame carries across navigation. Each chapter decides what that element is (Gothic: the whole nave; Renaissance: the perspective instrument; Brutalism: a slab, arriving by hard cut; Weirdcore: a tilted picture that arrives late). Chapters may ignore it visually.
- **Three modes.** Encounter (the scene and about ninety seconds of text), Understand (three to five minutes), Study (a disclosure). Each chapter orders and stages them differently.
- **Signature: Reframing the world.** One room (window onto the same world, seat, plant, light) drawn in ten languages; a toggle shows the skeleton that never changes. The comparison pages reuse it as a wipe.
- **Lab and map are separate on purpose.** The lab is a drawing instrument whose readout names only the nearest curated composition. The map is the cultural argument: six kinds of relationship, each sentence sourced.

## How it is built

| Path | Role |
| --- | --- |
| `data/atlas.ts` | The 46 subjects in canonical order and which are built. The catalog's `SEEING_CHAPTERS` must match (tested). |
| `data/sources.ts`, `data/assets.ts` | Every source, font and image, with kind and licence. Tests fail on a missing record, file or licence. |
| `data/relations.ts`, `data/pairs.ts` | The map's nodes and sourced edges; the comparison pairs. |
| `house/` | Layout (skip link, Sightline, house script), the atlas popover, the corridor after each chapter (`ChapterFoot`), the prose renderer (`text.ts`: `*em*` and `{source-id}` citations), the camera-obscura world drawing, the lazy-scene helper. |
| `chapters/<id>/` | One folder per chapter: `index.astro` (the route and composition), `content.ts` (all its text), `chapter.css` (its fonts, palette, layout), and any build-time geometry or scene script. Adding a chapter: a folder, `built` in the atlas, its id in `SEEING_CHAPTERS`. |
| `reframing/Room.astro` | The ten-way room. |
| `lab/` | The window generator (pure, used at build time and in the browser) and its script. |
| `lib/` | `gl.ts` (one full-screen shader on a canvas; Cyberpunk and Frutiger Aero), `random.ts` (seeded). |
| `routes/` | Opening, reframing, map, lab, comparisons, sources, and the font and image file routes. |

Techniques, simplest first: build-time SVG (Gothic tracery and glass, Art Nouveau stems, Brutalism's block, the room, the map), CSS with `:has()` for most interactions (they work without JavaScript), small scripts for the Renaissance instrument, Frutiger Aero's bubbles, Weirdcore's canvas, the lab, the comparison wipe and the house memory, and raw WebGL2 for two scenes. No dependencies.

## Fonts and images

Served from the experience's own file routes (contract § 3.6), never `public/`: `/seeing/fonts/<name>/face.woff2` and `/seeing/images/<name>/image.webp`. The patterns end in a file extension on purpose: the production output allowlist (`tools/checks/src/leaks.ts`) lets a dynamic route emit only HTML unless its pattern is a file route. Fonts are Google Fonts' latin subsets (SIL OFL 1.1, licence text beside each file); images are two Met Open Access (CC0) works, resized and re-encoded without metadata. Vite warns that the absolute `url()`s "didn't resolve at build time": expected, they are served by the routes. Every font file must be loaded by some stylesheet (the budget check fails otherwise).

## Sources and editorial status

All chapter text is **draft**, written for this atlas from the records in `data/sources.ts`; none of it comes from the owner's earlier narration, which can replace a chapter's `content.ts` without touching its composition. Passages are marked History (default), Interpretation, Term or Editor's note. Internet aesthetics rely on journalism and community wikis, cited as records of use.

## Fallbacks

- **No JavaScript:** all text; every CSS interaction works; script-only controls are hidden; Frutiger Aero's vocabulary is a plain list; Weirdcore shows a static drawing; the lab shows its gallery.
- **No WebGL2 / shader failure / lost context:** the static scene stays (canvas hidden).
- **Reduced motion:** no WebGL; the opening is lit at once; Wabi-sabi is shown already aged; growth and drift animations do not run.

## Tests

`apps/site/test/seeing.test.ts` (scope, routes, citations and sources, assets and licences, map and pairs, geometry) and `apps/site/test-browser/seeing.test.ts` (axe at desktop and mobile on every page, structure, 320 px reflow, no-JS, every interaction by keyboard, WebGL on and off, reduced motion, no console or CSP errors). WebGL runs on SwiftShader there: it proves the shaders compile and draw, not their speed on real devices.
