/**
 * `pnpm eval:history` — the trend across every baseline on disk.
 *
 * Generic in `@fde/evals`; this supplies where the baselines are and what
 * counts as dangerous.
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { REPO_ROOT, DOCS_ROOT } from '../config/paths';

config({ path: resolve(REPO_ROOT, '.env') });

import { runHistory, setResultsDir } from '@fde/evals';
import { severityOf } from './severity';
import type { CoverageAnswer } from '../schema/coverage-schema';

setResultsDir(resolve(DOCS_ROOT, 'evals/results'));

runHistory<CoverageAnswer>(severityOf).catch((e) => {
  console.error('FAILED:', e?.message ?? e);
  process.exit(1);
});
