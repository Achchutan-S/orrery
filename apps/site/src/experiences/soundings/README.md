# Soundings

A sea chart of one person's thinking. A sentence surfaces as an islet, writing at length grows the land, connected marks are joined by routes. Direction record, acceptance statements and the alternatives considered: [docs/design/registry/soundings.md](../../../../../docs/design/registry/soundings.md). An unreleased draft: `/soundings` exists locally and in previews only.

## What a visitor can do

| | |
| --- | --- |
| Capture | Type in the capture line, type with nothing in focus, or click open water and type there. A trailing `?` makes a question, a web address makes a source. Nothing is named or filed |
| Start from something | Five questions drift on the chart, different each day; choosing one makes it yours. The compass makes a heading out of one or two of your own marks |
| Write at length | Any mark opens into a page: title, plain text with `# `, `## `, `> ` and `- `, a reading view, marks within reach to quote, echoes (older marks that share words), earlier drafts |
| Draw | Any mark can carry a freehand drawing |
| Connect | A route between two marks, from the note's list or by choosing the other mark on the chart |
| Revisit | The log (everything in time, with search and filters), the tide (the chart as it was on a date), an echo or "continue" slip on return |
| Release | A link that carries one piece inside its fragment, read at `/soundings/letter`. Nothing is uploaded |
| Keep | Everything is in IndexedDB in the visitor's browser. The log exports and imports the whole chart as one JSON file |

## Files

| File | Holds |
| --- | --- |
| `model.ts` | The data model and every pure rule: kinds, titles, land mass, echoes, headings, placement, the Markdown subset, letter encoding, copies. No DOM |
| `terrain.ts` | The height field and marching squares that turn marks into coast, shoal and contours |
| `store.ts` | The `Store` interface and its two implementations: IndexedDB, and memory when the browser refuses storage |
| `App.tsx` | The island: state, autosave, the leave-journal, and the composition of the views |
| `Chart.tsx`, `Panel.tsx`, `Ashore.tsx`, `Sketch.tsx`, `Log.tsx`, `parts.tsx` | The chart, the note and release dialog, the writing page, the drawing pad, the log, the symbols |
| `render.ts`, `letter.ts` | Writing as DOM nodes (shared by the reading view and the letter page); the letter page's script |
| `styles/soundings.css`, `fonts/` | The stylesheet and Literata (SIL OFL 1.1, licence beside the files) |

## Decisions worth knowing

- **One entity.** A capture, a creation, an exploration and a publication are the same `Mark` at different stages (`text` only; `body` or `strokes`; joined by `Link`s; `releasedAt`). Nothing has to be converted to change what it is.
- **Local-first, and said so.** There is no server. `Store` is the seam for one: a synchronising store implements the same seven methods. Until then the log tells the visitor where their chart is and offers a copy.
- **No lost keystroke.** Typing updates the screen at once and is written 350 ms later. On `pagehide` and when the tab is hidden, whatever is unwritten or unconfirmed is first set down synchronously in `localStorage` (`soundings:unwritten`), because an IndexedDB write begun during unload may never finish; the next visit merges that journal before showing anything. A failed read is retried and then reported, never shown as an empty chart.
- **The writing field is a `<textarea>`.** Typing, selection, undo, spellcheck, dictation and input methods are the browser's own. Insertions go through the browser's editing command so Undo takes them back. The cost: headings are typeset only in the reading view.
- **Suggestions are never the visitor's words.** Questions adrift, headings and echoes are drawn differently from marks and are not stored until kept. There is no AI: headings are templates over the visitor's own marks, echoes are shared-word overlap.
- **A letter link is a stranger's input.** `decodeLetter()` accepts only the expected shape; `render.ts` writes with `textContent` and links only `http(s)` addresses.
- **The canvas is decoration to assistive technology.** Every mark is a real button over it, named with its kind, title, words and routes; arrow keys travel between marks by direction, Alt and an arrow nudges one. The log is the chart's non-spatial equal.

## Not built

Voice notes and images (no storage for media yet); an AI companion (the site's CSP allows no outside connection, and the core must not depend on one); named collections (groups exist as linked marks, `groupsOf()`, but are not named or shown); synchronisation between devices or tabs (two tabs open at once overwrite each other's last change to the same mark); typeset headings while writing; label collision avoidance; the tide and zoom buttons on phones.

## Tests

`apps/site/test/soundings.test.ts` (the model and the terrain) and `apps/site/test-browser/soundings.test.ts` (axe in every state, a keyboard-only journey to a released letter, persistence across reloads and a tab closed mid-sentence, hostile letter links, no CSP violations). Page weight is not measured by `check:budgets` until the experience is in a production build; measured by hand on 15 November 2026 from a preview build: about 90 KB JavaScript, 6 KB CSS and 104 KB fonts (gzip), inside the `interactive` class.
