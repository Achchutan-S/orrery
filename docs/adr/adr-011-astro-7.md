# ADR-011 — Upgrade the host to Astro 7

Status: accepted (1 November 2026) · Supersedes the version pin in ADR-001; the framework choice in ADR-001 stands.

**Context:** Astro 7.0 shipped on 22 June 2026, after the blueprint chose Astro 6. Staying on 6 would start the platform on a superseded major.

**Decision:** `astro@7.4.4`, `@astrojs/react@7.1.2`, `@astrojs/mdx@8.1.2`, Node `>=22.23.4`.

**Evidence**
- [Upgrade guide](https://docs.astro.build/en/guides/upgrade-to/v7/) breaking changes: Vite 8 (Rolldown); Rust compiler (stricter HTML); `src/fetch.ts` reserved; Sätteri is the default Markdown processor; `compressHTML` defaults to `'jsx'`; `@astrojs/db` and `astro:transitions` internals removed. None touches the integration API, `injectRoute`, `output: 'static'`, `build.format` or `trailingSlash`.
- [Install docs](https://docs.astro.build/en/install-and-setup/): "Node.js `v22.23.4` or higher. Odd-numbered versions like `v23` are not supported." npm `engines` for astro, @astrojs/react and @astrojs/mdx agree.
- Every routing spike test passed unchanged on 7.4.4 before any other change (7/7), then again as the pipeline test (`apps/site/test/pipeline.test.ts`).
- `astro check` passes with TypeScript 6.0.3. TypeScript 7 is out, but `@astrojs/check@0.9.12` accepts only `^5 || ^6`, so 6 stays.

**Consequences**
- Node: `.nvmrc` stays `22` (resolves to 22.23.4 or later); root `engines.node` is `>=22.23.4`; the Vercel project uses Node 22.x (runbook). CI (task 10) must use `.nvmrc`.
- No `src/fetch.ts` may be created without reading Astro's advanced-routing docs.
- Markdown with remark or rehype plugins needs `@astrojs/markdown-remark` and `markdown.processor: unified()` (decide in Phase 2).
- The `packageExtensions` workaround (ADR-003) is still needed: on Astro 7 `astro check` loads without it only because another package happens to install `@emnapi/runtime`; `@astrojs/astro2tsx@0.1.3` still does not declare it.
