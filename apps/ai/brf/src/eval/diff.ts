/**
 * pnpm eval:diff: compare two baselines.
 *
 * The comparison itself is generic and lives in @fde/evals: the setup-key guard, the
 * noise band, and the per-case table. This file supplies where the baselines live and
 * what counts as dangerous here.
 */
import '../config/env';
import { resolve } from 'node:path';
import { runDiff, setResultsDir } from '@fde/evals';
import { DOCS_ROOT } from '../config/paths';
import { severityOf } from './severity';
import type { BrfAnswer } from '../schema/answer-schema';

setResultsDir(resolve(DOCS_ROOT, 'brf/evals/results'));

runDiff<BrfAnswer>(process.argv.slice(2), severityOf)
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error('FAILED:', e?.message ?? e);
    process.exit(1);
  });
