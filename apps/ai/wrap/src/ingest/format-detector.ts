/**
 * format-detector.ts: decide what a file really is, from its bytes.
 *
 * Files lie about their names. This module reads the first bytes (magic
 * signatures, NUL / control-byte ratio), works out the text encoding, then
 * looks at the decoded content with small hand-written heuristics. The
 * extension is only a tiebreaker or a hint; when the content disagrees with
 * it, the content wins and the `reason` says so.
 *
 * No dependencies beyond Node built-ins (TextDecoder, Buffer).
 */
import * as path from "path";

export enum Format {
  MARKDOWN = "MARKDOWN",
  C_HEADER = "C_HEADER",
  C_SOURCE = "C_SOURCE",
  CSV = "CSV",
  JSON = "JSON",
  TEXT = "TEXT",
  BINARY = "BINARY",
  UNKNOWN = "UNKNOWN",
}

export enum Encoding {
  UTF8 = "UTF8",
  LATIN1 = "LATIN1",
  UTF16 = "UTF16",
  UNKNOWN = "UNKNOWN",
}

export interface DetectionResult {
  format: Format;
  encoding: Encoding;
  /** 0 to 1. Magic bytes and successful parses are near 1; weak heuristics sit around 0.6. */
  confidence: number;
  reason: string;
}

interface Candidate {
  format: Format;
  confidence: number;
  reason: string;
}

/**
 * Known binary signatures. None of these is a text format in this pipeline,
 * so each one routes to BINARY and the reason names the type.
 */
const MAGIC: Array<{ bytes: number[]; name: string }> = [
  { bytes: [0x25, 0x50, 0x44, 0x46], name: "PDF (%PDF)" },
  { bytes: [0x1f, 0x8b], name: "gzip archive" },
  { bytes: [0x50, 0x4b, 0x03, 0x04], name: "ZIP archive (or docx/xlsx/pptx/jar)" },
  { bytes: [0x89, 0x50, 0x4e, 0x47], name: "PNG image" },
  { bytes: [0xff, 0xd8, 0xff], name: "JPEG image" },
  { bytes: [0x47, 0x49, 0x46, 0x38], name: "GIF image" },
  { bytes: [0x49, 0x49, 0x2a, 0x00], name: "TIFF image (little-endian)" },
  { bytes: [0x4d, 0x4d, 0x00, 0x2a], name: "TIFF image (big-endian)" },
  { bytes: [0x4d, 0x5a], name: "Windows executable (MZ header)" },
  { bytes: [0x7f, 0x45, 0x4c, 0x46], name: "ELF executable" },
];

/** Extensions that carry a format expectation. Used for hints and mismatch notes. */
const EXTENSION_HINTS: Record<string, Format> = {
  ".md": Format.MARKDOWN,
  ".markdown": Format.MARKDOWN,
  ".csv": Format.CSV,
  ".tsv": Format.CSV,
  ".json": Format.JSON,
  ".c": Format.C_SOURCE,
  ".h": Format.C_HEADER,
  ".txt": Format.TEXT,
};

/** Control bytes that are normal in text files (tab, LF, VT, FF, CR, ESC). */
const ALLOWED_CONTROL = new Set([0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x1b]);

function matchMagic(buf: Buffer): string | null {
  for (const { bytes, name } of MAGIC) {
    if (buf.length >= bytes.length && bytes.every((b, i) => buf[i] === b)) {
      return name;
    }
  }
  return null;
}

function hasUtf8Bom(buf: Buffer): boolean {
  return buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
}

function hasUtf16Bom(buf: Buffer): boolean {
  return (
    buf.length >= 2 &&
    ((buf[0] === 0xff && buf[1] === 0xfe) || (buf[0] === 0xfe && buf[1] === 0xff))
  );
}

/**
 * Encoding from the bytes: BOM first, then strict UTF-8, then Latin1 when
 * high bytes are present (Latin1 decodes any byte sequence, so it is the
 * fallback for anything that is not valid UTF-8).
 */
export function detectEncoding(buf: Buffer): Encoding {
  if (hasUtf8Bom(buf)) return Encoding.UTF8;
  if (hasUtf16Bom(buf)) return Encoding.UTF16;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buf);
    return Encoding.UTF8;
  } catch {
    // not valid UTF-8: fall through to Latin1
  }
  return Encoding.LATIN1;
}

/**
 * Decode to a UTF-8 JS string with any BOM removed.
 * UTF-16 is decoded from its byte order; LATIN1 is read byte-for-byte
 * (ISO-8859-1), which matches Windows-1252 everywhere except 0x80-0x9F.
 */
