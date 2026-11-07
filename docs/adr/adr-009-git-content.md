# ADR-009 — Git-based content with collections and MDX

Status: accepted, not built: no `writing` collection exists, and the Journal and the Skills Archive own their content; blueprint decision D14 proposes superseding it (not decided)

**Decision:** one `writing` collection, draft by default, gated by one `isPublishable(entry, env)` function. `@astrojs/mdx` is installed now so the spike covers the full integration set.

## Founding context

As written in blueprint revision 2 § 6 on 30 October 2026 ("Git-based content with collections and MDX"); phase numbers are revision 2's ([blueprint phase table](../blueprint.md#what-changed-from-revision-2)). Facts implementation later changed are recorded in the status line and later ADRs.

- **Context:** publish freely without a CMS.
- **Decision:** one `writing` collection with typed frontmatter and a draft-by-default lifecycle; static search index generated from built HTML; RSS; OG images at build time.
- **Alternatives:** headless CMS (cost, vendor, unnecessary for one author); Notion or Google Docs as source (fragile export, private-data risk).
- **Trade-offs:** publishing needs a commit; no mobile editing in V1.
- **Consequences:** drafts never reach production output because one function gates pages, RSS, sitemap and search.
- **Revisit when:** you want to publish from a phone regularly.
