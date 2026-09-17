/**
 * `pnpm safety:parse` — stage 3.1, and nothing else.
 *
 * Reads the complaints slice, writes `documents.json`, and prints three checks.
 * No embedding, no database, no network, no model. One file in, one file out.
 *
 * ── WHY CHECK 2 IS THE ONE THAT MATTERS ───────────────────────────────────
 *
 * It compares this parser's line count against `awk` over the raw file — a
 * DIFFERENT TOOL, with no parser in the path. A parser confirming its own
 * output proves nothing, and that is not a hypothetical: a quote-aware reader
 * silently merged 52 records here and the resulting figures were written into
 * `docs/safety/CORPUS.md` as properties of the data. They were properties of
 * the reader. See that file's §3.
 *
 * So: any claim about the shape of a file gets a no-parser check beside it
 * before it becomes a finding. `docs/safety/ARCHITECTURE.md` guardrail 3.
 */
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { COMPLAINTS_TSV, DOCUMENTS_JSON } from '../config/paths';
import { EXPECTED_FIELDS, parseComplaints } from '../grounding/parse';

/** The complaint that answers eval case REC-001. If it is missing, so is the point. */
const CANARY = '11353867';

const n = (x: number) => x.toLocaleString('en-GB');

function awkFieldCounts(path: string): Map<number, number> {
  // Deliberately `awk` and not Node: the whole value of this check is that it
  // shares no code with the thing it is checking.
  const out = execFileSync(
    'awk',
    ['-F', '\t', '{c[NF]++} END {for (k in c) print k, c[k]}', path],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  const counts = new Map<number, number>();
  for (const line of out.trim().split('\n')) {
    const [fields, lines] = line.trim().split(/\s+/).map(Number);
    counts.set(fields, lines);
  }
  return counts;
}

async function main(): Promise<number> {
  console.log(`\nstage 3.1 · parse\n  reading ${COMPLAINTS_TSV}\n`);

  const started = Date.now();
  const { docs, report } = await parseComplaints(COMPLAINTS_TSV);
  const ms = Date.now() - started;

  writeFileSync(DOCUMENTS_JSON, JSON.stringify(docs));
  console.log(
    `  ${n(report.linesRead)} lines → ${n(report.documents)} documents ` +
      `(${n(report.merged)} rows merged, ${n(report.ragged)} ragged) in ${(ms / 1000).toFixed(1)}s`,
  );
  console.log(`  wrote ${DOCUMENTS_JSON}\n`);

  let failed = 0;
  const check = (ok: boolean, name: string, detail: string) => {
    if (!ok) failed++;
    console.log(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${name}`);
    console.log(`        ${detail}`);
  };

  // 1 — every row had the field count the dictionary promises.
  check(
    report.ragged === 0,
    'every row had the 51 fields CMPL.txt declares',
    report.ragged === 0
      ? 'no short rows — nothing was silently shifted into the wrong column'
      : `${n(report.ragged)} rows were skipped, and a short row is a SHIFTED row`,
  );

  // 2 — the count, verified by a tool that shares no code with the parser.
  const counts = awkFieldCounts(COMPLAINTS_TSV);
  const awkLines = [...counts.values()].reduce((a, b) => a + b, 0);
  const shapes = [...counts.entries()].map(([f, l]) => `${f} fields × ${n(l)}`).join(', ');
  check(
    awkLines === report.linesRead && counts.get(EXPECTED_FIELDS) === awkLines,
    'the raw file agrees, checked by awk with no parser in the path',
    `awk says ${shapes}; the parser read ${n(report.linesRead)} lines`,
  );

  // 3 — the one document the whole exercise is aimed at.
  const canary = docs.find((d) => d.id === CANARY);
  check(
    !!canary && canary.meta.make === 'FORD' && canary.meta.filed === '2020-09-08',
    `ODI ${CANARY} is present and reads correctly (eval case REC-001)`,
    canary
      ? `${canary.meta.year} ${canary.meta.make} ${canary.meta.model}, filed ${canary.meta.filed}`
      : 'NOT FOUND — the complaint REC-001 turns on is missing',
  );

  console.log(`\n  ── the first 3 documents, in full ──────────────────────────\n`);
  for (const d of docs.slice(0, 3)) {
    console.log(`  id ${d.id}  ${JSON.stringify(d.meta.components)}`);
    console.log(`  meta ${JSON.stringify({ ...d.meta, components: undefined })}`);
    console.log(`  text ${JSON.stringify(d.text).slice(0, 200)}…\n`);
  }

  console.log(
    failed === 0
      ? '  parse: PASS — stage 3.2 may begin\n'
      : `  parse: FAIL — ${failed} check(s). Nothing downstream should run.\n`,
  );
  return failed;
}

main().then((f) => process.exit(f === 0 ? 0 : 1));
