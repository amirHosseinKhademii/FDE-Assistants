/**
 * Model prose, made readable without changing a word of it.
 *
 * THE PROBLEM. A generated summary arrives as one unbroken block in which every
 * fact is right and almost none of it is scannable. The identifiers are the
 * load-bearing part — which record, which person, which revision, which day —
 * and they are set in exactly the same grey as the connective tissue around
 * them, so the eye has to read every word to find them.
 *
 * TWO THINGS ARE DONE, AND NOTHING ELSE.
 *
 *   1. Sentences become paragraphs. A wall of text at a comfortable reading
 *      measure is still a wall; whitespace between sentences is what lets
 *      someone skim to the one that matters.
 *   2. Identifiers and dates are set in mono and lifted in contrast, so they
 *      read as the typed references they are.
 *
 * WHAT IS DELIBERATELY NOT DONE: no word is added, removed, reordered or
 * reworded. This is a renderer, not a rewriter. The prose has already been
 * through the consumer's answer contract — including whatever coherence rules
 * that contract enforces about what the text may claim — and paraphrasing here
 * would put text on screen that nothing validated. Highlighting is presentation;
 * editing would be a second, unchecked author.
 *
 * THE PATTERNS COME FROM THE CALLER. `LOT-…`, `SOP-… Rev 7`, `mrd_hcm.…` are one
 * customer's identifier grammar and have no business in a shared package — a
 * design system that knows what a batch number looks like is not a design
 * system. Callers pass a table; this maps each `kind` to a style and does the
 * non-overlapping match.
 */
import type { ReactNode } from 'react';

/** What a matched span means, which is all this package needs to know. */
export type TokenKind = 'ref' | 'date' | 'code' | 'clause';

export interface TokenPattern {
  re: RegExp;
  kind: TokenKind;
}

const STYLE: Record<TokenKind, string> = {
  ref: 'font-mono text-[0.9em] tracking-tight text-ui-fg',
  date: 'font-mono text-[0.9em] tracking-tight text-ui-accent',
  code: 'font-mono text-[0.85em] tracking-tight text-ui-warn',
  clause: 'font-mono text-[0.9em] tracking-tight text-ui-fg',
};

interface Span {
  start: number;
  end: number;
  kind: TokenKind;
}

/**
 * Non-overlapping matches, earliest first.
 *
 * Patterns are tried in the order given and a later one never splits an earlier
 * match — which is why a caller lists its most specific pattern first. Without
 * that rule a rule for `SOP-QC-014` would cut `SOP-QC-014 Rev 7` in half and
 * render two references where the text has one.
 */
function findSpans(text: string, patterns: TokenPattern[]): Span[] {
  const spans: Span[] = [];
  for (const { re, kind } of patterns) {
    // A caller's regex may carry state if it was declared with /g and reused.
    const rx = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
    for (const m of text.matchAll(rx)) {
      const start = m.index ?? 0;
      const end = start + m[0].length;
      if (spans.some((s) => start < s.end && end > s.start)) continue;
      spans.push({ start, end, kind });
    }
  }
  return spans.sort((a, b) => a.start - b.start);
}

function decorate(text: string, patterns: TokenPattern[], keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let cursor = 0;
  for (const [i, s] of findSpans(text, patterns).entries()) {
    if (s.start > cursor) out.push(text.slice(cursor, s.start));
    out.push(
      <span key={`${keyPrefix}-${i}`} className={STYLE[s.kind]}>
        {text.slice(s.start, s.end)}
      </span>,
    );
    cursor = s.end;
  }
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}

/**
 * Split into sentences.
 *
 * The lookbehind requires a letter, digit or closing bracket before the full
 * stop, which is what keeps `Rev 7 §7.3` and `2026-09-04.` intact — a naive
 * split on ". " cuts revision and clause numbers in half and produces nonsense
 * fragments.
 */
function sentences(text: string): string[] {
  return text
    .split(/(?<=[a-z0-9)\]"'])\.\s+(?=[A-Z(])/)
    .map((s, i, all) => (i < all.length - 1 ? `${s}.` : s))
    .map((s) => s.trim())
    .filter(Boolean);
}

export function Prose({
  text,
  patterns = [],
  className = '',
}: {
  text: string;
  patterns?: TokenPattern[];
  className?: string;
}) {
  // `max-w-[68ch]` is a reading measure, not a layout guess: past roughly 75
  // characters the eye loses its place returning to the next line.
  return (
    <div className={`grid max-w-[68ch] gap-2.5 ${className}`}>
      {sentences(text).map((s, i) => (
        <p key={i} className="leading-[1.75]">
          {decorate(s, patterns, String(i))}
        </p>
      ))}
    </div>
  );
}

/** The same treatment for a single line that must not become paragraphs. */
export function Line({
  text,
  patterns = [],
  className = '',
}: {
  text: string;
  patterns?: TokenPattern[];
  className?: string;
}) {
  return <span className={className}>{decorate(text, patterns, 'l')}</span>;
}
