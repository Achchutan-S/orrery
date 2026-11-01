import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canTransition, resolve, type Experience, type RegistryItem, type ReleaseEntry, type ReleaseState } from '@pu/platform-schema';
import { allowedTransitions, availability, counts, entryRows, environmentView, impactSentences, LIFECYCLES, matches, sortItems } from './model.ts';

const internal = (id: string, title: string): Experience => ({
  kind: 'internal', id, title, summary: 's', capabilities: ['content'], tags: [], routes: [{ pattern: `/${id}`, entrypoint: `${id}/r.astro`, render: 'static' }],
  chrome: 'minimal', colorScheme: 'light-dark', performanceClass: 'content', exclusiveImports: [], flags: {}, events: [],
});
const external = (id: string, title: string): Experience => ({ kind: 'external', id, title, summary: 's', capabilities: ['content'], tags: [], url: 'https://example.com/' });
const entry = (lifecycle: ReleaseEntry['lifecycle'], access: 'public' | 'owner', discoverability: 'listed' | 'unlisted' = 'listed'): ReleaseEntry =>
  ({ lifecycle, access: { kind: access }, discoverability, flags: {} });

/** A registry item exactly as the server builds it: resolution from platform-schema. */
function item(def: Experience, e: ReleaseEntry): RegistryItem {
  const state: ReleaseState = { platform: { flags: {} }, experiences: { [def.id]: e } };
  return {
    id: def.id, definition: def, release: e, hasReleaseEntry: true, channel: null, issues: [],
    environments: { development: resolve(def, state, 'development'), preview: resolve(def, state, 'preview'), production: resolve(def, state, 'production') },
  };
}

const items = [
  item(internal('journal', 'The Orrery Journal'), entry('published', 'public')),
  item(external('kawaiui', 'KawaiUI'), entry('published', 'public')),
  item(internal('canary-draft', 'Canary draft'), entry('draft', 'owner', 'unlisted')),
  item(internal('beta-thing', 'A beta'), entry('beta', 'owner', 'unlisted')),
];

test('allowed transitions are exactly canTransition (no second lifecycle model)', () => {
  for (const from of LIFECYCLES) assert.deepEqual(allowedTransitions(from), LIFECYCLES.filter((to) => canTransition(from, to)));
  assert.deepEqual(allowedTransitions('archived'), []);
});

test('availability words: built and listed, unlisted, not built; external projects are linked, never built', () => {
  const [journal, kawaiui, canary] = items as [RegistryItem, RegistryItem, RegistryItem];
  assert.deepEqual(availability(journal, 'production'), { label: 'Built · listed', on: true });
  assert.deepEqual(availability(canary, 'preview'), { label: 'Built · unlisted', on: true });
  assert.deepEqual(availability(canary, 'production'), { label: 'Not built', on: false });
  assert.deepEqual(availability(kawaiui, 'production'), { label: 'Linked', on: true });
});

test('search matches title or id, case-insensitively; filters use lifecycle, production, kind and issues', () => {
  const ids = (f: Parameters<typeof matches>[1], q = '') => items.filter((i) => matches(i, f, q)).map((i) => i.id);
  assert.deepEqual(ids('all', 'JOUR'), ['journal']);
  assert.deepEqual(ids('all', 'kawa'), ['kawaiui']);
  assert.deepEqual(ids('all', '  '), items.map((i) => i.id));
  assert.deepEqual(ids('draft'), ['canary-draft']);
  assert.deepEqual(ids('published'), ['journal', 'kawaiui']);
  assert.deepEqual(ids('in-production'), ['journal', 'kawaiui']);
  assert.deepEqual(ids('external'), ['kawaiui']);
  assert.deepEqual(ids('issues'), []);
  assert.deepEqual(ids('draft', 'journal'), []);
});

test('sorting by name, lifecycle order and kind; ties keep catalog order', () => {
  assert.deepEqual(sortItems(items, 'name').map((i) => i.id), ['beta-thing', 'canary-draft', 'kawaiui', 'journal']);
  assert.deepEqual(sortItems(items, 'lifecycle').map((i) => i.id), ['canary-draft', 'beta-thing', 'journal', 'kawaiui']);
  assert.deepEqual(sortItems(items, 'kind').map((i) => i.id), ['kawaiui', 'journal', 'canary-draft', 'beta-thing']);
  assert.deepEqual(sortItems(items, 'catalog').map((i) => i.id), items.map((i) => i.id));
});

test('counts and environment views come from the resolution', () => {
  const c = counts(items);
  assert.deepEqual([c.total, c.hosted, c.external, c.byLifecycle.published, c.byLifecycle.draft, c.byLifecycle.beta], [4, 3, 1, 2, 1, 1]);
  assert.deepEqual(environmentView(items, 'production').built.map((i) => i.id), ['journal']);
  assert.deepEqual(environmentView(items, 'production').listed.map((i) => i.id), ['journal', 'kawaiui']);
  assert.deepEqual(environmentView(items, 'preview').built.map((i) => i.id), ['journal', 'canary-draft', 'beta-thing']);
});

test('entry rows list only changed fields; a missing entry is the owner-only default', () => {
  assert.deepEqual(entryRows(entry('published', 'public'), entry('published', 'owner')), [{ field: 'Access', before: 'public', after: 'owner' }]);
  assert.deepEqual(entryRows(entry('draft', 'owner', 'unlisted'), entry('draft', 'owner', 'unlisted')), []);
  assert.deepEqual(entryRows(null, entry('beta', 'owner', 'unlisted')), [
    { field: 'Entry', before: 'none (owner-only draft by default)', after: 'added' },
    { field: 'Lifecycle', before: 'draft', after: 'beta' },
  ]);
  const flagged = { ...entry('published', 'public'), flags: { inspector: { preview: true, production: false } } };
  assert.deepEqual(entryRows(entry('published', 'public'), flagged), [{ field: 'Flag inspector', before: 'not set', after: 'preview on, production off' }]);
});

test('impact sentences name production precisely', () => {
  const def = internal('journal', 'J');
  const on = (e: ReleaseEntry) => resolve(def, { platform: { flags: {} }, experiences: { journal: e } }, 'production');
  assert.deepEqual(impactSentences({ environment: 'production', before: on(entry('draft', 'owner')), after: on(entry('published', 'public')) }, false),
    ['Production will now include this experience.', 'Production will now list it in discovery.']);
  assert.deepEqual(impactSentences({ environment: 'production', before: on(entry('published', 'public')), after: on(entry('published', 'owner')) }, false),
    ['Production will no longer include this experience.', 'Production will no longer list it in discovery.']);
  const ext = external('kawaiui', 'K');
  const extOn = (e: ReleaseEntry) => resolve(ext, { platform: { flags: {} }, experiences: { kawaiui: e } }, 'production');
  assert.deepEqual(impactSentences({ environment: 'production', before: extOn(entry('published', 'public')), after: extOn(entry('published', 'public', 'unlisted')) }, true),
    ['Production will no longer link to it from discovery.']);
  const b = { id: 'x', deployable: true, mounted: true, listed: false, flags: { inspector: false } };
  assert.deepEqual(impactSentences({ environment: 'preview', before: b, after: { ...b, flags: { inspector: true } } }, false), ['Flag inspector turns on in preview.']);
});
