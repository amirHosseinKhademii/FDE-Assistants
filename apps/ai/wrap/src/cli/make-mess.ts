import fs from "fs";
import path from "path";

/**
 * make-mess.ts: Generates a corpus with deliberate flaws for testing data quality tooling.
 *
 * Copies all files from docs/steering/corpus/ to apps/ai/wrap/data/raw_dump/, then applies:
 * - Exact duplicates (5 files, 2 copies each)
 * - Near-duplicates (10 files, 2-5 lines changed)
 * - Wrong extensions (8 files)
 * - Windows-1252 encoding (4 files, at least one with é/ñ/ü)
 * - Fake PII (6 files)
 * - Synthetic files: empty.txt, huge-repeated.txt (50k lines), scanned-doc.txt (80 lines with OCR noise)
 *
 * All transformations use a seeded PRNG to ensure determinism.
 */

interface FlawedFile {
  original_file: string | null;
  raw_dump_file: string;
  transforms_applied: string[];
  size_bytes: number;
  encoding: string;
}

interface Manifest {
  seed: number;
  counts: {
    exact_duplicates: number;
    near_duplicates: number;
    wrong_extensions: number;
    mixed_encoding: number;
    fake_pii: number;
    synthetic: number;
  };
  entries: FlawedFile[];
}

/**
 * Mulberry32 PRNG: a simple, fast seeded random generator.
 * Ensures deterministic output across runs.
 */
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle using seeded PRNG.
 * Returns shuffled copy of input array; input array is not mutated.
 */
function fisherYatesShuffle<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Recursively collect all files from a directory, sorted alphabetically.
 */
function getAllFiles(dir: string, prefix = ""): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...getAllFiles(path.join(dir, entry.name), relativePath));
    } else {
      files.push(relativePath);
    }
  }

  return files.sort();
}

/**
 * Read file content; skip files > 1MB.
 */
function readFileIfSmall(
  filePath: string,
  maxSize = 1024 * 1024
): string | null {
  const stat = fs.statSync(filePath);
  if (stat.size > maxSize) return null;
  return fs.readFileSync(filePath, "utf8");
}

/**
 * Modify a text file by changing 2-5 random lines.
 */
function modifyTextFile(content: string, rng: () => number): string {
  const lines = content.split("\n");
  const numChanges = Math.floor(rng() * 4) + 2; // 2-5 changes
  const linesToChange = new Set<number>();

  while (linesToChange.size < Math.min(numChanges, lines.length)) {
    linesToChange.add(Math.floor(rng() * lines.length));
  }

  for (const idx of linesToChange) {
    if (lines[idx]) {
      // Change a digit or version/date in the line
      lines[idx] = lines[idx].replace(/(\d)/, (match) => {
        return String((parseInt(match) + 1) % 10);
      });
      if (!lines[idx].includes("1")) {
        lines[idx] += " # modified";
      }
    }
  }

  return lines.join("\n");
}

/**
 * Get a wrong extension for a file, ensuring it's different.
 */
function getWrongExtension(originalExt: string, rng: () => number): string {
  const wrongExts = [".txt", ".md", ".csv", ".json", ".c", ".py", ".js"];
  const candidates = wrongExts.filter((ext) => ext !== originalExt);
  return candidates[Math.floor(rng() * candidates.length)];
}

/**
 * Create OCR-corrupted text from source material.
 */
function createOCRCorruptedText(sourceText: string, rng: () => number): string {
  const lines = sourceText.split("\n").slice(0, 80);
  const garbledChars = ["@", "#", "$", "%", "&", "*", "^", "~", "|"];

  const corrupted = lines.map((line, idx) => {
    if (rng() < 0.15) {
      // 15% chance: garble some chars
      return line.replace(/./g, () => {
        return rng() < 0.3
          ? garbledChars[Math.floor(rng() * garbledChars.length)]
          : rng() < 0.5
            ? ""
            : " ";
      });
    }
    if (rng() < 0.1) {
      // 10% chance: add [illegible] marker
      const pos = Math.floor(rng() * Math.max(1, line.length - 10));
      return line.slice(0, pos) + " [illegible] " + line.slice(pos + 10);
    }
    if (rng() < 0.08) {
      // 8% chance: split a word with hyphen
      const wordMatch = line.match(/\b\w{6,}\b/);
      if (wordMatch) {
        const word = wordMatch[0];
        const pos = Math.floor(rng() * (word.length - 2)) + 1;
        return line.replace(
          word,
          word.slice(0, pos) + "-\n" + word.slice(pos)
        );
      }
    }
    if (rng() < 0.12) {
      // 12% chance: add erratic spacing
      return line.replace(/\s+/g, () => {
        const spaces = Math.floor(rng() * 5) + 1;
        return " ".repeat(spaces);
      });
    }
    return line;
  });

  return corrupted.join("\n");
}

