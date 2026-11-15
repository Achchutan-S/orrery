// robots.txt. Production invites crawlers and names the sitemap; a preview or local build, which
// also holds drafts, asks them to stay out. This is a request to well-behaved crawlers, not access
// control (docs/blueprint.md § 6.3).
import type { APIRoute } from 'astro';
import { env } from '../platform/release/index.ts';

export const GET: APIRoute = ({ site }) => {
  const body = env === 'production'
    ? `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', site).href}\n`
    : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
