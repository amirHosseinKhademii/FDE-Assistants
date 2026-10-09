/**
 * Shared env + redaction helpers for the wrap DB and embedding CLIs.
 * Loads the repo-root .env in Node (never via `source`). Never print raw secrets:
 * route every error message through redact() before logging.
 */
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

function findRepoRoot(from: string): string {
  let dir = from;
  for (;;) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) return dir;
    const up = dirname(dir);
    if (up === dir) return resolve(from, '..', '..', '..', '..');
    dir = up;
  }
}

export const REPO_ROOT = findRepoRoot(__dirname);

let loaded = false;
export function loadEnv(): void {
  if (loaded) return;
  config({ path: resolve(REPO_ROOT, '.env'), quiet: true });
  loaded = true;
}

export function requireDbUrl(): string {
  loadEnv();
  const url = process.env.WRAP_DB_URL;
  if (!url) throw new Error('WRAP_DB_URL is not set in the repo-root .env');
  return url;
}

export function redact(text: string): string {
  let out = text;
  for (const secret of [process.env.WRAP_DB_URL, process.env.HOSTED_API_KEY]) {
    if (secret) out = out.split(secret).join('[redacted]');
  }
  return out.replace(/postgres(ql)?:\/\/[^\s'"]+/g, '[redacted-url]');
}
