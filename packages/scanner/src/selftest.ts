/**
 * Does the stripper strip the right things, and does the scan catch what it
 * claims? Offline, instant, no filesystem beyond a temp file.
 *
 * THE CASE THAT MATTERS IS `urlNotAComment`. It is the exact line that made
 * `scripts/leak-check.mjs` report a clean repo while a real credential sat in
 * it, and the exact line pharma's write guard still missed on 2026-09-14. Every
 * other assertion here is ordinary; that one is the reason the package exists.
 *
 *   pnpm scanner:check
 */
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { executableLines, walkSources, scanFiles } from './scanner';

let failed = 0;

function check(ok: boolean, name: string, detail: string): void {
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}`);
  console.log(`        ${detail}`);
}

/** The stripped text of a one-line source, or '' if the line was all comment. */
const stripped = (src: string): string => (executableLines(src)[0]?.text ?? '').trim();

function control(): void {
  const before = failed;
  const log = console.log;
  console.log = () => {};
  check(false, 'planted', 'planted');
  console.log = log;
  const noticed = failed === before + 1;
  failed = before;
  check(
    noticed,
    'control: a false assertion IS caught',
    noticed
      ? 'a deliberately false assertion moved the counter — the checks above can fail'
      : 'a deliberately false assertion did NOT move the counter — every ok above is meaningless',
  );
}

export function runScannerCheck(): number {
  console.log('\nScanner — one comment-stripper, because three disagreed\n');
  console.log('THE CASE THE PACKAGE EXISTS FOR');

  const urlLine = "const url = 'postgresql://user@host/db'; insert into audit values (1);";
  const keptUrl = stripped(urlLine);
  check(
    /insert\s+into/i.test(keptUrl),
    'a `//` inside a URL is NOT a comment',
    keptUrl.includes('insert')
      ? 'the write after the URL survives the strip'
      : `truncated to ${JSON.stringify(keptUrl)} — this is the bug that reported a clean repo`,
  );

  console.log('\nSTRIPPING — what must go, and what must stay');

  check(stripped('const a = 1; // insert into x') === 'const a = 1;',
    'a real trailing comment goes',
    'reasoning in comments must not trip a checker, or it gets deleted instead of the risk');
  check(executableLines('/* insert into x */').length === 0,
    'a whole-line block comment goes',
    'no executable line produced');
  check(executableLines('/**\n * insert into x\n */\nconst a = 1;').length === 1,
    'a multi-line block comment goes, and the code after it stays',
    'one executable line from four');
  check(stripped('const a = 1; /* mid */ const b = 2;') === 'const a = 1;  const b = 2;',
    'a block comment in the middle of a line goes, leaving both halves',
    'the code either side survives');
  check(stripped("const re = /insert into/i; const a = 1;").includes('const a')
    && !/insert/i.test(stripped("const re = /insert into/i; const a = 1;")),
    'a regex LITERAL goes — a checker must not match its own pattern definition',
    'otherwise every scanner reports itself as a violation');
  check(stripped("const s = 'insert into audit';") === "const s = 'insert into audit';",
    'a STRING literal stays — strings execute',
    'SQL lives in strings; exempting them would exempt the thing being checked');

  console.log('\nLINE NUMBERS — a hit you cannot find is a hit you ignore');

  const numbered = executableLines('// a\n\nconst a = 1;\n/* b */\nconst b = 2;');
  check(
    numbered.length === 2 && numbered[0].line === 3 && numbered[1].line === 5,
    'lines are 1-indexed and count blanks and comments',
    numbered.map((l) => l.line).join(', ') + ' — matching what an editor shows',
  );

  console.log('\nWALK AND SCAN — over a real directory');

  const root = mkdtempSync(join(tmpdir(), 'scanner-'));
  mkdirSync(join(root, 'nested'));
  writeFileSync(join(root, 'clean.ts'), "// insert into x\nconst a = 1;\n");
  writeFileSync(join(root, 'nested', 'dirty.ts'), "const q = 'insert into audit';\n");
  writeFileSync(join(root, 'skip.d.ts'), "declare const x: string;\n");
  writeFileSync(join(root, 'notes.md'), "insert into audit\n");

  const files = walkSources(root);
  check(
    files.length === 2 && files.every((f) => f.endsWith('.ts') && !f.endsWith('.d.ts')),
    'walkSources takes .ts recursively, and skips .d.ts and everything else',
    `${files.length} file(s): ${files.map((f) => f.replace(root + '/', '')).join(', ')}`,
  );

  const hits = scanFiles(files, /\binsert\s+into\b/i);
  check(
    hits.length === 1 && hits[0].file.endsWith('dirty.ts') && hits[0].line === 1,
    'the write in code is caught; the identical write in a comment is not',
    hits.length === 1
      ? `1 hit, ${hits[0].file.replace(root + '/', '')}:${hits[0].line}`
      : `${hits.length} hits — expected exactly the one in nested/dirty.ts`,
  );

  check(
    scanFiles(files, /\binsert\s+into\b/i, (f) => f.endsWith('dirty.ts')).length === 0,
    'an exempt path is not scanned',
    'so a caller can carve out its own fixtures without weakening the pattern',
  );

  const g = scanFiles(files, /\binsert\s+into\b/gi);
  check(
    g.length === 1,
    'a /g pattern does not skip every other line',
    g.length === 1
      ? 'lastIndex is not carried between lines'
      : `${g.length} hits — a persisted lastIndex is making this look flaky`,
  );

  console.log('\nNEGATIVE CONTROL — the checks above must be capable of failing');
  control();

  console.log(
    failed === 0
      ? '\nscanner: PASS — a URL is not a comment, comments and regex literals go, strings stay\n'
      : `\nscanner: FAIL — ${failed} problem(s)\n`,
  );
  return failed;
}

if (require.main === module) process.exit(runScannerCheck() === 0 ? 0 : 1);
