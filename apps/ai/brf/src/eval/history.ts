/**
 * pnpm eval:history: the trend across every baseline on disk.
 *
 * Generic in @fde/evals. This file supplies where the baselines are and what counts as
 * dangerous.
 */
import '../config/env';
import { resolve } from 'node:path';
import { runHistory, setResultsDir } from '@fde/evals';
import { DOCS_ROOT } from '../config/paths';
import { severityOf } from './severity';
import type { BrfAnswer } from '../schema/answer-schema';

setResultsDir(resolve(DOCS_ROOT, 'brf/evals/results'));

runHistory<BrfAnswer>(severityOf).catch((e) => {
  console.error('FAILED:', e?.message ?? e);
  process.exit(1);
});
