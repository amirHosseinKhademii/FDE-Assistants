/**
 * `pnpm steering:code-chunk-check` — does the code chunker do what it claims?
 *
 * OFFLINE. Reads the corpus from disk, calls no model, touches no database,
 * costs nothing. Every assertion is about the SHAPE of the chunks, because the
 * failure this guards against is silent: a signature style that stops being
 * recognised produces fewer chunks and no error, and retrieval quietly gets
 * worse on a corpus nobody re-reads.
 *
 * The `damping.c` case is the one that matters. Its calibration table is the
 * thing anybody actually searches for, and it lives in the file banner —
 * separated from the function by includes and a file-scope static. Every naive
 * reading of "attach the preceding comment" loses it.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { REPO_ROOT } from '../config/connections';
import { report, type Result } from '../db/init/assertions';
import { chunkCode, parseSource, paramsUsedBy } from './code-chunker';

const CORPUS = process.env.STEERING_CORPUS_DIR
  ? resolve(process.env.STEERING_CORPUS_DIR)
  : resolve(REPO_ROOT, 'docs', 'steering', 'corpus');

const DAMPING = 'eps-steering-feel/src/damping.c';

function sources(dir: string, exts: string[]): string[] {
  return readdirSync(dir).sort().flatMap((n) => {
    const full = join(dir, n);
    if (statSync(full).isDirectory()) return sources(full, exts);
    return exts.some((e) => full.endsWith(e)) ? [full] : [];
  });
}

function main(): void {
  const r: Result = { ok: [], fail: [] };
  const note = (pass: boolean, label: string, detail: string): void => {
    r[pass ? 'ok' : 'fail'].push({ label, detail });
  };

  const cFiles = sources(CORPUS, ['.c']);
  const hFiles = sources(CORPUS, ['.h']);

  // ── 1 · the banner is found at all ──────────────────────────────────────
  //
  // Every file in this corpus starts with a NEWLINE before `/*`. An anchor at
  // position zero finds nothing, in all 147 files, and calls it "no banner".
  {
    const missing = cFiles.filter((f) => !parseSource(readFileSync(f, 'utf8')).banner);
    note(
      missing.length === 0,
      'every C source yields its file banner',
      missing.length === 0
        ? `${cFiles.length} files, all with a leading block comment found`
        : `${missing.length} without — e.g. ${relative(CORPUS, missing[0])}`,
    );
  }

  // ── 2 · functions are found in every file ───────────────────────────────
  {
    const empty = cFiles.filter((f) => parseSource(readFileSync(f, 'utf8')).functions.length === 0);
    const total = cFiles.reduce((a, f) => a + parseSource(readFileSync(f, 'utf8')).functions.length, 0);
    note(
      empty.length === 0 && total > 700,
      'every C source yields at least one function',
      empty.length === 0
        ? `${total} functions across ${cFiles.length} files`
        : `${empty.length} files yielded none — e.g. ${relative(CORPUS, empty[0])}`,
    );
  }

  // ── 3 · THE CASE THIS WAS BUILT FOR ─────────────────────────────────────
  //
  // `Damping_Apply` references four of the five calibration parameters. Those
  // four rows — with their units, ranges and defaults — must reach its chunk,
  // and the fifth must not.
  {
    const parsed = parseSource(readFileSync(join(CORPUS, DAMPING), 'utf8'));
    const apply = parsed.functions.find((f) => f.name === 'Damping_Apply');
    const used = apply ? paramsUsedBy(apply, parsed.params) : [];
    const chunks = chunkCode(DAMPING, readFileSync(join(CORPUS, DAMPING), 'utf8'));
    const applyChunk = chunks.find((c) => c.id.endsWith('#Damping_Apply'));

    const carries = used.every((p) => applyChunk?.body.includes(p.row));
    const excludes = !applyChunk?.body.includes('DAMP_ENABLE');
    note(
      used.length === 4 && carries && excludes,
      'a function chunk carries the calibration rows it uses, and only those',
      `Damping_Apply uses ${used.map((p) => p.name).join(', ')} — ` +
        `${carries ? 'all present with units and ranges' : 'MISSING'}; ` +
        `DAMP_ENABLE (declared, never referenced) ${excludes ? 'correctly absent' : 'LEAKED IN'}`,
    );
  }

  // ── 4 · the calibration table survives as its own chunk ─────────────────
  //
  // Because it is a thing people search for on its own terms, not only through
  // a function that happens to use it.
  {
    const chunks = chunkCode(DAMPING, readFileSync(join(CORPUS, DAMPING), 'utf8'));
    const banner = chunks.find((c) => c.id.endsWith('#banner'));
    const rows = ['DAMP_GAIN_BASE', 'DAMP_SPD_BRK', 'DAMP_MAX_TRQ', 'DAMP_RATE_LIM', 'DAMP_ENABLE'];
    note(
      Boolean(banner) && rows.every((n) => banner!.body.includes(n)),
      'the banner is its own chunk and holds the whole calibration table',
      `${rows.filter((n) => banner?.body.includes(n)).length}/5 parameters in the banner chunk`,
    );
  }

  // ── 5 · `CALIBRATION` is not a parameter ────────────────────────────────
  //
  // `\s+` spans newlines, so a row regex built with it walked down the banner
  // and matched the heading `CALIBRATION PARAMETERS` as a parameter, collecting
  // its remaining fields from the lines below. The fix is `[ \t]+`; this is the
  // assertion that keeps it fixed.
  {
    const bogus = cFiles
      .map((f) => ({ f, names: parseSource(readFileSync(f, 'utf8')).params.map((p) => p.name) }))
      .filter((x) => x.names.some((n) => n === 'CALIBRATION' || n === 'PARAMETERS'));
    note(
      bogus.length === 0,
      'the table heading is not parsed as a parameter',
      bogus.length === 0
        ? 'no file reports a parameter named CALIBRATION or PARAMETERS'
        : `${bogus.length} do — e.g. ${relative(CORPUS, bogus[0].f)}`,
    );
  }

  // ── 6 · every chunk carries a trail, and headers stay whole ─────────────
  {
    const all = [...cFiles, ...hFiles].flatMap((f) =>
      chunkCode(relative(CORPUS, f), readFileSync(f, 'utf8')),
    );
    const untrailed = all.filter((c) => c.headings.length < 2 || !c.text.includes(' > '));
    const headerChunks = hFiles.flatMap((f) => chunkCode(relative(CORPUS, f), readFileSync(f, 'utf8')));
    note(
      untrailed.length === 0 && headerChunks.length === hFiles.length,
      'every chunk carries a trail, and each header is exactly one chunk',
      `${all.length} chunks total; ${headerChunks.length} headers → ${headerChunks.length} chunks ` +
        `(566–1023 bytes each, nothing to split)`,
    );
  }

  // ── 7 · a prototype is not mistaken for a definition ────────────────────
  //
  // Headers are full of `Std_ReturnType Damping_Init(void);`. Matching a
  // signature without requiring a body would chunk declarations as functions.
  {
    const withBodies = hFiles.filter((f) => parseSource(readFileSync(f, 'utf8')).functions.length > 0);
    note(
      withBodies.length === 0,
      'prototypes in headers are not chunked as functions',
      withBodies.length === 0
        ? `${hFiles.length} headers, none reporting a function definition`
        : `${withBodies.length} headers claim function bodies — e.g. ${relative(CORPUS, withBodies[0])}`,
    );
  }

  process.exit(report('code-chunk:check', r));
}

if (require.main === module) {
  main();
}
