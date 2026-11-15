# Divya Chakshu

Bhagavad Gita chapter 11, Arjuna's vision of the universal form, as one continuous scroll at `/divya-chakshu`. Released by its entry in `config/release.json` (published, public, listed); on the Index under Thinking, with a literary headline. Link previews use the platform card `/og.png` (no `ogImage`). Release status and the publishing prerequisites (contract § 8.5) are in the [tracker](../../../../../docs/tracker.md); its direction record, reconstructed after the fact, is [docs/design/registry/divya-chakshu.md](../../../../../docs/design/registry/divya-chakshu.md).

## How it is built

| File | Role |
| --- | --- |
| `content.ts` | The one table: nine sequences of beats (cards, narration, verses, notes). The page renders it; nothing else holds text. |
| `routes/index.astro` | The page. All text is in the HTML; the canvas and stills are `aria-hidden`, and each sequence describes its picture in a visually hidden line. |
| `client/timeline.ts` | The score. Maps the reading position `g` (0–9: sequence + progress through its beats) to the layers drawn and the sound mix. Pure; unit-tested. **The picture is a function of `g` alone** (plus the one-time opening after Enter): divine sight, the form's rim leaving the frame, its drawing-in to the flame and its receding are all read from the position, so scrolling back restores every scene exactly. |
| `client/timeline.ts` (recognition) | `NAMED`, `names()`, `jaw()`: where Bhishma, Drona and Karna stand, on the plain in sequence I and among the teeth in sequence V, computed exactly as the shaders draw them, so the page can label them. |
| `client/shaders.ts` | Every scene as GLSL ES 3.00: six full-screen programs (battlefield and divine sight, suns, cosmos, time, lamp, feather) and four point programs (dust, rivers, moths, lives). Points are pure functions of their index and time: no buffers. |
| `client/engine.ts` | WebGL2 renderer, imported lazily. Compiles programs just ahead of the reader (`KHR_parallel_shader_compile` when present), deletes programs unused for 8 s, renders nothing when nothing changed, falls back to stills on a compile failure or lost context. **Resolution:** it starts at 1.5 canvas pixels per CSS pixel (1.25 on touch devices), rises to the display's density (at most 2, or 1.5 on touch) while frames arrive at 60 a second, and steps down, never below 0.6, when they take longer than about 23 ms. |
| `client/audio.ts` | Synthesised soundscape (Web Audio: noise, plucked drone, FM bells), imported only when the visitor turns sound on. No recordings. |
| `client/boot.ts` | The page script (about 4 KB gzip): reading position, controls, CSS stills, lazy engine. |
| `styles/divya.css` | Type, composition per sequence, the nine CSS stills, controls. System font stacks only: decision D11 was open when it was built (own fonts are possible since ADR-028). The passage halos are clipped by `.dc`, not `<body>`, so they add no sideways scroll. |

Weight (production build, gzip): 4.1 KB initial JavaScript, 5.7 KB CSS, 12.9 KB lazy engine chunk, 1.7 KB lazy audio chunk, no fonts or images; `immersive` class budgets. Lazy chunks are measured since [ADR-025](../../../../../docs/adr/adr-025-lazy-chunk-detection.md).

No npm dependencies: full-screen fragment shaders and index-driven points needed nothing Three.js or GSAP would add, and the CSP forbids `eval` and WebAssembly anyway.

## Visual rules

Decisions the shaders keep; change them on purpose, not by accident. The reasons and the owner's observations behind them are in the [direction record](../../../../../docs/design/registry/divya-chakshu.md).

- **No grain.** `finish()` adds a fixed dither under one 8-bit level, only to stop banding. Nothing re-rolls noise per frame.
- **Particles belong to an event.** The plain has no motes until divine sight raises them onto the rings; the wheel of Time carries a few hundred lives, each legible; moths come only with the flame.
- **The chariot is a solid thing:** a dark figure with a thin edge of light from the sun behind it and a shadow thrown toward the viewer. No halo.
- **The universal form is seen whole, then from inside.** `u_within` takes its rim out of the frame at "Not in front of him. Within him."; from there the light is at the heart and the near rings are in shadow. `u_gather` draws the burning form in to the one point where the flame of 11.29 then stands, and the moths arrive on the same inward spiral as the rivers before them.
- **One light per quiet scene.** The friend's lamp lights only a pool of ground under it; the form behind it is barely there.

## Additions of 15 November 2026

Every earlier scene is still there; these are layers and bridges added to it. Each came from a browser experiment (scratch, outside the repository) and is described in the [direction record](../../../../../docs/design/registry/divya-chakshu.md).

| Sequence | Added |
| --- | --- |
| I The question | Bhishma, Drona and Karna stand in the opposing ranks, a little taller, lit and labelled while the text speaks of them. |
| II Divine sight | Before the great eye opens, the plain's own surface becomes eyes (`watch()` in BATTLEFIELD): they open first where the pointer is not, then look at it. |
| III → IV | Out of the white of the thousand suns: the plain again, and over it a small world (ORB, a ray-marched inversion through one sphere) holding the same plain, every army and the whole sky in one point (11.7, 11.13). The view flies into that point, and the form unfolds from its white heart (`u_flash`). |
| IV 11.19 | The sun and the moon open as eyes, with lids and pupils that follow the pointer. |
| V 11.26–27 | JAWS: the plain under the burning form; its horizon curls into a lower lip, its mirror comes down as the upper, the soldiers are the teeth, the three named stand among them, and the form's fire is the inside of the mouth. Then the rivers. |
| VIII 11.51 | The charioteer turns his head back to the archer. |

The name labels are decorative (`aria-hidden`): the text names them. They exist only while WebGL draws.

## Fallbacks

- **No JavaScript:** the whole chapter is readable; each section carries its CSS still; no control is shown.
- **No WebGL2, a shader that fails to compile, or a lost context:** `dc-still`; a fixed CSS still follows the reader's sequence.
- **Reduced motion:** one still frame per beat, no scene time, no pointer response, no text movement; transitions in the platform clamp.
- **Pause motion** (control): scene time stops; scrolling still moves through the story.

## Sources and interpretation

The page states its own framing twice: under the title ("Verses carry their numbers. Everything else is narration: an interpretation, not scripture.") and in the closing sources note. Narration, images and sound are artistic interpretation; notes in the sans face mark commentary on how the text has been read.

Verse numbers follow the standard 700-verse numbering. Sanskrit is quoted only where the full lines shown are given, with `part` naming a partial quotation (tested: Devanagari only, one IAST line per Devanagari line). Every English rendering is an adaptation written for this experience, not a published translation; narration is set apart from scripture on the page. Where traditions differ (kāla as time or death; 11.33's readings; what Arjuna saw between the cosmic and human forms) the page says so rather than choosing. The verse requested in 11.3–4 says "see", not "bear", and is rendered that way.

## Tests

`apps/site/test/divya-chakshu.test.ts` (content integrity, the score, uniforms the score sets exist in their shaders) and `apps/site/test-browser/divya-chakshu.test.ts` (axe at four points on desktop and mobile, structure, no sideways scroll from 320 to 1440 px, the same pixels at the same place after scrolling on and back, no-JS, keyboard for every control, replay, WebGL and no-WebGL, reduced motion, CSP). WebGL runs on SwiftShader there: it proves the shaders compile and draw, not frame rate on real devices.
