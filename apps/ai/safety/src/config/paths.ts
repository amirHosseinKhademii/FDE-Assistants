/**
 * Where the corpus lives on disk — the only file that names a path.
 *
 * THE SLICE IS A FROZEN SNAPSHOT, NOT A LIVE FEED. `FLAT_CMPL.zip` changes
 * daily; an answer key written against moving data rots underneath the eval
 * baseline. `SAFETY_CORPUS_DIR` points at the extracted slice so a real
 * engagement can point it at real files and none of this code changes — the
 * same seam `CORPUS_DIR` gives insurance.
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { config } from 'dotenv';

const PACKAGE_ROOT = resolve(__dirname, '..', '..');

/**
 * The workspace root — where the single shared `.env` lives.
 *
 * COPIED FROM `apps/ai/insurance/src/config/paths.ts`, INCLUDING ITS SCARS.
 * Walking up to find `pnpm-workspace.yaml` rather than counting `..`, because
 * counting encodes "this package sits two levels below the root" — true today
 * and wrong in silence the moment a package moves: `.env` is simply not found,
 * `dotenv` reports nothing, and the first symptom is a path that is undefined
 * three layers away.
 *
 * And NOT FOUND IS A NORMAL STATE. `pnpm deploy` builds a standalone directory
 * with no workspace file and no `.env`; configuration arrives there as real
 * environment variables. Throwing here took that engagement's `/desk` down for
 * a day. So fall back to where the package sits and let `dotenv` find nothing.
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

/**
 * LOADED HERE, AND THE CLIs GET IT BY IMPORTING THIS FILE.
 *
 * `pnpm --filter @calder/safety <script>` runs with the PACKAGE as its working
 * directory, so `dotenv`'s default lookup finds nothing. Stage 3.2 read
 * `/tmp/nhtsa` for a whole run after `SAFETY_CORPUS_DIR` had been changed,
 * because nothing had loaded the file that changed. It did not error — it read
 * the old corpus and passed every check against it.
 *
 * Same shape as `scripts/local-llm-check.mjs`, which tested a deleted Ollama
 * for exactly this reason: a tool that reads `process.env` but never reads
 * `.env` disagrees with the app it is meant to be configured alongside.
 */
config({ path: resolve(REPO_ROOT, '.env') });

/** The frozen snapshot. Off `/tmp`, which most systems clear on reboot. */
export const CORPUS_DIR = process.env.SAFETY_CORPUS_DIR ?? resolve(REPO_ROOT, '..', 'nhtsa');

/** Model years 2019 + 2020, every make — see docs/safety/CORPUS.md §1. */
export const COMPLAINTS_TSV = resolve(CORPUS_DIR, 'CMPL_SLICE.tsv');
export const RECALLS_TSV = resolve(CORPUS_DIR, 'RCL_SLICE.tsv');
export const INVESTIGATIONS_TSV = resolve(CORPUS_DIR, 'INV_SLICE.tsv');

/** Stage 3.1's output. Plain JSON, on purpose: you can open it and read it. */
export const DOCUMENTS_JSON = resolve(CORPUS_DIR, 'documents.json');

/** Stage 3.2's output. Still plain JSON — stage 3.4 is the first database. */
export const PASSAGES_JSON = resolve(CORPUS_DIR, 'passages.json');

/**
 * Stage 3.3's output: one JSON object per line, ~637 MB.
 *
 * NDJSON AND NOT JSON, and the reason cost 37.9 minutes. `JSON.stringify` over
 * all 73,442 records builds a single 637 MB string and V8's maximum is 512 MB —
 * a float serialises as `0.019854292273521423`, twenty characters of double
 * precision from a float32 model. The vectors were computed and then thrown
 * away by the write. One object per line never builds that string, and the file
 * stays greppable.
 */
export const VECTORS_NDJSON = resolve(CORPUS_DIR, 'vectors.ndjson');
