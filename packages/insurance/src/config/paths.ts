/**
 * Where things are, resolved from THIS FILE rather than from `process.cwd()`.
 *
 * WHY THIS EXISTS. cwd is wherever the process was started: the repo root for
 * `pnpm ask`, `packages/insurance` under a workspace filter, `apps/insurance-app` under the
 * dev server. A cwd-relative corpus path silently pointed at
 * `apps/insurance-app/examples/` and every lookup returned ENOENT — the model refused to
 * answer rather than inventing a deductible, which is the only reason it was
 * obvious. A data path that depends on where you were standing is a bug waiting
 * for a deployment.
 *
 * Two levels up from `src/config/` or `dist/config/` is the package root in both
 * cases, which is why the same expression works built and unbuilt.
 */
import { resolve } from 'node:path';

/** `packages/insurance` — the code. */
export const PACKAGE_ROOT = resolve(__dirname, '..', '..');

/** The workspace root — where the single shared `.env` lives. */
export const REPO_ROOT = resolve(PACKAGE_ROOT, '..', '..');

/**
 * `docs/` — the corpus, the eval cases, the fixtures and the baselines.
 *
 * DATA LIVES OUTSIDE THE PACKAGE ON PURPOSE. A customer's corpus is not source
 * code: it is reviewed by different people, it changes on a different schedule,
 * and at a real engagement it is not in this repo at all — `CORPUS_DIR` and
 * `RECORDS_DIR` point somewhere else entirely and none of this is read. Keeping
 * it out of `packages/insurance` makes that swap a path change rather than a
 * refactor.
 */
export const DOCS_ROOT = resolve(REPO_ROOT, 'docs');
