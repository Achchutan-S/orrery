# ADR-001 — Astro 6 as the host framework

Status: accepted; version pin superseded by [ADR-011](adr-011-astro-7.md)

**Decision:** Astro hosts every experience; React 19 only inside islands and client-only sub-apps.

**Implementation notes:** versions and the move to Astro 7 are in ADR-011.

## Founding context

As written in blueprint revision 2 § 6 on 30 October 2026 ("Astro 6 as the host framework"); phase numbers are revision 2's ([blueprint phase table](../blueprint.md#what-changed-from-revision-2)). Facts implementation later changed are recorded in the status line and later ADRs.

- **Context:** mostly content and visual experiments, a minority of interactive apps, future server-side gating, a solo maintainer.
- **Decision:** Astro 6 with React islands and client-only React sub-apps for application-like experiences.
- **Alternatives:** *Next.js 16*: strongest for authenticated apps, but every page carries React, and it brings Server Component and caching-model complexity to small experiments. *Vite + React Router SPA*: one document and runtime for everything, client-rendered metadata, no server layer. *React Router 7 or TanStack Start in SSR mode*: viable, but React-everywhere like Next.js with a smaller ecosystem. *Eleventy or Hugo*: excellent for content, poor for React apps and server gating.
- **Trade-offs:** zero-JS content, per-route rendering choice and document-level isolation, at the cost of full-page navigation between experiences, separate React roots per island, one React version, and dependence on a Cloudflare-owned project.
- **Consequences:** application experiences mount a React sub-app on a catch-all route (`/cloud/[...path]`) with `client:only="react"` and their own client router; cross-island state uses a small store or a single larger island.
- **Revisit when:** more than half of experiences become authenticated, data-driven applications (Next.js becomes the better host), or Astro's Vercel support degrades.