export function decodeToUtf8(buf: Buffer, encoding: Encoding): string {
  switch (encoding) {
    case Encoding.LATIN1:
      return buf.toString("latin1");
    case Encoding.UTF16: {
      const bigEndian = buf[0] === 0xfe && buf[1] === 0xff;
      const body = hasUtf16Bom(buf) ? buf.subarray(2) : buf;
      const even = body.length - (body.length % 2);
      const le = Buffer.alloc(even);
      for (let i = 0; i < even; i += 2) {
        if (bigEndian) {
          le[i] = body[i + 1];
          le[i + 1] = body[i];
        } else {
          le[i] = body[i];
          le[i + 1] = body[i + 1];
        }
      }
      return le.toString("utf16le");
    }
    case Encoding.UTF8:
    case Encoding.UNKNOWN:
    default: {
      const body = hasUtf8Bom(buf) ? buf.subarray(3) : buf;
      return new TextDecoder("utf-8").decode(body);
    }
  }
}

/** Returns a reason string when the first 512 bytes look binary, else null. */
function binaryEvidence(head: Buffer): string | null {
  let nul = 0;
  let control = 0;
  for (const b of head) {
    if (b === 0) nul++;
    else if (b === 0x7f || (b < 0x20 && !ALLOWED_CONTROL.has(b))) control++;
  }
  if (nul > 0) {
    return `contains ${nul} NUL byte(s) in the first ${head.length} bytes; binary`;
  }
  const ratio = head.length === 0 ? 0 : control / head.length;
  if (ratio > 0.1) {
    return `${Math.round(ratio * 100)}% control characters in the first ${head.length} bytes; binary`;
  }
  return null;
}

function countOutsideQuotes(line: string, delim: string): number {
  let inQuote = false;
  let n = 0;
  for (const ch of line) {
    if (ch === '"') inQuote = !inQuote;
    else if (!inQuote && ch === delim) n++;
  }
  return n;
}

function countMatches(text: string, re: RegExp): number {
  return (text.match(re) || []).length;
}

function detectJson(trimmed: string): Candidate | null {
  const first = trimmed[0];
  if (first !== "{" && first !== "[") return null;
  try {
    JSON.parse(trimmed);
    return { format: Format.JSON, confidence: 0.95, reason: "parses as JSON" };
  } catch {
    // not valid JSON; check whether it is a broken JSON document
  }
  if (/^\s*"[^"\n]{1,200}"\s*:/m.test(trimmed.slice(0, 4096))) {
    return {
      format: Format.JSON,
      confidence: 0.7,
      reason: "starts like JSON (quoted keys) but does not parse",
    };
  }
  return null;
}

