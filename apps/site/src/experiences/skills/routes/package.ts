// The whole skill as a ZIP whose root is the skill's folder (what Claude.ai's upload expects), with
// every published file at its original relative path. Offered only when nothing it needs is withheld.
import type { APIRoute, GetStaticPaths } from 'astro';
import { skills } from '../library.ts';
import { zip } from '../zip.ts';

export const getStaticPaths = (() => skills.filter((s) => s.packaged).map((s) => ({ params: { skill: s.slug } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) => {
  const s = skills.find((k) => k.slug === params.skill)!;
  const bytes = zip(s.files.map((f) => ({ path: `${s.slug}/${f.path}`, data: Buffer.from(f.text, 'utf8') })), s.source.updated);
  return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': 'application/zip' } });
};
