/**
 * scrub-pii.ts: redact emails, phones and names across a directory tree.
 *
 * Usage: pnpm --filter @wrap/ai scrub-pii [--validate] [dir]
 *   dir defaults to apps/ai/wrap/data/raw_dump (resolved from the package).
 *
 * Every text file is scrubbed in 'redact' mode with ONE PiiMap shared across
 * all files, so a given value gets the same token everywhere. Output mirrors
 * the input tree under apps/ai/wrap/data/scrubbed/. BINARY and UNKNOWN files
 * are copied unchanged. The map is written to data/pii-map.json (chmod 600).
 *
 * --validate re-scans data/scrubbed with the same email and phone regexes and
 * reports anything that survived (expected: 0).
 */
import * as fs from "fs";
import * as path from "path";
import { decodeToUtf8, detectFormat, Format } from "../ingest/format-detector";
import {
  createPiiMap,
  EMAIL_RE,
  loadPiiAllowlist,
  PHONE_RE,
  scrubPII,
  type PiiMap,
  type PiiType,
  type Redaction,
} from "../ingest/pii-scrubber";

const PACKAGE_DIR = path.resolve(__dirname, "../..");
const DEFAULT_DIR = path.join(PACKAGE_DIR, "data", "raw_dump");
const SCRUBBED_DIR = path.join(PACKAGE_DIR, "data", "scrubbed");
const MAP_FILE = path.join(PACKAGE_DIR, "data", "pii-map.json");
const TOP_PERSON = 25;

/** Values planted by make-mess.ts; each must end up with a token. */
const PLANTED: Array<{ value: string; type: PiiType }> = [
  { value: "John Harvey", type: "PERSON" },
  { value: "Alice Smith", type: "PERSON" },
  { value: "jharvey@company.local", type: "EMAIL" },
  { value: "asmith.contractor@external-firm.io", type: "EMAIL" },
  { value: "555-0147", type: "PHONE" },
  { value: "+44-1234-567890", type: "PHONE" },
];

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

function validate(): number {
  if (!fs.existsSync(SCRUBBED_DIR)) {
    console.error(`scrub-pii --validate: no scrubbed output at ${SCRUBBED_DIR}`);
    return 1;
  }
  const files = walk(SCRUBBED_DIR);
  const hits: string[] = [];
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    for (const m of text.matchAll(EMAIL_RE)) hits.push(`EMAIL ${path.relative(SCRUBBED_DIR, file)}: ${m[0]}`);
    for (const m of text.matchAll(PHONE_RE)) hits.push(`PHONE ${path.relative(SCRUBBED_DIR, file)}: ${m[0]}`);
  }
  console.log(`Validate: ${files.length} files in ${SCRUBBED_DIR}`);
  console.log(`Remaining emails/phones: ${hits.length}`);
  for (const h of hits.slice(0, 20)) console.log(`  ${h}`);
  return hits.length === 0 ? 0 : 1;
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.includes("--validate")) {
    process.exit(validate());
  }
  const scanDir = path.resolve(args.find((a) => !a.startsWith("--")) ?? DEFAULT_DIR);
  if (!fs.existsSync(scanDir) || !fs.statSync(scanDir).isDirectory()) {
    console.error(`scrub-pii: not a directory: ${scanDir}`);
    process.exit(1);
  }

  const allowlist = loadPiiAllowlist();
  const map: PiiMap = createPiiMap();
  const files = walk(scanDir);
  const all: Redaction[] = [];
  let changed = 0;
  let copied = 0;
  let errors = 0;

  // Start from a clean output tree so no stale files survive a rerun.
  fs.rmSync(SCRUBBED_DIR, { recursive: true, force: true });

  for (const file of files) {
    const rel = path.relative(scanDir, file);
    const dest = path.join(SCRUBBED_DIR, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    try {
      const buf = fs.readFileSync(file);
      const detection = detectFormat(buf, path.basename(file));
      if (detection.format === Format.BINARY || detection.format === Format.UNKNOWN) {
        fs.copyFileSync(file, dest);
        copied++;
        continue;
      }
      const text = decodeToUtf8(buf, detection.encoding);
      const result = scrubPII(text, "redact", map, allowlist);
      fs.writeFileSync(dest, result.text, "utf8");
      if (result.text !== text) changed++;
      all.push(...result.redactions);
    } catch (err) {
      errors++;
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`WARN ERROR: ${rel} (${message})`);
    }
  }

  // Map: array of {token, type, original}, allocation order (deterministic: sorted walk).
  fs.writeFileSync(MAP_FILE, JSON.stringify(map.entries(), null, 2) + "\n", "utf8");
  fs.chmodSync(MAP_FILE, 0o600);

  console.log(`Scanned: ${scanDir}`);
  console.log(`Files scanned: ${files.length} (changed: ${changed}, copied unchanged BINARY/UNKNOWN: ${copied}, errors: ${errors})`);
  console.log("Per type (found / unique values / tokens):");
  for (const type of ["EMAIL", "PHONE", "PERSON"] as PiiType[]) {
    const found = all.filter((r) => r.type === type);
    const unique = new Set(found.map((r) => r.original));
    const tokens = map.entries().filter((e) => e.type === type).length;
    console.log(`  ${type.padEnd(6)} ${String(found.length).padStart(6)} / ${String(unique.size).padStart(5)} / ${tokens}`);
  }

  const personFreq = new Map<string, number>();
  for (const r of all) {
    if (r.type === "PERSON") personFreq.set(r.original, (personFreq.get(r.original) ?? 0) + 1);
  }
  const top = [...personFreq].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, TOP_PERSON);
  console.log(`Top ${TOP_PERSON} PERSON originals by frequency:`);
  for (const [value, n] of top) console.log(`  ${String(n).padStart(5)}  ${value}`);

  const seen = new Set(map.entries().map((e) => `${e.type}\u0000${e.original}`));
  console.log("Planted values:");
  for (const p of PLANTED) {
    const ok = seen.has(`${p.type}\u0000${p.value}`);
    console.log(`  ${ok ? "YES" : "NO "}  ${p.type.padEnd(6)} ${p.value}`);
  }

  console.log(`Output: ${SCRUBBED_DIR}`);
  console.log(`PII map: ${MAP_FILE} (chmod 600, ${map.entries().length} entries)`);
}

main();
