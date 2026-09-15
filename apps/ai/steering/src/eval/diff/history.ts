/**
 * `pnpm steering:eval-history` — every baseline on disk, one row each.
 *
 * FREE. Reads the results directory and nothing else: no model, no database, no
 * Azure. Run it BEFORE a re-run, to see whether the number you are about to
 * compare against was itself unusual — a baseline is a sample too, and choosing
 * an outlier as your "before" manufactures an improvement.
 *
 * Generic in `@fde/evals`; this supplies where the baselines are and what counts
 * as dangerous.
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { REPO_ROOT } from '../../config/connections';

config({ path: resolve(REPO_ROOT, '.env'), quiet: true });

import { runHistory, setResultsDir } from '@fde/evals';
import { severityOf } from '../severity/assessment-severity';
import type { RequirementAssessment } from '../../schema/assessment-schema';

setResultsDir(resolve(REPO_ROOT, 'docs', 'steering', 'evals', 'results'));

runHistory<RequirementAssessment>(severityOf).catch((e: unknown) => {
  console.error(`FAILED: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
