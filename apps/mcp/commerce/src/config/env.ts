/**
 * Find the workspace `.env` and load it.
 *
 * WHY NOT `import 'dotenv/config'`. That reads `.env` from `process.cwd()`, and
 * pnpm runs a package script with the cwd set to the PACKAGE, not the workspace
 * root. The first version of `live.ts` did exactly that and reported
 * `COMMERCE_SERVICE_TOKEN is not set` against a `.env` that had it — a true
 * sentence about the wrong file.
 *
 * WHY WALKING UP AND NOT `resolve(__dirname, '..', '..', '..')`. Counting `..`
 * encodes "this package sits N levels below the root", which is a fact about
 * today's directory layout rather than about the repo, and it is WRONG IN
 * SILENCE — dotenv reports nothing and the symptom arrives three layers away as
 * an undefined credential. `apps/ai/commerce` already learned this and its
 * comment says so; this is the same function for the same reason.
 *
 * A MISSING WORKSPACE FILE IS NORMAL, not an error: `pnpm deploy` builds a
 * standalone directory with no workspace file, and a container has no `.env`
 * either. Fall back rather than throw.
 */
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const PACKAGE_ROOT = resolve(__dirname, '..', '..');

function findWorkspaceRoot(from: string): string {
  let dir = from;
  for (;;) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) return dir;
    const up = dirname(dir);
    if (up === dir) return from;
    dir = up;
  }
}

export const REPO_ROOT = findWorkspaceRoot(PACKAGE_ROOT);

/** Idempotent. dotenv never overwrites a variable already in the environment. */
export function loadEnv(): void {
  config({ path: resolve(REPO_ROOT, '.env'), quiet: true });
}
