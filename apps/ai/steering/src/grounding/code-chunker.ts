/**
 * Cut C source into retrievable passages — one per function, plus the banner.
 *
 * ── WHY THIS IS IN `packages/steering` AND NOT IN `@fde/grounding` ───────
 *
 * `@fde/grounding` has needed NO edit to take on a third domain, and this file
 * deliberately keeps that true. Splitting C by function is generic; almost
 * nothing else here is:
 *
 *   · the signature shape it recognises is AUTOSAR-flavoured
 *     (`Std_ReturnType Damping_Apply(const DampIn_t *in, DampOut_t *out)`)
 *   · the file banner convention, and specifically the `CALIBRATION PARAMETERS`
 *     ASCII table, is this customer's house style
 *   · which of those parameters a function actually uses is the link that makes
 *     the whole thing worth doing, and it exists because THIS corpus writes
 *     calibration in a table and references it by name in code
 *
 * That is a domain descriptor's worth of knowledge, not a library's. When a
 * second customer arrives with C, the ~30% that is genuinely generic — find the
 * banner, find the functions — is the part to lift, and two consumers will be
 * the evidence for where the seam goes. One is not.
 *
 * ── WHAT THE BRIEF SAID, AND WHAT THE FILES ACTUALLY DO ─────────────────
 *
 * The task was described as: *a comment block sits ABOVE the function and a
 * clean function-boundary split orphans it, so the block must travel with the
 * function that follows it.*
 *
 * That is not what this corpus contains, and building to it would have produced
 * a chunker that did nothing. Measured across all 147 `.c` files:
 *
 *   · ZERO functions have a comment block immediately above them
 *   · the calibration table is in the FILE BANNER, separated from the first
 *     function by `#include` lines and file-scope statics
 *   · files hold 1–12 functions (median 4), so a banner attached to "the
 *     function that follows it" would reach one function and orphan the rest
 *
 * ── SO THE RULE IS DIFFERENT, AND CHEAPER ────────────────────────────────
 *
 * Copying the whole banner onto every function chunk was the obvious repair and
 * is a bad one: the banner is 500–900 bytes and a function body is 100–300, so
 * six chunks from one file would be ~80% identical text. They would embed to
 * nearly the same vector, and retrieval would lose the ability to tell one
 * function from another — the exact precision that chunking by function is for.
 *
 * Instead, and by direct analogy with the markdown chunker's heading trail:
 *
 *   1. the banner becomes its OWN chunk, so the calibration table is
 *      retrievable on its own terms — it is a thing people search for
 *   2. each function chunk gets a short trail, plus ONLY the calibration rows
 *      its own body references by name
 *
 * `Damping_Apply` names four of the five parameters in `damping.c`. It gets
 * those four rows — with their units, ranges and defaults, which exist nowhere
 * but the banner — and not the fifth. Nothing is orphaned and nothing is
 * duplicated wholesale.
 */
import { createHash } from 'node:crypto';
import type { Chunk } from '@fde/grounding';

/** One row of a `CALIBRATION PARAMETERS` table. */
export interface CalibrationParam {
  name: string;
  /** The row verbatim, minus the ` * ` comment prefix. Units and ranges live here. */
  row: string;
}

export interface CodeFunction {
  name: string;
  /** Signature through closing brace, verbatim. */
  text: string;
  /** 1-based line where the signature starts. */
  startLine: number;
}

export interface ParsedSource {
  /** The leading block comment, verbatim, or empty. */
  banner: string;
  /** `damping.c — SWC-DAMP / FN-DAMP-0031` → the whole line, for the trail. */
  moduleLine: string;
  params: CalibrationParam[];
  functions: CodeFunction[];
  /** Everything after the banner. What function detection ran over. */
  body: string;
}

/**
 * The leading block comment.
 *
 * `^\s*` and not `^`, because every file in this corpus begins with a NEWLINE
 * before `/*`. Anchoring at position zero found zero banners in 147 files and
 * reported it as "no banner" rather than as a bug — a whole-corpus silent miss
 * from one character.
 */
const BANNER = /^\s*\/\*[\s\S]*?\*\//;

/**
 * A calibration row: a SHOUTY name and at least five more fields on ONE line.
 *
 * `[ \t]+` rather than `\s+`, and that is not a style choice. `\s` matches
 * newlines, so `\s+` let the regex walk down the banner and match the heading
 * `CALIBRATION PARAMETERS` as a parameter called `CALIBRATION` by collecting its
 * remaining fields from the four lines beneath it.
 *
 * Trailing text is captured loosely: the generated files carry six columns and
 * the hand-written `damping.c` carries seven plus a `(compile-time)` note.
 */
const CALIBRATION_ROW =
  /^ \* ([A-Z][A-Z0-9_]{3,})[ \t]+(\S+)[ \t]+(\S+)[ \t]+(\S+)[ \t]+(\S+)[ \t]+(\S+)(.*)$/gm;

/**
 * A function signature at column zero, with `{` opening the next line.
 *
 * Requiring the brace on the following line is what separates a definition from
 * a prototype — headers are full of `Std_ReturnType Damping_Init(void);` and a
 * signature-only match would chunk declarations as if they had bodies.
 */
const SIGNATURE = /^[A-Za-z_][A-Za-z0-9_]*(?:[ \t]+\*?[A-Za-z_][A-Za-z0-9_]*)*[ \t]*\([^;]*\)[ \t]*$/;

function bannerOf(source: string): string {
  return BANNER.exec(source)?.[0]?.trim() ?? '';
}

