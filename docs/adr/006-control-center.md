---
noteId: "e68a5f02d5de11f1ae605f8c0e08bb6f"
tags: []

---

# ADR-006 — Control Center as a separate app; V1 local and Git-backed

Status: accepted, not started (Phase 1) · Source: [blueprint §6 ADR-006](../blueprint.md#adr-006--control-center-as-a-separate-app-v1-local-and-git-backed)

**Decision:** `apps/control`, loopback-only V1 editing `config/release.json`; V2 only on `control.<domain>`.

**Implementation notes:** `ReleasePatch`, `applyPatch` and `canTransition` already live in `platform-schema` so V1 reuses them. API request and response schemas are added with the server (task 12).
