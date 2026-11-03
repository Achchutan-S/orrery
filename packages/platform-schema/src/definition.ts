import { z } from 'zod';

export const Capability = z.enum([
  'content', 'interactive', 'visualization', 'geospatial',
  'multimedia', 'data', 'downloads', 'api', 'experimental',
]);

// Canonical paths only (docs/architecture.md § Route paths): '/'-separated, lowercase ASCII,
// every segment starts with a letter, digit or underscore. That rules out '.' and '..', empty segments,
// backslashes, absolute paths, percent-encoding and look-alike characters, so a path means
// the same thing to the schema, the filesystem, Vite and the URL layer.
const SEGMENT = '[a-z0-9_][a-z0-9_.-]*';
const ENTRYPOINT = new RegExp(`^${SEGMENT}(?:/${SEGMENT})+\\.(?:astro|ts)$`);
// URL segments may also hold Astro parameters ('[chapter]', '[...path]').
const URL_SEGMENT = `(?:${SEGMENT}|\\[(?:\\.\\.\\.)?[a-z][a-zA-Z0-9]*\\])`;
const PATTERN = new RegExp(`^/(?:${URL_SEGMENT}(?:/${URL_SEGMENT})*)?$`);

export const Route = z.object({
  pattern: z.string().regex(PATTERN, 'Route patterns are canonical: /a/b, no ".", "..", empty segments or backslashes'),
  // Path relative to apps/site/src/experiences/, e.g. 'cloud/routes/index.astro'.
  // A string, never an import, so the catalog stays free of site code.
  entrypoint: z.string().regex(ENTRYPOINT, 'Entrypoints are canonical relative paths: <id>/…/<file>.astro|ts, no ".", "..", empty segments or backslashes'),
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
  // How the Index presents the entry (task 14). Both optional: an entry without a section is
  // listed under "Also here"; without a headline style its title is set in the platform face.
  section: z.enum(['engineering', 'civic', 'thinking', 'labs', 'profile']).optional(),
  // Echoes the experience's own typography on the Index without loading its fonts there:
  // literary = book serif, technical = monospace, expressive = heavy display sans, plain = platform face.
  headline: z.enum(['literary', 'technical', 'expressive', 'plain']).optional(),
});

export const InternalExperience = Base.extend({
  kind: z.literal('internal'),
  routes: z.array(Route).min(1),
  // Implemented chrome only (ADR-021). The blueprint's 'full' (shared header) is rejected here,
  // not at build time, until an experience needs it.
  chrome: z.enum(['minimal', 'beacon'], {
    error: (i) => `chrome ${JSON.stringify(i.input)} is not supported; use "minimal" (Beacon and colophon) or "beacon" (Beacon only). "full" is not implemented (ADR-021)`,
  }).default('minimal'),
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
  // Link-preview image: the pattern of one of this experience's own .png/.jpg routes, so it is
  // built only where the experience is (ADR-020, ADR-022). Without it pages use the platform's /og.png.
  ogImage: z.string().optional(),
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
