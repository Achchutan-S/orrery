# ADR-028 — Experiences ship their own fonts and images as hashed assets

Status: accepted (13 November 2026) · Implements blueprint decision D11 and closes contract gaps G2 and G3 · Written by an agent after the decision it implements; the owner accepts this text by merging the pull request that adds it

## Context

The production output allowlist accepted hashed `.js` and `.css` and the platform's font, so a font or image imported from an experience's own CSS failed `check:leaks`. Divya Chakshu used system font stacks for that reason; A History of Seeing served 25 font files through parameterised file routes, which works but gives revalidating instead of immutable caching and leaves Vite warning about unresolved `url()`s. Typography and imagery are most of an experience's identity.

## Decision

1. `tools/checks/src/leaks.ts` accepts `_astro/<name>.<8-character hash>.<woff2|woff|png|jpg|jpeg|webp|avif|gif|svg>` **only when its bytes equal a source file owned by an experience released in that build, or by the platform**. Vite's output name does not say who owns a file; its content does, and the scan already hashes every source file.
2. The three proofs contract § 3.6 requires are kept:
   - *Ownership:* the content-hash rule above. Bytes nobody released own are a finding.
   - *No unreleased bytes:* unchanged. A copy of an unreleased experience's file is reported under any name, and its base64 form inside any text file.
   - *Budgeted:* unchanged. `check:budgets` counts fonts and images a page loads and reports any emitted file no page loads.
3. The smoke test knows the media types (`font/woff`, `image/webp`, `image/avif`, `image/gif`).

## Limits

- **Transformed images are not accepted.** `astro:assets` optimisation (`<Image>`, `getImage`) writes new bytes, which match no source file. Commit images at the size and format they ship in, and reference them from CSS `url()` or a plain file import. Revisit when an experience needs responsive image sets.
- Vite inlines files under 4 KB as `data:` URLs. That is fine for images (`img-src 'self' data:`); a font that small would be blocked by `font-src 'self'`.
- Font and image budgets cannot be raised per experience (gap G4, still open).
- Licensing is still review: only files whose licence allows redistribution may be committed to a public repository.

## Alternatives considered

- *File routes for everything (the Seeing workaround):* no content hashing, no immutable caching, one route per file kind per experience.
- *Trust the file extension:* turns the allowlist into a hole; any bytes could ship under a font's name.
- *Per-experience entries in `astro.config.ts`:* breaks "one folder, one entry, one line".

## Consequences

- An experience imports a WOFF2 or image from its own folder and it ships, hashed and cached for a year, without a platform file changing. Verified end to end with a throwaway experience on 13 November 2026 ([tracker](../tracker.md)).
- File routes remain valid for files that need a stable address (link-preview images, PDFs, downloads).
