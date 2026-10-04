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
import { parse } from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
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

/**
 * ONLY THIS SERVER'S OWN KEYS — ▲ 2026-09-27.
 *
 * This was `config({ path })`, which loads the WHOLE workspace `.env` — and that
 * file holds the estate's admin credential (`ECOMMERCE_DB_URL`, the role that
 * creates and drops all five databases), every other engagement's database URL
 * and the model provider's key. None of it was ever read here; all of it sat in
 * this process's environment. "This process holds no database credential"
 * (api/client.ts) was true of the code and false of the process — found while
 * wiring Step 10, when the agent's spawn of this server would have handed its
 * whole environment down too.
 *
 * So the load is an ALLOWLIST, the same shape as the write-path gate: the
 * `COMMERCE_*` variables this server reads (its API token and URL, its inbound
 * token and port, the read-only index URL), plus `EMBEDDINGS` (Step 9's query
 * embedder must match the ingest's). Anything else in the file is not loaded.
 * `commerce:mcp-check` asserts the filter on a planted file.
 */
export function ownKeys(parsed: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(parsed).filter(([k]) => /^COMMERCE_[A-Z0-9_]+$/.test(k) || k === 'EMBEDDINGS'),
  );
}

/** Idempotent. Never overwrites a variable already in the environment. */
export function loadEnv(path = resolve(REPO_ROOT, '.env')): void {
  if (!existsSync(path)) return;
  for (const [k, v] of Object.entries(ownKeys(parse(readFileSync(path))))) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
}
