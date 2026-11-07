// One published file of a skill, served exactly as stored: /skills/<slug>/files/<relative path>.
import type { APIRoute, GetStaticPaths } from 'astro';
import { skills } from '../library.ts';

export const getStaticPaths = (() => skills.flatMap((s) => s.files.map((f) => ({
  params: { skill: s.slug, path: f.path },
  props: { text: f.text },
})))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => new Response(Buffer.from(props.text as string, 'utf8'), {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
});
