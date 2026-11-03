---
noteId: "84d685d0d6a711f1ae605f8c0e08bb6f"
tags: []

---

# ADR-021 — Platform integrity: implemented chrome only, a permanent island fixture, one Node policy, a committed platform font

Status: accepted (2 November 2026) · Engineering audit Phase B (F16, F09, F10, F14, F15). Supersedes [ADR-012](012-platform-layer.md) decisions 4 and 7 and [ADR-016](016-vercel-deployment.md) decision 5 in the points below.

**Decision.**

1. **`chrome` accepts only what is implemented: `minimal` and `beacon`.** The blueprint's `full` (a shared header) has no consumer, and ADR-012 let it validate and then fail the Astro build. The schema now rejects it, with a message naming the supported values, so `validateCatalog`, the Control Center and `pnpm check:metadata` report it before anything builds. Add `full` back to the enum together with its implementation, when an experience needs it.
2. **`sample-app` is a permanent regression fixture**, not a sample to delete in task 16 (owner decision, 2 November 2026). It is the only React island, and the production checks need real island output: React only on island pages, the interactive budget class, the leak scan of island chunks, the error boundary. It stays published, public and listed (the release state is unchanged); its catalog entry says it is a fixture, and a catalog test fails if its shape drifts or it disappears. Remove it only after another island takes over that coverage.
3. **Each island contains its own render errors.** `sample-app` wraps its root in a local `ErrorBoundary` with an accessible fallback that shows no error details. It stays in the experience until a second island needs one (a kernel module needs two users).
4. **One Node policy.** `.nvmrc` names `22.23.4`; the root, `apps/site` and `apps/control` all declare `engines.node: ">=22.23.4 <23"`; `pnpm-workspace.yaml` sets `engineStrict: true`, so installing with another Node (including 24) fails; CI reads `.nvmrc`. Vercel maps a semver range to its major (its Node.js versions page: "a valid semver range" deploys the latest matching major), so the site still builds on 22.x; this replaces ADR-016's `22.x`. A test (`tools/checks/src/node-policy.test.ts`) keeps the four in agreement.
5. **The platform font is a committed file.** Astro's Google provider downloaded Atkinson Hyperlegible Next at build time; offline, the build still succeeded but shipped pages with no `@font-face` at all. The file is now `apps/site/src/platform/fonts/atkinson-hyperlegible-next-latin.woff2`, served through Astro's local provider at the same weights (400, 700), unicode range and `font-display: swap`.

**Provenance (decision 5).** Downloaded on 2 November 2026 from Google Fonts, the font's official distribution: `https://fonts.gstatic.com/s/atkinsonhyperlegiblenext/v7/NaPNcYPdHfdVxJw0IfIP0lvYFqijb-UxCtm5_wdGseiJn3q0pkZ_.woff2` (the latin subset the CSS API serves for weights 400 and 700). SHA-256 `1e4cea71d75ec427581d6259fc07148a2e60d60d16cabf4b4f5360487b3f9dc3`, 34,024 bytes: identical to the file the Google provider had been shipping, so pages, metrics and the resume PDF do not change. Licence: SIL Open Font License 1.1, `OFL.txt` beside the font, from `github.com/google/fonts/ofl/atkinsonhyperlegiblenext/`. Copyright 2020–2024 The Atkinson Hyperlegible Next Project Authors.

**Consequences.** A catalog entry with `chrome: 'full'` is a validation error. The build needs no network for fonts. Covering more scripts than latin means adding the matching subset file and its unicode range. Installing under Node 24 fails until the policy changes in a new ADR.
