// Kernel units: discovery filtering, track(), authorize(), token contrast.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseCatalog } from '@pu/experience-catalog';
import { Lifecycle, parseRelease, type ReleaseState } from '@pu/platform-schema';
import { authorize } from '../src/platform/access/authorize.ts';
import { track } from '../src/platform/analytics/track.ts';
import { publicDiscoveryIndex, weightLine } from '../src/platform/discovery/index.ts';
import { STATES } from '../src/experiences/sample-app/lifecycles.ts';
import { stateFacts } from '../src/experiences/sample-app/facts.ts';
import { views } from '../src/experiences/sample-app/views.ts';

const { experiences } = parseCatalog();
const release = parseRelease(JSON.parse(readFileSync(new URL('../../../config/release.json', import.meta.url), 'utf8'))).state!;
const ids = (state: ReleaseState) => publicDiscoveryIndex(experiences, state, 'production').map((e) => e.id);
const edit = (id: string, patch: Partial<ReleaseState['experiences'][string]>) => {
  const s = structuredClone(release);
  s.experiences[id] = { ...s.experiences[id]!, ...patch };
  return s;
};

test('discovery lists public, listed experiences in catalog order, internal and external', () => {
  const entries = publicDiscoveryIndex(experiences, release, 'production');
  assert.deepEqual(entries.map((e) => [e.id, e.href, e.weight, e.host]), [
    ['kawaiui', 'https://kawaiui.vercel.app/', 'external', 'kawaiui.vercel.app'],
    ['devxray', 'https://devxray-one.vercel.app/', 'external', 'devxray-one.vercel.app'],
    ['sample-content', '/sample-content', 'static', undefined],
    ['sample-app', '/sample-app', 'interactive', undefined],
  ]);
  // Titles and summaries come from the catalog, not from a UI-specific copy.
  for (const e of entries) {
    const source = experiences.find((x) => x.id === e.id)!;
    assert.equal(e.title, source.title);
    assert.equal(e.summary, source.summary);
  }
});

test('discovery excludes drafts and owner-only experiences in every environment', () => {
  for (const env of ['development', 'preview', 'production'] as const) {
    const ids = publicDiscoveryIndex(experiences, release, env).map((e) => e.id);
    assert.ok(!ids.includes('canary-draft') && !ids.includes('sample-hostile'), env);
  }
  assert.ok(!ids(edit('sample-app', { access: { kind: 'owner' } })).includes('sample-app'));
});

test('discovery excludes unlisted and deprecated experiences', () => {
  assert.ok(!ids(edit('sample-content', { discoverability: 'unlisted' })).includes('sample-content'));
  assert.ok(!ids(edit('sample-content', { lifecycle: 'deprecated', discoverability: 'unlisted' })).includes('sample-content'));
  assert.ok(!ids(edit('kawaiui', { discoverability: 'unlisted' })).includes('kawaiui'));
  assert.ok(!ids(edit('devxray', { access: { kind: 'owner' } })).includes('devxray'));
});

test('weight lines say what opening an entry involves; externals name their host', () => {
  assert.equal(weightLine({ weight: 'static' }), 'Static page. No JavaScript of its own.');
  assert.equal(weightLine({ weight: 'external', host: 'devxray-one.vercel.app' }), 'Leaves Personal Universe for devxray-one.vercel.app.');
});

test('track() is a no-op: no network, no storage, no return value', () => {
  const calls: string[] = [];
  const saved = { fetch: globalThis.fetch, navigator: globalThis.navigator };
  globalThis.fetch = (() => { calls.push('fetch'); return Promise.reject(new Error('no')); }) as typeof fetch;
  Object.defineProperty(globalThis, 'navigator', { value: { sendBeacon: () => calls.push('beacon') }, configurable: true });
  try {
    assert.equal(track('sample-app', 'view_opened', { view: 'overview', n: 1 }), undefined);
    assert.deepEqual(calls, []);
  } finally {
    globalThis.fetch = saved.fetch;
    Object.defineProperty(globalThis, 'navigator', { value: saved.navigator, configurable: true });
  }
});

test('authorize() stub fails closed for every subject', () => {
  for (const subject of [{ kind: 'anonymous' }, { kind: 'account', id: 'owner' }] as const) {
    for (const id of ['sample-content', 'canary-draft', 'unknown']) {
      assert.deepEqual(authorize(subject, id), { allowed: false, reason: 'not-implemented' });
    }
  }
});

// WCAG 2.x relative luminance and contrast ratio.
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

test('platform page colours meet WCAG AA for text in light and dark schemes', () => {
  const css = readFileSync(new URL('../src/pages/_PlatformLayout.astro', import.meta.url), 'utf8');
  const token = (name: string) => {
    const m = css.match(new RegExp(`--${name}: light-dark\\((#[0-9a-f]{6}), (#[0-9a-f]{6})\\)`));
    assert.ok(m, `--${name} not found`);
    return { light: m[1]!, dark: m[2]! };
  };
  const plate = token('plate');
  for (const text of ['ink', 'graphite', 'verdigris']) {
    for (const scheme of ['light', 'dark'] as const) {
      const ratio = contrast(token(text)[scheme], plate[scheme]);
      assert.ok(ratio >= 4.5, `${text} on plate (${scheme}) is ${ratio.toFixed(2)}:1`);
    }
  }
});

test('the two-band focus ring contrasts at least 3:1 with any solid background', () => {
  const css = readFileSync(new URL('../src/platform/tokens/platform.css', import.meta.url), 'utf8');
  const inner = css.match(/--pu-focus-inner: (#[0-9a-f]{6})/)![1]!;
  const outer = css.match(/--pu-focus-outer: (#[0-9a-f]{6})/)![1]!;
  let worst = Infinity;
  for (let v = 0; v <= 255; v++) {
    const grey = `#${v.toString(16).padStart(2, '0').repeat(3)}`;
    worst = Math.min(worst, Math.max(contrast(inner, grey), contrast(outer, grey)));
  }
  assert.ok(worst >= 3, `worst case ${worst.toFixed(2)}:1`);
});

test('sample-app: its client-side state list matches platform-schema, and every state has a view', () => {
  assert.deepEqual([...STATES], Lifecycle.options);
  assert.deepEqual(views.map((v) => v.path), ['states', ...STATES.map((s) => `states/${s}`)]);
});

test('sample-app: build-time facts agree with the release rules', () => {
  const draft = stateFacts().find((f) => f.state === 'draft')!;
  assert.deepEqual(draft.built.public, { development: true, preview: true, production: false });
  assert.deepEqual(draft.next, ['alpha', 'beta', 'published']);
  const published = stateFacts().find((f) => f.state === 'published')!;
  assert.deepEqual(published.built.owner, { development: true, preview: true, production: false });
  assert.equal(published.channel, 'stable');
});
