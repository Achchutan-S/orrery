# ADR-007 — Presentation ownership and CSS isolation

Status: accepted; implemented in task 7 ([ADR-012](adr-012-platform-layer.md))

**Decision:** document-per-page isolation; layers `platform.reset, platform.tokens, platform.chrome, experience`; experience styles scoped by `data-experience`; native cross-document View Transitions.

## Founding context

As written in blueprint revision 2 § 6 on 30 October 2026 ("Presentation ownership and CSS isolation"); phase numbers are revision 2's ([blueprint phase table](../blueprint.md#what-changed-from-revision-2)). Facts implementation later changed are recorded in the status line and later ADRs.

- **Context:** experiences need radically different identities without breaking each other.
- **Decision:** document-per-page isolation; cascade layers `platform.reset, platform.tokens, platform.chrome, experience`; experience styles scoped by `data-experience`; tokens limited to accessibility and identity; native cross-document View Transitions.
- **Alternatives:** a shared design system (contradicts the vision); Shadow DOM per experience (heavy, hurts SEO tooling and fonts); Astro's client router (reintroduces shared document state).
- **Trade-offs:** no automatic visual consistency; repeated small styles across experiences.
- **Consequences:** an experience may use Tailwind, vanilla CSS or CSS Modules independently; Tailwind's base styles affect only that experience's documents.
- **Revisit when:** three or more experiences copy the same component (move it to `platform/ui` as opt-in).
