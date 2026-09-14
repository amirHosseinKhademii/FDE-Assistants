/**
 * `pnpm eval:diff` — compare two baselines.
 *
 * The comparison itself is generic and lives in `@fde/evals`: the setup-key
 * guard, the noise band, the per-case table. This file is the domain half —
 * where baselines live, and what counts as a dangerous failure here.
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { REPO_ROOT, DOCS_ROOT } from '../config/paths';

config({ path: resolve(REPO_ROOT, '.env') });

import { runDiff, setResultsDir } from '@fde/evals';
import { severityOf } from './severity';
import type { CoverageAnswer } from '../schema/coverage-schema';

setResultsDir(resolve(DOCS_ROOT, 'evals/results'));

runDiff<CoverageAnswer>(process.argv.slice(2), severityOf)
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error('FAILED:', e?.message ?? e);
    process.exit(1);
  });
