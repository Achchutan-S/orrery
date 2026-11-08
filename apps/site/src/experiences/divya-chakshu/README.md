# Divya Chakshu

Bhagavad Gita chapter 11, Arjuna's vision of the universal form, as one continuous scroll at `/divya-chakshu`. Released by its entry in `config/release.json` (published, public, listed); on the Index under Thinking, with a literary headline. Link previews use the platform card `/og.png` (no `ogImage`). Release status and the publishing prerequisites (contract § 8.5) are in the [tracker](../../../../../docs/tracker.md).

## How it is built

| File | Role |
| --- | --- |
| `content.ts` | The one table: nine sequences of beats (cards, narration, verses, notes). The page renders it; nothing else holds text. |
| `routes/index.astro` | The page. All text is in the HTML; the canvas and stills are `aria-hidden`, and each sequence describes its picture in a visually hidden line. |
| `client/timeline.ts` | The score. Maps the reading position `g` (0–9: sequence + progress through its beats) to the layers drawn and the sound mix. Pure; unit-tested. |
| `client/shaders.ts` | Every scene as GLSL ES 3.00: six full-screen programs (battlefield and divine sight, suns, cosmos, time, lamp, feather) and four point programs (dust, rivers, moths, lives). Points are pure functions of their index and time: no buffers. |
| `client/engine.ts` | WebGL2 renderer, imported lazily. Compiles programs just ahead of the reader (`KHR_parallel_shader_compile` when present), deletes programs unused for 8 s, adapts resolution to frame time, renders nothing when nothing changed, falls back to stills on a compile failure or lost context. |
| `client/audio.ts` | Synthesised soundscape (Web Audio: noise, plucked drone, FM bells), imported only when the visitor turns sound on. No recordings. |
| `client/boot.ts` | The page script (about 4 KB gzip): reading position, controls, CSS stills, lazy engine. |
| `styles/divya.css` | Type, composition per sequence, the nine CSS stills, controls. System font stacks only (decision D11). |

Weight (production build, gzip): 4.1 KB initial JavaScript, 5.7 KB CSS, 12.9 KB lazy engine chunk, 1.7 KB lazy audio chunk, no fonts or images; `immersive` class budgets. Lazy chunks are measured since [ADR-025](../../../../../docs/adr/adr-025-lazy-chunk-detection.md).

No npm dependencies: full-screen fragment shaders and index-driven points needed nothing Three.js or GSAP would add, and the CSP forbids `eval` and WebAssembly anyway.

## Fallbacks

- **No JavaScript:** the whole chapter is readable; each section carries its CSS still; no control is shown.
- **No WebGL2, a shader that fails to compile, or a lost context:** `dc-still`; a fixed CSS still follows the reader's sequence.
- **Reduced motion:** one still frame per beat, no scene time, no pointer response, no text movement; transitions in the platform clamp.
- **Pause motion** (control): scene time stops; scrolling still moves through the story.

## Sources and interpretation

The page states its own framing twice: under the title ("Verses carry their numbers. Everything else is narration: an interpretation, not scripture.") and in the closing sources note. Narration, images and sound are artistic interpretation; notes in the sans face mark commentary on how the text has been read.

Verse numbers follow the standard 700-verse numbering. Sanskrit is quoted only where the full lines shown are given, with `part` naming a partial quotation (tested: Devanagari only, one IAST line per Devanagari line). Every English rendering is an adaptation written for this experience, not a published translation; narration is set apart from scripture on the page. Where traditions differ (kāla as time or death; 11.33's readings; what Arjuna saw between the cosmic and human forms) the page says so rather than choosing. The verse requested in 11.3–4 says "see", not "bear", and is rendered that way.

## Tests

`apps/site/test/divya-chakshu.test.ts` (content integrity, the score, uniforms the score sets exist in their shaders) and `apps/site/test-browser/divya-chakshu.test.ts` (axe at four points on desktop and mobile, structure, 320 px reflow, no-JS, keyboard for every control, replay, WebGL and no-WebGL, reduced motion, CSP). WebGL runs on SwiftShader there: it proves the shaders compile and draw, not frame rate on real devices.
