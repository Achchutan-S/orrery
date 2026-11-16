# Scraps

A cutting-mat table for whatever you have got. Say something and it becomes a small typeset piece of coloured paper. Direction record, acceptance statements, the owner's instructions and the alternatives considered: [docs/design/registry/scraps.md](../../../../../docs/design/registry/scraps.md). A permanent, published experience (`/scraps`, `/scraps/letter`); the eight rules every change is held to are [the permanent contract](../../../../../docs/design/registry/scraps.md#the-permanent-contract) in that record.

## What a visitor can do

| | |
| --- | --- |
| Say something | Type on the strip (or just type: with nothing focused, keys go to the strip) and press Enter. It lands on the table, typeset in one of five looks on one of six papers |
| Pull a spark | The jar is nine instruments, and each slip says which it came from: a small question, look closer, what if, through someone else's eyes, argue with yourself, an odd pair (two of your own scraps side by side), pull the thread, from a while ago, make it into something. "More like this" stays with one; "Take a whole sheet for it" turns the question into the head of a page |
| Pick a scrap up | A new look, new words, a doodle, a gold star, a clip, the drawer, the bin; under "More to do with it": bigger or smaller paper, a tilt, a copy, tape (it then never slides into the drawer), a picture, a seal. Links in it can be opened; scraps that share words with it are offered |
| Add a picture | Choose, paste or drop one. It is shrunk in the browser (900 px at most) and kept with the scrap; the words under it are its caption and its accessible name |
| Turn it over | A full sheet for writing at length: plain text with `# `, `## `, `> `, `- ` and `**bold**` (Ctrl or Cmd+B). Once typing starts the bar slides away and the margin hides; the pointer, Tab or leaving the field brings them back (on touch screens the bar stays). "Read it back", "Print", what is on the same clip (ready to quote), things that might belong with it, earlier drafts (one on each visit, and one every four minutes of a long sitting) |
| Clip things together | Drop one scrap on another, or use "Clip it to another". A pile opens as a spread: "Write something from these", or "Make a little zine of them" |
| Carry it | A dragged scrap lifts off the mat; the pile under it tilts and is outlined when dropping would clip them; it settles when put down |
| Take it back | Ctrl or Cmd+Z and Shift+Z (or "undo" and "redo" by the tools) for anything done on the table: a move, a look, a star, a clip, a bin |
| Come back | The table is as it was left. Something untouched for days is found "at the bottom of the drawer"; a sheet left mid-sentence offers to carry on; a sealed scrap whose day has come is on top |
| The drawer | Everything, month by month, newest first, sixty at a time, searchable throughout. Shelves appear when they have something in them: around now in other years, gold stars, written on the back, doodles and pictures, sent, from other people, sealed, the bin |
| The bin | Binned scraps wait thirty days and can be taken out, or torn up at once with a second press to confirm |
| Seal | A scrap goes out of sight until a day you choose, then turns up on the table. It can be opened early from the drawer |
| Send | A link that carries one scrap, or a whole pile as a zine, inside its fragment. It can say who it is for, be signed, be given a name (a zine), and ask to stay folded until a day. Nothing is uploaded |
| Receive | An addressed letter waits in an envelope until its reader opens it. `/scraps/letter` shows a note or a zine in order (named, its pages numbered), prints as a booklet, and offers "Keep it on my table, and write back": the letter becomes scraps in the reader's own browser, and the reply is ready to send |
| Your studio | The mat's colour (green, blue, plum, slate), paper noises (off until asked for), "keep everything still", bigger writing |
| Keep | Everything is in IndexedDB in the visitor's browser. The drawer exports and imports the lot as one JSON file and says how much room the browser has left |

## Files

| File | Holds |
| --- | --- |
| `model.ts` | The scrap and every pure rule: how a front is typeset, piles, the full table, placement, the jar, kin, the Markdown subset, letters and zines, copies and their cleaning, two-tab reconciliation, the bin, seals. No DOM |
| `store.ts` | The `Store` interface and its two implementations: IndexedDB, and memory when the browser refuses storage |
| `App.tsx` | The island: state, autosave, undo history, the leave-journals, the channel between tabs, and the composition of the views |
| `Table.tsx`, `Held.tsx`, `Back.tsx`, `Sketch.tsx`, `Drawer.tsx`, `Studio.tsx`, `parts.tsx` | The table; a scrap in the hand, a pile spread out and the send dialog; the writing page; the doodle pad; the drawer; the studio and its preferences; the scrap's front, its marks and the icons |
| `sound.ts` | Six paper noises made from filtered noise with Web Audio. No audio files |
| `render.ts`, `letter.ts` | A front and a back as DOM nodes (for the letter page and the reading view); the letter page's script |
| `styles/scraps.css`, `fonts/` | The stylesheet, print rules included; Bricolage Grotesque, Fraunces and Kalam (SIL OFL 1.1, licences beside the files) |

## Decisions worth knowing

