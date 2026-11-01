---
noteId: "fd59a480d60f11f1ae605f8c0e08bb6f"
tags: []

---

# Control Center server (task 12)

The owner's management API over `config/release.json`. It runs only on the owner's machine, on `127.0.0.1`, and is never deployed. The frontend is task 13 and does not exist yet. Design: blueprint §4 and [ADR-006](adr/006-control-center.md); where this differs from the blueprint, [ADR-017](adr/017-control-center-server.md).

```
apps/control/server/
  main.ts       start: refuse in CI/Vercel, load catalog, read baseline, new token, listen on 127.0.0.1
  app.ts        Hono app: security middleware, endpoints, error mapping
  security.ts   Host/Origin policy, token generation and comparison, port parsing
  store.ts      ReleaseStore interface and FileReleaseStore
  *.test.ts     store, API contract and security, running server
packages/platform-schema/src/control.ts   ReleasePatch, serializeRelease, request schemas, error codes, response types
```

Every rule comes from `@pu/platform-schema` (`applyPatch`, `canTransition`, `validateRelease`, `validateCatalog`, `validateCoverage`, `resolve`, `channelOf`), the same functions the site build runs. The catalog is read from `@pu/experience-catalog` and is read-only. There is no second release model.

## Running it

```sh
pnpm control:server                 # or: pnpm --filter @pu/control dev
PU_CONTROL_PORT=4400 pnpm control:server
```

Prints `Orrery Control Center server listening on http://127.0.0.1:4318 (loopback only). Press Ctrl+C to stop.` and one logfmt line per request. Ctrl+C or SIGTERM closes the server and exits 0.