/** `damping.c — SWC-DAMP / FN-DAMP-0031`, the first substantive banner line. */
function moduleLineOf(banner: string): string {
  for (const line of banner.split('\n')) {
    const text = line.replace(/^\s*\/?\*+\s?/, '').trim();
    if (text && !text.startsWith('*')) return text;
  }
  return '';
}

function paramsOf(banner: string): CalibrationParam[] {
  const out: CalibrationParam[] = [];
  for (const m of banner.matchAll(CALIBRATION_ROW)) {
    out.push({ name: m[1], row: m[0].replace(/^ \* /, '').trimEnd() });
  }
  return out;
}

/**
 * Functions, by brace depth from the signature line.
 *
 * Counted rather than regexed to the closing brace: a body contains braces of
 * its own, and a non-greedy match to the first `}` at column zero would end the
 * function at its first nested block on any file that is formatted differently.
 */
function functionsOf(source: string, offsetLines: number): CodeFunction[] {
  const lines = source.split('\n');
  const out: CodeFunction[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!SIGNATURE.test(lines[i]) || lines[i + 1]?.trim() !== '{') continue;

    let depth = 0;
    let end = i + 1;
    for (let j = i + 1; j < lines.length; j++) {
      for (const ch of lines[j]) {
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
      }
      if (depth === 0) { end = j; break; }
    }

    out.push({
      name: /([A-Za-z_][A-Za-z0-9_]*)[ \t]*\(/.exec(lines[i])?.[1] ?? 'unknown',
      text: lines.slice(i, end + 1).join('\n'),
      startLine: offsetLines + i + 1,
    });
    i = end;
  }
  return out;
}

export function parseSource(source: string): ParsedSource {
  const banner = bannerOf(source);
  const afterBanner = source.slice(source.indexOf(banner) + banner.length);
  const offsetLines = source.slice(0, source.indexOf(banner) + banner.length).split('\n').length - 1;

  return {
    banner,
    moduleLine: moduleLineOf(banner),
    params: paramsOf(banner),
    functions: functionsOf(afterBanner, offsetLines),
    body: afterBanner,
  };
}

/** The calibration rows a function names in its own body. */
export function paramsUsedBy(fn: CodeFunction, params: CalibrationParam[]): CalibrationParam[] {
  return params.filter((p) => new RegExp(`\\b${p.name}\\b`).test(fn.text));
}

const idOf = (documentId: string, suffix: string): string =>
  `${documentId}#${suffix}`;

const hashOf = (text: string): string =>
  createHash('sha256').update(text).digest('hex').slice(0, 16);

/**
 * A `Chunk`, in exactly the shape `@fde/grounding`'s markdown chunker emits.
 *
 * `startLine` became REQUIRED on `Chunk` after an agent, asked by its answer
 * schema to cite a line it had never been given, wrote `1` four times out of
 * five. The type error that appeared here is the good kind: a new obligation
 * arrived and the compiler named every place that had to meet it.
 *
 * Code is the one source where the line is exact rather than approximate — the
 * parser already records where each signature starts.
 */
function chunk(
  documentId: string, headings: string[], body: string, index: number, suffix: string,
  startLine: number,
): Chunk {
  const text = `${headings.join(' > ')}\n\n${body}`;
  return {
    id: idOf(documentId, suffix),
    documentId,
    headings,
    text,
    body,
    hash: hashOf(text),
    index,
    startLine,
  };
}

/**
 * A `.c` file → its banner, then one chunk per function.
 *
 * A file with no detectable function still yields its banner, so a parser that
 * stops recognising this customer's signature style degrades to whole-file
 * retrieval rather than to silence.
 */
export function chunkCSource(documentId: string, source: string): Chunk[] {
  const parsed = parseSource(source);
  const out: Chunk[] = [];
  const trail = [documentId, parsed.moduleLine].filter(Boolean);

  if (parsed.banner) {
    // The banner is the top of the file, always.
    out.push(chunk(documentId, [...trail, 'file header'], parsed.banner, 0, 'banner', 1));
  }

  parsed.functions.forEach((fn, i) => {
    const used = paramsUsedBy(fn, parsed.params);
    // The units, ranges and defaults exist nowhere but the banner. Appended
    // rather than prefixed so the function's own code leads the passage.
    const calibration = used.length
      ? `\n\nCalibration parameters used by ${fn.name}:\n${used.map((p) => `  ${p.row}`).join('\n')}`
      : '';
    out.push(
      chunk(documentId, [...trail, `${fn.name}()`], `${fn.text}${calibration}`, i + 1, fn.name, fn.startLine),
    );
  });

  return out;
}

/**
 * A `.h` file → ONE chunk.
 *
 * Headers here are 566–1023 bytes: a banner, some typedefs and a list of
 * prototypes. There is nothing to split, and splitting would separate the ASIL
 * statement in the banner from the declarations it governs — which in
 * `damping.h` is the whole content of the file.
 */
export function chunkCHeader(documentId: string, source: string): Chunk[] {
  const parsed = parseSource(source);
  const trail = [documentId, parsed.moduleLine].filter(Boolean);
  // A header is one chunk covering the whole file — see the assertion in the
  // self-test that none of the 73 is large enough to split.
  return [chunk(documentId, trail, source.trim(), 0, 'header', 1)];
}

/** Dispatch on extension. */
export function chunkCode(documentId: string, source: string): Chunk[] {
  return documentId.endsWith('.h') ? chunkCHeader(documentId, source) : chunkCSource(documentId, source);
}
