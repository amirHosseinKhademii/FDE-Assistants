/**
 * ONE CONFIG, PARAMETERISED BY SYSTEM — because there are five schemas and
 * Prisma 7 takes exactly one at a time.
 *
 * WHY THIS FILE EXISTS AT ALL, which is a Prisma 7 change worth recording.
 * Through Prisma 6 the connection string lived in the schema as
 * `url = env("DATABASE_URL")`. Prisma 7 removed it:
 *
 *     Error code: P1012
 *     error: The datasource property `url` is no longer supported in schema
 *     files. Move connection URLs for Migrate to `prisma.config.ts` and pass
 *     either `adapter` for a direct database connection or `accelerateUrl` to
 *     the PrismaClient constructor.
 *
 * (Measured on prisma 7.10.0, 2026-09-18, by generating a probe schema.) So the
 * CLI reads the URL here and the running app passes a driver adapter — which is
 * why `pg` is still a dependency after moving to Prisma, and why "five pools"
 * stayed literally true: each client is handed a `pg.Pool` this code owns.
 *
 * Prisma 7 also stopped loading `.env` implicitly, so it is loaded explicitly,
 * from the REPO ROOT, which is where this workspace keeps the one `.env`.
 */
import { defineConfig } from 'prisma/config';
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { SYSTEMS, systemUrl, type SystemName } from './src/config/estate';

loadEnv({ path: join(__dirname, '..', '..', '..', '.env') });

const requested = (process.env.PRISMA_SYSTEM ?? '') as SystemName;
if (!SYSTEMS.includes(requested)) {
  throw new Error(
    `PRISMA_SYSTEM must be one of ${SYSTEMS.join(', ')} — got ${requested || '(unset)'}. ` +
      `Run the CLI through \`pnpm commerce:api-generate\` / \`pnpm commerce:api-pull\`, ` +
      `which loop over all five.`,
  );
}

export default defineConfig({
  schema: join(__dirname, 'prisma', `${requested}.prisma`),
  datasource: {
    url: systemUrl(requested),
  },
});
