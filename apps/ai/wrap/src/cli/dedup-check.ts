/**
 * dedup-check.ts: find exact and near-duplicate files in a directory.
 *
 * Usage: pnpm wrap:dedup-check [dir]
 *   dir defaults to apps/ai/wrap/data/raw_dump (resolved from the package).
 *
 * Steps:
 *   1. SHA-256 of every file's raw bytes. Files with the same hash are exact
 *      duplicates; the shortest relative path is kept (tie: alphabetical).
 *   2. Files that are BINARY or UNKNOWN are hashed but not shingled.
 *   3. Every other file is decoded to UTF-8 (files over 10 MB: first and last
 *      10% of the text only), shingled (word 5-grams) and MinHashed (128).
 *   4. Among the files that survive exact dedup, every pair is compared by
 *      estimated Jaccard. Pairs at or above 0.95 are near-duplicates.
 *
 * Writes apps/ai/wrap/data/dedup-report.json. The report is deterministic:
 * the same directory always gives the same bytes. Runtime is printed, not
 * written, for that reason.
 */
import * as fs from "fs";
import * as path from "path";
import { decodeToUtf8, detectFormat, Format } from "../ingest/format-detector";
import { computeMinHash, computeSHA256, computeShingles, jaccardSimilarity } from "../ingest/dedup";

const PACKAGE_DIR = path.resolve(__dirname, "../..");
const DEFAULT_DIR = path.join(PACKAGE_DIR, "data", "raw_dump");
const REPORT_FILE = path.join(PACKAGE_DIR, "data", "dedup-report.json");

const NEAR_DUP_THRESHOLD = 0.95;
const SUMMARY_THRESHOLDS = [0.9, 0.8];
const LARGE_FILE_BYTES = 10 * 1024 * 1024;
const LARGE_FILE_EDGE_FRACTION = 0.1;
const LIST_LIMIT = 10;

interface ExactGroup {
  hash: string;
  files: string[];
  kept: string;
  removed: string[];
}

interface NearDupPair {
  file_a: string;
  file_b: string;
  similarity: number;
}

interface Summary {
  total_files: number;
  skipped_shingling: number;
  exact_groups: number;
  exact_removed: number;
  near_dup_pairs: number;
  pairs_ge_0_9: number;
  pairs_ge_0_8: number;
  files_after_dedup: number;
}

interface Report {
  exact_duplicates: ExactGroup[];
  near_duplicates: NearDupPair[];
  summary: Summary;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out.sort();
}

