# ADR-006 — Control Center as a separate app; V1 local and Git-backed

Status: accepted; V1 built locally (server task 12, UI task 13), never deployed

**Decision:** `apps/control`, loopback-only V1 editing `config/release.json`; V2 only on `control.<domain>`.

**Implementation notes:** `ReleasePatch`, `applyPatch` and `canTransition` already live in `platform-schema` so V1 reuses them. The server (task 12) adds the API contract to `control.ts`; where it departs from blueprint §4.0, see [ADR-017](adr-017-control-center-server.md) (server) and [ADR-018](adr-018-control-center-ui.md) (UI).

## Founding context

As written in blueprint revision 2 § 6 on 30 October 2026 ("Control Center as a separate app; V1 local and Git-backed"); phase numbers are revision 2's ([blueprint phase table](../blueprint.md#what-changed-from-revision-2)). Facts implementation later changed are recorded in the status line and later ADRs.

- **Context:** governance is wanted early; a deployed admin UI needs authentication that does not exist yet.
- **Decision:** `apps/control`, local-only in V1, editing `release.json`; V2 deployed only on `control.<domain>` with owner-only sign-in, writing release state as Git commits.
- **Alternatives:** an admin route inside the public site (same origin as every experiment); a hosted CMS (wrong shape, extra vendor); CLI only (works, but loses the environment overview).
- **Trade-offs:** V1 needs your machine; changes take a deploy to apply.
- **Consequences:** Git history is the release audit trail; the database holds only per-person data.
- **Revisit when:** you need to change release state away from your machine (that is the V2 trigger).
