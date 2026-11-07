# Control Center

The owner's tool for `config/release.json`: a local API and the interface that uses it. It runs only on the owner's machine, on `127.0.0.1`, and is never deployed. Design: [blueprint § 7](../../docs/blueprint.md#7-control-center) and [ADR-006](../../docs/adr/adr-006-control-center.md); where this differs from the blueprint, [ADR-017](../../docs/adr/adr-017-control-center-server.md) (server) and [ADR-018](../../docs/adr/adr-018-control-center-ui.md) (interface).

```
apps/control/server/
  main.ts       start: refuse in CI/Vercel, load catalog, read baseline, new token, listen on 127.0.0.1
  app.ts        Hono app: security middleware, endpoints, error mapping
  security.ts   Host/Origin policy, token generation and comparison, port parsing
  store.ts      ReleaseStore interface and FileReleaseStore
  *.test.ts     store, API contract and security, running server
apps/control/web/
  ui-config.ts  Vite settings: 127.0.0.1:4317, strict port, /api proxy, CORS off, CSP for the build
  src/api.ts    the one API client (session renewal, typed failures)
  src/state.tsx server state, polling, live announcements
  src/model.ts  pure derivations: filters, sorting, availability words, change rows, impact sentences
  src/App.tsx, Overview.tsx, Registry.tsx, Experience.tsx, Release.tsx, Pending.tsx, components.tsx
  src/control.css
apps/control/vite.config.ts               `pnpm control`: the UI plus the server in one process
apps/control/test-browser/control.test.ts  Playwright and axe against the built UI and a temporary release file
packages/platform-schema/src/control.ts   ReleasePatch, serializeRelease, request schemas, error codes, response types
```

Every rule comes from `@pu/platform-schema` (`applyPatch`, `canTransition`, `validateRelease`, `validateCatalog`, `validateCoverage`, `resolve`, `channelOf`), the same functions the site build runs. The catalog is read from `@pu/experience-catalog` and is read-only. There is no second release model.

## Running it

```sh
pnpm control                        # build the UI, serve it on 127.0.0.1:4317, start the server on 127.0.0.1:4318
pnpm control:server                 # the server alone (or: pnpm --filter @pu/control dev)
pnpm --filter @pu/control dev:web   # UI with hot reload, for working on the UI itself (no CSP)
PU_CONTROL_PORT=4400 pnpm control   # the server on another port; the UI stays on 4317
```

`pnpm control` runs `vite build && vite preview`. A Vite plugin (`vite.config.ts`) starts the server in the same process when the preview server starts and closes it with it, so one Ctrl+C stops both and nothing can be left running. It prints `Orrery Control Center: open http://127.0.0.1:4317 (server on 127.0.0.1:4318, loopback only). Press Ctrl+C to stop both.` Both ports are strict: if either is taken the command fails with the reason (`the port 4318 is already in use…`) instead of moving.

`pnpm control:server` prints `Orrery Control Center server listening on http://127.0.0.1:4318 (loopback only). Press Ctrl+C to stop.` and one logfmt line per request. Ctrl+C or SIGTERM closes the server and exits 0.

It refuses to start, with the reason, when: `CI` or `VERCEL` is set; `PU_CONTROL_PORT` is not 1024–65535 or is 4317 (the UI's port); the port is taken (it never tries another port or interface); `config/release.json` is missing, not JSON, not a regular file, or fails its schema. If the catalog itself fails validation the server starts read-only: writes return `CATALOG_INVALID`.

## Security model

A loopback server is reachable by any web page open in the owner's browser, so "local" is not a boundary by itself. Layers, in the order they run:

1. **Loopback only.** `listen(port, '127.0.0.1')`, hard-coded. Not reachable from the network; IPv6 `::1` is not served. Tested by connecting through a LAN interface (refused).
2. **Host.** Exactly `127.0.0.1:<port>` or `localhost:<port>`, for the server's port or the UI's port 4317 (requests forwarded by the UI's dev proxy), case-insensitive. Everything else is `INVALID_HOST`, which stops DNS rebinding (a page on `evil.example` that resolves to 127.0.0.1 still sends `Host: evil.example`). `X-Forwarded-Host` is ignored; no proxy is trusted.
3. **Origin.** Every method other than GET/HEAD needs `Origin` exactly `http://127.0.0.1:4317` or `http://localhost:4317`. Missing, `null`, other scheme, port or host: `INVALID_ORIGIN`. A GET that carries a foreign Origin is refused too. Browsers always send Origin on cross-origin requests and on POST/PATCH, and pages cannot forge it.
4. **Session.** Every endpoint except `GET /api/health` and `POST /api/session` needs the session cookie (below). Otherwise `UNAUTHORIZED`.
5. **Body rules for writes.** `Content-Type: application/json` (optionally `; charset=utf-8`), else `UNSUPPORTED_MEDIA_TYPE`. At most 64 KB, else `PAYLOAD_TOO_LARGE`. Strict JSON, then a strict zod schema: unknown fields are errors.
6. **No CORS.** The server never sends `Access-Control-*` headers, so a cross-origin page can neither read a response nor send a non-simple request (JSON content type, PATCH). CORS is not relied on as the boundary; Origin is.
7. **Response headers** on everything (the UI's own responses also send `Cross-Origin-Opener-Policy: same-origin`, ADR-023): `Cache-Control: no-store`, `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`, `Cross-Origin-Resource-Policy: same-origin`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex`.

GET never writes. The server never runs Git, a shell or any client-supplied path; the only file it writes is the release file resolved at start.

### Session lifecycle

- **Generation.** At start, 32 bytes from `crypto.randomBytes`, base64url (43 characters). One token per server process. Never printed, logged, written to disk or returned in a response body.
- **Bootstrap.** The UI calls `POST /api/session` with body `{}`. Host and Origin checks apply, so only the Control Center page can do it. The response sets `pu_control_session=<token>; Path=/api; HttpOnly; SameSite=Strict`. Page scripts cannot read it (HttpOnly); other sites never send it (SameSite=Strict); it stays out of URLs, history and the terminal.
- **Use.** The browser sends the cookie automatically. The server checks its format and compares it with `crypto.timingSafeEqual`. Query strings, `Authorization` and custom headers are ignored.
- **Lifetime.** Until the server stops. A restart makes a new token, so old cookies get `UNAUTHORIZED`; the UI then calls `POST /api/session` again. There is no idle expiry and no logout endpoint.
- **Not `Secure`.** The server speaks plain HTTP on loopback; a `Secure` cookie (and the `__Host-` prefix, which needs it) would depend on how each browser treats `http://127.0.0.1` as a secure context. SameSite and HttpOnly do not need it.

What this is not: identity. Any page served from the UI origin can obtain a session; any program running as the owner can read and write the file anyway. It ensures requests come from the Control Center page in a browser and that sessions end with the process. Owner sign-in belongs to the Identity phase (blueprint § 11; older documents call it Phase 4a).

### CSRF

The session is a cookie, so cross-site request forgery is the threat. Defences: SameSite=Strict (other sites never send the cookie), Origin required on every write (exact match), JSON content type required (a cross-site form or `fetch` with JSON triggers a preflight that gets no CORS approval). No CSRF token: with Origin checked on every write it would add nothing (ADR-017).

Other local web servers on `127.0.0.1` are the same *site*, so SameSite does not stop them from sending the cookie; the Origin check does (their Origin has another port), and without CORS they cannot read responses.

The other direction is a known risk, proposed for acceptance (audit F20, ADR-023; owner decision pending): cookies are scoped by host, not by port, so the browser also sends `pu_control_session` to any other server on `127.0.0.1` when a page asks it for a path under `/api`. That server learns the token and, outside a browser, could call this API with any Host and Origin. It is a program the owner runs, which could write `config/release.json` directly anyway, so it gains nothing; the token also dies with this server. Do not run untrusted local servers while the Control Center is open.

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

**Promotion** is `transition`, previewed first. `POST /api/release/preview` with `{ op: 'transition', experienceId, to }` returns every failed rule and `changes`, the per-environment resolution diff, which shows exactly what production would gain. A draft promoted to `beta` with `owner` access shows no production change, because owner access is never deployed before the Identity phase (Phase 4 in older documents); the UI should say so (blueprint revision 2 § 4.2). There is no separate promote endpoint: it would duplicate `transition`.

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
- **Read:** one `open` with `O_NOFOLLOW` (a symlink is refused, so it cannot redirect writes), then `fstat` and read from that same descriptor, so the file checked is the file read; anything but a regular file is refused. Then `JSON.parse`, `parseRelease`. Rule issues (`validateRelease`) are reported by the API, not by the store. Windows has no `O_NOFOLLOW`; there the regular-file check on the open descriptor remains (ADR-023).
- **Write:** validate `next` with the schema; read the file and compare its revision with `expectedRevision` (`STALE_REVISION`); write the canonical text to `.release.json.<uuid>.tmp` in the same directory with the original's mode, `fsync`, close; re-read the file and compare again (`WRITE_CONFLICT` if an editor saved meanwhile); `rename` over the original (atomic on one filesystem); `fsync` the directory so the rename itself survives a crash (best effort: Windows cannot, and the write has already happened); re-read and return. On any failure the temporary file is removed and the original is untouched. Temporary files are git-ignored.
- **Revert:** writes the session baseline's own bytes, not a re-serialisation of its state, after the same JSON and schema checks as a read, so reverting a hand-formatted file leaves no diff.
- **Concurrency:** writes are serialised by an in-process queue, so two simultaneous requests with one revision give one success and one `STALE_REVISION`; edits from other programs are caught by the two revision checks. Boundary: one server process per checkout. Two servers on the same checkout could race in the microseconds between the final check and the rename; no cross-process lock exists.

## Logging

logfmt on stdout: `ready`, `shutdown`, `request method= path= status= ms=`, `request.rejected code=`, `release.write op= revision=`, `release.revert`, `release.conflict code=`, `store.error code= cause=`, `error name= message=`. Never logged: tokens, cookies, headers, request bodies, environment variables.

## Tests

`pnpm --filter @pu/control test` (part of `pnpm test` and CI) and `pnpm --filter @pu/control test:browser` (part of `pnpm test:browser` and CI). The real `config/release.json` is never written: every test works on a copy in a temporary directory and the suites assert the real file is unchanged.

- `server/store.test.ts`: reads, revisions, missing/malformed/schema-invalid/symlinked files, canonical writes, file mode, stale revisions, simultaneous writes, two stores on one file, an editor saving mid-write, failure at the rename step, an unwritable directory, temporary-file cleanup.
- `server/app.test.ts`: every endpoint and every error code; Host, Origin, session, content type and size rules; no CORS headers, no token in any response or log; envelope invariants checked on every response.
- `server/server.test.ts`: binds to 127.0.0.1 only (LAN and `::1` refused), raw HTTP Host injection and duplicate Host headers, end-to-end session over real HTTP, restart invalidates sessions, port in use, CI refusal, startup output with no token, clean shutdown.
- `web/src/api.test.ts`: the client's request shapes, envelope parsing, unavailable server, one read retry after session renewal, no write replay.
- `web/src/model.test.ts`: transitions equal `canTransition`, availability words, search, filters, sorting, change rows, production impact sentences.
- `web/src/client.integration.test.ts`: the UI client against the real server, as a browser on the UI origin: session, reads, preview, write, stale write, pending, revert, server restart.
- `test-browser/control.test.ts`: the built UI behind Vite preview and its proxy: overview, registry search/filter/sort and Back, detail and environment matrix, external entries, preview → confirm (Escape cancels, focus returns) → write, pending changes and revert, a stale write with no retry, rule violations at the controls, polling picks up editor edits, keyboard and focus, cookie unreachable from page scripts, no CORS and a strict CSP, axe (WCAG 2.2 AA) on every screen at desktop and phone widths in light and dark, no horizontal scroll on phones, server-unavailable screen and recovery. Screenshots in `apps/control/test-results/`.

Mutation checks when the server was built: removing the compare-and-swap, the pre-rename re-check, the write queue, the Host check, the Origin check, `HttpOnly`, or binding to `0.0.0.0` each made tests fail.

## Not deployed, and why

No Vercel project points at `apps/control`; the site project's Root Directory is `apps/site`, and `apps/site` may not import `apps/control` (`site-control` boundary rule). The server refuses to run when `VERCEL` or `CI` is set. A deployed management API would need owner identity, which arrives in the Identity phase (blueprint § 11; V2 on `control.<domain>`).

## Known limitations

- No owner identity: protection is loopback + Host + Origin + per-process session (above).
- No cross-process write lock (one server per checkout).
- Pending changes compare with the session baseline, not Git `HEAD`.
- No Content screen and no content endpoint: there is no writing collection to list yet (blueprint 4.1); add both when one exists.
- No Preview links screen (blueprint 4.1): the API has no source for branch preview URLs.
- Platform-wide flags are not editable in the UI: none is declared anywhere, and inventing names in a form would bypass the catalog. `setFlag` with `scope: 'platform'` remains available through the API.
- `archivedTo` cannot be set: no patch operation sets it, so archiving (which requires it) is refused by the rules until one exists.
- The UI bundle includes zod (through `platform-schema`'s lifecycle model): about 107 KB gzip in total, loaded once from localhost.
- Absolute-form request targets (`GET http://other/...` with a valid Host) are answered by path; browsers never send them to an origin server.
- IPv6 loopback is not served.

## The interface

Five screens, reached from a header that also shows "Local session" (not a sign-in), whether the server answers, and the current revision.

- **Overview:** the release file (revision, session baseline, counts by lifecycle, rule issues, pending changes); what each environment would build and list under the current file (the release model, not a live deployment); what needs attention; what changed this session.
- **Experiences:** every catalog entry with kind, lifecycle, access and discovery, and its availability in each environment. Search by name or id, filters (all, published, draft, in production, external, with issues), sorting. Filters live in the address, so Back from a detail page returns to the same list. "Canary" is not a release concept, so there is no canary filter: the canary is a draft.
- **Experience detail:** environment matrix (release allows it, built, listed, flags), release entry, catalog entry (read-only; it changes in code), issues, and the change form. External projects are marked as separate sites that are never built here.
- **Release:** the same change form with an experience picker.
- **Pending changes:** the structured diff against the session baseline, the effect on each environment, the commit commands exactly as the API gives them, and Restore baseline.

**A change, step by step.** The form offers only what the release model allows: lifecycle moves from `canTransition`, access `public` or `owner`, discoverability, declared flags, the note. *Preview change* sends the patch with the revision the page was loaded at to `POST /api/release/preview` and shows the field-by-field change, whether every release rule passes, and the effect on each environment in plain sentences ("Production will no longer include this experience."), production first and marked when it changes. Any edit to the form discards the preview. *Apply change…* opens a confirmation dialog that repeats the production effect; *Write to release file* sends the same patch and revision to `PATCH /api/release`. Success is shown only after the server answers, with the new revision; then every view re-reads.

**When it goes wrong.**
- `STALE_REVISION` / `WRITE_CONFLICT`: "Nothing was written: the release file changed after it was loaded", the revision now on disk and what changed for this experience. *Load latest state* re-reads; nothing is retried.
- `ILLEGAL_TRANSITION` / `VALIDATION_FAILED`: the issues appear at the form, linked with `aria-describedby`; Apply stays disabled for an invalid preview.
- `CATALOG_INVALID`: editing turns off everywhere, with the issues.
- Session expired (server restarted): reads renew the session and retry once; a write is not replayed: the owner sees "Nothing was written" and confirms again.
- No answer during a write: "The server did not confirm the write", and *Re-read the release file* says whether the file changed.
- Server down at start: a screen with the start command and *Try again*; down later: a banner, and editing pauses.

**Polling.** `GET /api/release` every 5 seconds while the tab is visible, never overlapping. If the revision moved and no change form is open, every view re-reads and a polite announcement says so; while a form is open it only shows that the file changed, so nothing shifts under the owner.

**Accessibility.** Semantic landmarks and one h1 per screen; a skip link; the heading takes focus after navigation (not on first load); native `<dialog>` (focus trapped, Escape cancels, Cancel first, focus returns); a polite live region for results and `role="alert"` for failures; states as text plus shape, never colour alone; the public site's two-band focus ring and 44 px targets; reduced motion. axe passes on every screen, both widths, both schemes. Not yet checked by hand: screen readers, zoom, forced colours.

**Security in the browser.** The UI build is served with `Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'` plus no-frame, no-sniff, no-referrer and no-store headers. Vite's own CORS is off (its default reflects any localhost origin, on the `/api` proxy too). The proxy keeps `changeOrigin: false`, so the API sees the UI's Host and Origin and applies its checks unchanged. The session cookie is HttpOnly: no script, storage or URL ever holds the token.

## How the UI uses the API

1. **Run.** Vite preview on `127.0.0.1:4317` proxies `/api` to `127.0.0.1:4318` (`PU_CONTROL_PORT`).
2. **Session.** On load, `POST /api/session` with `{}`. On `UNAUTHORIZED`, reads renew and retry once; writes renew and stop.
3. **Reads.** `GET /api/registry`, `GET /api/release`, `GET /api/release/pending` together; `GET /api/experiences/:id` for a detail page, re-read whenever the revision moves.
4. **Changes.** `POST /api/release/preview`, then after confirmation `PATCH /api/release`, both with the revision the page shows. Promotion is the `transition` patch.
5. **Revert.** `POST /api/release/revert` with the current revision, after confirmation.

Every call goes through `web/src/api.ts`; components never call `fetch`.
