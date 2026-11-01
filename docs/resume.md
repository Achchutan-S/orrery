---
noteId: "8e6a56e0d61f11f1ae605f8c0e08bb6f"
tags: []

---

# Resume (`/resume`, task 15)

Status: **draft awaiting the owner's approval.** Release entry `draft`, `owner`, `unlisted`: built in development and preview builds only, never in production, never listed on the Index or in the Beacon palette. Nothing here is live.

## One source, three outputs

`apps/site/src/experiences/resume/content.ts` is the only place resume text lives.

| Output | Made by | When it changes |
| --- | --- | --- |
| `/resume` page | `routes/index.astro` renders `content.ts` | every build |
| `/resume/resume.pdf` | the page, printed to A4 by Chromium | when you run the command below |
| `/resume/og.png` (1200×630 link preview) | a card set in the same font, screenshotted by Chromium | when you run the command below |

The PDF and image are committed in `src/experiences/resume/assets/` and served by the experience's own routes (`routes/pdf.ts`, `routes/og.ts`). Like its pages, they are built only where the resume is released, so a draft cannot leak them into production (ADR-020).

**After any change to `content.ts`** (or to the resume's styles):

```sh
pnpm --filter @pu/site resume:assets
```

It builds a preview, serves it locally, prints `/resume` and screenshots the card with Playwright's Chromium (already a dev dependency). No network or external service. It writes `resume.pdf`, `og.png` and `source.sha256` (the SHA-256 of `content.ts`). Synchronisation is **manual but enforced**: `apps/site/test/resume.test.ts` fails when `source.sha256` does not match `content.ts`, and when any statement in `content.ts` is missing from the PDF's text. Style-only changes are not detected; regenerate after those too. The PDF's bytes differ on every run (Chromium writes a creation date); its text does not.

**Fonts.** Everything is set in Atkinson Hyperlegible Next, which the site self-hosts, so the PDF looks the same whichever machine generates it. Chromium embeds this variable font as Type 3 glyphs with ToUnicode maps: text is selectable and searchable (the test extracts it). Glyph rendering is unhinted at very small sizes in some viewers.

## Facts used, and where each comes from

| Statement | Source |
| --- | --- |
| Name "Achchutan S" | git author name `Achchutan_S` and GitHub account `Achchutan-S`; **confirm spelling and form** |
| Computer Science, SASTRA University | owner (task 15 brief) |
| Verizon internship, February to July 2024 | owner |
| Software Engineer I at Verizon from 17 July 2024 | owner (shown as "Jul 2024 – present") |
| Internship: React homepage redesign on existing APIs, global navigation (GNav) and search; demos to senior stakeholders | owner; "GNav" generalised to "global navigation" |
| Spring Boot APIs, JUnit and Mockito tests, API exploration, reactive services, GraphQL, data-grid migration work, customer journeys, assisted-sales flows | owner; "DataGrid" generalised |
| AI-related projects: lead scoring, OCR, voice bot with Twilio and Gemini | owner ("project exposure"); worded as "involved in" |
| Orrery and its engineering points | this repository |
| KawaiUI and Dev X-Ray are personal projects | their repositories are `Achchutan-S/kawaiui` and `Achchutan-S/devxray`; descriptions from their catalog entries |
| GitHub link | the repository's remote owner |
| Skills | split into "used at work" (owner's brief) and "used in personal projects" (this repository); no proficiency levels |

Wording describes participation ("worked on", "contributed to", "involved in"), never sole ownership, scale or impact. No internal names, URLs, customers or figures.

## Open questions for the owner (nothing below is published)

1. **Name** as it should appear (currently "Achchutan S").
2. **Contact:** an email address and/or LinkedIn to show, or none. None is shown now.
3. **Internship title** (shown as "Intern").
4. **Degree and years:** degree name (for example B.Tech) and graduation year for SASTRA University.
5. **AI projects:** your role, and whether each was production work or a prototype. Shown as "Involved in AI-related projects".
6. **Certifications or achievements** to list. None is shown.
7. **Location**, if you want one shown.
8. **"Built with AI coding assistance"** in the Orrery project description: keep, reword or remove.
9. **Section on the Index:** the resume is filed under a new "Profile" section, but as the last entry in catalog order the Index's documented rule makes it "Worth the detour". Move it earlier in `packages/experience-catalog/src/index.ts` if you prefer.

## Publishing, once approved

1. Edit `content.ts`, then run `pnpm --filter @pu/site resume:assets` and `pnpm test`.
2. In `config/release.json` (or the Control Center), set `resume` to `published`, access `public`, discoverability `listed`.
3. `pnpm check`, commit, open a pull request, check the preview, merge. Production then serves `/resume`, the PDF and the image; the Index and palette list it automatically. A local publish simulation (production build with that release state) showed the canonical URL, `og:image` → `/resume/og.png`, `twitter:card` `summary_large_image`, the Index link and the palette entry.
