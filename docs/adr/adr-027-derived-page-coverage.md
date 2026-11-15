# ADR-027 — Browser coverage and test lists are derived from the build

Status: accepted (13 November 2026) · Implements blueprint decision D12 and closes contract gap G7 · Written by an agent after the decision it implements; the owner accepts this text by merging the pull request that adds it

## Context

The generic accessibility checks ran on a hand-written list of eight paths, and several tests pinned the catalog's ids or each experience's pages. A new experience was unchecked until its author edited those lists; adding one draft (A History of Seeing, on a branch) took edits to eight shared files. The 2026-11-13 audit also found a published page that scrolled sideways at 768 px, a width no test visited.

## Decision

1. `samplePages()` in `tools/checks/src/routes.ts` derives the pages to visit from a build's HTML files: every page of a parameter-free route, and the first and last page (by name) of each dynamic route. Sampling keeps the browser job inside its 25-minute limit while visiting every kind of page.
2. `apps/site/test-browser/browser.test.ts` visits those pages of the production build, its hand-listed stateful addresses (a query string, an unknown path), and the pages of any draft that exists only in the preview build, with: axe (light and dark, desktop and phone), axe best practices, one `h1` and one `main`, heading order, text spacing, forced-colours focus, and reflow at 320, 640, 768 and 1024 px. The permanent fixtures `canary-draft` and `sample-hostile` are excluded: they are not pages for readers.
3. Tests no longer pin the catalog's full id list or the folder list; they assert the invariants (the permanent fixtures and external projects exist; the fixtures are never in production). `pipeline.test.ts` keeps exact page lists only for experiences whose pages come from a table it can read (Journal chapters, sample-app views, Archive shelves and entries); every other experience's pages are whatever its routes built.
4. "Scripts only on named experiences" became a rule: a `content`-class page ships no script of its own.

## Alternatives considered

- *Visit every page:* the Archive alone has a page per skill and shelf; run time would grow with content, not with kinds of page.
- *Keep hand lists:* a contract requirement that is not checked for new pages is a promise, not a gate.

## Consequences

- Adding an experience needs no edit to a shared test file. Interactions still need the experience's own browser suite (contract § 8.4).
- A draft's pages are held to the generic checks as soon as they build, so an inaccessible draft fails CI before anyone thinks of publishing it.
- The middle page of a dynamic route is not visited by the generic checks; an experience whose pages differ in kind within one route covers them in its own suite.
