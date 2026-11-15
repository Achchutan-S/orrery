// The sitemap: the entry page of every experience hosted here and listed in this build, from
// publicDiscoveryIndex() and nothing else, so an unlisted, draft or external address can never
// appear in it. Crawlers reach an experience's other pages through its own links.
import type { APIRoute } from 'astro';
import { publicDiscoveryIndex } from '../platform/discovery/index.ts';
import { env, experiences, releaseState } from '../platform/release/index.ts';

export const GET: APIRoute = ({ site }) => {
  const urls = publicDiscoveryIndex(experiences, releaseState, env)
    .filter((e) => e.weight !== 'external')
    .map((e) => `  <url><loc>${new URL(e.href, site).href}</loc></url>`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
