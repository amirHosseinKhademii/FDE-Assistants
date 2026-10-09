/**
 * Markdown chunker: one chunk per heading section.
 *
 * - Headings are ATX lines (# .. ######). Lines inside ``` or ~~~ fences are never headings.
 * - Each chunk's heading_path is the trail of its headings, e.g. "2 Design > 2.3 Torque limits",
 *   and the ancestor heading lines are repeated at the top of the chunk content.
 * - Text before the first heading is its own chunk (heading_path absent).
 * - Sections under CHUNK_SIZES.minTokens merge into the next section (or the previous one at the end).
 * - Sections over CHUNK_SIZES.maxTokens are sub-split with the text window; each part repeats
 *   the ancestor headings and the section's own heading line.
 */
import { CHUNK_SIZES, Chunk, estimateTokens, makeChunk } from "./types";
import { lineFinder, windowSpans } from "./text";

const HEADING = /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;
const FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;

interface Piece {
  /** Ancestor heading lines (exact text), rendered above the piece when headingLine is set. */
  prefix: string[];
  headingLine: string | null;
  /** "2 Design > 2.3 Torque limits", or "" for text before the first heading. */
  trail: string;
  /** Every distinct trail this piece covers (more than one after a merge). */
  trails: string[];
  ownLines: string[];
  /** 1-based file line of ownLines[0]. */
  startLine: number;
  endLine: number;
}

function newPiece(prefix: string[], headingLine: string | null, trail: string, startLine: number): Piece {
  return {
    prefix,
    headingLine,
    trail,
    trails: trail ? [trail] : [],
    ownLines: [],
    startLine,
    endLine: startLine,
  };
}

/** Drop leading/trailing blank lines; null if nothing is left. */
function finish(p: Piece): Piece | null {
  let a = 0;
  let b = p.ownLines.length;
  while (a < b && p.ownLines[a].trim() === "") a++;
  while (b > a && p.ownLines[b - 1].trim() === "") b--;
  if (a === b) return null;
  return {
    ...p,
    ownLines: p.ownLines.slice(a, b),
    startLine: p.startLine + a,
    endLine: p.startLine + b - 1,
  };
}

function parsePieces(text: string): Piece[] {
  const pieces: Piece[] = [];
  const stack: Array<{ level: number; title: string; line: string }> = [];
  let cur = newPiece([], null, "", 1);
  let fence: string | null = null;

  const flush = () => {
    const done = finish(cur);
    if (done) pieces.push(done);
  };

  text.split("\n").forEach((line, i) => {
    const lineNo = i + 1;
    if (fence !== null) {
      const close = FENCE_CLOSE.exec(line);
      if (close && close[1][0] === fence[0] && close[1].length >= fence.length) fence = null;
      cur.ownLines.push(line);
      return;
    }
    const open = FENCE_OPEN.exec(line);
    if (open) {
      fence = open[1];
      cur.ownLines.push(line);
      return;
    }
    const h = HEADING.exec(line);
    if (!h || h[2].trim() === "") {
      cur.ownLines.push(line);
      return;
    }
    const level = h[1].length;
    const title = h[2].trim();
    flush();
    while (stack.length > 0 && stack[stack.length - 1].level >= level) stack.pop();
    const prefix = stack.map((s) => s.line);
    stack.push({ level, title, line });
    cur = newPiece(prefix, line, stack.map((s) => s.title).join(" > "), lineNo);
    cur.ownLines.push(line);
  });
  flush();
  return pieces;
}

function isTiny(p: Piece): boolean {
  return estimateTokens(p.ownLines.join("\n")) < CHUNK_SIZES.minTokens;
}

function mergePieces(a: Piece, b: Piece): Piece {
  const aHasHeading = a.headingLine !== null;
  const trails = [...a.trails];
  for (const t of b.trails) if (!trails.includes(t)) trails.push(t);
  return {
    prefix: aHasHeading ? a.prefix : [],
    headingLine: a.headingLine,
    trail: aHasHeading ? a.trail : b.trail,
    trails,
    ownLines: [...a.ownLines, ...b.ownLines],
    startLine: a.startLine,
    endLine: b.endLine,
  };
}

export function chunkMarkdown(content: string, sourceFile: string): Chunk[] {
  const text = content.replace(/\r\n?/g, "\n");
  const parsed = parsePieces(text);

  // Merge tiny sections forward; a tiny last section merges backward.
  const merged: Piece[] = [];
  let carry: Piece | null = null;
  parsed.forEach((p, k) => {
    const cur = carry ? mergePieces(carry, p) : p;
    carry = null;
    if (isTiny(cur) && k < parsed.length - 1) carry = cur;
    else merged.push(cur);
  });
  if (merged.length > 1 && isTiny(merged[merged.length - 1])) {
    const last = merged.pop() as Piece;
    merged[merged.length - 1] = mergePieces(merged[merged.length - 1], last);
  }

  const out: Chunk[] = [];
  const emit = (
    body: string,
    startLine: number,
    endLine: number,
    piece: Piece,
    extra: Record<string, unknown> = {},
  ) => {
    const metadata: Record<string, unknown> = { ...extra };
    if (piece.trails.length > 1) metadata.merged_sections = piece.trails;
    out.push(
      makeChunk({
        sourceFile,
        index: out.length,
        type: "markdown_section",
        content: body,
        startLine,
        endLine,
        headingPath: piece.trail || undefined,
        metadata,
      }),
    );
  };

  for (const piece of merged) {
    const pre = piece.headingLine !== null ? piece.prefix : [];
    const own = piece.ownLines.join("\n");
    const whole = [...pre, own].join("\n");
    if (estimateTokens(whole) <= CHUNK_SIZES.maxTokens) {
      emit(whole, piece.startLine, piece.endLine, piece);
      continue;
    }
    // Oversize section: sub-split the own text with the window; each part
    // repeats the ancestor headings (and its own heading line after the first part).
    const headerChars =
      pre.join("\n").length + (piece.headingLine !== null ? piece.headingLine.length + 1 : 0) + 1;
    const maxChars = Math.max(200, CHUNK_SIZES.maxTokens * 4 - headerChars - 8);
    const spans = windowSpans(own, maxChars, CHUNK_SIZES.textOverlapTokens * 4);
    const lineOf = lineFinder(own);
    spans.forEach((s, k) => {
      const parts = [...pre];
      if (k > 0 && piece.headingLine !== null) parts.push(piece.headingLine);
      parts.push(own.slice(s.start, s.end));
      emit(
        parts.join("\n"),
        piece.startLine + lineOf(s.start) - 1,
        piece.startLine + lineOf(Math.max(s.start, s.end - 1)) - 1,
        piece,
        { sub_split: { part: k + 1, of: spans.length } },
      );
    });
  }
  return out;
}
