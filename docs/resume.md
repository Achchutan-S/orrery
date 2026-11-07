# Resume (`/resume`, task 15)

Status: **published.** The owner set the release entry to `published`, `public`, `listed` on 3 November 2026 (commit `f49d6dc`); it is live at `/resume` and listed on the Index and in the Beacon palette. Content finalised from the owner's V3 resume on 2 November 2026 (task 15.1), with the owner's editorial decisions applied (task 15.2). Before publication it was a draft (`draft`, `owner`, `unlisted`), built in development and preview builds only.

**What the release entry controlled.** While it was a draft, the release entry kept the resume off the deployed site (production answered `/resume`, `/resume/resume.pdf` and `/resume/og.png` with 404). It never hid the files in this repository, which is public: `content.ts`, the committed PDF and image, and this document can be read on GitHub (raw file URLs included), and earlier versions remain in the Git history. Preview deployments also contain the resume. The Control Center lists it on the owner's machine only. See [ADR-022](adr/adr-022-link-previews-smoke-and-public-repository.md) for the four layers.

## One source, three outputs

`apps/site/src/experiences/resume/content.ts` is the only place resume text lives.

| Output | Made by | When it changes |
| --- | --- | --- |
| `/resume` page | `routes/index.astro` renders `content.ts` | every build |
| `/resume/resume.pdf` | the page, printed to A4 by Chromium (currently 2 pages) | when you run the command below |
| `/resume/og.png` (1200×630 link preview) | a card set in the same font, screenshotted by Chromium | when you run the command below |

The PDF and image are committed in `src/experiences/resume/assets/` and served by the experience's own routes (`routes/pdf.ts`, `routes/og.ts`). Like its pages, they are built only where the resume is released, so a draft cannot leak them into the production site (ADR-020); the committed files themselves are in the public repository. The link-preview image is the catalog entry's `ogImage` (`/resume/og.png`), which is one of these routes, so it too exists only where the resume is built (ADR-022).

