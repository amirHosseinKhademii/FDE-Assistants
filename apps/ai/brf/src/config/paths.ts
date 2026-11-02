/**
 * Where things are, resolved from this file rather than from process.cwd().
 *
 * The working directory depends on how the process was started: the repo root
 * for `pnpm ask`, the package folder under a workspace filter. A path that
 * depends on where the process stood is right in one place and wrong in the
 * next. Two levels up from src/config/ is the package root, built or unbuilt.
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/** This package's own root, the folder that holds its package.json. */
export const PACKAGE_ROOT = resolve(__dirname, '..', '..');

/**
 * The workspace root, where the shared .env lives.
 *
 * Found by walking up to pnpm-workspace.yaml rather than by counting levels, so
 * moving the package cannot quietly stop .env from being found. Without a
 * workspace file (a standalone deploy) the package location is used, dotenv
 * finds nothing, and configuration arrives as real environment variables.
 */
function findWorkspaceRoot(from: string): string {
  let dir = from;
  for (;;) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) return dir;
    const up = dirname(dir);
    if (up === dir) return resolve(from, '..', '..');
    dir = up;
  }
}

export const REPO_ROOT = findWorkspaceRoot(PACKAGE_ROOT);

/** docs/: the corpus, the eval cases and the baselines. Kept outside the package on purpose. */
export const DOCS_ROOT = resolve(REPO_ROOT, 'docs');
