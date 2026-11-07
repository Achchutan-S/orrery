# ADR-008 — Existing apps stay external, reached by subdomain

Status: accepted · Source: [blueprint §6 ADR-008](../blueprint.md#adr-008--existing-apps-stay-external-reached-by-subdomain)

**Decision:** UI Lab and Dev X-Ray are `external` catalog entries; their repositories are never modified. `resolve()` never mounts an external entry, but lists it when its release entry allows.
