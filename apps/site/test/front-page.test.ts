// The Index's mapping from public discovery entries to a front page, and the Beacon palette's
// pure logic. Real catalog and release file; small hand-made lists only for edge cases.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CANARY, parseCatalog } from '@pu/experience-catalog';
import { parseRelease, type ReleaseState } from '@pu/platform-schema';
import { readFileSync } from 'node:fs';
import { frontPage, related, SECTIONS } from '../src/experiences/index/front-page.ts';
import { publicDiscoveryIndex, type DiscoveryEntry } from '../src/platform/discovery/index.ts';
import { isApple, isEditable, isShortcut, matches, step } from '../src/platform/beacon/palette.ts';

const { experiences } = parseCatalog();
const release = parseRelease(JSON.parse(readFileSync(new URL('../../../config/release.json', import.meta.url), 'utf8'))).state!;
const entries = (state: ReleaseState = release, env: 'production' | 'preview' = 'production') => publicDiscoveryIndex(experiences, state, env);
const entry = (id: string, extra: Partial<DiscoveryEntry> = {}): DiscoveryEntry =>
  ({ id, title: id, summary: 's', href: `/${id}`, weight: 'static', tags: [], ...extra });

test('the real front page: lead, detour, sections, counts; the Index never lists itself', () => {
  const page = frontPage(entries(), 'index');
  assert.equal(page.lead?.id, 'journal');
  assert.equal(page.detour?.id, 'sample-app');
  assert.deepEqual(page.sections.map((s) => [s.id, s.entries.map((e) => e.id)]), [
    ['engineering', ['devxray']], ['thinking', ['sample-content']], ['labs', ['kawaiui']],
  ]);
  assert.deepEqual(page.counts, { total: 5, hosted: 3, external: 2 });
  const shown = [page.lead, page.detour, ...page.sections.flatMap((s) => s.entries)].map((e) => e!.id);
  assert.equal(new Set(shown).size, shown.length, 'each entry appears once');
  assert.ok(!shown.includes('index'));
});

test('drafts, owner-only and unlisted entries never reach the front page or the palette, in any environment', () => {
  for (const env of ['production', 'preview'] as const) {
    const ids = entries(release, env).map((e) => e.id);
    assert.ok(!ids.includes('canary-draft') && !ids.includes('sample-hostile'), env);
    assert.ok(!JSON.stringify(entries(release, env)).includes(CANARY), env);
  }
  const withdrawn = structuredClone(release);
  withdrawn.experiences.journal = { ...withdrawn.experiences.journal!, access: { kind: 'owner' } };
  assert.ok(!frontPage(entries(withdrawn), 'index').sections.flatMap((s) => s.entries).some((e) => e.id === 'journal'));
  assert.notEqual(frontPage(entries(withdrawn), 'index').lead?.id, 'journal');
});

test('externals keep their own address and host; hosted entries use their first parameter-free route', () => {
  const byId = new Map(entries().map((e) => [e.id, e]));
  assert.deepEqual([byId.get('kawaiui')!.href, byId.get('kawaiui')!.host], ['https://kawaiui.vercel.app/', 'kawaiui.vercel.app']);
  assert.deepEqual([byId.get('journal')!.href, byId.get('journal')!.host], ['/journal', undefined]);
});

test('small and empty collections: no detour under three entries, nothing invented', () => {
  assert.deepEqual(frontPage([], 'index'), { lead: undefined, detour: undefined, sections: [], counts: { total: 0, hosted: 0, external: 0 } });
  const one = frontPage([entry('index'), entry('a')], 'index');
  assert.deepEqual([one.lead?.id, one.detour, one.sections.length], ['a', undefined, 0]);
  const two = frontPage([entry('a'), entry('b', { section: 'labs' })], 'index');
  assert.deepEqual([two.lead?.id, two.detour, two.sections.map((s) => s.id)], ['a', undefined, ['labs']]);
});

