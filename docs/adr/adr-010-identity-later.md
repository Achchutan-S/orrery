# ADR-010 — Identity, authorization and analytics designed now, built later

Status: accepted

**Decision:** reserved prefixes, schema fields, `authorize()` and `track()` exist before their implementations.

**Implementation notes:** the "single switch" is `PlatformOptions.protectedRendering` in `platform-schema` (`PHASE_0` = off). With it off, `signed-in` and `policy` access and on-demand routes fail validation; reserved prefixes are rejected now.

## Founding context

As written in blueprint revision 2 § 6 on 30 October 2026 ("Identity, authorization and analytics are designed now, built later"); phase numbers are revision 2's ([blueprint phase table](../blueprint.md#what-changed-from-revision-2)). Facts implementation later changed are recorded in the status line and later ADRs.

- **Context:** future restricted audiences and audit needs; no current users.
- **Decision:** reserve route prefixes, schema fields, the `authorize()` interface and the `track()` facade now. In Phase 4 choose a managed identity provider (default) or a self-operated library; grants, invites, sessions and audit live in one small database; analytics stay cookieless and anonymous, with no replay.
- **Alternatives:** build auth now (no users to protect); vendor SDKs directly in experiences (lock-in, privacy drift).
- **Trade-offs:** some interfaces exist before their implementation.
- **Consequences:** introducing Phase 4 changes the kernel and on-demand routes, but no public experience.
- **Revisit when:** the first piece of genuinely private content needs sharing.