It refuses to start, with the reason, when: `CI` or `VERCEL` is set; `PU_CONTROL_PORT` is not 1024–65535 or is 4317 (the UI's port); the port is taken (it never tries another port or interface); `config/release.json` is missing, not JSON, not a regular file, or fails its schema. If the catalog itself fails validation the server starts read-only: writes return `CATALOG_INVALID`.

`pnpm control` (server and UI together) arrives with task 13.

## Security model

A loopback server is reachable by any web page open in the owner's browser, so "local" is not a boundary by itself. Layers, in the order they run:

1. **Loopback only.** `listen(port, '127.0.0.1')`, hard-coded. Not reachable from the network; IPv6 `::1` is not served. Tested by connecting through a LAN interface (refused).
2. **Host.** Exactly `127.0.0.1:<port>` or `localhost:<port>`, for the server's port or the UI's port 4317 (requests forwarded by the UI's dev proxy), case-insensitive. Everything else is `INVALID_HOST`, which stops DNS rebinding (a page on `evil.example` that resolves to 127.0.0.1 still sends `Host: evil.example`). `X-Forwarded-Host` is ignored; no proxy is trusted.
3. **Origin.** Every method other than GET/HEAD needs `Origin` exactly `http://127.0.0.1:4317` or `http://localhost:4317`. Missing, `null`, other scheme, port or host: `INVALID_ORIGIN`. A GET that carries a foreign Origin is refused too. Browsers always send Origin on cross-origin requests and on POST/PATCH, and pages cannot forge it.
4. **Session.** Every endpoint except `GET /api/health` and `POST /api/session` needs the session cookie (below). Otherwise `UNAUTHORIZED`.
5. **Body rules for writes.** `Content-Type: application/json` (optionally `; charset=utf-8`), else `UNSUPPORTED_MEDIA_TYPE`. At most 64 KB, else `PAYLOAD_TOO_LARGE`. Strict JSON, then a strict zod schema: unknown fields are errors.
6. **No CORS.** The server never sends `Access-Control-*` headers, so a cross-origin page can neither read a response nor send a non-simple request (JSON content type, PATCH). CORS is not relied on as the boundary; Origin is.
7. **Response headers** on everything: `Cache-Control: no-store`, `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`, `Cross-Origin-Resource-Policy: same-origin`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex`.

GET never writes. The server never runs Git, a shell or any client-supplied path; the only file it writes is the release file resolved at start.

### Session lifecycle

- **Generation.** At start, 32 bytes from `crypto.randomBytes`, base64url (43 characters). One token per server process. Never printed, logged, written to disk or returned in a response body.
- **Bootstrap.** The UI calls `POST /api/session` with body `{}`. Host and Origin checks apply, so only the Control Center page can do it. The response sets `pu_control_session=<token>; Path=/api; HttpOnly; SameSite=Strict`. Page scripts cannot read it (HttpOnly); other sites never send it (SameSite=Strict); it stays out of URLs, history and the terminal.
- **Use.** The browser sends the cookie automatically. The server checks its format and compares it with `crypto.timingSafeEqual`. Query strings, `Authorization` and custom headers are ignored.
- **Lifetime.** Until the server stops. A restart makes a new token, so old cookies get `UNAUTHORIZED`; the UI then calls `POST /api/session` again. There is no idle expiry and no logout endpoint.
- **Not `Secure`.** The server speaks plain HTTP on loopback; a `Secure` cookie (and the `__Host-` prefix, which needs it) would depend on how each browser treats `http://127.0.0.1` as a secure context. SameSite and HttpOnly do not need it.

What this is not: identity. Any page served from the UI origin can obtain a session; any program running as the owner can read and write the file anyway. It ensures requests come from the Control Center page in a browser and that sessions end with the process. Owner sign-in is Phase 4a.

### CSRF

The session is a cookie, so cross-site request forgery is the threat. Defences: SameSite=Strict (other sites never send the cookie), Origin required on every write (exact match), JSON content type required (a cross-site form or `fetch` with JSON triggers a preflight that gets no CORS approval). No CSRF token: with Origin checked on every write it would add nothing (ADR-017).

Other local web servers on `127.0.0.1` are the same *site*, so SameSite does not stop them from sending the cookie; the Origin check does (their Origin has another port), and without CORS they cannot read responses.

## API

Envelope: success `{ ok: true, data, meta: { revision? } }`; error `{ ok: false, error: { code, message, issues?, current? } }`. Types: `ApiResponse<T>` and the `*Data` types in `platform-schema/src/control.ts`. Revisions are 64 lowercase hex characters.

| Method and path | Session | Request | `data` | Purpose |
| --- | --- | --- | --- | --- |
| `GET /api/health` | no | — | `{ service: 'orrery-control', status: 'ok' }` | Liveness |
| `POST /api/session` | no (Origin yes) | `{}` | `{}` + `Set-Cookie` | Start a session |
| `GET /api/registry` | yes | — | `{ experiences: RegistryItem[], issues }` | Every catalog entry, in catalog order |
| `GET /api/experiences/:id` | yes | — | `RegistryItem` | One entry; malformed id 400, unknown 404 |
| `GET /api/release` | yes | — | `{ state, revision, baselineRevision, issues }` | The file as it is now |
| `POST /api/release/preview` | yes | `{ patch, baseRevision }` | `{ valid, issues, state, changes }` | Dry run; writes nothing |
| `PATCH /api/release` | yes | `{ patch, baseRevision }` | `{ state, revision, changes }` | Apply one change |
| `POST /api/release/revert` | yes | `{ baseRevision }` | `{ state, revision, changes }` | Restore the session baseline |
| `GET /api/release/pending` | yes | — | `PendingData` | What changed since the session started |

`RegistryItem`: `id`, `definition` (the parsed catalog entry: kind, title, summary, capabilities, routes with entrypoints, flags, url for externals…), `release` (the entry in effect, the owner-only draft default if the file has none), `hasReleaseEntry`, `channel` (`stable`/`beta`/`alpha`/`null`), `environments` (`development`, `preview`, `production` → `{ deployable, mounted, listed, flags }` from `resolve()`), `issues` (catalog and release issues for this id).

How the UI tells states apart: *registered* = in the registry; *published/draft/deprecated/archived* = `release.lifecycle`; *listed* and *mounted* = `environments[env].listed/mounted`; *external* = `definition.kind === 'external'` (never mounted); environment-dependent availability = compare the three environments.

`patch` is a `ReleasePatch`: `transition` (lifecycle; `canTransition` decides), `setAccess` (`public` or `owner` only in V1), `setDiscoverability`, `setFlag` (platform or one experience), `setNote` (`null` removes). The server checks the experience exists, applies the patch with `applyPatch`, then runs `validateRelease` on the whole result.

**Promotion** is `transition`, previewed first. `POST /api/release/preview` with `{ op: 'transition', experienceId, to }` returns every failed rule and `changes`, the per-environment resolution diff, which shows exactly what production would gain. A draft promoted to `beta` with `owner` access shows no production change, because owner access is never deployed before Phase 4; the UI should say so (blueprint 4.2). There is no separate promote endpoint: it would duplicate `transition`.

**Pending changes** compare the file with the session baseline (the file as it was when the server started), not with Git `HEAD`: the server never runs Git (blueprint review point 1). `entries` lists each release entry (or the platform flags) that differs, before and after; `changes` lists resolution differences; `suggestedCommitMessage` and `commands` (`git add`, `git commit`) are text for the owner to run. After a commit the baseline stays until restart.

### Errors

| Code | HTTP | When | UI behaviour |
| --- | --- | --- | --- |
| `INVALID_REQUEST` | 400 | Body or parameter fails its schema (`issues`) | Frontend bug |
| `INVALID_JSON` | 400 | Body is not JSON | Frontend bug |
| `UNAUTHORIZED` | 401 | No or wrong session cookie | Call `POST /api/session`, retry once |
| `INVALID_HOST` | 403 | Host not allowed | Open the UI at 127.0.0.1 or localhost |
| `INVALID_ORIGIN` | 403 | Origin missing or not the UI | Not from the Control Center page |
| `NOT_FOUND` | 404 | Unknown endpoint or experience | — |
| `METHOD_NOT_ALLOWED` | 405 | Known path, other method (`Allow` header) | Frontend bug |
| `STALE_REVISION` | 409 | `baseRevision` is not the file's revision (`current`) | Show `current`, ask to redo the change |
| `WRITE_CONFLICT` | 409 | The file changed during the write (`current`) | Same as stale |
| `PAYLOAD_TOO_LARGE` | 413 | Body over 64 KB | — |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Write without `application/json` | Frontend bug |
| `ILLEGAL_TRANSITION` | 422 | `canTransition` refuses (`issues`, rule `transition`) | Offer the allowed stages |
| `VALIDATION_FAILED` | 422 | Result breaks a release rule (`issues` with path and rule) | Show each issue at its field |
| `INTERNAL_ERROR` | 500 | Anything unexpected; details only in the server log | Retry, read the log |
| `CATALOG_INVALID` | 503 | Catalog or folder coverage fails validation (`issues`) | Read-only until the code is fixed |
| `STORE_UNAVAILABLE` | 503 | File missing, not JSON, fails its schema (`issues`), or the write failed | Fix the file; the original is untouched |

Messages are safe to show: no paths, stack traces or tokens. Codes are stable; message wording is not.

## ReleaseStore

```ts
interface ReleaseStore {
  read(): Promise<{ state: ReleaseState; revision: string }>;
  write(next: ReleaseState, expectedRevision: string): Promise<{ state; revision }>; // compare-and-swap
}
```

Handlers never touch the filesystem. `FileReleaseStore` is V1; V2 swaps in a GitHub-backed store with the blob SHA as revision, and the API does not change.

- **Revision:** SHA-256 of the file's bytes. Any edit, including whitespace, is a new revision; identical bytes, the same revision. No timestamps.
- **Canonical format:** `serializeRelease` writes ids sorted, fields in a fixed order (`lifecycle, access, discoverability, flags, archivedTo, note`), empty flag maps omitted, two-space indent, trailing newline. It reproduces today's `config/release.json` byte for byte (tested), so writing an unchanged state keeps the revision.
- **Read:** `lstat` (refuse anything but a regular file, so a symlink cannot redirect writes), read, `JSON.parse`, `parseRelease`. Rule issues (`validateRelease`) are reported by the API, not by the store.
- **Write:** validate `next` with the schema; read the file and compare its revision with `expectedRevision` (`STALE_REVISION`); write the canonical text to `.release.json.<uuid>.tmp` in the same directory with the original's mode, `fsync`, close; re-read the file and compare again (`WRITE_CONFLICT` if an editor saved meanwhile); `rename` over the original (atomic on one filesystem); re-read and return. On any failure the temporary file is removed and the original is untouched. Temporary files are git-ignored.
- **Concurrency:** writes are serialised by an in-process queue, so two simultaneous requests with one revision give one success and one `STALE_REVISION`; edits from other programs are caught by the two revision checks. Boundary: one server process per checkout. Two servers on the same checkout could race in the microseconds between the final check and the rename; no cross-process lock exists.

## Logging

logfmt on stdout: `ready`, `shutdown`, `request method= path= status= ms=`, `request.rejected code=`, `release.write op= revision=`, `release.revert`, `release.conflict code=`, `store.error code= cause=`, `error name= message=`. Never logged: tokens, cookies, headers, request bodies, environment variables.

## Tests

`pnpm --filter @pu/control test` (50 tests, part of `pnpm test` and CI). The real `config/release.json` is never written: each test works on a copy in a temporary directory and the suite asserts the real file is unchanged.

- `store.test.ts`: reads, revisions, missing/malformed/schema-invalid/symlinked files, canonical writes, file mode, stale revisions, simultaneous writes, two stores on one file, an editor saving mid-write, failure at the rename step, an unwritable directory, temporary-file cleanup.
- `app.test.ts`: every endpoint and every error code; Host, Origin, session, content type and size rules; no CORS headers, no token in any response or log; envelope invariants checked on every response.
- `server.test.ts`: binds to 127.0.0.1 only (LAN and `::1` refused), raw HTTP Host injection and duplicate Host headers, end-to-end session over real HTTP, restart invalidates sessions, port in use, CI refusal, startup output with no token, clean shutdown.

Mutation checks during task 12: removing the compare-and-swap, the pre-rename re-check, the write queue, the Host check, the Origin check, `HttpOnly`, or binding to `0.0.0.0` each made tests fail.

## Not deployed, and why

No Vercel project points at `apps/control`; the site project's Root Directory is `apps/site`, and `apps/site` may not import `apps/control` (`site-control` boundary rule). The server refuses to run when `VERCEL` or `CI` is set. A deployed management API would need owner identity, which is Phase 4a (V2 on `control.<domain>`).

## Known limitations

- No owner identity: protection is loopback + Host + Origin + per-process session (above).
- No cross-process write lock (one server per checkout).
- Pending changes compare with the session baseline, not Git `HEAD`.
- No content endpoint yet: there is no writing collection to list; task 13 adds it when one exists (blueprint 4.1 Content screen).
- Absolute-form request targets (`GET http://other/...` with a valid Host) are answered by path; browsers never send them to an origin server.
- IPv6 loopback is not served.

## Task 13 integration guide

1. **Run.** `pnpm control` should start this server (port 4318) and a Vite dev server on `127.0.0.1:4317` that proxies `/api` to `http://127.0.0.1:4318`. Keep the proxy's Host as sent (`changeOrigin: false`) or set it to `127.0.0.1:4318`; both are allowed. Set Vite's `server.host` to `127.0.0.1` and keep its `allowedHosts` default.
2. **Session.** On load, `fetch('/api/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })`. Same-origin requests carry the cookie automatically. On any `UNAUTHORIZED` (server restarted), call it again and retry once.
3. **Registry.** `GET /api/registry`; table columns from `definition` (id, title, kind, performanceClass), `release` (lifecycle, access, discoverability), `channel`, and a validation badge from `issues`.
4. **Experience detail.** `GET /api/experiences/:id`; environment matrix from `environments.development/preview/production` (`deployable`, `mounted`, `listed`, `flags`).
5. **Edit or promote.** Keep `meta.revision` from the last read. `POST /api/release/preview` with `{ patch, baseRevision }` to show `issues` and `changes` (what production will look like), then `PATCH /api/release` with the same body. Promotion is `{ op: 'transition', experienceId, to }`.
6. **Stale revisions.** On `STALE_REVISION` or `WRITE_CONFLICT`, replace local state with `error.current`, show that the file changed (for example an editor save), and ask the owner to redo the change. Never retry automatically with the new revision.
7. **Validation errors.** `ILLEGAL_TRANSITION` and `VALIDATION_FAILED` carry `issues` with `path` (e.g. `experiences.journal.access`) and `rule`; show each at its field. `CATALOG_INVALID`: make the UI read-only and show `issues`. `STORE_UNAVAILABLE`: show the message and issues; the file needs a hand fix.
8. **Pending changes.** `GET /api/release/pending`; show `entries` (before/after), `changes`, the suggested commit message and `commands` to copy. "Revert" is `POST /api/release/revert` with the current revision.
9. **Freshness.** Poll `GET /api/release` every few seconds (blueprint 4.0) so editor changes appear; the server re-reads the file on every request.