test('sections follow the fixed order, hide when empty, and unfiled entries go to "Also here"', () => {
  const many = [entry('lead'), entry('x', { section: 'thinking' }), entry('y'), entry('z', { section: 'engineering' }), entry('w', { section: 'civic' }), entry('last')];
  const page = frontPage(many, 'index');
  assert.deepEqual(page.sections.map((s) => s.id), ['engineering', 'civic', 'thinking', 'also']);
  assert.deepEqual(page.sections.find((s) => s.id === 'also')!.entries.map((e) => e.id), ['y']);
  assert.equal(page.detour?.id, 'last', 'deterministic: the entry that would sit last');
  assert.deepEqual(frontPage(many, 'index'), page);
  assert.deepEqual(SECTIONS.map((s) => s.label), ['Engineering', 'Civic', 'Thinking', 'Labs', 'Profile', 'Also here']);
});

test('marginalia come only from shared catalog tags', () => {
  const all = entries();
  const journal = all.find((e) => e.id === 'journal')!;
  assert.deepEqual(related(journal, all, 'index').map((r) => [r.tag, r.entries.map((e) => e.id)]), [['architecture', ['sample-content', 'sample-app']]]);
  assert.deepEqual(related(all.find((e) => e.id === 'kawaiui')!, all, 'index'), []);
  // Names alone never relate entries.
  assert.deepEqual(related(entry('orrery-a'), [entry('orrery-a'), entry('orrery-b')], 'index'), []);
});

test('palette filtering: every word must match title, id, kind, section or tag; case-insensitive', () => {
  const terms = 'the orrery journal journal hosted here thinking architecture history';
  assert.ok(matches(terms, ''));
  assert.ok(matches(terms, '  JOURNAL '));
  assert.ok(matches(terms, 'arch think'));
  assert.ok(!matches(terms, 'arch labs'));
  assert.ok(!matches(terms, 'kawaiui'));
});

test('palette selection wraps, and is -1 when nothing is shown', () => {
  assert.equal(step(-1, 3, 1), 0);
  assert.equal(step(-1, 3, -1), 2);
  assert.equal(step(2, 3, 1), 0);
  assert.equal(step(0, 3, -1), 2);
  assert.equal(step(1, 3, 1), 2);
  assert.equal(step(0, 0, 1), -1);
});

test('the shortcut is ⌘K or Ctrl+K alone; typing in a field keeps it', () => {
  const k = (o: Partial<KeyboardEvent>) => ({ key: 'k', metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...o });
  assert.ok(isShortcut(k({ metaKey: true })));
  assert.ok(isShortcut(k({ ctrlKey: true, key: 'K' })));
  assert.ok(!isShortcut(k({})));
  assert.ok(!isShortcut(k({ metaKey: true, ctrlKey: true })));
  assert.ok(!isShortcut(k({ ctrlKey: true, altKey: true })));
  assert.ok(!isShortcut(k({ ctrlKey: true, shiftKey: true })));
  assert.ok(!isShortcut(k({ ctrlKey: true, key: 'j' })));
  for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT']) assert.ok(isEditable({ tagName } as unknown as EventTarget));
  assert.ok(isEditable({ tagName: 'DIV', isContentEditable: true } as unknown as EventTarget));
  assert.ok(!isEditable({ tagName: 'BODY', isContentEditable: false } as unknown as EventTarget));
  assert.ok(!isEditable(null));
  assert.ok(isApple({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)' }));
  assert.ok(!isApple({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }));
});

test('a published resume would join the front page under Profile and the palette, with no hand-written link', () => {
  const published = structuredClone(release);
  published.experiences.resume = { ...published.experiences.resume!, lifecycle: 'published', access: { kind: 'public' }, discoverability: 'listed' };
  const list = entries(published);
  const resume = list.find((e) => e.id === 'resume');
  assert.deepEqual([resume?.href, resume?.section, resume?.headline], ['/resume', 'profile', 'plain']);
  // Last in catalog order, so the documented rule lifts it to "Worth the detour"; reorder the catalog to change that.
  const page = frontPage(list, 'index');
  assert.equal(page.detour?.id, 'resume');
  assert.equal([page.lead, page.detour, ...page.sections.flatMap((x) => x.entries)].filter((e) => e?.id === 'resume').length, 1);
  assert.ok(!entries().some((e) => e.id === 'resume'), 'but not while it is a draft');
});
