# ADR-005 — Four release dimensions; channels derived; three environments

Status: accepted

**Decision:** lifecycle, access, discoverability and flag values are stored separately; channels are derived (`channelOf`); environments are development, preview, production.

**Implementation choices where the blueprint was open** (`packages/platform-schema`)
- `environmentFrom(VERCEL_ENV)`: unset means development; an unknown value throws instead of guessing, because a guess could mount drafts in a production build.
- `listed` requires public access in every environment. A static listing is the same for every visitor, so owner-access drafts are reachable by URL in previews but never listed.
- `deprecated` with `listed` is a validation error, and `applyPatch` sets `unlisted` when it transitions to `deprecated`, so the stored file always says what production does.
- `applyPatch` checks only lifecycle edges; every other rule is `validateRelease`, run on the result, the same function for build and Control Center.

## Founding context

As written in blueprint revision 2 § 6 on 30 October 2026 ("Four release dimensions; channels derived; three environments"); phase numbers are revision 2's ([blueprint phase table](../blueprint.md#what-changed-from-revision-2)). Facts implementation later changed are recorded in the status line and later ADRs.

- **Context:** visibility, lifecycle, flags and authorization were being conflated.
- **Decision:** store lifecycle, access, discoverability and flag values separately; derive channels from lifecycle; environments are development, preview and production.
- **Alternatives:** a single `visibility` enum (conflates concerns); stored channels (duplicate lifecycle); alpha and beta deployments (more projects and domains for no security gain before Phase 4).
- **Trade-offs:** more fields to understand, offset by validation rules that reject incoherent combinations.
- **Consequences:** before Phase 4, only public-access experiences in beta or later reach production; alphas live in protected previews.
- **Revisit when:** a real need appears for scheduled releases or percentage rollouts.
