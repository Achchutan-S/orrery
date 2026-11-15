# ADR-026 — Content belongs to the experience that presents it

Status: accepted (13 November 2026) · Implements blueprint decision D14 · Supersedes [ADR-009](adr-009-git-content.md) · Written by an agent after the decision it implements; the owner accepts this text by merging the pull request that adds it

## Context

ADR-009 planned one platform-owned `writing` collection in `apps/site/content`, gated by one `isPublishable()` function, with a search index, RSS and tag pages built from it. It was never built. The Journal keeps its chapters in its own folder, the Skills Archive keeps its entries and source files in its own, and Divya Chakshu keeps its text in `content.ts`. Each is released by its catalog entry and `config/release.json`, like any other experience.

## Decision

1. Long-form content belongs to the experience that presents it and lives in that experience's folder. There is no platform content collection.
2. A shared collection is a kernel module, so the kernel rule applies: it appears only when two experiences present the same corpus.
3. RSS, tag pages and content search stay unbuilt until they have a reason. The sitemap is not part of this: it lists experiences, not content, and is built from `publicDiscoveryIndex()` (`apps/site/src/pages/sitemap.xml.ts`).
4. `@astrojs/mdx` stays installed: the Journal uses it.

## Alternatives considered

- *Build ADR-009's collection now:* no second consumer, and it would give the platform an opinion about how writing is structured.
- *Keep ADR-009 accepted and unbuilt:* an accepted decision nobody follows is misleading.

## Consequences

- Release state gates content only through the experience that holds it. A draft essay inside a published experience is that experience's own concern (the Journal has none).
- Nothing in the code changes.
