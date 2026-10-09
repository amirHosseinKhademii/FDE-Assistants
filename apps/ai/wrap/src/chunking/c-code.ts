/**
 * C and C header chunker (plan Step 2.4).
 *
 * Structure is read from a MASKED copy of the file: comments, string and char
 * literals and preprocessor directives are replaced by spaces (same length,
 * newlines kept), so brace depth and ';' can be counted without being fooled
 * by a '}' in a comment or a '{' in a string. Content always comes from the
 * original text.
 *
 * - A function definition is a top-level `{...}` block whose preceding token is
 *   ')'. Its chunk runs from the doc comment directly above it to the closing
 *   brace. The chunk has heading_path = metadata.function = the function name.
 * - Everything else at top level (#include/#define, typedefs, struct/enum
 *   definitions, prototypes, globals) is a declaration unit. Consecutive
 *   declaration units are packed into one chunk up to MAX_TOKENS_PER_CHUNK.
 *   Groups before the first function get metadata.kind "preamble"; later ones
 *   get "declarations".
 * - A function over the max is sub-split with the text window. Every part starts
 *   with the signature line; part 1 also keeps the doc comment.
 *
 * Known limits: a function inside an `extern "C" { ... }` block is not split
 * out (the whole block is one declaration unit, window-split if large).
 */
import { lineFinder, windowSpans } from "./text";
import { CHUNK_SIZES, Chunk, ChunkInit, estimateTokens, makeChunk } from "./types";

interface Span {
  start: number;
  end: number;
}

interface Unit {
  kind: "func" | "decl";
  /** Start of the unit, including the whitespace and comments before its first token. */
  start: number;
  /** Exclusive end. */
  end: number;
  /** Index of the first code character. */
  codeStart: number;
  /** Index of the first top-level '{' (functions and brace initialisers), or -1. */
  brace: number;
}

/** C keywords or attributes that look like calls (`name(`) but are not function names. */
const NOT_NAMES = new Set([
  "__attribute__",
  "__attribute",
  "__declspec",
  "__asm__",
  "asm",
  "_Alignas",
  "_Static_assert",
  "__typeof__",
  "__extension__",
  "sizeof",
]);

const isSpace = (c: string | undefined): boolean => c !== undefined && /\s/.test(c);

/**
 * Same-length copy of `text` with comments, string/char literals and
 * preprocessor directives blanked out (newlines kept), plus the directive spans.
 */
export function maskC(text: string): { masked: string; directives: Span[] } {
  const out: string[] = text.split("");
  const n = text.length;
  const directives: Span[] = [];
  const blank = (a: number, b: number): void => {
    for (let k = a; k < b; k++) if (out[k] !== "\n") out[k] = " ";
  };
  let i = 0;
  let lineStart = true;
  while (i < n) {
    const c = text[i];
    if (c === "\n") {
      lineStart = true;
      i++;
      continue;
    }
    if (c === " " || c === "\t" || c === "\r" || c === "\f" || c === "\v") {
      i++;
      continue;
    }
    if (lineStart && c === "#") {
      // A directive runs to the end of its line, through backslash continuations.
      let j = i;
      while (j < n && text[j] !== "\n") {
        if (text[j] === "\\" && text[j + 1] === "\n") {
          j += 2;
          continue;
        }
        if (text[j] === "/" && text[j + 1] === "*") {
          const e = text.indexOf("*/", j + 2);
          j = e < 0 ? n : e + 2;
          continue;
        }
        if (text[j] === "/" && text[j + 1] === "/") break;
        j++;
      }
      blank(i, j);
      directives.push({ start: i, end: j });
      i = j;
      lineStart = false;
      continue;
    }
    lineStart = false;
    if (c === "/" && text[i + 1] === "/") {
      const e = text.indexOf("\n", i);
      const end = e < 0 ? n : e;
      blank(i, end);
      i = end;
      continue;
    }
    if (c === "/" && text[i + 1] === "*") {
      const e = text.indexOf("*/", i + 2);
      const end = e < 0 ? n : e + 2;
      blank(i, end);
      i = end;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && text[j] !== c && text[j] !== "\n") j += text[j] === "\\" ? 2 : 1;
      const end = j < n && text[j] === c ? j + 1 : Math.min(j, n);
      blank(i, end);
      i = end;
      continue;
    }
    i++;
  }
  return { masked: out.join(""), directives };
}