/** Shortest path wins; equal lengths fall back to alphabetical order. */
function compareKeep(a: string, b: string): number {
  if (a.length !== b.length) return a.length - b.length;
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Text used for shingling. Very large files keep only their first and last 10%. */
function textForShingles(buf: Buffer, text: string): string {
  if (buf.length <= LARGE_FILE_BYTES) return text;
  const cut = Math.floor(text.length * LARGE_FILE_EDGE_FRACTION);
  return text.slice(0, cut) + "\n" + text.slice(text.length - cut);
}

function main(): void {
  const started = Date.now();
  const scanDir = path.resolve(process.argv[2] ?? DEFAULT_DIR);
  if (!fs.existsSync(scanDir) || !fs.statSync(scanDir).isDirectory()) {
    console.error(`dedup-check: not a directory: ${scanDir}`);
    process.exit(1);
  }

  const files = walk(scanDir);
  const byHash = new Map<string, string[]>();
  const minhashByRel = new Map<string, number[]>();
  let errors = 0;
  let skippedShingling = 0;

  for (const file of files) {
    const rel = path.relative(scanDir, file).split(path.sep).join("/");
    let buf: Buffer;
    try {
      buf = fs.readFileSync(file);
    } catch (err) {
      errors++;
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`WARN ERROR: ${rel} (${message})`);
      continue;
    }

    const sha = computeSHA256(buf);
    const group = byHash.get(sha);
    if (group) group.push(rel);
    else byHash.set(sha, [rel]);

    const detection = detectFormat(buf, path.basename(file));
    if (detection.format === Format.BINARY || detection.format === Format.UNKNOWN) {
      skippedShingling++;
      continue;
    }
    const text = textForShingles(buf, decodeToUtf8(buf, detection.encoding));
    minhashByRel.set(rel, computeMinHash(computeShingles(text)));
  }

  // Exact groups: every hash shared by two or more files.
  const exact: ExactGroup[] = [];
  const removedRel = new Set<string>();
  for (const [hash, members] of byHash) {
    if (members.length < 2) continue;
    const sorted = [...members].sort(compareKeep);
    const [kept, ...removed] = sorted;
    for (const r of removed) removedRel.add(r);
    exact.push({ hash, files: sorted, kept, removed });
  }
  exact.sort((a, b) => (a.kept < b.kept ? -1 : a.kept > b.kept ? 1 : 0));

  // Near-dups: pairs among survivors of exact dedup (the kept files).
  const survivors = [...byHash.values()].map((m) => [...m].sort(compareKeep)[0]).sort();
  const shingled = survivors.filter((rel) => minhashByRel.has(rel));
  const near: NearDupPair[] = [];
  let pairsGe09 = 0;
  let pairsGe08 = 0;
  for (let i = 0; i < shingled.length; i++) {
    for (let j = i + 1; j < shingled.length; j++) {
      const sim = jaccardSimilarity(minhashByRel.get(shingled[i])!, minhashByRel.get(shingled[j])!);
      if (sim >= SUMMARY_THRESHOLDS[0]) pairsGe09++;
      if (sim >= SUMMARY_THRESHOLDS[1]) pairsGe08++;
      if (sim >= NEAR_DUP_THRESHOLD) {
        near.push({ file_a: shingled[i], file_b: shingled[j], similarity: sim });
      }
    }
  }
  near.sort((a, b) => b.similarity - a.similarity || (a.file_a < b.file_a ? -1 : a.file_a > b.file_a ? 1 : 0) || (a.file_b < b.file_b ? -1 : a.file_b > b.file_b ? 1 : 0));

  const totalFiles = files.length - errors;
  const report: Report = {
    exact_duplicates: exact,
    near_duplicates: near.map((p) => ({ ...p, similarity: Math.round(p.similarity * 10000) / 10000 })),
    summary: {
      total_files: totalFiles,
      skipped_shingling: skippedShingling,
      exact_groups: exact.length,
      exact_removed: removedRel.size,
      near_dup_pairs: near.length,
      pairs_ge_0_9: pairsGe09,
      pairs_ge_0_8: pairsGe08,
      files_after_dedup: totalFiles - removedRel.size,
    },
  };

  fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2) + "\n", "utf8");

  const s = report.summary;
  console.log(`Scanned: ${scanDir}`);
  console.log(`Total files: ${s.total_files} (skipped shingling: ${s.skipped_shingling}, errors: ${errors})`);
  console.log(`Exact groups: ${s.exact_groups} (removed: ${s.exact_removed})`);
  console.log(`Near-dup pairs >= ${NEAR_DUP_THRESHOLD}: ${s.near_dup_pairs} (>= 0.9: ${s.pairs_ge_0_9}, >= 0.8: ${s.pairs_ge_0_8})`);
  console.log(`Files after dedup: ${s.files_after_dedup}`);

  if (exact.length) {
    console.log("Exact groups (first 10):");
    for (const g of exact.slice(0, LIST_LIMIT)) {
      console.log(`  ${g.hash.slice(0, 12)}  kept ${g.kept}  removed ${g.removed.length}`);
      for (const r of g.removed) console.log(`      - ${r}`);
    }
    if (exact.length > LIST_LIMIT) console.log(`  ... and ${exact.length - LIST_LIMIT} more`);
  }
  if (near.length) {
    console.log("Near-dup pairs (first 10, by similarity):");
    for (const p of near.slice(0, LIST_LIMIT)) {
      console.log(`  ${p.similarity.toFixed(4)}  ${p.file_a}  <->  ${p.file_b}`);
    }
    if (near.length > LIST_LIMIT) console.log(`  ... and ${near.length - LIST_LIMIT} more`);
  }

  console.log(`Output: ${REPORT_FILE}`);
  console.log(`Runtime: ${((Date.now() - started) / 1000).toFixed(2)}s`);
}

main();
