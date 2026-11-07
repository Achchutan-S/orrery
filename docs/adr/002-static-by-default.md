# ADR-002 — Static by default; on-demand only for protected and API routes

Status: accepted · Source: [blueprint §6 ADR-002](../blueprint.md#adr-002--static-by-default-on-demand-only-for-protected-and-api-routes)

**Decision:** `output: 'static'`, no Vercel adapter in Phases 0–3; headers, clean URLs and redirects live in `apps/site/vercel.json`.

**Implementation notes**
- `platform-schema` rejects any `render: 'on-demand'` route while `protectedRendering` is off (rule `on-demand-phase-4`), so the static guarantee is checked, not assumed.
- Node is `>=22.23.4`, Astro 7's minimum (ADR-011). Tests also rely on Node's built-in TypeScript type stripping, which that version has.
