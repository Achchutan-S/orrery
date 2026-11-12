// The experience's own images, served from its own routes (contract § 3.6, "a file route of the
// experience"): /seeing/images/<name>/image.webp. Compressed, metadata-stripped WebP; credits and licences in
// data/assets.ts. Built only where the experience is mounted.
import type { APIRoute, GetStaticPaths } from 'astro';

const files = import.meta.glob<string>('../assets/images/*.webp', { query: '?inline', import: 'default', eager: true });

export const getStaticPaths = (() => Object.entries(files).map(([path, data]) => ({
  params: { image: path.slice(path.lastIndexOf('/') + 1).replace(/\.webp$/, '') },
  props: { data },
}))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const data = props.data as string;
  return new Response(new Uint8Array(Buffer.from(data.slice(data.indexOf(',') + 1), 'base64')), { headers: { 'Content-Type': 'image/webp' } });
};
