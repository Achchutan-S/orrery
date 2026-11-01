---
noteId: "e68a8610d5de11f1ae605f8c0e08bb6f"
tags: []

---

# ADR-010 — Identity, authorization and analytics designed now, built later

Status: accepted · Source: [blueprint §6 ADR-010](../blueprint.md#adr-010--identity-authorization-and-analytics-are-designed-now-built-later)

**Decision:** reserved prefixes, schema fields, `authorize()` and `track()` exist before their implementations.

**Implementation notes:** the "single switch" is `PlatformOptions.protectedRendering` in `platform-schema` (`PHASE_0` = off). With it off, `signed-in` and `policy` access and on-demand routes fail validation; reserved prefixes are rejected now.
