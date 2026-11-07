// The Vercel build (apps/site/vercel.json). A production deployment builds only after the
// source checks pass and is accepted only if the output checks pass: any failure exits
// non-zero, so Vercel fails the deployment and production keeps serving the previous one.
// Previews and local builds only build. docs/deployment.md § Production build gate.
import { spawnSync } from 'node:child_process';
import { buildEnvironment, type Environment } from '@pu/platform-schema';
import { isMain, repoRoot } from './repo.ts';

/** Root package.json scripts, in order. Reuses the same scripts CI and `pnpm check` run. */
export function deploySteps(env: Environment): string[] {
  if (env !== 'production') return ['build'];
  return ['typecheck', 'check:boundaries', 'build', 'check:metadata', 'check:leaks', 'check:budgets'];
}

if (isMain(import.meta)) {
  // Throws when PU_DEPLOYMENT is set without VERCEL_ENV, as the site build does.
  const env = buildEnvironment(process.env);
  console.log(`deploy build (${env}): ${deploySteps(env).join(' → ')}`);
  for (const step of deploySteps(env)) {
    const r = spawnSync('pnpm', ['run', step], { cwd: repoRoot, stdio: 'inherit' });
    if (r.status !== 0) {
      console.error(`✖ deploy build: \`pnpm run ${step}\` failed (${r.error?.message ?? `exit ${r.status ?? r.signal}`}); nothing is deployed.`);
      process.exit(1);
    }
  }
  console.log(`✔ deploy build (${env}): all steps passed`);
}
