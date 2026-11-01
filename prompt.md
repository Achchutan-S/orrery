# Personal Universe — Task 7: Shared Platform Layer

You are continuing development of Personal Universe.

Tasks 1–6 are complete. Astro 7, the workspace, platform schemas, experience catalog, release configuration and catalog-driven route integration are implemented and verified.

The next milestone is Task 7: the shared platform layer.

Read the complete `docs/blueprint.md`, `AGENTS.md`, `CLAUDE.md`, relevant ADRs and `docs/tracker.md` before making changes.

Do not assume this prompt overrides the architecture blueprint.

## 1. Start with architecture inspection

Inspect:

- Current workspace and package boundaries.
- `platform-schema` and `experience-catalog`.
- `mount-experiences` integration.
- Existing sample experiences.
- Current Astro layout and styling setup.
- Release and environment resolution.
- Existing test conventions.

Identify exactly where the shared platform layer should live.

Do not introduce another package or abstraction unless the blueprint requires it or you can demonstrate a concrete architectural need.

Before coding, produce a short implementation plan showing:

- Components and files to create.
- Existing files to modify.
- Dependency direction.
- Public interfaces.
- Testing strategy.

## 2. Design process — mandatory

This is the first real visual-design milestone.

Use the installed skills:

- `frontend-design`
- `web-design-guidelines`

Read their instructions and apply them rather than merely mentioning them.

Do not generate a generic AI portfolio, SaaS dashboard or template-driven personal website.

### Establish a distinct visual identity

Before implementing the UI:

1. Explore at least three genuinely different visual directions.
2. Explain the design rationale for each.
3. Consider typography, layout, density, navigation, colour, surfaces, motion and interaction.
4. Evaluate how each direction could support a growing collection of very different experiences.
5. Select the strongest direction and explain why.
6. Produce a concise design-system specification.
7. Sketch the discovery index and shared page wrapper structure.
8. Critique the design against the frontend-design and web-design-guidelines principles before implementation.

Avoid predictable design shortcuts:

- Generic centred hero with a gradient.
- Excessive rounded cards.
- Repeated identical card grids.
- Default Inter-style typography without a reason.
- Random decorative gradients and blobs.
- Unnecessary animations.
- Generic dark developer portfolio aesthetics.

The visual identity should feel deliberate, technically thoughtful and recognisable.

Do not imitate an existing website. Use references only to understand design principles.

## 3. Shared page wrapper and metadata

Implement the page wrapper specified in the blueprint.

Requirements:

- Consistent document structure and metadata.
- Correct page titles and descriptions.
- Semantic landmarks.
- Sensible default responsive behaviour.
- Accessible focus states.
- Support for individual experience layouts.
- No assumption that every experience must look like the discovery index.
- No unnecessary client-side JavaScript.
- Correct handling of missing metadata.

Keep experience-specific presentation separate from platform-wide responsibilities.

## 4. CSS architecture and tokens

Implement the CSS layer order and accessibility tokens.

Define a coherent foundation for:

- Typography.
- Colour and contrast.
- Spacing.
- Layout constraints.
- Borders and surfaces.
- Focus indicators.
- Reduced motion.
- Responsive behaviour.
- Selection and interaction states.

Requirements:

- Explicit CSS layer order.
- Avoid global selectors that unexpectedly break independent experiences.
- Make tokens reusable without forcing identical visual treatments.
- Respect `prefers-reduced-motion`.
- Support keyboard navigation.
- Ensure visible focus indicators.
- Avoid using colour as the only means of communicating state.
- Verify contrast for text and interactive elements.

Keep the token system intentionally small. Do not create dozens of speculative tokens.

### Optional colophon

Implement the optional colophon only if it fits the selected direction and the blueprint's scope. It should add meaning rather than decorative noise.

## 5. Public discovery index

Implement the discovery index according to the blueprint.

It must:

- Read from the typed experience catalog and resolved release information.
- Display only experiences eligible for public discovery.
- Respect listed/unlisted/deprecated behaviour.
- Never expose owner-only or restricted draft metadata.
- Render external experiences as links, not local mounted applications.
- Include the external fixture as a link.
- Avoid duplicating catalog information in UI-specific arrays.
- Use semantic HTML and accessible navigation.
- Work without JavaScript for its essential content and navigation.

The discovery index is not a CMS or a database. Keep it static and deterministic.

## 6. Platform API stubs

Implement the platform interfaces:

### `track()`

- Provide a typed interface.
- No-op implementation for now.
- Must not send analytics data.
- Must not introduce cookies or tracking scripts.
- Make future implementation possible without changing every experience.

### `authorize()`

- Provide a typed interface and explicit stub behaviour.
- Do not pretend to authenticate or authorize real users.
- Do not use client-side checks as a security boundary.
- Clearly document what the stub does and does not guarantee.
- Do not introduce authentication infrastructure in this task.

The interfaces should be small and stable, not speculative frameworks.

## 7. Quality requirements

Test:

- Page metadata.
- Shared wrapper rendering.
- Discovery filtering.
- External link rendering.
- Exclusion of unlisted and owner-only experiences.
- Accessibility fundamentals.
- Token and CSS layer integrity where testable.
- `track()` no-op behaviour.
- `authorize()` stub behaviour.
- Production output and JavaScript footprint.

Run the Vercel Web Interface Guidelines against the implemented UI.

Use browser-based checks where practical. Do not claim visual or accessibility verification merely because TypeScript passes.

Do not add dependencies without explaining why existing capabilities are insufficient.

## 8. Scope boundaries

Do not implement:

- Full Control Center UI.
- Authentication.
- Private content.
- Database or CMS.
- Real analytics.
- Beacon command palette unless the blueprint explicitly includes it in this task.
- Full resume.
- Additional real experiences.
- External UI Lab or Dev X-Ray code.

Those belong to later tasks.

## 9. Final verification

Run:

- Clean frozen install.
- Full tests.
- Full typecheck.
- Production build.
- Production artifact leak scan.
- Relevant accessibility checks.
- Browser checks for the discovery index and representative experience routes.

Update documentation and the tracker.

If the design or architecture requires an important deviation, document it in an ADR.

Do not commit without approval.

## 10. Completion report

At the end, provide:

1. Final visual direction and rationale.
2. Design tokens and CSS architecture.
3. Shared platform interfaces.
4. Discovery index behaviour.
5. Files created and modified.
6. Tests and verification results.
7. Accessibility findings.
8. Performance and JavaScript observations.
9. Deviations from the blueprint.
10. Remaining risks and next task.

The objective is to establish a shared foundation that makes Personal Universe feel like one coherent platform while allowing each experience to have its own personality.

Do not sacrifice design quality for speed, and do not sacrifice architectural clarity for visual effects.
