// Generates config/release.schema.json (editor autocompletion) from the zod schema.
// Run `pnpm gen:release-schema`; release-schema.test.ts fails if the committed file is stale.
// Lives in tools/ (not platform-schema) so the schema package depends on zod alone.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { ReleaseState } from '@pu/platform-schema';

export const releaseJsonSchema = (): string =>
  `${JSON.stringify(z.toJSONSchema(ReleaseState, { io: 'input' }), null, 2)}\n`;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(process.argv[2] ?? 'release.schema.json', releaseJsonSchema());
}
