# ADR-023 — Audit closure: complete budgets, durable Control Center writes, opener isolation, dependency and hygiene policy

Status: accepted (7 November 2026) · Engineering audit Phase D (F12, F13, F18, F19, F20–F23). Extends [ADR-014](014-repository-checks.md) (budgets) and [ADR-017](017-control-center-server.md) (store, session).

## Context

The audit's remaining findings were low-risk but real: budgets ignored lazy chunks, CSS `url()` assets, images and files no page loads (F13); the release store checked the file with `lstat` and then read it by path, did not flush the directory after its rename, and reverted by re-serialising the baseline (F21); no `Cross-Origin-Opener-Policy` (F23); a low `esbuild` advisory reached through Vite's optional peer (F22) and patch updates outstanding, two of them security fixes in Hono (F19); every Markdown file carried an editor's `noteId` front matter and an obsolete task prompt sat at the root (F18); the session cookie is not port-scoped (F20); manual accessibility checks had never been done (F12).

## Decisions

1. **Budgets account for every emitted file.** Per page: `images` (`<img src|srcset>`, `<source srcset>`, the icon, CSS `url()`) and `lazy` (the largest `import()` chunk with its static imports, minus what the page already loaded; blueprint 3.12's 100 KB for interactive pages, nothing for content and platform pages). Stylesheets' `url()` fonts and images count with the stylesheet. Files no page loads have their own limits (`FILE_BUDGETS`: link-preview images 150 KB, documents 400 KB). A reference to a file the build did not emit, an `<img>` without dimensions, and any emitted file that no page loads and no budget names are findings. Image limits are provisional (no real image exists yet) and say so in `budgets.ts`.
2. **The release store reads through one descriptor.** `open(O_RDONLY | O_NOFOLLOW)`, then `fstat` and read from the same handle: no window between a check and a read, and a symlink is refused at open (where the platform has `O_NOFOLLOW`; Windows still refuses anything but a regular file). After the rename the directory is `fsync`ed (best effort; Windows cannot). A revert writes the session baseline's own bytes, validated like a read, so it leaves no formatting diff. API errors carry only a snapshot's `state` and `revision`.
3. **`Cross-Origin-Opener-Policy: same-origin`** on every site response (`vercel.json`) and on the Control Center UI. Nothing opens popups or needs an opener.
4. **Dependencies:** patch and minor updates only, after reading each changelog; majors (TypeScript 7, `@types/node` 26) stay out (Node 22 policy, ADR-021). `esbuild` is overridden to `0.28.2` in `pnpm-workspace.yaml`; Vite 8 accepts `^0.28`, and with the override pnpm no longer auto-installs the optional peer at all (nothing in the build uses it). Remove the override once Vite resolves it on its own.
5. **Hygiene is tested.** `tools/checks/src/hygiene.test.ts` fails on `noteId` front matter in any Markdown or MDX file Git would commit. `prompt.md` (the task 7 prompt, superseded by ADR-012 and the design notes; no references) is removed from the working tree, pending the owner's approval; its text stays in the Git history.
6. **The cookie's port scope: proposed as an accepted risk, pending the owner's decision (F20).** Cookies are scoped by host, not port, so a browser also sends the session cookie to other servers on `127.0.0.1` under `/api`. Such a server learns the token and, outside a browser, could call the API with any Host and Origin. It is a program the owner runs, which can already write `config/release.json` directly, so this grants nothing new. A per-port cookie needs a different origin (a hostname per service) or a non-cookie credential, which the HttpOnly design deliberately avoids (ADR-017). The token dies with the server process. Practical mitigations considered and not taken: a per-session random path prefix for the API (narrows which requests carry the cookie, at the cost of changing every route and the proxy), `Secure`/`__Host-` cookies (depend on each browser treating `http://127.0.0.1` as secure), a separate loopback address (needs a manual `lo0` alias on macOS).
7. **Accessibility evidence is split** ([runbooks/accessibility.md](../runbooks/accessibility.md)): automated checks run in CI (now also reflow at 320 and 640 px, WCAG text spacing, forced colours, heading and landmark structure, axe best practices, palette focus containment); the manual checklist is recorded separately and is not yet performed.

## Consequences

- Two reflow defects found by the new checks are fixed: the `sample-app` explorer's grid column and the Control Center's environment matrix no longer force sideways scrolling at 320 px (their tables scroll in their own focusable regions).
- A new emitted file type needs a page that loads it or a `FILE_BUDGETS` entry; the failure says which.
- The editor extension that adds `noteId` will keep adding it until it is turned off for this folder; the hygiene test makes that visible before commit.

## Not done

- Manual accessibility checks (F12): owner action.
- No Lighthouse or Core Web Vitals gate in CI (part of the original F13 note); lab runs stay manual.
- Vendored `.claude/skills` stay (Apache-2.0, used by contributors' tools).
