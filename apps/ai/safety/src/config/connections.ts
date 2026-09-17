/**
 * Where the database is — and the one import that guarantees `.env` was read.
 *
 * ── THIS FILE EXISTS BECAUSE THE SAME BUG HAPPENED THREE TIMES ────────────
 *
 * `paths.ts` calls `dotenv`'s `config()` at module load, so anything importing
 * it gets the environment. Stage 3.4's CLI imports a path and worked; stage
 * 3.5's CLI needed no path, imported none, and threw
 * `SAFETY_DATABASE_URL is not set` against a `.env` that had it.
 *
 * Loading configuration as a SIDE EFFECT of importing something else is the
 * defect. It works until a file legitimately does not need that something, and
 * then it fails in a way that reads as missing configuration rather than as
 * missing an import. The first time it cost a whole stage run against the wrong
 * corpus, silently, because the old value was still on disk.
 *
 * So: connections live here, this file loads the environment, and a caller that
 * wants a database says so by importing this. `apps/ai/steering` reached the
 * same shape for the same reason.
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { REPO_ROOT } from './paths';

config({ path: resolve(REPO_ROOT, '.env') });

/**
 * The engagement's own Neon project.
 *
 * SEPARATE FROM THE OTHER THREE, deliberately — the same reason pharma and
 * steering have their own. A mistyped base URL cannot then reach across and
 * drop another engagement's estate.
 */
export function safetyDatabaseUrl(): string {
  const url = process.env.SAFETY_DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      'SAFETY_DATABASE_URL is not set. It is the fourth engagement\'s own Neon ' +
        'project — see docs/safety/PLAN.md §1b. If it IS in .env, the process ' +
        'did not read .env: import this module rather than reading process.env.',
    );
  }
  return url;
}

/** For a log line that should not carry a password. */
export function redactedHost(url: string = safetyDatabaseUrl()): string {
  return new URL(url).host;
}
