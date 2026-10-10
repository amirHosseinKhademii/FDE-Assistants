/**
 * Loads the repo-root .env into process.env, the same way the `bostad:profile`
 * CLI does. Values are never logged or returned. dotenv does not override
 * variables already set in the environment.
 */
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

function findRepoRoot(start: string): string | null {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

let loaded = false;

export function loadRepoEnv(): void {
  if (loaded) return;
  loaded = true;
  const root = findRepoRoot(process.cwd());
  if (root) config({ path: join(root, '.env') });
}