/** True when a `}` that closes a non-function block is followed by a declarator (`} name;`, `;`, `*p`). */
function continuesDeclaration(masked: string, from: number, directives: Span[], di: number): boolean {
  let k = from;
  while (k < masked.length && isSpace(masked[k])) k++;
  const next = directives[di];
  if (next && next.start < k) return false; // a directive comes first: the declaration ends here
  if (k >= masked.length) return false;
  return masked[k] === ";" || /[A-Za-z_*]/.test(masked[k]);
}

/** Split the masked text into top-level units. */
function segment(masked: string, directives: Span[]): Unit[] {
  const units: Unit[] = [];
  const n = masked.length;
  let unitStart = 0;
  let codeStart = -1;
  let depth = 0;
  let brace = -1;
  let braceIsFunc = false;
  let lastCode = -1;
  let di = 0;

  const reset = (pos: number): void => {
    unitStart = pos;
    codeStart = -1;
    depth = 0;
    brace = -1;
    braceIsFunc = false;
    lastCode = -1;
  };
  const close = (kind: "func" | "decl", end: number): void => {
    if (codeStart >= 0) units.push({ kind, start: unitStart, end, codeStart, brace });
    reset(end);
  };

  let i = 0;
  while (i < n) {
    const d = directives[di];
    if (d && i === d.start) {
      // A declaration cut short by a directive ends here; the directive is its own unit.
      if (codeStart >= 0) close("decl", i);
      units.push({ kind: "decl", start: unitStart, end: d.end, codeStart: d.start, brace: -1 });
      di++;
      reset(d.end);
      i = d.end;
      continue;
    }
    const c = masked[i];
    if (isSpace(c)) {
      i++;
      continue;
    }
    if (codeStart < 0) codeStart = i;
    if (c === "{") {
      if (depth === 0 && brace < 0) {
        brace = i;
        braceIsFunc = lastCode >= 0 && masked[lastCode] === ")";
      }
      depth++;
    } else if (c === "}") {
      if (depth > 0) depth--;
      if (depth === 0) {
        if (brace >= 0 && braceIsFunc) close("func", i + 1);
        else if (!continuesDeclaration(masked, i + 1, directives, di)) close("decl", i + 1);
      }
    } else if (c === ";" && depth === 0) {
      close("decl", i + 1);
    }
    lastCode = i;
    i++;
  }
  if (codeStart >= 0) units.push({ kind: "decl", start: unitStart, end: n, codeStart, brace: -1 });
  return units;
}

/**
 * Name of the function whose signature (masked text up to its '{') is `sig`:
 * the last identifier at parenthesis depth 0 that is followed by '(' and is not
 * an attribute keyword. Returns null when there is none.
 */
export function functionName(sig: string): string | null {
  const toks = sig.match(/[A-Za-z_]\w*|[()]/g) ?? [];
  let depth = 0;
  let last: string | null = null;
  for (let k = 0; k < toks.length; k++) {
    const t = toks[k];
    if (t === "(") depth++;
    else if (t === ")") depth--;
    else if (toks[k + 1] === "(" && depth === 0 && !NOT_NAMES.has(t)) last = t;
  }
  return last;
}

function trimSpan(text: string, start: number, end: number): Span {
  let s = start;
  let e = end;
  while (s < e && isSpace(text[s])) s++;
  while (e > s && isSpace(text[e - 1])) e--;
  return { start: s, end: e };
}

function lineStartOf(text: string, idx: number): number {
  return idx === 0 ? 0 : text.lastIndexOf("\n", idx - 1) + 1;
}

/**
 * Where the doc comment directly above a definition starts, or `codeStart` when
 * there is none. Comments count only when no blank line separates them from the
 * code, and never reach back past `lower`.
 */
function docStart(text: string, lower: number, codeStart: number): number {
  let pos = codeStart;
  for (;;) {
    let p = pos;
    while (p > lower && isSpace(text[p - 1])) p--;
    if (text.slice(p, pos).split("\n").length - 1 > 1) break;
    if (p - 2 >= lower && text.slice(p - 2, p) === "*/") {
      const open = text.lastIndexOf("/*", p - 2);
      if (open < lower || text.slice(lineStartOf(text, open), open).trim() !== "") break;
      pos = open;
      continue;
    }
    const ls = lineStartOf(text, p);
    if (ls >= lower && ls < p && /^\s*\/\//.test(text.slice(ls, p))) {
      pos = ls;
      continue;
    }
    break;
  }
  return pos;
}

