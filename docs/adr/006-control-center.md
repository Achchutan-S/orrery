---
noteId: "e68a5f02d5de11f1ae605f8c0e08bb6f"
tags: []

---

# ADR-006 — Control Center as a separate app; V1 local and Git-backed

Status: accepted; server built (task 12), frontend not started · Source: [blueprint §6 ADR-006](../blueprint.md#adr-006--control-center-as-a-separate-app-v1-local-and-git-backed)

**Decision:** `apps/control`, loopback-only V1 editing `config/release.json`; V2 only on `control.<domain>`.

**Implementation notes:** `ReleasePatch`, `applyPatch` and `canTransition` already live in `platform-schema` so V1 reuses them. The server (task 12) adds the API contract to `control.ts`; where it departs from blueprint §4.0, see [ADR-017](017-control-center-server.md).