function detectC(text: string, ext: string): Candidate | null {
  const hasInclude = /^\s*#\s*include\s*[<"]/m.test(text);
  const hasGuard =
    (/^\s*#\s*ifndef\s+\w+/m.test(text) && /^\s*#\s*define\s+\w+/m.test(text)) ||
    /^\s*#\s*pragma\s+once\b/m.test(text);
  const hasDefine = /^\s*#\s*define\s+[A-Za-z_]\w*/m.test(text);
  const hasPreproc = hasInclude || hasGuard || hasDefine;
  // "type name(args) {" at the start of a line
  const hasBodies = /^[A-Za-z_][\w \t*]*\s[\s*]*[A-Za-z_]\w*\s*\([^;{}]*\)\s*\{/m.test(text);
  // "type name(args);" at the start of a line
  const hasProtos = /^[A-Za-z_][\w \t*]*\s[\s*]*[A-Za-z_]\w*\s*\([^;{}]*\)\s*;/m.test(text);

  if (hasPreproc) {
    if (hasGuard && !hasBodies) {
      return { format: Format.C_HEADER, confidence: 0.9, reason: "include guard or #pragma once, no function bodies" };
    }
    if (!hasGuard && hasBodies) {
      return { format: Format.C_SOURCE, confidence: 0.85, reason: "preprocessor lines plus function bodies" };
    }
    if (!hasGuard && !hasBodies && hasProtos) {
      return { format: Format.C_HEADER, confidence: 0.8, reason: "preprocessor lines plus prototypes, no bodies" };
    }
    // ambiguous: guard with bodies, or only #include/#define
    const format = ext === ".h" ? Format.C_HEADER : Format.C_SOURCE;
    return { format, confidence: 0.7, reason: "preprocessor lines, content ambiguous between header and source" };
  }
  if (hasBodies) {
    return { format: Format.C_SOURCE, confidence: 0.6, reason: "function definitions, no preprocessor lines" };
  }
  return null;
}

function detectCsv(lines: string[]): Candidate | null {
  // Lines starting with '#' are comments in these exports, not rows.
  const rows = lines.filter((l) => l.trim() !== "" && !l.trimStart().startsWith("#"));
  if (rows.length < 5) return null;

  let best: { label: string; mode: number; share: number } | null = null;
  const delimiters: Array<[string, string]> = [
    [",", "comma"],
    ["\t", "tab"],
    [";", "semicolon"],
  ];
  for (const [delim, label] of delimiters) {
    const freq = new Map<number, number>();
    for (const row of rows) {
      const c = countOutsideQuotes(row, delim);
      freq.set(c, (freq.get(c) ?? 0) + 1);
    }
    let mode = 0;
    let modeCount = 0;
    for (const [count, n] of freq) {
      if (count > 0 && n > modeCount) {
        mode = count;
        modeCount = n;
      }
    }
    const share = modeCount / rows.length;
    if (share >= 0.9 && (best === null || share > best.share)) {
      best = { label, mode, share };
    }
  }
  if (best === null) return null;
  return {
    format: Format.CSV,
    confidence: 0.85,
    reason: `${rows.length} rows, ${best.mode} ${best.label}(s) per row in ${Math.round(best.share * 100)}% of them`,
  };
}

function detectMarkdown(text: string, lines: string[]): Candidate | null {
  const headings = lines.filter((l) => /^#{1,6}[ \t]+\S/.test(l)).length;
  const fences = lines.filter((l) => /^\s*```/.test(l)).length;
  const links = countMatches(text, /\[[^\]\n]+\]\([^)\s]+\)/g);
  const bullets = lines.filter((l) => /^\s*[-*][ \t]+\S/.test(l)).length;
  const bold = countMatches(text, /\*\*[^*\n]+\*\*/g);
  const signals = [headings > 0, fences >= 2, links > 0, bullets >= 2, bold > 0].filter(Boolean).length;
  const detail = `${headings} heading(s), ${fences} code fence line(s), ${links} link(s), ${bullets} list item(s)`;

  if ((headings > 0 && signals >= 2) || headings >= 2 || fences >= 2) {
    return { format: Format.MARKDOWN, confidence: 0.85, reason: `Markdown structure: ${detail}` };
  }
  if (signals >= 1) {
    return { format: Format.MARKDOWN, confidence: 0.65, reason: `weak Markdown signal: ${detail}` };
  }
  return null;
}

/** When the content has no signal, a .md or C extension is still a useful guess. */
function trustExtension(ext: string): Candidate | null {
  const hint = EXTENSION_HINTS[ext];
  if (hint === Format.MARKDOWN || hint === Format.C_SOURCE || hint === Format.C_HEADER) {
    return { format: hint, confidence: 0.62, reason: `no strong content signal; trusting ${ext} extension` };
  }
  return null;
}

/**
 * Detect format and encoding. `buf` is the whole file (the magic and binary
 * checks only look at the first 512 bytes; the text heuristics need more).
 */
export function detectFormat(buf: Buffer, filename: string): DetectionResult {
  const magic = matchMagic(buf);
  if (magic !== null) {
    return {
      format: Format.BINARY,
      encoding: Encoding.UNKNOWN,
      confidence: 1,
      reason: `magic bytes say ${magic}; not a text format`,
    };
  }
  if (buf.length === 0) {
    return { format: Format.UNKNOWN, encoding: Encoding.UNKNOWN, confidence: 0, reason: "empty file" };
  }

  const encoding = detectEncoding(buf);
  // UTF-16 text is full of NUL bytes, so the binary check does not apply to it.
  if (encoding !== Encoding.UTF16) {
    const binary = binaryEvidence(buf.subarray(0, 512));
    if (binary !== null) {
      return { format: Format.BINARY, encoding: Encoding.UNKNOWN, confidence: 0.9, reason: binary };
    }
  }

  const text = decodeToUtf8(buf, encoding);
  const trimmed = text.trim();
  if (trimmed === "") {
    return { format: Format.UNKNOWN, encoding, confidence: 0, reason: "whitespace only" };
  }

  const ext = path.extname(filename).toLowerCase();
  const lines = text.split(/\r?\n/);
  const candidates: Array<Candidate | null> = [
    detectJson(trimmed),
    detectC(text, ext),
    detectCsv(lines),
    detectMarkdown(text, lines),
    trustExtension(ext),
    { format: Format.TEXT, confidence: 0.6, reason: "plain text: no JSON, C, CSV or Markdown signal" },
  ];

  // Highest confidence wins; on a tie the earlier (more specific) candidate stays.
  let best: Candidate | null = null;
  for (const c of candidates) {
    if (c !== null && (best === null || c.confidence > best.confidence)) best = c;
  }
  const chosen = best as Candidate;

  let reason = chosen.reason;
  const hint = EXTENSION_HINTS[ext];
  if (hint !== undefined && hint !== chosen.format) {
    reason += `; extension ${ext} but content is ${chosen.format}`;
  }
  return { format: chosen.format, encoding, confidence: chosen.confidence, reason };
}
