/**
 * `pnpm logs:sync` — ship the local request log into Postgres.
 *
 * Generic in `@fde/telemetry`. This supplies where the log lives and which
 * database, and loads `.env` first — without it `connectionString()` finds no
 * DATABASE_URL and silently falls back to the local container, which is exactly
 * what happened on 2026-09-10: the sync reported "1 new row inserted" and the
 * row went to localhost while the hosted database had no table at all.
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { REPO_ROOT } from '../config/paths';

config({ path: resolve(REPO_ROOT, '.env'), quiet: true } as any);

import { syncRequestLog } from '@fde/telemetry';
import { connectionString } from '@fde/grounding';
import { REQUEST_LOG } from './prices';

syncRequestLog({ logPath: REQUEST_LOG, connectionString: connectionString() }).catch((e) => {
  console.error('FAILED:', e?.message ?? e);
  process.exit(1);
});
