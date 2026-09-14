/**
 * Terminal formatting shared by the CLIs. No domain, no I/O, no state.
 *
 * WHY A MODULE AND NOT A PACKAGE. `wrap`, `flag` and the colour constants
 * existed twice — in `lot-debate.ts` and `supplier-fanout.ts`, both written on
 * 2026-09-12, so the duplication was hours old when it was noticed. Six CLIs in
 * this package write raw escape codes.
 *
 * That is a shared module in ONE domain, not evidence a second customer needs
 * one. `EXTRACTION.md`'s rule is a second occurrence across CONSUMERS, and
 * `@meridian/pharma` is a single consumer however many files it has. If
 * insurance's CLIs grow the same helpers, that is the occurrence that earns a
 * package — and `@fde/uikit` is React, so it would not be that one.
 *
 * EVERY FUNCTION HERE IS PURE, so the presentation half of a CLI can be checked
 * without a database or a model. `lot-trace.ts` was 165 lines of fetch and
 * print interleaved; the point of pulling these out is that the printing stops
 * being the reason a function cannot be tested.
 */

// ── colours ────────────────────────────────────────────────────────────────
//
// Raw escape codes rather than a dependency: this is five constants, and the
// alternative (chalk) is ESM-only at v5, which is the same fight `chunker.ts`
// already records about `remark` in a CommonJS project.

export const DIM = '\x1b[2m';
export const BOLD = '\x1b[1m';
export const RED = '\x1b[31m';
export const YELLOW = '\x1b[33m';
export const OFF = '\x1b[0m';

export const dim = (s: string): string => `${DIM}${s}${OFF}`;
export const bold = (s: string): string => `${BOLD}${s}${OFF}`;
export const red = (s: string): string => `${RED}${s}${OFF}`;
export const yellow = (s: string): string => `${YELLOW}${s}${OFF}`;

// ── arguments ──────────────────────────────────────────────────────────────

/**
 * The value after `--name`, or undefined.
 *
 * Deliberately NOT an argument-parsing library. These CLIs take a positional id
 * and two or three flags; a parser would be more configuration than the thing
 * it configures.
 */
export function flag(name: string, argv: string[] = process.argv): string | undefined {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? undefined : argv[i + 1];
}

/** `--name` present at all, regardless of what follows it. */
export function has(name: string, argv: string[] = process.argv): boolean {
  return argv.includes(`--${name}`);
}

/** A numeric flag, or `fallback` when absent or unparseable. */
export function numFlag(name: string, fallback: number, argv: string[] = process.argv): number {
  const raw = flag(name, argv);
  if (raw === undefined) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

// ── text ───────────────────────────────────────────────────────────────────

/**
 * Wrap prose to `width`, indenting every line by `indent`.
 *
 * WRAPS ON WORDS AND NEVER BREAKS ONE, because the things being printed are lot
 * codes, shipment ids and clause references — `LOT-AMX250-2510-A` split across
 * two lines is no longer greppable, and grepping the output is how these are
 * actually read.
 *
 * Escape codes are not counted, so a coloured word will appear to overrun. That
 * is deliberate: measuring visible width means parsing escapes, and none of
 * these CLIs colour mid-paragraph.
 */
export function wrap(s: string, indent = 4, width = 92): string {
  const pad = ' '.repeat(indent);
  const out: string[] = [];
  let line = '';

  for (const word of s.split(/\s+/).filter(Boolean)) {
    if (line && (line.length + word.length + 1) > width - indent) {
      out.push(pad + line);
      line = '';
    }
    line = line ? `${line} ${word}` : word;
  }
  if (line) out.push(pad + line);

  return out.join('\n');
}

/** A section rule: `── TITLE ─────────…` at a fixed width. */
export function rule(title: string, width = 72): string {
  const head = `── ${title} `;
  return bold(head + '─'.repeat(Math.max(0, width - head.length)));
}

/** `key: value` with the key padded, for the two-column blocks these CLIs use. */
export function kv(key: string, value: string, keyWidth = 26): string {
  return `  ${key.padEnd(keyWidth)} ${value}`;
}
