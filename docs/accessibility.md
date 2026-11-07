# Accessibility checks

Two kinds of evidence, never mixed: what the browser suites prove automatically on every CI run, and what a person has checked by hand. Automated checks catch structure, contrast and keyboard mechanics; they cannot tell whether a screen reader's announcement makes sense or whether a page is usable at 400% zoom. Record manual results in the table at the end, with the date, browser, assistive technology and who checked.

## Automated (`pnpm test:browser`, every CI run)

| Check | Where | Pages |
| --- | --- | --- |
| axe, WCAG 2.2 A/AA rules, light and dark, desktop and phone | `apps/site/test-browser/browser.test.ts` § axe; Control Center `apps/control/test-browser/control.test.ts` § axe | every main page; the palette open; every Control Center screen, its preview and its confirm dialog |
| axe best practices (landmarks, heading order, unique regions) | site § accessibility beyond axe | every production page |
| One `h1`, one `main`, no skipped heading levels, `lang`, `<title>` | site § accessibility beyond axe | every production page |
| Reflow: no sideways scrolling at 320 and 640 CSS px (400% and 200% of a 1280 px window) | site § accessibility beyond axe; Control Center § reflow | every production page; every Control Center screen at 320 px |
| Text spacing (WCAG 1.4.12: line height 1.5, letter 0.12em, word 0.16em, paragraph 2em) | site § accessibility beyond axe | every production page, desktop and phone |
| Forced colours: the focus outline survives (the box-shadow band does not), the Beacon stays visible | site § accessibility beyond axe; Control Center § reflow | every production page; every Control Center screen |
| Keyboard order, visible two-band focus ring | site § The Index, Journal, Resume; Control Center § keyboard | Index, Journal, resume; Control Center skip link and navigation |
| Palette: opens with focus in the filter, arrows announce the selection, Escape returns focus, Tab never reaches the page behind the modal | site § Beacon and palette, § accessibility beyond axe | every page with the Beacon |
| Reduced motion zeroes the platform's transitions | site § The Index | Index |
| Touch targets of 44 px on phones | site § The Index; error fallback | Index headlines, the island error fallback's button |
| Island errors: an `alert` fallback with focus on its heading | site § island error boundary | `sample-app` |
| Works without JavaScript | site § The Index, Resume | Index, resume |
| Skills Archive: axe light and dark on desktop and phone; reflow at 320 px; WCAG text spacing; forced-colours focus; Tab order through every volume; one `h1`, `main` and skip link; source regions focusable and labelled; copy announced in a polite status; reduced motion; works without JavaScript | `apps/site/test-browser/skills.test.ts` | `/skills`, guide, a shelf, four skill pages |

## Manual checklist

**New experiences.** The pages the automated checks visit are listed by hand in the suites, so a new experience is covered only when its pages are added (decision D12 proposes deriving them from the build). Covering its pages and recording a person's manual check below are both prerequisites for publishing it ([contract § 8.5](experience-contract.md#85-prerequisites-for-publishing-a-new-experience), P1 and P2).

