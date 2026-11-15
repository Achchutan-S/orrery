import assert from 'node:assert/strict';
import { test } from 'node:test';
import { captureMatrix, contactSheet, shotName, WIDTHS } from '../scripts/capture.ts';

test('the capture matrix: four widths, each scheme the experience offers, motion on and reduced', () => {
  assert.deepEqual(WIDTHS, [360, 768, 1280, 1920]);
  assert.equal(captureMatrix('dark').length, 4 * 1 * 2);
  assert.ok(captureMatrix('dark').every((s) => s.scheme === 'dark'));
  assert.equal(captureMatrix('light-dark').length, 4 * 2 * 2);
  assert.equal(captureMatrix('custom').length, 4 * 2 * 2, 'a custom scheme is looked at under both preferences');
});

test('the contact sheet names every capture it links, so nothing reviewed is missing from disk', () => {
  const shots = captureMatrix('dark');
  const sheet = contactSheet('x', 'slice-1', ['/x', '/x/a'], shots);
  for (const path of ['/x', '/x/a']) for (const s of shots) for (const part of ['first', 'full'] as const) assert.ok(sheet.includes(shotName(path, s, part)), shotName(path, s, part));
  assert.equal(shotName('/', shots[0]!, 'first'), 'index-360-dark-motion-first.png');
});