/**
 * Encode text to Windows-1252 (Latin-1), handling chars > U+00FF.
 */
function encodeToLatin1(text: string): Buffer {
  // Replace chars > U+00FF with closest replacements
  let replaced = text
    .replace(/[^\x00-\xFF]/g, (char) => {
      const code = char.charCodeAt(0);
      if (code > 0xff) {
        // Map common extended chars to Latin-1 equivalents
        const map: Record<string, string> = {
          é: "\xE9",
          è: "\xE8",
          ê: "\xEA",
          ë: "\xEB",
          á: "\xE1",
          à: "\xE0",
          â: "\xE2",
          ä: "\xE4",
          ñ: "\xF1",
          ó: "\xF3",
          ò: "\xF2",
          ô: "\xF4",
          ö: "\xF6",
          ú: "\xFA",
          ù: "\xF9",
          û: "\xFB",
          ü: "\xFC",
        };
        return map[char] || "?";
      }
      return char;
    });

  return Buffer.from(replaced, "latin1");
}

async function main() {
  const seed = parseInt(process.env.RNG_SEED || "42", 10);
  const rng = mulberry32(seed);

  // Resolve paths from repo root
  const repoRoot =
    process.cwd().includes("apps/ai/wrap") &&
    process.cwd().includes("project-a")
      ? process.cwd()
          .split("apps/ai/wrap")[0]
          .replace(/\/$/, "")
      : process.cwd();

  const corpusDir = path.resolve(repoRoot, "docs/steering/corpus");
  const outputDir = path.resolve(repoRoot, "apps/ai/wrap/data/raw_dump");

  // Idempotent: delete output if it exists
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`[make-mess] Seed: ${seed}`);
  console.log(`[make-mess] Copying corpus from: ${corpusDir}`);
  console.log(`[make-mess] Output to: ${outputDir}`);

  // Get all corpus files, sorted
  const allFiles = getAllFiles(corpusDir);
  console.log(`[make-mess] Found ${allFiles.length} files in corpus`);

  // Copy all files first
  let copiedCount = 0;
  for (const relPath of allFiles) {
    const srcFile = path.join(corpusDir, relPath);
    const dstFile = path.join(outputDir, relPath);
    const dstDir = path.dirname(dstFile);

    fs.mkdirSync(dstDir, { recursive: true });
    fs.copyFileSync(srcFile, dstFile);
    copiedCount++;
  }
  console.log(`[make-mess] Copied ${copiedCount} files`);

  // Prepare for transforms: get a shuffled list of text files for each category
  const textFiles = allFiles.filter((f) => {
    const fullPath = path.join(corpusDir, f);
    const stat = fs.statSync(fullPath);
    return stat.size < 1024 * 1024 && (f.endsWith(".md") || f.endsWith(".txt"));
  });

  const shuffled = fisherYatesShuffle(textFiles, rng);
  const manifest: Manifest = {
    seed,
    counts: {
      exact_duplicates: 0,
      near_duplicates: 0,
      wrong_extensions: 0,
      mixed_encoding: 0,
      fake_pii: 0,
      synthetic: 0,
    },
    entries: [],
  };

  let fileIdx = 0;

  // 1. Exact duplicates: 5 files, 2 copies each (copy_1_of_, copy_2_of_)
  console.log("[make-mess] Creating exact duplicates (5 files)...");
  for (let i = 0; i < 5 && fileIdx < shuffled.length; i++) {
    const relPath = shuffled[fileIdx++];
    const originalFile = path.join(corpusDir, relPath);
    const originalContent = fs.readFileSync(originalFile);
    const dir = path.dirname(relPath);
    const name = path.basename(relPath);

    for (let copy = 1; copy <= 2; copy++) {
      const copyName = name
        .split(".")
        .slice(0, -1)
        .join(".") + `_copy_${copy}_of_${name.split(".").pop()}`;
      const newName = `${copyName.replace(/\.$/, "")}.${name.split(".").pop()}`;
      const dstPath = path.join(outputDir, dir, newName);
      fs.writeFileSync(dstPath, originalContent);

      manifest.entries.push({
        original_file: relPath,
        raw_dump_file: path.relative(outputDir, dstPath),
        transforms_applied: ["exact_duplicate"],
        size_bytes: originalContent.length,
        encoding: "utf8",
      });
      manifest.counts.exact_duplicates++;
    }
  }

  // 2. Near-duplicates: 10 files with _v2, 2-5 lines changed
  console.log("[make-mess] Creating near-duplicates (10 files)...");
  for (let i = 0; i < 10 && fileIdx < shuffled.length; i++) {
    const relPath = shuffled[fileIdx++];
    const originalFile = path.join(corpusDir, relPath);
    const content = readFileIfSmall(originalFile);
    if (!content) continue;

    const modified = modifyTextFile(content, rng);
    const ext = path.extname(relPath);
    const baseName = relPath.slice(0, -ext.length);
    const newName = `${baseName}_v2${ext}`;
    const dstPath = path.join(outputDir, newName);

    fs.writeFileSync(dstPath, modified, "utf8");
    manifest.entries.push({
      original_file: relPath,
      raw_dump_file: path.relative(outputDir, dstPath),
      transforms_applied: ["near_duplicate"],
      size_bytes: Buffer.byteLength(modified, "utf8"),
      encoding: "utf8",
    });
    manifest.counts.near_duplicates++;
  }

  // 3. Wrong extensions: 8 files
  console.log("[make-mess] Creating wrong-extension files (8 files)...");
  for (let i = 0; i < 8 && fileIdx < shuffled.length; i++) {
    const relPath = shuffled[fileIdx++];
    const originalFile = path.join(corpusDir, relPath);
    const originalContent = fs.readFileSync(originalFile);
    const ext = path.extname(relPath);
    const wrongExt = getWrongExtension(ext, rng);
    const baseName = path.basename(relPath, ext);
    const newName = `${baseName}_misnamed${wrongExt}`;
    const dir = path.dirname(relPath);
    const dstPath = path.join(outputDir, dir, newName);

    fs.writeFileSync(dstPath, originalContent);
    manifest.entries.push({
      original_file: relPath,
      raw_dump_file: path.relative(outputDir, dstPath),
      transforms_applied: ["wrong_extension"],
      size_bytes: originalContent.length,
      encoding: "utf8",
    });
    manifest.counts.wrong_extensions++;
  }

  // 4. Windows-1252 encoding: 4 files
  console.log("[make-mess] Creating Windows-1252 encoded files (4 files)...");
  let hasExtendedChars = false;
  for (let i = 0; i < 4 && fileIdx < shuffled.length; i++) {
    const relPath = shuffled[fileIdx++];
    const originalFile = path.join(corpusDir, relPath);
    const content = readFileIfSmall(originalFile);
    if (!content) continue;

    let modifiedContent = content;
    // For the first cp1252 file, ensure it has extended chars
    if (!hasExtendedChars && i === 0) {
      modifiedContent +=
        "\nSpecial chars: é, ñ, ü - for testing encoding detection";
      hasExtendedChars = true;
    }

    const buffer = encodeToLatin1(modifiedContent);
    const ext = path.extname(relPath);
    const baseName = path.basename(relPath, ext);
    const newName = `${baseName}_cp1252${ext}`;
    const dir = path.dirname(relPath);
    const dstPath = path.join(outputDir, dir, newName);

    fs.writeFileSync(dstPath, buffer);
    manifest.entries.push({
      original_file: relPath,
      raw_dump_file: path.relative(outputDir, dstPath),
      transforms_applied: ["windows_1252_encoding"],
      size_bytes: buffer.length,
      encoding: "windows-1252",
    });
    manifest.counts.mixed_encoding++;
  }

  // 5. Fake PII: 6 files with inserted emails, phone numbers, names
  console.log("[make-mess] Creating fake PII files (6 files)...");
  const fakeEmails = ["jharvey@company.local", "asmith.contractor@external-firm.io"];
  const fakePhones = ["555-0147", "+44-1234-567890"];
  const fakeNames = ["John Harvey", "Alice Smith"];

  for (let i = 0; i < 6 && fileIdx < shuffled.length; i++) {
    const relPath = shuffled[fileIdx++];
    const originalFile = path.join(corpusDir, relPath);
    const content = readFileIfSmall(originalFile);
    if (!content) continue;

    const lines = content.split("\n");
    const piiInserted: string[] = [];

    // Insert PII on a few random lines
    const numInsertions = Math.floor(rng() * 2) + 2;
    for (let j = 0; j < numInsertions && j < lines.length; j++) {
      const lineIdx = Math.floor(rng() * lines.length);
      const email = fakeEmails[Math.floor(rng() * fakeEmails.length)];
      const phone = fakePhones[Math.floor(rng() * fakePhones.length)];
      const name = fakeNames[Math.floor(rng() * fakeNames.length)];
      lines[lineIdx] += ` [Contact: ${name}, ${email}, ${phone}]`;
    }

    const modified = lines.join("\n");
    const ext = path.extname(relPath);
    const baseName = path.basename(relPath, ext);
    const newName = `${baseName}_pii${ext}`;
    const dir = path.dirname(relPath);
    const dstPath = path.join(outputDir, dir, newName);

    fs.writeFileSync(dstPath, modified, "utf8");
    manifest.entries.push({
      original_file: relPath,
      raw_dump_file: path.relative(outputDir, dstPath),
      transforms_applied: ["fake_pii"],
      size_bytes: Buffer.byteLength(modified, "utf8"),
      encoding: "utf8",
    });
    manifest.counts.fake_pii++;
  }

  // 6. Synthetic files: empty.txt, huge-repeated.txt, scanned-doc.txt
  console.log("[make-mess] Creating synthetic files...");

  // empty.txt
  fs.writeFileSync(path.join(outputDir, "empty.txt"), "");
  manifest.entries.push({
    original_file: null,
    raw_dump_file: "empty.txt",
    transforms_applied: ["synthetic_empty"],
    size_bytes: 0,
    encoding: "utf8",
  });

  // huge-repeated.txt: 50000 lines, cycling through all lines of a corpus file
  if (shuffled.length > 0) {
    // Find the first corpus file with >= 5 non-empty lines; if none, find one with >= 20
    let sourceFile: string | null = null;
    let sourceLines: string[] = [];

    for (const relPath of allFiles) {
      const fullPath = path.join(corpusDir, relPath);
      const stat = fs.statSync(fullPath);
      if (stat.size > 1024 * 1024) continue;

      const content = readFileIfSmall(fullPath);
      if (!content) continue;

      const lines = content
        .split("\n")
        .filter((line) => line.trim().length > 0); // Only non-empty lines
      if (lines.length >= 5) {
        sourceFile = relPath;
        sourceLines = lines;
        break;
      }
    }

    // If no file with >= 5 lines found, search for >= 20 lines
    if (sourceLines.length < 5) {
      for (const relPath of allFiles) {
        const fullPath = path.join(corpusDir, relPath);
        const stat = fs.statSync(fullPath);
        if (stat.size > 1024 * 1024) continue;

        const content = readFileIfSmall(fullPath);
        if (!content) continue;

        const lines = content
          .split("\n")
          .filter((line) => line.trim().length > 0);
        if (lines.length >= 20) {
          sourceFile = relPath;
          sourceLines = lines;
          break;
        }
      }
    }

    // Fallback if no suitable file found
    if (sourceLines.length === 0) {
      sourceLines = ["Line repeated."];
    }

    // Truncate lines to 120 chars max to keep file size under ~3MB
    const truncatedLines = sourceLines.map((line) =>
      line.length > 120 ? line.substring(0, 120) : line
    );

    // Cycle through truncated lines until exactly 50000 lines written
    const hugeLines: string[] = [];
    for (let i = 0; i < 50000; i++) {
      hugeLines.push(truncatedLines[i % truncatedLines.length]);
    }
    const hugeContent = hugeLines.join("\n") + "\n"; // Ensure trailing newline so wc -l counts 50000
    const dstPath = path.join(outputDir, "huge-repeated.txt");
    fs.writeFileSync(dstPath, hugeContent, "utf8");
    manifest.entries.push({
      original_file: sourceFile,
      raw_dump_file: "huge-repeated.txt",
      transforms_applied: ["synthetic_huge"],
      size_bytes: Buffer.byteLength(hugeContent, "utf8"),
      encoding: "utf8",
    });
  }

  // scanned-doc.txt: 80 lines with OCR artifacts
  if (shuffled.length > 0) {
    const sourceFile = path.join(corpusDir, shuffled[0]);
    const sourceContent = readFileIfSmall(sourceFile) || "Sample text.\n";
    const ocrText = createOCRCorruptedText(sourceContent, rng);
    const dstPath = path.join(outputDir, "scanned-doc.txt");
    fs.writeFileSync(dstPath, ocrText, "utf8");
    manifest.entries.push({
      original_file: null,
      raw_dump_file: "scanned-doc.txt",
      transforms_applied: ["synthetic_ocr"],
      size_bytes: Buffer.byteLength(ocrText, "utf8"),
      encoding: "utf8",
    });
  }

  manifest.counts.synthetic = 3; // empty, huge-repeated, scanned-doc

  // Write manifest.json
  const manifestPath = path.join(outputDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  // Summary
  const totalFlawed = manifest.entries.length;
  console.log(`[make-mess] ✓ Created ${totalFlawed} flawed/synthetic files`);
  console.log(`  - Exact duplicates: ${manifest.counts.exact_duplicates}`);
  console.log(`  - Near-duplicates: ${manifest.counts.near_duplicates}`);
  console.log(
    `  - Wrong extensions: ${manifest.counts.wrong_extensions}`
  );
  console.log(
    `  - Windows-1252 encoded: ${manifest.counts.mixed_encoding}`
  );
  console.log(`  - Fake PII: ${manifest.counts.fake_pii}`);
  console.log(`  - Synthetic: ${manifest.counts.synthetic}`);
  console.log(`[make-mess] Total files in raw_dump: ${copiedCount + totalFlawed}`);
  console.log(`[make-mess] Manifest written to: ${manifestPath}`);
}

main().catch((err) => {
  console.error("[make-mess] Error:", err);
  process.exit(1);
});
