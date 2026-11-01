// The resume's content and generated assets. The PDF and image are committed; these tests
// prove they are real, current and say what the page says (docs/resume.md).
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { resume } from '../src/experiences/resume/content.ts';
import { pdfText } from './pdf-text.ts';

const assets = new URL('../src/experiences/resume/assets/', import.meta.url);
const pdf = readFileSync(new URL('resume.pdf', assets));
const png = readFileSync(new URL('og.png', assets));
const { pages, text } = pdfText(pdf);
/** Collapses case and whitespace: small caps print as capitals, lines wrap anywhere. */
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const everything = JSON.stringify(resume);

test('the assets were generated from the current content.ts (run `pnpm --filter @pu/site resume:assets`)', () => {
  const hash = createHash('sha256').update(readFileSync(new URL('../src/experiences/resume/content.ts', import.meta.url))).digest('hex');
  assert.equal(readFileSync(new URL('source.sha256', assets), 'utf8').trim(), hash);
});

test('the PDF is a real, small, one-or-two page A4 document with a text layer, outline and tags', () => {
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.match(pdf.subarray(-32).toString('latin1'), /%%EOF\s*$/);
  assert.ok(pdf.length > 10_000 && pdf.length < 400_000, `${pdf.length} bytes`);
  assert.ok(pages >= 1 && pages <= 2, `${pages} pages`);
  assert.match(pdf.toString('latin1'), /\/MediaBox \[0 0 594\.95996 841\.91998\]/, 'A4');
  assert.match(pdf.toString('latin1'), /\/StructTreeRoot/, 'tagged');
  assert.ok(text.length > 1000, 'searchable text');
});

test('the PDF says what the page says: every statement in content.ts is in its text', () => {
  const t = norm(text);
  const statements = [
    resume.name, resume.role, resume.summary,
    ...resume.links.map((l) => l.text),
    ...resume.experience.flatMap((x) => [x.title, x.organisation, ...x.points]),
    ...resume.projects.flatMap((p) => [p.name, p.host, p.summary, ...(p.points ?? [])]),
    ...resume.skills.flatMap((s) => [s.group, ...s.items]),
    ...resume.education.flatMap((e) => [e.institution, e.field]),
  ];
  for (const s of statements) assert.ok(t.includes(norm(s)), `missing from the PDF: ${s}`);
  for (const section of ['summary', 'experience', 'selected projects', 'skills', 'education']) assert.ok(t.includes(section), section);
});

test('the link-preview image is a 1200×630 PNG', () => {
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1200, 630]);
});

test('no placeholders, no invented contact details, nothing internal', () => {
  for (const [what, s] of [['content', everything], ['PDF', text]] as const) {
    assert.doesNotMatch(s, /\b(TODO|TBD|FIXME|lorem|placeholder|example\.(com|org))\b/i, what);
    assert.doesNotMatch(s, /[\w.+-]+@[\w-]+\.[\w.]+/, `${what}: no e-mail address until the owner provides one`);
    assert.doesNotMatch(s, /\+?\d[\d\s()-]{8,}\d/, `${what}: no phone number`);
    assert.doesNotMatch(s, /linkedin\.com|verizon\.com|vzw|\.internal|localhost|salary|ctc|appraisal|rating/i, what);
  }
  // Links are only the owner's public GitHub and sites.
  for (const href of [...resume.links.map((l) => l.href), ...resume.projects.map((p) => p.href)]) {
    assert.match(href, /^https:\/\/(github\.com\/Achchutan-S|orrery-teal\.vercel\.app|devxray-one\.vercel\.app|kawaiui\.vercel\.app)\/?$/, href);
  }
});

test('dates are ISO year-months in order; only the current role is open-ended', () => {
  for (const x of resume.experience) {
    assert.match(x.start, /^\d{4}-(0[1-9]|1[0-2])$/);
    if (x.end !== null) assert.ok(x.end >= x.start, x.title);
  }
  assert.equal(resume.experience.filter((x) => x.end === null).length, 1);
});
