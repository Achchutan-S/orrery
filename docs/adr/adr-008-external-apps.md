# ADR-008 — Existing apps stay external, reached by subdomain

Status: accepted

**Decision:** UI Lab and Dev X-Ray are `external` catalog entries; their repositories are never modified. `resolve()` never mounts an external entry, but lists it when its release entry allows.

## Founding context

As written in blueprint revision 2 § 6 on 30 October 2026 ("Existing apps stay external, reached by subdomain"); phase numbers are revision 2's ([blueprint phase table](../blueprint.md#what-changed-from-revision-2)). Facts implementation later changed are recorded in the status line and later ADRs.

- **Context:** UI Lab and Dev X-Ray must not be redeveloped.
- **Decision:** register them as `external` experiences; serve them at `uilab.<domain>` and `devxray.<domain>` by adding domains to their existing Vercel projects.
- **Alternatives:** path rewrites (needs base-path support and shares the primary origin; for an installable app, service-worker scope and manifest changes); iframes (poor UX for full apps); migration into the monorepo (redevelopment).
- **Trade-offs:** URLs are subdomains rather than paths; analytics are per project.
- **Consequences:** zero changes to either codebase; real origin isolation.
- **Revisit when:** a path URL matters enough to justify a base-path change in that app.
