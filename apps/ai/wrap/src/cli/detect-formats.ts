/**
 * detect-formats.ts: run format-detector over every file in a directory.
 *
 * Usage: pnpm --filter @wrap/ai detect-formats [dir]
 *   dir defaults to apps/ai/wrap/data/raw_dump (resolved from the package).
 *
 * Writes one JSON line per file to apps/ai/wrap/data/format-detection.jsonl:
 *   { path, extension, format, encoding, confidence, reason, mismatch }
 * path is relative to the scanned directory. mismatch is true when the
 * extension names a format that disagrees with the detected one.
 * Files that cannot be read or come out UNKNOWN are logged and kept; the
 * run never throws on a single bad file.
 */
import * as fs from "fs";
import * as path from "path";
import { detectFormat, Format } from "../ingest/format-detector";

const PACKAGE_DIR = path.resolve(__dirname, "../..");
const DEFAULT_DIR = path.join(PACKAGE_DIR, "data", "raw_dump");
const OUTPUT_FILE = path.join(PACKAGE_DIR, "data", "format-detection.jsonl");
const MISMATCH_LIST_LIMIT = 15;

/** Format each extension claims to be. Extensions not listed make no claim. */
const EXPECTED_BY_EXTENSION: Record<string, Format[]> = {
  ".md": [Format.MARKDOWN],
  ".markdown": [Format.MARKDOWN],
  ".csv": [Format.CSV],
  ".tsv": [Format.CSV],
  ".json": [Format.JSON],
  ".c": [Format.C_SOURCE],
  ".h": [Format.C_HEADER],
  ".txt": [Format.TEXT],
  ".pdf": [Format.BINARY],
  ".png": [Format.BINARY],
  ".jpg": [Format.BINARY],
  ".jpeg": [Format.BINARY],
  ".gz": [Format.BINARY],
  ".zip": [Format.BINARY],
  ".exe": [Format.BINARY],
};

interface FileRecord {
  path: string;
  extension: string;
  format: string;
  encoding: string;
  confidence: number;
  reason: string;
  mismatch: boolean;
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

function isMismatch(extension: string, format: Format): boolean {
  const expected = EXPECTED_BY_EXTENSION[extension];
  return expected !== undefined && !expected.includes(format);
}

function main(): void {
  const scanDir = path.resolve(process.argv[2] ?? DEFAULT_DIR);
  if (!fs.existsSync(scanDir) || !fs.statSync(scanDir).isDirectory()) {
    console.error(`detect-formats: not a directory: ${scanDir}`);
    process.exit(1);
  }

  const files = walk(scanDir);
  const records: FileRecord[] = [];
  let errors = 0;

  for (const file of files) {
    const rel = path.relative(scanDir, file);
    const extension = path.extname(file).toLowerCase();
    try {
      const buf = fs.readFileSync(file);
      const result = detectFormat(buf, path.basename(file));
      if (result.format === Format.UNKNOWN) {
        console.warn(`WARN UNKNOWN: ${rel} (${result.reason})`);
      }
      records.push({
        path: rel,
        extension,
        format: result.format,
        encoding: result.encoding,
        confidence: result.confidence,
        reason: result.reason,
        mismatch: isMismatch(extension, result.format),
      });
    } catch (err) {
      errors++;
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`WARN ERROR: ${rel} (${message})`);
      records.push({
        path: rel,
        extension,
        format: Format.UNKNOWN,
        encoding: "UNKNOWN",
        confidence: 0,
        reason: `read error: ${message}`,
        mismatch: false,
      });
    }
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(
    OUTPUT_FILE,
    records.map((r) => JSON.stringify(r)).join("\n") + (records.length ? "\n" : ""),
    "utf8",
  );

  const byFormat = countBy(records.map((r) => r.format));
  const byEncoding = countBy(records.map((r) => r.encoding));
  const mismatches = records.filter((r) => r.mismatch);
  const unknown = byFormat.get(Format.UNKNOWN) ?? 0;

  console.log(`Scanned: ${scanDir}`);
  console.log(`Total files: ${records.length} (unknown: ${unknown}, errors: ${errors})`);
  console.log(`Formats: ${fmtCounts(byFormat)}`);
  console.log(`Encodings: ${fmtCounts(byEncoding)}`);
  console.log(`Extension mismatches: ${mismatches.length}`);
  for (const m of mismatches.slice(0, MISMATCH_LIST_LIMIT)) {
    console.log(`  ${m.path}: ${m.extension || "(none)"} → ${m.format}`);
  }
  if (mismatches.length > MISMATCH_LIST_LIMIT) {
    console.log(`  ... and ${mismatches.length - MISMATCH_LIST_LIMIT} more`);
  }
  console.log(`Output: ${OUTPUT_FILE}`);
}

function countBy(values: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return new Map([...m.entries()].sort((a, b) => b[1] - a[1]));
}

function fmtCounts(m: Map<string, number>): string {
  return [...m.entries()].map(([k, v]) => `${k}=${v}`).join(", ");
}

main();
