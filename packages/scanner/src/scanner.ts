/**
 * Walk a source tree, and hand back only the lines that execute.
 *
 * WHY THIS IS A PACKAGE, and it is a measured bug rather than a tidiness
 * argument. Three checks in this repo independently scan source for a forbidden
 * pattern, and on 2026-09-14 all three stripped comments DIFFERENTLY:
 *
 *   scripts/leak-check.mjs                     `.replace(/(^|[^:])\/\/.*$/, '$1')`
 *   pharma/src/guard/sql-write-selftest.ts     `t.slice(0, t.indexOf('//'))`
 *   steering/src/guard/sql-write-selftest.ts   no stripping at all
 *
 * `leak-check.mjs` carries a comment explaining that its first version used the
 * naive `//` cut and TRUNCATED `postgresql://claims@host` to `postgresql:`,
 * hiding the only real leak in the repo while reporting PASS. It was fixed
 * there. The identical bug was still live in pharma's write guard, which
 * demonstrably misses an `insert into` on any line that also holds a URL:
 *
 *   const url = 'postgresql://claims@host/db'; insert into audit values (1);
 *     leak-check  → sees the write
 *     pharma      → sees "const url = 'postgresql:"  and reports clean
 *
 * That is what three copies of a stripper buys you: a fix in one is not a fix,
 * and nothing anywhere fails to tell you.
 *
 * COMMENTS ARE EXEMPT ON PURPOSE, in every caller. The reasoning in these files
 * is often ABOUT the thing being forbidden — why a drop cannot reach a
 * particular database, why a prune refused. A checker that read prose would be
 * silenced within a week by someone deleting the explanation instead of the
 * risk. Strings and code are what execute; those are what is checked.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A regex literal can hold anything — including the very pattern a checker
 * hunts for, which is how a scanner reports its own forbidden-pattern
 * definition as a violation. Blanked rather than removed so column positions do
 * not shift.
 */
const REGEX_LITERAL = /\/(?:[^/\\\n[]|\\.|\[(?:[^\]\\]|\\.)*\])+\/[gimsuy]*/g;

export interface CodeLine {
  /** 1-indexed, matching what an editor shows. */
  line: number;
  /** The line with comments removed. Never the raw text. */
  text: string;
}

/**
 * Strip block comments, then line comments, then regex literals — in that
 * order, because a `//` inside a block comment is not a line comment.
 *
 * THE `[^:]` IN THE LINE-COMMENT STEP IS THE WHOLE POINT. `//` preceded by a
 * colon is a URL scheme separator, not a comment. Removing that guard is the
 * documented way to make every check in this repo silently pass.
 */
export function executableLines(src: string): CodeLine[] {
  const out: CodeLine[] = [];
  let inBlock = false;

  src.split('\n').forEach((raw, i) => {
    let t = raw;

    if (inBlock) {
      const end = t.indexOf('*/');
      if (end === -1) return;
      t = t.slice(end + 2);
      inBlock = false;
    }

    const open = t.indexOf('/*');
    if (open !== -1) {
      const close = t.indexOf('*/', open);
      if (close === -1) {
        t = t.slice(0, open);
        inBlock = true;
      } else {
        t = t.slice(0, open) + t.slice(close + 2);
      }
    }

    // NOT `indexOf('//')`. See the header, and the selftest that pins it.
    t = t.replace(/(^|[^:])\/\/.*$/, '$1');
    t = t.replace(REGEX_LITERAL, ' ');

    if (t.trim()) out.push({ line: i + 1, text: t });
  });

  return out;
}

/** Every `.ts` under `dir`, recursively, sorted, excluding declaration files. */
export function walkSources(dir: string, ext = '.ts'): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir).sort()) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walkSources(full, ext));
    else if (entry.endsWith(ext) && !entry.endsWith('.d.ts')) out.push(full);
  }
  return out;
}

export interface Hit {
  file: string;
  line: number;
  /** The executable text that matched, trimmed for display. */
  text: string;
}

/**
 * Every executable line in `files` matching `pattern`.
 *
 * `exempt` is checked against the path as given, so a caller passes whatever
 * form it wants to read in its own output — this never rewrites paths, because
 * a checker that reports a path you cannot paste back is a checker people stop
 * running.
 */
export function scanFiles(
  files: string[],
  pattern: RegExp,
  exempt: (file: string) => boolean = () => false,
): Hit[] {
  const hits: Hit[] = [];
  for (const file of files) {
    if (exempt(file)) continue;
    for (const { line, text } of executableLines(readFileSync(file, 'utf8'))) {
      // `lastIndex` persists on a /g regex between calls and would make every
      // other line a miss. Testing a fresh copy costs nothing and removes a
      // failure that looks like flakiness.
      if (new RegExp(pattern.source, pattern.flags.replace('g', '')).test(text)) {
        hits.push({ file, line, text: text.trim().slice(0, 120) });
      }
    }
  }
  return hits;
}
