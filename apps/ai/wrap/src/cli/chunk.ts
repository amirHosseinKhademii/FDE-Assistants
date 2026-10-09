/**
 * chunk.ts: split every file under data/scrubbed into typed chunks and write data/chunks.jsonl.
 *
 * Usage: pnpm --filter @wrap/ai chunk   (or pnpm wrap:chunk from the repo root)
 *
 * Files listed as removed exact duplicates in data/dedup-report.json are skipped (the kept copy
 * is chunked). BINARY and UNKNOWN files are skipped. Output is one Chunk JSON object per line,
 * in sorted path order, so two runs give a byte-identical file.
 */
import * as fs from "fs";
import * as path from "path";
import { CHUNK_SIZES, Chunk, chunkFile } from "../chunking";
import { decodeToUtf8, detectFormat, Format } from "../ingest/format-detector";
import { enrichChunk } from "../ingest/metadata-extractor";

const PACKAGE_DIR = path.resolve(__dirname, "../..");
const SCRUBBED_DIR = path.join(PACKAGE_DIR, "data", "scrubbed");
const DEDUP_REPORT = path.join(PACKAGE_DIR, "data", "dedup-report.json");
const OUT_FILE = path.join(PACKAGE_DIR, "data", "chunks.jsonl");
const TOP_FILES = 5;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out.sort();
}

/** Relative paths (forward slashes) of files the dedup pass removed as exact duplicates. */
function removedDuplicates(): Set<string> {
  if (!fs.existsSync(DEDUP_REPORT)) return new Set();
  const report = JSON.parse(fs.readFileSync(DEDUP_REPORT, "utf8")) as {
    exact_duplicates: Array<{ removed: string[] }>;
  };
  return new Set(report.exact_duplicates.flatMap((g) => g.removed));
}

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)];
}

function countBy(chunks: Chunk[], key: (c: Chunk) => string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const c of chunks) for (const k of new Set(key(c))) counts.set(k, (counts.get(k) ?? 0) + 1);
  return counts;
}

function percentOf(n: number, total: number): string {
  return total === 0 ? "0.0%" : `${((100 * n) / total).toFixed(1)}%`;
}

/** Metadata summary (plan Step 2.5): per subsystem and type, and how often each ID kind or date appears. */
function printMetadataSummary(chunks: Chunk[]): void {
  const total = chunks.length;
  const one = (value: unknown): string[] => (typeof value === "string" ? [value] : []);
  const list = (value: unknown): string[] => (Array.isArray(value) ? (value as string[]) : []);
  const bySubsystem = countBy(chunks, (c) => one(c.metadata.subsystem ?? "(none)"));
  const byType = countBy(chunks, (c) => one(c.metadata.type_category));
  const withReq = chunks.filter((c) => list(c.metadata.requirement_ids).length > 0).length;
  const withTicket = chunks.filter((c) => list(c.metadata.ticket_ids).length > 0).length;
  const withDate = chunks.filter((c) => list(c.metadata.dates).length > 0).length;
  const reqCounts = countBy(chunks, (c) => list(c.metadata.requirement_ids));
  const topReq = [...reqCounts.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 10);

  console.log("Metadata summary:");
  console.log("  Chunks per subsystem:");
  for (const [name, count] of [...bySubsystem.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)))
    console.log(`    ${String(count).padStart(6)}  ${name}`);
  console.log("  Chunks per type_category:");
  for (const [name, count] of [...byType.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)))
    console.log(`    ${String(count).padStart(6)}  ${name}`);
  console.log(`  Chunks with >=1 requirement id: ${withReq} (${percentOf(withReq, total)})`);
  console.log(`  Chunks with >=1 ticket id:      ${withTicket} (${percentOf(withTicket, total)})`);
  console.log(`  Chunks with >=1 date:           ${withDate} (${percentOf(withDate, total)})`);
  console.log("  Top 10 requirement ids by chunk count:");
  for (const [id, count] of topReq) console.log(`    ${String(count).padStart(6)}  ${id}`);
}

function main(): void {
  const started = Date.now();
  if (!fs.existsSync(SCRUBBED_DIR)) {
    console.error(`chunk: no scrubbed tree at ${SCRUBBED_DIR} (run pnpm wrap:scrub-pii first)`);
    process.exit(1);
  }
  const removed = removedDuplicates();
  const files = walk(SCRUBBED_DIR);

  let chunkedFiles = 0;
  let skippedDuplicates = 0;
  let skippedFormat = 0;
  const lines: string[] = [];
  const enriched: Chunk[] = [];
  const perFile = new Map<string, number>();
  const perType = new Map<string, number>();
  const tokens: number[] = [];
  let overMax = 0;

  for (const file of files) {
    const rel = path.relative(SCRUBBED_DIR, file).split(path.sep).join("/");
    if (removed.has(rel)) {
      skippedDuplicates++;
      continue;
    }
    const buf = fs.readFileSync(file);
    const detection = detectFormat(buf, path.basename(file));
    if (detection.format === Format.BINARY || detection.format === Format.UNKNOWN) {
      skippedFormat++;
      continue;
    }
    const chunks: Chunk[] = chunkFile(rel, decodeToUtf8(buf, detection.encoding), detection.format);
    chunkedFiles++;
    perFile.set(rel, chunks.length);
    for (const raw of chunks) {
      const c = enrichChunk(raw);
      enriched.push(c);
      lines.push(JSON.stringify(c));
      perType.set(c.type, (perType.get(c.type) ?? 0) + 1);
      tokens.push(c.tokens);
      if (c.tokens > CHUNK_SIZES.maxTokens) overMax++;
    }
  }

  fs.writeFileSync(OUT_FILE, lines.map((l) => `${l}\n`).join(""));

  const sorted = [...tokens].sort((a, b) => a - b);
  const top = [...perFile.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, TOP_FILES);
  const seconds = (Date.now() - started) / 1000;

  console.log("Chunking complete");
  console.log(`Files in data/scrubbed: ${files.length}`);
  console.log(`  chunked: ${chunkedFiles}`);
  console.log(`  skipped, removed exact duplicate (data/dedup-report.json): ${skippedDuplicates}`);
  console.log(`  skipped, BINARY/UNKNOWN: ${skippedFormat}`);
  console.log(`Total chunks: ${lines.length} -> ${path.relative(PACKAGE_DIR, OUT_FILE)}`);
  console.log("Chunks per type:");
  for (const [type, count] of [...perType.entries()].sort()) console.log(`  ${type}: ${count}`);
  if (sorted.length > 0) {
    console.log(
      `Tokens per chunk: min ${sorted[0]}, median ${percentile(sorted, 0.5)}, p95 ${percentile(sorted, 0.95)}, max ${sorted[sorted.length - 1]}`,
    );
  }
  console.log(`Chunks over MAX_TOKENS_PER_CHUNK (${CHUNK_SIZES.maxTokens}): ${overMax}`);
  console.log(`Top ${top.length} files by chunk count:`);
  for (const [rel, count] of top) console.log(`  ${String(count).padStart(4)}  ${rel}`);
  printMetadataSummary(enriched);
  console.log(`Runtime: ${seconds.toFixed(2)}s`);
}

main();
