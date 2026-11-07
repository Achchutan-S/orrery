# ADR-014 — Repository checks in `tools/checks`

Status: accepted (1 November 2026); known limit 1 (og:image) superseded by [ADR-022](adr-022-link-previews-smoke-and-public-repository.md) · Implements blueprint task 9 (§5 `tools/checks`, 3.8, 3.12, 7.2). How to run them: [repository-checks.md](../repository-checks.md).

**Decision:** four checks — leaks, budgets, metadata, boundaries — live in the workspace package `@pu/checks` (`tools/checks`), each a pure function plus a small CLI. They read build output and source files; they change nothing at runtime.

## Deviations and choices

1. **A custom boundary checker instead of ESLint + dependency-cruiser** (blueprint §5). Neither is installed; the rules are eight, and two of them need repository knowledge a linter config cannot express cleanly: which files are browser code (island components found from `client:*` directives, followed transitively) and which packages a catalog entry owns (`exclusiveImports`). The checker is about 200 lines with positive and negative fixtures. Revisit if rules outgrow it or editor integration becomes worth a linter.
2. **One definition of a valid platform.** The catalog + release + folder-coverage validation that the build ran inside `mount-experiences` moved into `platform-schema` as `validatePlatform()`. The build and `check:metadata` both call it.
3. **The JSON Schema generator moved** from `platform-schema` to `tools/checks/src/release-schema.ts`, with its staleness test, so `platform-schema` depends on zod alone (now enforced by `schema-deps`).
4. **Titles and summaries may not be blank** (`trim().min(1)` in the definition schema): discovery would render an unlabelled entry.
5. **Flag-gated UI is marked** with `data-pu-flag="<experience>:<flag>"` on its root element. The leak scan fails if a production page renders a marker for a flag that is off in production. The flag's code may still ship in the island chunk (ADR-004), and the scan allows that.
6. **Budgets for fonts and total transfer** are not in the blueprint; they are set from the measured 1 November 2026 build and documented next to the table in `budgets.ts`. JS and CSS limits are the blueprint's (3.12); the platform pages use the Beacon's 15 KB JS budget.

## Known limits

- **og:image is not enforced.** The Foundation checklist requires it, but no page has one; per-entry OG images arrive with Phase 2 (blueprint 3.10). `check:metadata` enforces title, description, og:title, og:description, `lang`, and canonical/noindex consistency.
- **The leak scan reads text files only** (HTML, JS, CSS, JSON, XML, SVG, maps). A canary inside an image or font is not detected; such files should not be in `public/` (blueprint 7.5).
- **Images are not measured** by the budget check; there are none yet.
- **Per-experience JS is reported per page, not by chunk owner.** Astro's output does not say which experience a shared chunk belongs to; each page counts everything it loads.
- **The boundary checker uses regular expressions**, not a TypeScript parser: imports built from template strings or computed specifiers are invisible to it. None exist; the checker reads static strings only.
