---
noteId: "e68a5f01d5de11f1ae605f8c0e08bb6f"
tags: []

---

# ADR-005 — Four release dimensions; channels derived; three environments

Status: accepted · Source: [blueprint §6 ADR-005](../blueprint.md#adr-005--four-release-dimensions-channels-derived-three-environments)

**Decision:** lifecycle, access, discoverability and flag values are stored separately; channels are derived (`channelOf`); environments are development, preview, production.

**Implementation choices where the blueprint was open** (`packages/platform-schema`)
- `environmentFrom(VERCEL_ENV)`: unset means development; an unknown value throws instead of guessing, because a guess could mount drafts in a production build.
- `listed` requires public access in every environment. A static listing is the same for every visitor, so owner-access drafts are reachable by URL in previews but never listed.
- `deprecated` with `listed` is a validation error, and `applyPatch` sets `unlisted` when it transitions to `deprecated`, so the stored file always says what production does.
- `applyPatch` checks only lifecycle edges; every other rule is `validateRelease`, run on the result, the same function for build and Control Center.
