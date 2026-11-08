# ADR-025 — The checks recognise the output of the first immersive experience

Status: proposed (8 November 2026), pending the owner · Corrects the measurement of [ADR-023](adr-023-audit-closure.md) decision 1; the budgets themselves are unchanged.

## Context

ADR-023 made `check:budgets` measure each page's largest lazy chunk (a dynamic `import()` with its own static imports, minus what the page already loaded) and treat any emitted file that no page loads, and no `FILE_BUDGETS` entry names, as a finding. Until Divya Chakshu no released page used a dynamic import, so the code path had only run against hand-written fixtures.

Divya Chakshu loads its WebGL engine and its sound with dynamic imports. Vite writes these with a template literal, ``import(`./engine.Ab12Cd34.js`)``, and the checker's pattern accepted only `"` and `'` quotes. Measured on a preview build, the page reported a lazy size of 0 KB while emitting a 12.9 KB (gzip) engine chunk. In a production build the same chunk would have been reported as "emitted but loaded by no page", so publishing the first page with a real lazy chunk would have failed the build gate for a reason that was the checker's, not the page's.

## Decision

1. The dynamic-import pattern in `tools/checks/src/budgets.ts` accepts backticks as well as quotes: `` import(`./x.js`) `` is a lazy root, measured like `import("./x.js")`.
2. `measurePage` also returns `later`: every lazy chunk the page may load afterwards (and their static imports), excluding what it loaded first. `fileFindings` counts those as loaded, so a lazy chunk is measured by its page's `lazy` budget instead of being reported as an orphan.
3. A test in `budgets.test.ts` builds a page whose entry imports a chunk with a template literal and asserts both: the chunk is the page's `lazy` size, and it produces no "loaded by no page" finding.

4. **The production output allowlist** (`tools/checks/src/leaks.ts`) accepts the name Astro gives a page `<script>` that is too large to inline: `_astro/<component>.astro_astro_type_script_index_<n>_lang.<8-character hash>.js`. Earlier pages' scripts were small enough to be inlined, so this name had never reached a production build; the first `pnpm build:production` with Divya Chakshu released failed `check:leaks` on its 11 KB page script. Only that fixed suffix is added: an unhashed name, a bare `.astro` name or any other extra dot still fails, and the hashed file is still scanned for unreleased bytes and canaries like every other asset (`leaks.test.ts`).

## Alternatives

- **Add lazy chunks to `FILE_BUDGETS`.** Rejected: it would measure the chunk against a file-kind limit instead of the page's class budget, and hide which page loads it.
- **Configure Vite to emit quoted dynamic imports.** Rejected: a build setting to suit a regular expression, affecting every experience.
- **Shrink or split the page script until Astro inlines it, or rename chunks with a Vite `output.chunkFileNames` rule.** Rejected: the first ties an experience's code size to a checker's naming rule; the second changes asset names for every experience.

## Consequences

- Lazy budgets now apply to real output: `immersive` pages may load up to 8,192 KB lazily, `interactive` pages 100 KB, `content` and platform pages nothing. Divya Chakshu measures 12.9 KB lazily (engine) and 4.1 KB of initial JavaScript.
- Template literals with interpolation (``import(`./${name}.js`)``) are still not followed; Vite does not emit them for static imports, and a checker that cannot resolve a chunk reports it as unloaded rather than passing it silently.
