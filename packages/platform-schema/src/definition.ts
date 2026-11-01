import { z } from 'zod';

export const Capability = z.enum([
  'content', 'interactive', 'visualization', 'geospatial',
  'multimedia', 'data', 'downloads', 'api', 'experimental',
]);

export const Route = z.object({
  pattern: z.string().startsWith('/'),
  // Path relative to apps/site/src/experiences/, e.g. 'cloud/routes/index.astro'.
  // A string, never an import, so the catalog stays free of site code.
  entrypoint: z.string().regex(/^[a-z0-9-]+\/.+\.(astro|ts)$/),
  render: z.enum(['static', 'on-demand']).default('static'),
});

export const FlagDeclaration = z.object({
  description: z.string(),
  evaluation: z.enum(['build', 'request']).default('build'), // request = Phase 4
});

const Base = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{1,39}$/),
  // Discovery shows both; blank text would render an unlabelled entry.
  title: z.string().trim().min(1).max(60),
  summary: z.string().trim().min(1).max(160),
  capabilities: z.array(Capability).min(1),
  tags: z.array(z.string()).max(8).default([]),
  variantOf: z.string().optional(),
});

export const InternalExperience = Base.extend({
  kind: z.literal('internal'),
  routes: z.array(Route).min(1),
  chrome: z.enum(['full', 'minimal', 'beacon']).default('minimal'),
  colorScheme: z.enum(['light', 'dark', 'light-dark', 'custom']).default('light-dark'),
  performanceClass: z.enum(['content', 'interactive', 'immersive']),
  budgetOverrides: z.object({
    jsKb: z.number().optional(),
    cssKb: z.number().optional(),
    transferMb: z.number().optional(),
    reason: z.string().min(20), // an override must be justified
  }).optional(),
  // Packages that ONLY this experience may import. Enforced by CI.
  // Does NOT isolate versions: the site has one dependency graph and one lockfile.
  exclusiveImports: z.array(z.string()).default([]),
  flags: z.record(z.string(), FlagDeclaration).default({}),
  events: z.array(z.string()).default([]),
  ogImage: z.string().optional(), // path relative to the experience folder
});

export const ExternalExperience = Base.extend({
  kind: z.literal('external'),
  // https only: the URL becomes an href on public pages, so javascript:, data:
  // and plain http must never validate.
  url: z.url({ protocol: /^https$/ }),
});

export const ExperienceDefinition =
  z.discriminatedUnion('kind', [InternalExperience, ExternalExperience]);

/** What a catalog entry author writes (defaults optional). */
export type ExperienceInput = z.input<typeof ExperienceDefinition>;
/** A parsed catalog entry (defaults applied). */
export type Experience = z.output<typeof ExperienceDefinition>;
export type InternalExperience = z.output<typeof InternalExperience>;

export const defineExperience = (d: ExperienceInput): ExperienceInput => d;
