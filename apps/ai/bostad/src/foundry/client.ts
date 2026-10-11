/**
 * Azure AI Foundry, for the bostad ask layer.
 *
 * The client is generic and lives in `@fde/foundry`. This file does the one
 * thing a package must not: load the workspace `.env` from a path it knows.
 * The root is found by walking up to `pnpm-workspace.yaml`, so the same code
 * works from `src/` under ts-node and from `dist/` after a build.
 */
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

function findWorkspaceRoot(from: string): string {
  let dir = from;
  for (;;) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) return dir;
    const up = dirname(dir);
    if (up === dir) throw new Error(`no pnpm-workspace.yaml above ${from}`);
    dir = up;
  }
}

export const REPO_ROOT = findWorkspaceRoot(__dirname);

config({ path: resolve(REPO_ROOT, '.env'), quiet: true } as any);

export { FOUNDRY_SCOPE, env, credential, openaiClient } from '@fde/foundry';
