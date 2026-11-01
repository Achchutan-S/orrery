---
noteId: "5f716e90d61611f1ae605f8c0e08bb6f"
tags: []

---

# ADR-018 — Control Center UI: one process, a built UI under CSP, no extra libraries

Status: accepted (1 November 2026) · Implements blueprint task 13 and ADR-006. Reference: [control-center.md](../control-center.md).

**Decision:** the UI is React 19 in `apps/control/web`, built by Vite 8 and served by `vite preview` on `127.0.0.1:4317`, which proxies `/api` to the server. `pnpm control` is `vite build && vite preview`; a Vite plugin starts the server in the same Node process.

1. **No process manager.** Starting the server from the preview server's `configurePreviewServer` hook (through `startLocal()`, the same function `pnpm control:server` uses) means one process, one Ctrl+C, no orphaned server, and no `concurrently`-style dependency or hand-written supervisor. If the server cannot start (port taken, CI, broken release file) the UI does not start either.
2. **A built UI, not the dev server.** The blueprint runs the Vite dev server. Its hot-reload client needs inline scripts, so it cannot run under a strict Content Security Policy; the built UI can (`script-src 'self'`, no inline anything). `pnpm --filter @pu/control dev:web` keeps the dev server for UI work. Building first costs about a second.
3. **Vite's CORS is turned off.** Vite's default CORS reflects any localhost origin and answers preflights, including on the proxied `/api`. The server's Origin check still refused writes, but the API must never send CORS headers (ADR-017), so `cors: false` on both servers. Tested.
4. **Proxy keeps Host and Origin.** `changeOrigin: false`: the API sees `Host: 127.0.0.1:4317` (allowed by ADR-017) and the page's real Origin. Ports are strict, never moved.
5. **No router, state or component library.** Five screens use the History API (`navigate`, `usePath`, `Link`); server state is one React context that re-reads after writes and polls every 5 seconds; dialogs are native `<dialog>`. Added dependencies are only `react`, `react-dom`, `vite` and `@vitejs/plugin-react` (all already in the lockfile through the site), plus `playwright` and `@axe-core/playwright` for tests.
6. **Rules from `platform-schema` in the browser.** Lifecycle moves come from `canTransition`, defaults from `defaultReleaseEntry`. This pulls zod into the bundle (about 107 KB gzip in total), accepted for a local tool rather than copying the lifecycle model.
7. **Server additions, no contract change.** `start()` takes an optional `uiPort` (tests run the UI on a free port and the API must trust that origin); `startLocal()` was extracted from `main.ts`. No endpoint, response or error code changed.

**Boundary:** `pnpm check:boundaries` now scans `apps/control/web/src` and adds `control-web-client`: browser code may import only `@pu/platform-schema`, npm packages and its own files; never the server, Node built-ins or the catalog (it gets data from the API).