export function chunkC(content: string, sourceFile: string): Chunk[] {
  const text = content.replace(/\r\n?/g, "\n");
  const { masked, directives } = maskC(text);
  const units = segment(masked, directives);
  const lineOf = lineFinder(text);
  const maxTokens = CHUNK_SIZES.maxTokens;
  const maxChars = maxTokens * 4;
  const overlapChars = CHUNK_SIZES.textOverlapTokens * 4;

  const chunks: Chunk[] = [];
  const add = (init: Omit<ChunkInit, "sourceFile" | "index">): void => {
    chunks.push(makeChunk({ ...init, sourceFile, index: chunks.length }));
  };

  const emitDeclSpan = (s: number, e: number, kind: string): void => {
    const body = text.slice(s, e);
    if (estimateTokens(body) <= maxTokens) {
      add({
        type: "code_struct",
        content: body,
        startLine: lineOf(s),
        endLine: lineOf(e - 1),
        metadata: { kind },
      });
      return;
    }
    const spans = windowSpans(body, maxChars, overlapChars);
    spans.forEach((w, k) =>
      add({
        type: "code_struct",
        content: body.slice(w.start, w.end),
        startLine: lineOf(s + w.start),
        endLine: lineOf(s + w.end - 1),
        metadata: { kind, part: k + 1, parts: spans.length },
      }),
    );
  };

  let seenFunction = false;
  let group: Unit[] = [];
  const flushGroup = (): void => {
    if (group.length === 0) return;
    const span = trimSpan(text, group[0].start, group[group.length - 1].end);
    emitDeclSpan(span.start, span.end, seenFunction ? "declarations" : "preamble");
    group = [];
  };

  const emitFunction = (u: Unit): void => {
    const sigStart = u.codeStart;
    const brace = u.brace;
    const name = functionName(masked.slice(sigStart, brace));
    // u.start is already the doc comment's start (see chunkC), so the chunk runs from there to the closing brace.
    const whole = trimSpan(text, u.start, u.end);
    const full = text.slice(whole.start, whole.end);
    const meta = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({
      function: name,
      kind: "function",
      ...extra,
    });

    if (estimateTokens(full) <= maxTokens) {
      add({
        type: "code_function",
        content: full,
        startLine: lineOf(whole.start),
        endLine: lineOf(whole.end - 1),
        headingPath: name ?? undefined,
        metadata: meta(),
      });
      return;
    }

    // Oversize: every part starts with the signature line (part 1 also with the doc comment).
    const sigFull = text.slice(sigStart, brace + 1);
    const sig = sigFull.length <= maxChars / 4 ? sigFull : sigFull.split("\n")[0].slice(0, maxChars / 4);
    const docRaw = text.slice(whole.start, sigStart).trim();
    const doc = docRaw !== "" && docRaw.length <= maxChars / 4 ? `${docRaw}\n` : "";
    const bodyStart = brace + 1;
    const body = text.slice(bodyStart, whole.end);
    const windowMax = maxChars - sig.length - doc.length - 2;
    const spans = windowSpans(body, windowMax, overlapChars);
    spans.forEach((w, k) => {
      const piece = body.slice(w.start, w.end).replace(/^\s+/, "");
      add({
        type: "code_function",
        content: `${k === 0 ? doc + sig : sig}\n${piece}`,
        startLine: k === 0 ? lineOf(whole.start) : lineOf(sigStart),
        endLine: lineOf(bodyStart + w.end - 1),
        headingPath: name ?? undefined,
        metadata: meta({ part: k + 1, parts: spans.length }),
      });
    });
  };

  for (const u of units) {
    if (u.kind === "func") {
      // A comment detached from the function (blank line between) is not its doc; keep it as declaration text.
      const ds = docStart(text, u.start, u.codeStart);
      const gap = trimSpan(text, u.start, ds);
      if (gap.start < gap.end) group.push({ kind: "decl", start: u.start, end: ds, codeStart: gap.start, brace: -1 });
      flushGroup();
      seenFunction = true;
      emitFunction({ ...u, start: ds });
      continue;
    }
    if (group.length > 0) {
      const merged = trimSpan(text, group[0].start, u.end);
      if (estimateTokens(text.slice(merged.start, merged.end)) > maxTokens) flushGroup();
    }
    group.push(u);
  }
  // Trailing comments after the last definition.
  const lastEnd = units.length > 0 ? units[units.length - 1].end : 0;
  const tail = trimSpan(text, lastEnd, text.length);
  if (tail.start < tail.end) group.push({ kind: "decl", start: lastEnd, end: text.length, codeStart: tail.start, brace: -1 });
  flushGroup();
  return chunks;
}
