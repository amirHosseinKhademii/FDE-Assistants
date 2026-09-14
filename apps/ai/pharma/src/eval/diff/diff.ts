/**
 * `pnpm eval:diff` — compare two baselines.
 *
 *   pnpm eval:diff                  the newest two
 *   pnpm eval:diff <before> <after> two you name
 *
 * The comparison is generic and lives in `@fde/evals`: the setup-key guard, the
 * noise band, the per-case table. This file is the domain half — where the
 * baselines live, and what counts as dangerous here.
 *
 * IT REFUSES (exit 2) TO COMPARE RUNS MADE WITH A DIFFERENT MODEL, FIXTURE MODE
 * OR REPEAT COUNT. Those numbers would measure the setup change rather than the
 * code change, and a diff you cannot trust is worse than no diff — you act on it.
 *
 * AND A SINGLE FLAKY RUN OUT OF FIVE PRINTS AS `MOVED`, NEVER AS A REGRESSION.
 * At five samples, 5/5 → 4/5 is inside the noise of the same system, and a gate
 * that fails CI on it teaches everyone to ignore the gate.
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { REPO_ROOT } from '../../config/connections';

config({ path: resolve(REPO_ROOT, '.env'), quiet: true });

import { runDiff, setResultsDir } from '@fde/evals';
import { severityOf } from '../severity/severity';
import type { ReleaseAnswer } from '../../schema/release-schema';

setResultsDir(resolve(REPO_ROOT, 'docs', 'pharma', 'evals', 'results'));

runDiff<ReleaseAnswer>(process.argv.slice(2), severityOf)
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error('FAILED:', e?.message ?? e);
    process.exit(1);
  });
