/**
 * `pnpm eval:history` — every baseline on disk, one row each.
 *
 * FREE. Reads the results directory and nothing else: no model, no database, no
 * Azure. Run it before a re-run to see whether the number you are about to
 * compare against was itself unusual.
 *
 * Generic in `@fde/evals`; this supplies where the baselines are and what counts
 * as dangerous.
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { REPO_ROOT } from '../../config/connections';

config({ path: resolve(REPO_ROOT, '.env'), quiet: true });

import { runHistory, setResultsDir } from '@fde/evals';
import { severityOf } from '../severity/severity';
import type { ReleaseAnswer } from '../../schema/release-schema';

setResultsDir(resolve(REPO_ROOT, 'docs', 'pharma', 'evals', 'results'));

runHistory<ReleaseAnswer>(severityOf).catch((e) => {
  console.error('FAILED:', e?.message ?? e);
  process.exit(1);
});
