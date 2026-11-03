import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import { defineConfig, fontProviders } from 'astro/config';
import { createHash } from 'node:crypto';
import mountExperiences from './integrations/mount-experiences.ts';
import { LAYER_ORDER } from './src/platform/tokens/layer-order.ts';

/** One weight of the platform face: the same variable-font file, as Google Fonts declared it. */
const platformFace = (weight: 400 | 700) => ({
  src: ['./src/platform/fonts/atkinson-hyperlegible-next-latin.woff2'] as [string],
  weight,
  style: 'normal' as const,
  display: 'swap' as const,
  unicodeRange: ['U+0000-00FF', 'U+0131', 'U+0152-0153', 'U+02BB-02BC', 'U+02C6', 'U+02DA', 'U+02DC', 'U+0304', 'U+0308', 'U+0329',
    'U+2000-206F', 'U+20AC', 'U+2122', 'U+2191', 'U+2193', 'U+2212', 'U+2215', 'U+FEFF', 'U+FFFD'] as [string, ...string[]],
});

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
  // The platform face, used by platform pages and the experiences that opt in (index, Journal,
  // resume). A committed file, so builds need no network (ADR-021). It is Google Fonts' latin
  // subset of the variable font, byte for byte what the Google provider used to download; licence
  // and provenance in src/platform/fonts/. Declared at 400 and 700, as before.
  fonts: [{
    provider: fontProviders.local(),
    name: 'Atkinson Hyperlegible Next',
    cssVariable: '--font-platform',
    fallbacks: ['system-ui', 'sans-serif'],
    options: { variants: [platformFace(400), platformFace(700)] },
  }],
});
