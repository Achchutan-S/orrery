---
noteId: "3df00ca0d5f211f1ae605f8c0e08bb6f"
tags: []

---

# ADR-013 — KawaiUI and Dev X-Ray as external experiences; Task 8 samples

Status: accepted (1 November 2026) · Builds on ADR-004, ADR-008, ADR-012.

## External projects

**Decision:** KawaiUI (`kawaiui`, https://kawaiui.vercel.app/) and Dev X-Ray (`devxray`, https://devxray-one.vercel.app/) are `external` catalog entries with `published`, `public`, `listed` release entries. They replace `external-fixture`. Neither repository nor deployment is touched; nothing of theirs is built here.

- Titles, summaries and tags were written from an inspection of the live sites in Chromium (Playwright) on 1 November 2026: landing pages at 1280px and 390px, one room in KawaiUI, the JSON tool and the "Why" and "Self-hosting" pages in Dev X-Ray. KawaiUI calls itself "UI Lab"; it is the blueprint's UI Lab. Counts shown on the sites (exhibits, tools) were left out of the copy because they change.
- **Schema change:** external `url` must be `https:`. `z.url()` alone accepted `javascript:`, `data:` and `http:` URLs, and the URL becomes an `href` on public pages. Tested in `validate.test.ts`.
- The index marks external entries by an icon, a dashed underline and the line "Leaves Personal Universe for <host>." The line is also the link's accessible description; the accessible name ends "(external site)". Links open in the same tab. Browser tests check the exact `href`, the announcement and that a click reaches that URL (answered by a local stub, so tests never depend on the live apps).
- **Not done:** subdomains on the primary domain (`uilab.<domain>`, `devxray.<domain>`) wait for the domain (blueprint task 15). The catalog URL changes then; nothing else does.

## Task 8 samples

- `sample-content` is a short real essay ("How a page reaches you"), zero JavaScript, with its own serif tokens (`--sc-*`).
- `sample-app` is a lifecycle explorer: seven state views plus an overview, all prerendered from one route table (`views.ts`) that `getStaticPaths` and the in-app router share. Facts are computed at build time from `platform-schema` (`facts.ts`) and passed as props, so the island imports nothing from the schema, catalog or release state (island JavaScript: about 1.7 KB gzip plus React).
- **Router:** a 40-line history router (`router.tsx`): `pushState`, `popstate`, real `<a href>` links that fall back to normal navigation on modified clicks. Focus moves to the new `<h1>` and `document.title` updates after in-app navigation. No router dependency; adopt one when an experience needs nested layouts or loaders.
- **Islands render on the server** (`client:load`, not `client:only`), so every view's content is in the HTML before JavaScript runs.
- **Build flag `inspector`:** preview true, production false; read in frontmatter with `flag()`. In production the panel is not rendered, but its code is still in the island chunk: flags are not secrecy, and the panel shows only the visitor's own URL state.
- **`sample-hostile`** is a permanent draft fixture whose stylesheet is `@layer experience { * { all: unset } }`. Browser tests prove that after visiting it, other experiences' computed styles match a build that does not contain it, against fixed anchors too.

## Focus ring made non-overridable

`sample-hostile` showed that `all: unset` in the experience layer removed the platform focus ring on its own page. The ring's declarations in `platform.reset` are now `!important`, which in the first layer outranks every later layer (the same mechanism as reduced motion). Blueprint J: freedom stops at accessibility. Consequence: experiences cannot restyle the focus ring; they can add to it.
