// The experience's own font files, served from its own routes (contract § 3.6, "a file route of the
// experience"): /seeing/fonts/<name>/face.woff2. Committed WOFF2 subsets; licences beside them and in
// data/assets.ts. Built only where the experience is mounted.
import type { APIRoute, GetStaticPaths } from 'astro';

const files = import.meta.glob<string>('../assets/fonts/*.woff2', { query: '?inline', import: 'default', eager: true });

export const getStaticPaths = (() => Object.entries(files).map(([path, data]) => ({
  params: { face: path.slice(path.lastIndexOf('/') + 1).replace(/\.woff2$/, '') },
  props: { data },
}))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const data = props.data as string;
  return new Response(new Uint8Array(Buffer.from(data.slice(data.indexOf(',') + 1), 'base64')), { headers: { 'Content-Type': 'font/woff2' } });
};
