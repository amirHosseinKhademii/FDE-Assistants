/**
 * Plain-text chunker: sliding window with overlap, breaking on paragraph
 * breaks (\n\n) when possible, otherwise on whitespace. Never cuts a word.
 */
import { CHUNK_SIZES, Chunk, makeChunk } from "./types";

const WS = /\s/;

function skipWs(text: string, p: number): number {
  let i = p;
  while (i < text.length && WS.test(text[i])) i++;
  return i;
}

/**
 * Returns a function mapping a character offset to a 1-based line number
 * within `text`.
 */
export function lineFinder(text: string): (offset: number) => number {
  const newlines: number[] = [];
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") newlines.push(i);
  return (offset: number) => {
    // count of newlines strictly before `offset`
    let lo = 0;
    let hi = newlines.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (newlines[mid] < offset) lo = mid + 1;
      else hi = mid;
    }
    return lo + 1;
  };
}

/**
 * Split `text` into [start, end) spans of at most `maxChars` characters, each
 * starting and ending on a word boundary. Consecutive spans overlap by about
 * `overlapChars`. Spans never start or end inside a word.
 */
export function windowSpans(
  text: string,
  maxChars: number,
  overlapChars: number,
): Array<{ start: number; end: number }> {
  const spans: Array<{ start: number; end: number }> = [];
  const n = text.length;
  const overlap = Math.min(overlapChars, Math.floor(maxChars / 2));
  let start = skipWs(text, 0);
  while (start < n) {
    let end = start + maxChars;
    if (end >= n) {
      end = n;
    } else {
      const para = text.lastIndexOf("\n\n", end - 2);
      if (para > start + maxChars / 2) {
        end = para;
      } else {
        let b = end;
        while (b > start && !WS.test(text[b])) b--;
        if (b > start) end = b;
      }
    }
    spans.push({ start, end });
    if (end >= n) break;
    let next = end - overlap;
    if (next <= start) next = end;
    while (next < end && !WS.test(text[next - 1])) next++;
    start = skipWs(text, next);
  }
  // Drop any span that is entirely inside the previous one (a tiny tail
  // that only repeats overlap text).
  return spans.filter((s, i) => i === 0 || s.end > spans[i - 1].end);
}

export function chunkText(content: string, sourceFile: string): Chunk[] {
  const text = content.replace(/\r\n?/g, "\n");
  const lineOf = lineFinder(text);
  const spans = windowSpans(
    text,
    CHUNK_SIZES.textWindowTokens * 4,
    CHUNK_SIZES.textOverlapTokens * 4,
  );
  return spans.map((s, index) =>
    makeChunk({
      sourceFile,
      index,
      type: "text_paragraph",
      content: text.slice(s.start, s.end),
      startLine: lineOf(s.start),
      endLine: lineOf(Math.max(s.start, s.end - 1)),
      metadata: { char_start: s.start, char_end: s.end },
    }),
  );
}