**After any change to `content.ts`** (or to the resume's styles):

```sh
pnpm --filter @pu/site resume:assets
```

It builds a preview, serves it locally, prints `/resume` and screenshots the card with Playwright's Chromium (already a dev dependency). No network or external service. It writes `resume.pdf`, `og.png` and `source.sha256` (the SHA-256 of `content.ts`). Synchronisation is **manual but enforced**: `apps/site/test/resume.test.ts` fails when `source.sha256` does not match `content.ts`, and when any statement in `content.ts` is missing from the PDF's text. Style-only changes are not detected; regenerate after those too. The PDF's bytes differ on every run (Chromium writes a creation date); its text does not.

**Fonts.** Everything is set in Atkinson Hyperlegible Next, which the site self-hosts, so the PDF looks the same whichever machine generates it. Chromium embeds this variable font as Type 3 glyphs with ToUnicode maps: text is selectable and searchable (the test extracts it). Glyph rendering is unhinted at very small sizes in some viewers.

## Content provenance (task 15.1, 2 November 2026)

Primary source: the owner's resume **Achchutan_S_ResumeV3.pdf** (dated September 2026), plus the owner's task 15.1 brief. Where the two differ, the brief's more careful wording is used and the difference is listed below.

| Section | Source and treatment |
| --- | --- |
| Name, descriptor, email, location | V3 header and brief. Name shown as "Achchutan S" (V3 sets it in letter-spaced capitals; mixed case reads better and is spelled correctly by screen readers). |
| GitHub, LinkedIn, LeetCode | link targets inside the V3 PDF: `github.com/Achchutan-S`, `linkedin.com/in/achchutan-s-5390251b5`, `leetcode.com/u/achchutan26`. GitHub answered 200; LeetCode answers 403 to scripted requests (bot protection), so it is taken from the PDF, not re-verified. |
| Summary | V3 summary, rewritten in the site's voice; keeps 2+ years, Java 17 and Spring Boot, REST and GraphQL, reactive modernisation, React and TypeScript, Python and FastAPI GenAI tooling, and the ~60 s → under 5 s result. |
| Engineer I, Software Development (Jul 2024 – present) | V3 bullets. Production work and prototypes are separate lists. |
| Student Intern (Feb – Jul 2024) | V3. |
| Projects | V3 for syllabus-agent, Dev X-Ray, Exam Helper and earlier ML work; Orrery retained from task 15. Checked read-only against the owner's local repositories: syllabus-agent collects 101 tests (`pytest --collect-only`, not run) and has SSRF-guard and redaction code; Dev X-Ray has 24 tool tabs, PWA configuration and a separate GraphQL package; Exam Helper (`let-me-study`) uses OpenCV, pytesseract and Gemini. All four repository URLs answered 200. |
| Skills | V3 taxonomy in the brief's groups; Docker, Kubernetes and GCP only under "Exposure only". |
| Education | V3: "B.Tech, Computer Science & Engineering", SASTRA Deemed University, Thanjavur, June 2024, CGPA 8.47. |
| Recognition and learning | V3, split into recognition, certification and "courses and learning paths"; the Cloud Engineer item is labelled a learning path. Google Cloud Generative AI Leader: owner's statement (task 15.2) that the exam was passed on 20 October 2026; shown as "exam passed October 2026", with no credential ID, score or issue date. |
| Earlier ML work | owner's clarification (task 15.2): academic deep-learning project, 6th semester; reported accuracy improved from 82% to 89% during experimentation; not clinically validated. |

### Generalised or left out, and why

- **Internal names:** internal product, tool, team and programme names are replaced by generic descriptions ("legacy APIs", "an internal service-status monitoring tool", "another product team"), and one internal programme is not described at all. The names themselves are kept out of this repository too (see [Privacy check](#privacy-check)).
- **Internal context:** the internal reason the knowledge graph was built, and its size, are not described.
- **Internal performance rating:** not published (brief). Tests fail if the word "rating" appears.
- **"while working full-time"** after GATE: GATE 2024 was taken during the internship, so the phrase is not accurate for both years.
- **"permanently resolved"** → "resolved"; **"Embedded … into the team's daily workflow"** → "use … in daily engineering work" (brief's wording).
- **Regex capped at 2.5 s** (Dev X-Ray): not found in the code on a quick read; omitted rather than unverified.
- **KawaiUI:** no longer on the resume (not in V3, not in the brief's project list). It stays an external experience on the site.

## Privacy check

This repository is public, so it never names what the resume leaves out. `apps/site/test/resume.test.ts` checks `content.ts` and the PDF in two ways:

- **Generic patterns, always:** internal e-mail domains and hosts, `localhost`, and the words salary, CTC, appraisal and rating.
- **The owner's private term list, locally:** keep the specific internal names in a plain-text file outside the repository, one per line (`#` starts a comment), and run `PU_PRIVATE_TERMS=/path/to/terms.txt pnpm --filter @pu/site test`. The test reports only a count, never a term. Without the variable the test is skipped (shown as skipped, not passed), which is the case in CI.

The pushed commit `9b5fe81` (2 November 2026) still contains the specific names in this file and in the test. History has not been rewritten; that, or making the repository private, is the owner's decision.

## Owner decisions (task 15.2, 2 November 2026)

1. Name: "Achchutan S", title case.
2. KawaiUI: not on the resume; unchanged as an Orrery experience.
3. The four approval flows shipped in August 2026, and the release-documentation generator adopted by principal architects: kept as worded.
4. "Google AI Professional Certificate": kept exactly as in V3.
5. Google Cloud Generative AI Leader: added as a passed certification (October 2026). **To confirm:** the title is shown as "Google Cloud Certified – Generative AI Leader", Google Cloud's naming for this certification; check it against your credential.
6. Earlier ML work: academic project wording applied, from the owner's clarification.
7. Orrery: "built with AI coding assistance" removed; described by its platform and engineering.
8. Index placement: unchanged (catalog position and "Worth the detour" rule).

Item 5 (the certification title) was listed as "to confirm" before publication; no confirmation is recorded here. Check it against the credential.

## Length

Two A4 pages at 8.8 pt. One page would need text below 8 pt with no margin column; readability was preferred. The web page is not affected.

## Publishing (done 3 November 2026; the steps, for a re-publication after a withdrawal)

1. Edit `content.ts`, then run `pnpm --filter @pu/site resume:assets` and `pnpm test`.
2. In `config/release.json` (or the Control Center), set `resume` to `published`, access `public`, discoverability `listed`.
3. `pnpm check`, commit, open a pull request, check the preview, merge. Production then serves `/resume`, the PDF and the image; the Index and palette list it automatically. A local publish simulation (production build with that release state) showed the canonical URL, `og:image` → `/resume/og.png`, `twitter:card` `summary_large_image`, the Index link and the palette entry.
