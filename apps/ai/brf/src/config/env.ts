/**
 * Loads the workspace .env, then sets the BRF defaults that must follow it.
 *
 * Every entry point imports this module first. dotenv never overwrites a
 * variable that is already set, so a default assigned before dotenv runs would
 * hide the value written in .env.
 *
 * The cache default is the directory the MiniLM model was already downloaded
 * into. The grounding package reads LOCAL_EMBEDDING_CACHE_DIR, so the default is
 * assigned to that name only. The older LOCAL_EMBEDDING_CACHE name is not read,
 * because a value of that name set for another application must not move this
 * model's cache.
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { REPO_ROOT } from './paths';

config({ path: resolve(REPO_ROOT, '.env'), quiet: true } as any);

export const BRF_EMBEDDING_CACHE_DEFAULT = '/home/byron/Documents/Zahra/ahk/FDE/.cache/brf-embeddings';

process.env.LOCAL_EMBEDDING_CACHE_DIR ??= BRF_EMBEDDING_CACHE_DEFAULT;
