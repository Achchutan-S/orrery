# ADR-002 — Static by default; on-demand only for protected and API routes

Status: accepted

**Decision:** `output: 'static'`, no Vercel adapter in Phases 0–3; headers, clean URLs and redirects live in `apps/site/vercel.json`.

**Implementation notes**
- `platform-schema` rejects any `render: 'on-demand'` route while `protectedRendering` is off (rule `on-demand-phase-4`), so the static guarantee is checked, not assumed.
- Node is `>=22.23.4`, Astro 7's minimum (ADR-011). Tests also rely on Node's built-in TypeScript type stripping, which that version has.

## Founding context

As written in blueprint revision 2 § 6 on 30 October 2026 ("Static by default; on-demand only for protected and API routes"); phase numbers are revision 2's ([blueprint phase table](../blueprint.md#what-changed-from-revision-2)). Facts implementation later changed are recorded in the status line and later ADRs.

- **Context:** static files cost nothing per request and have no attack surface; Vercel Hobby limits functions to 1M invocations and 4 active CPU-hours per month. Astro's Vercel guide states that a static Astro site needs the adapter only to use additional Vercel services such as Web Analytics or Image Optimization.
- **Decision:** `output: 'static'` with **no adapter in Phases 0–3**; headers, clean URLs and redirects come from `apps/site/vercel.json`; Vercel Web Analytics uses its component, which needs no adapter. Add `@astrojs/vercel` in Phase 4a with the first on-demand route. From then on, routes opt into on-demand rendering only for protected experiences, `/me`, invites, auth and experience APIs.
- **Alternatives:** the adapter from day one (my earlier plan: an extra build-output layer whose interaction with `vercel.json` would need verifying, for no benefit while everything is static); server output everywhere (needless cost and risk).
- **Trade-offs:** a deliberate deployment-shape change in Phase 4a; a CSP delivered by `<meta>` tag cannot carry `frame-ancestors`, so that directive is a `vercel.json` header.
- **Consequences:** Phases 0–3 have no runtime code path at all. Node 22 (required by Astro 6) is pinned in `.nvmrc`, `engines` and the Vercel project.
- **Revisit when:** Phase 4a starts (verify `vercel.json` headers and rewrites still apply alongside the adapter's build output, or move them to the adapter's `staticHeaders` and middleware), or Hobby's non-commercial terms stop fitting.
