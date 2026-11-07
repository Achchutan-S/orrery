# ADR-009 — Git-based content with collections and MDX

Status: accepted, not started (Phase 1–2) · Source: [blueprint §6 ADR-009](../blueprint.md#adr-009--git-based-content-with-collections-and-mdx)

**Decision:** one `writing` collection, draft by default, gated by one `isPublishable(entry, env)` function. `@astrojs/mdx` is installed now so the spike covers the full integration set.
