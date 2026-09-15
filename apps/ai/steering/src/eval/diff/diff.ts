/**
 * `pnpm steering:eval-diff` — compare two baselines.
 *
 *   pnpm steering:eval-diff                  the newest two
 *   pnpm steering:eval-diff <before> <after> two you name, by any unambiguous
 *                                           fragment of the filename
 *
 * The comparison is generic and lives in `@fde/evals`: the setup-key guard, the
 * noise band, the per-case table. This file is the domain half — where the
 * baselines live, and what counts as dangerous here.
 *
 * IT COSTS NOTHING AND CALLS NOTHING. Both baselines are already on disk, so
 * this is arithmetic over data we were already keeping.
 *
 * IT REFUSES (exit 2) TO COMPARE RUNS MADE WITH A DIFFERENT MODEL, ENGINE,
 * FIXTURE MODE OR REPEAT COUNT. Those numbers would measure the setup change
 * rather than yours, and a diff you cannot trust is worse than no diff — you act
 * on it.
 *
 * EXPECT THAT REFUSAL THE FIRST TIME FIXTURES ARRIVE. Every baseline committed
 * before 2026-09-15 ran `fixtures: 'live'`. The first replay-backed baseline
 * starts a NEW comparable series and nothing before it compares to anything
 * after it. That is the guard working, not a broken build.
 *
 * AND A SINGLE FLAKY RUN OUT OF FIVE PRINTS AS `MOVED`, NEVER AS A REGRESSION.
 * `PROGRESS.md` §10.7 records a day spent investigating a middle run that read
 * as a regression and was sampling noise. A tool that renders every wobble in
 * red re-creates exactly the mistake `--repeat` exists to prevent.
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { REPO_ROOT } from '../../config/connections';

config({ path: resolve(REPO_ROOT, '.env'), quiet: true });

import { runDiff, setResultsDir } from '@fde/evals';
import { severityOf } from '../severity/assessment-severity';
import type { RequirementAssessment } from '../../schema/assessment-schema';

setResultsDir(resolve(REPO_ROOT, 'docs', 'steering', 'evals', 'results'));

runDiff<RequirementAssessment>(process.argv.slice(2), severityOf)
  .then((code) => process.exit(code))
  .catch((e: unknown) => {
    console.error(`FAILED: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  });
