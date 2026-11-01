import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import { defineConfig, fontProviders } from 'astro/config';
import { createHash } from 'node:crypto';
import mountExperiences from './integrations/mount-experiences.ts';
import { LAYER_ORDER } from './src/platform/tokens/layer-order.ts';

// Canonical and og:url need an absolute origin. Vercel provides the production host;
// locally (and until a domain exists) URLs point at the dev server.
const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export default defineConfig({
  site: productionHost ? `https://${productionHost}` : 'http://localhost:4321',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [react(), mdx(), mountExperiences()],
  // Astro hashes every script and style it emits into a <meta> CSP (blueprint ADR-002).
  // Directives a <meta> cannot carry (frame-ancestors) are vercel.json headers (ADR-016).
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
      // The inline layer-order statement is not processed by Astro, so its hash is added here.
      styleDirective: { hashes: [`sha256-${createHash('sha256').update(LAYER_ORDER).digest('base64')}`] },
    },
  },
  // Shiki writes inline style attributes, which this CSP blocks; no page highlights code yet.
  markdown: { syntaxHighlight: false },
  // Platform pages only (index, 404). Self-hosted at build; experiences bring their own fonts.
  fonts: [{
    provider: fontProviders.google(),
    name: 'Atkinson Hyperlegible Next',
    cssVariable: '--font-platform',
    weights: [400, 700],
    styles: ['normal'],
    subsets: ['latin'],
    fallbacks: ['system-ui', 'sans-serif'],
  }],
});