About 90 minutes. Use the live site (https://orrery-teal.vercel.app) once this tree is deployed, or a local production build: `pnpm build:production`, then `pnpm --filter @pu/site preview` (http://localhost:4321). The Control Center: `pnpm control` (http://127.0.0.1:4317). Record each check as pass or fail with a note in [Results](#results); a failure gets an issue, a fix and, where a browser can detect it, an automated regression test.

### A. Keyboard only (Safari or Chrome; no mouse or trackpad)

In Safari, first turn on Settings → Advanced → "Press Tab to highlight each item on a webpage".

| # | Route | Action | Expected |
| --- | --- | --- | --- |
| 1 | `/` | Click the address bar once, then Tab repeatedly | Every Index headline in reading order, then the Beacon mark ("Orrery"), then "Go to ⌘K"; a two-band ring (dark outline, gold inner band) on every stop; nothing focusable is invisible |
| 2 | any page | ⌘K (Ctrl K on Windows); type "jour"; ↓; Enter | Palette opens with focus in "Go to"; the list narrows; ↓ moves the highlight (and wraps at the end); Enter opens the Journal |
| 3 | any page | Open the palette, press Escape; open it, Tab and Shift+Tab | Escape closes it and focus is back on "Go to"; Tab never reaches a link on the page behind |
| 4 | `/journal` → a chapter | Tab through a chapter to its end | Every passage link, then "Previous chapter" / "Next chapter"; Enter on "Next chapter" opens it |
| 5 | `/resume` | Tab through the page | Every contact and project link, then "Download as PDF"; Enter downloads `Achchutan-S-Resume.pdf` |
| 6 | `/sample-app/states` | Tab to a state, Enter; repeat | The view changes without a page load and focus lands on the new heading |
| 7 | Control Center | Tab from the address bar; Enter on "Skip to content"; go to Experiences → Journal → Release; change the note; "Preview change"; "Apply change…"; in the dialog press Escape, then repeat and confirm | Skip link appears first; every control reachable; Escape closes the dialog without writing; confirming writes and announces "Written. config/release.json is now revision …"; then revert from Pending |

### B. Screen reader: VoiceOver on macOS with Safari (NVDA with Firefox optional)

Start VoiceOver with ⌘F5. VO = Control+Option.

| # | Route | Action | Expected |
| --- | --- | --- | --- |
| 8 | `/` | VO+U, Landmarks, then Headings | Landmarks include main and the "Orrery" navigation; one heading level 1; headlines read with their section; KawaiUI and Dev X-Ray say "external site" and "Leaves Orrery for …" |
| 9 | any page | Open the palette, type "re", arrow down | Announces the "Go to" dialog and the text field; after typing, "N destinations"; each arrow announces the option (title, kind, section) |
| 10 | `/journal/today` | VO+→ through two passages | Each passage's standing (verified, implemented, planned…) is read with it |
| 11 | `/resume` | VO+U, Headings | Name (level 1), then Summary, Experience, Projects, Skills, Education, Recognition and learning; the PDF link is read as a link to a download |
| 12 | Control Center | Preview and apply a change; then make the file stale (edit `config/release.json` in an editor) and try another change | "Written…" is announced without focus jumping; the stale-revision message is announced; validation issues are read at the controls they belong to |

### C. Zoom and reflow (browser zoom on a 1280 px wide window)

| # | Route | Action | Expected |
| --- | --- | --- | --- |
| 13 | `/`, `/journal/today`, `/resume`, `/sample-app/states`, Control Center Experiences → any | ⌘+ to 200%, then to 400% (Safari and Chrome) | No sideways scrolling of the page (tables may scroll inside their own box); no overlapping or cut-off text; the Beacon does not hide content you need |

### D. Forced colours, reduced motion, touch, copy

| # | Route | Action | Expected |
| --- | --- | --- | --- |
| 14 | `/`, `/resume`, palette open, Control Center | Windows: Settings → Accessibility → Contrast themes → any theme. Or Chrome DevTools → ⋮ → More tools → Rendering → "Emulate CSS forced-colors: active" | Focus visible on every control; the Beacon, the palette's highlighted option and the current-page markers are distinguishable; nothing relies on colour alone |
| 15 | `/`, palette, Control Center | macOS: System Settings → Accessibility → Display → Reduce motion, then reload | No animated transitions |
| 16 | `/`, `/resume`, palette | A real iPhone (Safari) and Android phone (Chrome) | Every link and button can be hit without zooming; the Beacon button opens and closes the palette; the PDF downloads; then read `/`, `/resume` and one Journal chapter for plain language and link text that makes sense alone |

### E. The Claude Skills Archive (`/skills`)

| # | Route | Action | Expected |
| --- | --- | --- | --- |
| 17 | `/skills` | Keyboard only: Tab from the address bar; press `/`; type "audio"; Tab to a volume; Enter | Skip link first, then "Enter the archive" and "Light the lanterns"; `/` puts focus in the search; the count is announced; the volume opens |
| 18 | `/skills/sidequest` | VoiceOver: VO+U Headings and Landmarks; activate "Copy SKILL.md", then a section button; VO into the SKILL.md region | Six numbered sections in order; each copy is announced ("Copied SKILL.md: 188 lines, exactly as written.") without focus moving; the region reads as "SKILL.md, original text" and its lines read as text, without line numbers |
| 19 | `/skills`, `/skills/conceptcast` | Reduce motion on, then off; 200% and 400% zoom; "Light the lanterns" | No drifting dust, light or blinking with reduced motion; nothing cut off or sideways at 400%; night mode keeps readable contrast, and the button says "Let in the daylight" when pressed |

## Results

Record only what a person actually did. One row per session.

| Date | Checks | Browser and assistive technology | Pass | Fail (with note) | By |
| --- | --- | --- | --- | --- | --- |
| — | 1–19 | — | — | — | — |

Until a row is filled in, nothing here is manually verified ([tracker § Open work](tracker.md#open-work)).