- **One thing.** There are only scraps. A scrap with writing on the back is an essay; scraps on one `clip` are an exploration or a zine; one with `sentAt` was sent; one with `from` arrived. Nothing has a type to pick.
- **A look is a number.** `look` selects composition and paper (`faceOf()`); the size step comes from the length of the words. The front is CSS over one piece of markup sized in container units, so the same scrap is a thumbnail, a table scrap and a poster.
- **A table of fixed size.** No panning or zooming. Positions are fractions of the table. Overflow goes to the drawer, least recently touched first, never a taped pile.
- **Stable elements.** Piles keep their DOM order; what lies on top is a `z-index`. The table is its own stacking layer, so no pile can lie over the tools or a slip.
- **Nothing is deleted by one press.** "Bin it" sets `binnedAt`; the scrap leaves every pile and suggestion (`isHidden()`), and is removed for good only from the bin or after `BIN_DAYS`. The one exception is a scrap with nothing on it.
- **Undo is a list of before-and-after.** Every change made through `set()` records each scrap as it was and as it became (`null` for "not there"). Typing is not in it: a field's own undo covers that.
- **No lost keystroke.** Typing is written 350 ms later. On `pagehide` and when the tab is hidden, whatever is unwritten or unconfirmed is set down synchronously in `localStorage` (`scraps:unwritten`; without pictures if they do not fit, and the merge keeps the stored picture), with `scraps:midway` for the sheet being written and `scraps:torn` for removals still in the air. The next visit applies all three before showing anything. A failed read is retried and then reported, never shown as an empty table. A failed write says so and offers "Try again" and "Keep a copy now".
- **Two tabs, one table.** Each tab announces what it saved on a `BroadcastChannel`; the others read those scraps from IndexedDB. If a tab is in the middle of changing the same scrap, its words stay on the page and the other tab's version goes into "How it read before" (`reconcile()`).
- **Bringing a copy back adds; it never clears.** Only scraps the copy adds, or has in a newer version, are written, and the table says "brought back" only after the browser has stored them.
- **What comes from outside is cleaned.** A copy file and the journal pass through `clean()`: only a scrap's own fields, each of its own type; a picture must be a `data:image/` PNG, JPEG, WebP or GIF (no SVG).
- **The jar has a memory.** The last eighty sparks shown are remembered (`scraps:sparks`), so the library is not repeated while it has something new; an odd pair prefers two scraps that share few words.
- **A long word decides the size.** `faceOf()` picks the size step from the length of the words and from the longest word (`FITS`, per look), so ordinary words are not broken across lines; a word too long for any step hyphenates.
- **A letter link is a stranger's input.** `decodeLetter()` accepts only the expected shape (at most 40 scraps, names cut to 60 characters, looks reduced to a number in range); `render.ts` writes with `textContent` and links only `http(s)` addresses. A kept letter reaches the table as its link, and is decoded again there.
- **Folded until a day is a courtesy.** The letter page will not show a letter before its `open` date, and the send dialog says in so many words that this is not a lock.
- **The place's words are never yours.** Sparks and remarks are in pencil and are not stored; only the answer is, with its question attached. There is no AI: the jar is a written library plus templates over the visitor's own scraps.
- **Preferences are not content.** The studio's choices live in `localStorage` (`scraps:studio`), are read before the first paint, and are not part of a copy.

## Changing what is stored

People keep things here for years. Whatever any released version wrote must open in every later one ([permanent contract](../../../../../docs/design/registry/scraps.md#the-permanent-contract), rule 5). In practice:

| Where | What is there | The rule |
| --- | --- | --- |
| IndexedDB `scraps`, version 1 | store `scraps` (by `id`), store `meta` | Add fields to `Scrap` only as optional, and never change what an existing field means. Raise `VERSION` in `store.ts` only with an `onupgradeneeded` step that carries every existing scrap across, and a browser test that opens a database made by the old version. A database with a higher version than the code knows is opened as it is (a rolled-back deployment must not look like an empty table) |
| A copy file | `{ "scraps": 1, "savedAt", "items": Scrap[] }` | `clean()` is the reader for everything from outside: teach it each new field in the same change that adds the field, or a round trip through a copy drops it. A copy with a higher format number is refused with a sentence, never half-read. Raise `FORMAT` only when an older reader would misread the file, and keep reading every older number |
| A letter link | `0.` or `1.` + base64url JSON; the first format is one scrap at the top level, the second `{ v: 2, d, items, to?, from?, name?, open? }` | Links are out in the world and cannot be reissued. `decodeLetter()` reads every format ever made, for ever. New fields are optional |
| `localStorage` | `scraps:unwritten`, `scraps:torn`, `scraps:midway` (the leave-journals); `scraps:arrived` (a letter being kept); `scraps:studio`, `scraps:sparks`, `scraps:copied` (preferences and memory of the place: never content, never in a copy) | Losing any of the last three loses nothing a person made |

`test/scraps.test.ts` ends with frozen bytes from past formats ("Kept for ever"). If a change makes one fail, the change is wrong, not the fixture.

## Not built

Deliberately left out, with the reason:

- **Live collaboration and shared tables.** They need a server, and the site has none (and its CSP allows no outside connection). The exchange that exists is by link: send, keep, write back.
- **Synchronisation between devices.** The same reason. `Store` is the seam for it.
- **Voice.** No reliable, accessible capture without a transcription service.
- **Ambient sound.** A loop that plays without being caused by the visitor is the opposite of the rule the paper noises follow.
- **Streaks, counts as achievement, reminders, notifications.** Refused, not deferred.
- **An AI companion.** Nothing here should depend on one.
- **Pictures inside links.** A link cannot carry them; the dialog says so.
- **Typeset headings while writing; italics; a night version of the page; choosing a look directly; arranging the pages of a zine by hand; looks for picture scraps.** Not yet.
- **Printing an unopened envelope.** A letter prints once it has been opened.

## Tests

`apps/site/test/scraps.test.ts` (the model, 21 tests, ending with the frozen past formats) and `apps/site/test-browser/scraps.test.ts` (29 tests: axe in every state, every look and on every mat; a keyboard-only journey to a sent letter; undo and redo; the bin across reloads and its two-press tearing up; sealing; two tabs writing the same sheet; a failed write; a database left by a later version; reduced motion; drag feedback; a long sitting and 3,000 scraps; pictures; the studio; the focus mode, bold and print; a named zine sent, opened from its envelope, kept and answered; a folded letter; hostile letter links; no CSP violations). No person has run the manual accessibility checklist, and nothing here was checked on a real phone or with a screen reader.
