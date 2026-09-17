/**
 * Where the corpus lives on disk — the only file that names a path.
 *
 * THE SLICE IS A FROZEN SNAPSHOT, NOT A LIVE FEED. `FLAT_CMPL.zip` changes
 * daily; an answer key written against moving data rots underneath the eval
 * baseline. `SAFETY_CORPUS_DIR` points at the extracted slice so a real
 * engagement can point it at real files and none of this code changes — the
 * same seam `CORPUS_DIR` gives insurance.
 */
import { resolve } from 'node:path';

export const CORPUS_DIR = process.env.SAFETY_CORPUS_DIR ?? '/tmp/nhtsa';

/** Model years 2019 + 2020, every make — see docs/safety/CORPUS.md §1. */
export const COMPLAINTS_TSV = resolve(CORPUS_DIR, 'CMPL_SLICE.tsv');
export const RECALLS_TSV = resolve(CORPUS_DIR, 'RCL_SLICE.tsv');
export const INVESTIGATIONS_TSV = resolve(CORPUS_DIR, 'INV_SLICE.tsv');

/** Stage 3.1's output. Plain JSON, on purpose: you can open it and read it. */
export const DOCUMENTS_JSON = resolve(CORPUS_DIR, 'documents.json');
