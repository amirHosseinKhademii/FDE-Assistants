/**
 * Dedup primitives: exact (SHA-256) and near-duplicate (shingles + MinHash).
 *
 * Everything here is hand-written. The only library is Node's `crypto`, and
 * only for SHA-256. No Math.random: the same input always gives the same
 * signature, so a dedup report can be reproduced byte for byte.
 *
 * Choices (see docs/wrap/PLAN.md Step 2.2):
 *   - shingles: word-level, k = 5 by default (the plan's typical value).
 *   - hash: 32-bit FNV-1a over the UTF-8 bytes, with the seed folded into the
 *     starting state and a murmur3 fmix32 finaliser for avalanche. Chosen over
 *     HMAC-SHA256 (what the plan hints at) because it is ~100x faster for
 *     128 hashes x every shingle and is still fully deterministic.
 *   - MinHash: num_hashes = 128 by default, seeded with BASE_SEED + i.
 */
import { createHash } from "node:crypto";

export const BASE_SEED = 42;
export const DEFAULT_SHINGLE_SIZE = 5;
export const DEFAULT_NUM_HASHES = 128;
const EMPTY_SLOT = 0xffffffff;

/** SHA-256 of raw bytes, lowercase hex. */
export function computeSHA256(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

/** murmur3 fmix32: forces every input bit to affect every output bit. */
function fmix32(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Deterministic seeded 32-bit hash of a string. Returns an unsigned 32-bit int. */
export function generateHash(seed: number, input: string): number {
  let h = fmix32((seed ^ 0x9e3779b9) >>> 0);
  const bytes = Buffer.from(input, "utf8");
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193); // FNV prime
  }
  return fmix32(h);
}

/**
 * Lowercase, collapse all whitespace runs to one space, trim, split into words.
 * Punctuation is kept on purpose: "steering," and "steering" are different words.
 */
function normalizedWords(text: string): string[] {
  return text.toLowerCase().replace(/\s+/g, " ").trim().split(" ").filter((w) => w.length > 0);
}

/**
 * Word-level k-shingles of the normalised text. Texts with fewer than k words
 * give one shingle (the whole text); empty text gives an empty set.
 */
export function computeShingles(text: string, shingle_size: number = DEFAULT_SHINGLE_SIZE): Set<string> {
  if (!Number.isInteger(shingle_size) || shingle_size < 1) {
    throw new Error(`shingle_size must be a positive integer, got ${shingle_size}`);
  }
  const words = normalizedWords(text);
  const out = new Set<string>();
  if (words.length === 0) return out;
  if (words.length < shingle_size) {
    out.add(words.join(" "));
    return out;
  }
  for (let i = 0; i + shingle_size <= words.length; i++) {
    out.add(words.slice(i, i + shingle_size).join(" "));
  }
  return out;
}

/**
 * MinHash signature: slot i holds the minimum of generateHash(BASE_SEED + i, s)
 * over all shingles s. An empty set gives all slots 0xFFFFFFFF.
 */
export function computeMinHash(shingles: Set<string>, num_hashes: number = DEFAULT_NUM_HASHES): number[] {
  if (!Number.isInteger(num_hashes) || num_hashes < 1) {
    throw new Error(`num_hashes must be a positive integer, got ${num_hashes}`);
  }
  const mins = new Array<number>(num_hashes).fill(EMPTY_SLOT);
  for (const s of shingles) {
    for (let i = 0; i < num_hashes; i++) {
      const v = generateHash(BASE_SEED + i, s);
      if (v < mins[i]) mins[i] = v;
    }
  }
  return mins;
}

/** Estimated Jaccard similarity: fraction of MinHash slots that agree. Returns 0..1. */
export function jaccardSimilarity(minHash1: number[], minHash2: number[]): number {
  if (minHash1.length !== minHash2.length) {
    throw new Error(`MinHash length mismatch: ${minHash1.length} vs ${minHash2.length}`);
  }
  if (minHash1.length === 0) return 0;
  let equal = 0;
  for (let i = 0; i < minHash1.length; i++) {
    if (minHash1[i] === minHash2[i]) equal++;
  }
  return equal / minHash1.length;
}

/**
 * Exact Jaccard |A∩B| / |A∪B|, for checking the MinHash estimate in tests.
 * Two empty sets give 1, matching what MinHash gives for two empty texts.
 */
export function exactJaccard(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1;
  let inter = 0;
  const [small, large] = setA.size <= setB.size ? [setA, setB] : [setB, setA];
  for (const x of small) {
    if (large.has(x)) inter++;
  }
  const union = setA.size + setB.size - inter;
  return inter / union;
}
