// Repository hygiene (audit F18). The repository is public, so what an editor adds to files
// is published too. A notes extension stamped `noteId`/`tags` front matter on every Markdown
// file it opened; GitHub renders that as a table at the top of each document.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { repoRoot } from './repo.ts';

/** Tracked and not-yet-tracked files, as Git would commit them (ignored files excluded). */
const files = () => execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], { cwd: repoRoot, encoding: 'utf8' })
  .split('\0').filter(Boolean);

/** The front matter block at the top of a document, if any. */
export const frontMatter = (text: string) => text.match(/^---\n([^]*?)\n---\n/)?.[1];

test('no editor-generated noteId front matter in any Markdown or MDX file', () => {
  const stamped = files().filter((f) => /\.mdx?$/.test(f)).filter((f) => {
    try { return /^noteId:/m.test(frontMatter(readFileSync(join(repoRoot, f), 'utf8')) ?? ''); } catch { return false; }
  });
  assert.deepEqual(stamped, [], 'remove the noteId/tags lines your editor added (and turn the extension off for this folder)');
});

test('front matter is read only from the top of a file: real front matter and later "noteId" text are not flagged', () => {
  assert.equal(frontMatter('---\ntitle: A\n---\n\nnoteId: in prose'), 'title: A');
  assert.equal(/^noteId:/m.test(frontMatter('# Doc\n\nnoteId: x') ?? ''), false);
  assert.equal(/^noteId:/m.test(frontMatter('---\nnoteId: "1"\ntags: []\n\n---\n') ?? ''), true);
});
