/**
 * Azure AI Foundry, for this app.
 *
 * The client is generic and lives in `@fde/foundry`. This file does the one
 * thing a package must not: load `.env` from a path it knows. A library that
 * guessed that path would be unpredictable in a container, in a test, and in
 * anything that embeds it — so the application decides, once, here.
 *
 * Imported for its side effect by everything that needs a credential, which is
 * why the re-export exists rather than callers reaching for `@fde/foundry`
 * directly: reaching past this file would skip the `.env` load and fail with a
 * missing-variable error that points at the wrong place.
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { REPO_ROOT } from '../config/paths';

config({ path: resolve(REPO_ROOT, '.env'), quiet: true } as any);

export { FOUNDRY_SCOPE, env, credential, openaiClient } from '@fde/foundry';
