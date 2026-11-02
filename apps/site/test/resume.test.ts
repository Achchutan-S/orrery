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
/** Collapses case and whitespace: small caps print as capitals, lines wrap anywhere (also after a hyphen). */
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').replace(/- /g, '-').trim();
const everything = JSON.stringify(resume);

test('the assets were generated from the current content.ts (run `pnpm --filter @pu/site resume:assets`)', () => {
  const hash = createHash('sha256').update(readFileSync(new URL('../src/experiences/resume/content.ts', import.meta.url))).digest('hex');
  assert.equal(readFileSync(new URL('source.sha256', assets), 'utf8').trim(), hash);
});

test('the PDF is a real, small, one- or two-page A4 document with a text layer, outline and tags', () => {
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
    resume.name, resume.role, ...resume.focus, resume.location, resume.email, resume.summary, resume.earlierWork,
    ...resume.links.map((l) => l.text),
    ...resume.experience.flatMap((x) => [x.title, x.organisation, x.place, ...x.points.flatMap((p) => [p.lead, p.text]), ...(x.prototypes ?? [])]),
    ...resume.projects.flatMap((p) => [p.name, p.kind, p.stack.join(', '), p.summary, ...p.links.map((l) => l.text), ...(p.points ?? [])]),
    ...resume.skills.flatMap((s) => [s.group, ...s.items]),
    ...resume.education.flatMap((e) => [e.degree, e.institution, e.place, e.grade]),
    ...resume.recognition, ...resume.certifications, ...resume.learning,
  ];
  for (const s of statements) assert.ok(t.includes(norm(s)), `missing from the PDF: ${s}`);
  for (const section of ['summary', 'experience', 'prototypes and proofs of concept', 'projects', 'skills', 'education', 'recognition and learning']) assert.ok(t.includes(section), section);
});

test('the link-preview image is a 1200×630 PNG', () => {
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1200, 630]);
});

test('no placeholders, only the approved contact details, nothing internal', () => {
  for (const [what, s] of [['content', everything], ['PDF', text]] as const) {
    assert.doesNotMatch(s, /\b(TODO|TBD|FIXME|lorem|placeholder|example\.(com|org))\b/i, what);
    const emails = [...s.matchAll(/[\w.+-]+@[\w-]+\.[\w.]+/g)].map((m) => m[0]);
    assert.deepEqual([...new Set(emails)], ['achchutansrinivasan26@gmail.com'], `${what}: only the owner's approved address`);
    assert.doesNotMatch(s, /\+?\d[\d\s()-]{8,}\d/, `${what}: no phone number`);
    // Internal Verizon names stay generalised (docs/resume.md); the internal performance rating is not published.
    assert.doesNotMatch(s, /APIGraph|Service Hive|Digital Service|rep-facing|Exceeding Performance|verizon\.com|vzw|\.internal|localhost|salary|ctc|appraisal|rating/i, what);
  }
  // Links are only the owner's verified public profiles, repositories and sites (from the V3 resume or the repositories' remotes).
  const allowed = /^https:\/\/(github\.com\/Achchutan-S(\/(devxray|searchtosyllabi|let-me-study|orrery))?|linkedin\.com\/in\/achchutan-s-5390251b5|leetcode\.com\/u\/achchutan26|orrery-teal\.vercel\.app\/|devxray-one\.vercel\.app\/)$/;
  for (const href of [...resume.links.map((l) => l.href), ...resume.projects.flatMap((p) => p.links.map((l) => l.href))]) assert.match(href, allowed, href);
});

test('prototypes are kept apart from production work, and exposure apart from experience', () => {
  const role = resume.experience[0]!;
  assert.equal(role.prototypes?.length, 4);
  for (const p of role.points) assert.doesNotMatch(p.text, /voice ?bot|Boltzmann|gas-sheet|JSONL/i, 'prototype work listed as production');
  assert.deepEqual(resume.skills.at(-1), { group: 'Exposure only', items: ['Docker', 'Kubernetes', 'Google Cloud Platform'] });
  assert.ok(!resume.skills.slice(0, -1).some((s) => s.items.some((i) => /Docker|Kubernetes|Google Cloud/.test(i))));
});

test('owner decisions (task 15.2): a passed certification is not a learning path; no AI-assistance line; academic ML wording', () => {
  assert.deepEqual(resume.certifications, ['Google Cloud Certified – Generative AI Leader (exam passed October 2026).']);
  assert.ok(!resume.learning.some((x) => /Generative AI Leader/.test(x)));
  assert.ok(resume.learning.includes('Google AI Professional Certificate.'), 'kept exactly as in V3');
  assert.doesNotMatch(everything, /AI coding assistance|credential ID/i);
  assert.match(resume.earlierWork, /academic deep-learning project \(6th semester\).*82% to 89% during experimentation; not clinically validated/);
  assert.ok(!resume.projects.some((p) => /kawaiui/i.test(p.name)), 'KawaiUI stays off the resume');
});

test('dates are ISO year-months in order; only the current role is open-ended', () => {
  for (const x of resume.experience) {
    assert.match(x.start, /^\d{4}-(0[1-9]|1[0-2])$/);
    if (x.end !== null) assert.ok(x.end >= x.start, x.title);
  }
  assert.equal(resume.experience.filter((x) => x.end === null).length, 1);
});
