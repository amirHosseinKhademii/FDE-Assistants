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
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/** This package's own root — the directory holding its `package.json`. */
export const PACKAGE_ROOT = resolve(__dirname, '..', '..');

/**
 * The workspace root — where the single shared `.env` lives.
 *
 * FOUND BY WALKING UP, NOT BY COUNTING `..`. It used to be
 * `resolve(PACKAGE_ROOT, '..', '..')`, which encoded "this package sits two
 * levels below the root" — true at `packages/{name}`, false the moment it moved
 * to `apps/ai/{name}`, and WRONG IN SILENCE: `.env` simply would not be found,
 * `dotenv` reports nothing, and the first symptom is a connection string that
 * is undefined three layers away.
 *
 * `pnpm-workspace.yaml` is the thing that actually defines the root, so look
 * for it. A move cannot break this, and if one ever does it throws here with
 * the path it searched instead of failing somewhere else.
 */
function findWorkspaceRoot(from: string): string {
  let dir = from;
  for (;;) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) return dir;
    const up = dirname(dir);
    // NOT FOUND IS A NORMAL STATE, AND MAKING IT FATAL BROKE PRODUCTION.
    //
    // This threw for one day. `pnpm deploy` builds a STANDALONE directory —
    // /app holds dist, node_modules and package.json and nothing else, no
    // workspace file — so the throw fired on the first import inside the
    // container. `GET /` served static and passed; `GET /desk` touched this
    // module and returned 500, and the deploy gate failed on exactly that.
    //
    // There is no `.env` in a container either, and there should not be:
    // configuration arrives as real environment variables. So a missing
    // workspace root is not an error to report, it is the deployed case. Fall
    // back to where the package sits and let `dotenv` find nothing, which is
    // what it did for a year before any of this.
    if (up === dir) return resolve(from, '..', '..');
    dir = up;
  }
}

export const REPO_ROOT = findWorkspaceRoot(PACKAGE_ROOT);

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
