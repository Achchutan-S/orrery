import { lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { catalog } from '@pu/experience-catalog';
import {
  buildEnvironment, mountedRoutes, validatePlatform,
  type Environment, type ExperienceInput, type Issue,
} from '@pu/platform-schema';

const experiencesDir = new URL('../src/experiences/', import.meta.url);
const releaseFile = new URL('../../../config/release.json', import.meta.url);

/** A regular file at exactly this path: no symlink in the path, so it cannot point into another experience. */
function isOwnFile(entrypoint: string): boolean {
  const path = fileURLToPath(new URL(entrypoint, experiencesDir));
  try {
    return lstatSync(path).isFile() && realpathSync(path) === join(realpathSync(experiencesDir), entrypoint);
  } catch {
    return false;
  }
}

type PlanInput = {
  catalog: readonly ExperienceInput[];
  release: unknown;
  env: Environment;
  folders: readonly string[];
  fileExists: (entrypoint: string) => boolean;
};

/** Validates everything, then lists the routes to mount. Any issue means no routes. */
export function planMount(input: PlanInput): { routes: ReturnType<typeof mountedRoutes>; issues: Issue[] } {
  const { experiences, state, issues } = validatePlatform(input);
  if (issues.length > 0 || !state) return { routes: [], issues };
  return { routes: mountedRoutes(experiences, state, input.env), issues };
}

/**
 * Injects only the routes of experiences mounted in this environment (VERCEL_ENV).
 * A route that is not injected is never compiled, so its pages, islands and assets
 * cannot reach dist/. Any catalog or release issue fails the build.
 */
export default function mountExperiences(): AstroIntegration {
  return {
    name: 'pu:mount-experiences',
    hooks: {
      'astro:config:setup': ({ injectRoute, addWatchFile, logger }) => {
        addWatchFile(releaseFile);
        const env = buildEnvironment(process.env);
        const { routes, issues } = planMount({
          catalog,
          release: JSON.parse(readFileSync(releaseFile, 'utf8')),
          env,
          folders: readdirSync(experiencesDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name),
          fileExists: isOwnFile,
        });
        if (issues.length > 0) {
          const list = issues.map((i) => `  - ${i.path} [${i.rule}] ${i.message}`).join('\n');
          throw new Error(`Experience catalog or config/release.json is invalid:\n${list}`);
        }
        for (const { pattern, entrypoint } of routes) {
          injectRoute({ pattern, entrypoint: new URL(entrypoint, experiencesDir), prerender: true });
        }
        logger.info(`${env}: mounted ${[...new Set(routes.map((r) => r.id))].join(', ') || 'nothing'}`);
      },
    },
  };
}
