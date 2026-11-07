# ADR-006 — Control Center as a separate app; V1 local and Git-backed

Status: accepted; V1 built locally (server task 12, UI task 13), never deployed · Source: [blueprint §6 ADR-006](../blueprint.md#adr-006--control-center-as-a-separate-app-v1-local-and-git-backed)

**Decision:** `apps/control`, loopback-only V1 editing `config/release.json`; V2 only on `control.<domain>`.

**Implementation notes:** `ReleasePatch`, `applyPatch` and `canTransition` already live in `platform-schema` so V1 reuses them. The server (task 12) adds the API contract to `control.ts`; where it departs from blueprint §4.0, see [ADR-017](017-control-center-server.md) (server) and [ADR-018](018-control-center-ui.md) (UI).
