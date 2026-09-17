/**
 * `pnpm safety:chunk` — stage 3.2, and nothing else.
 *
 * Reads `documents.json` from stage 3.1, writes `passages.json`, prints the
 * ledger and three checks. No embedding, no database, no network, no model.
 *
 * The ledger is the point of this stage: two of its three rows say `untouched`,
 * and 99.84% of the corpus passes straight through. See `docs/safety/CHUNK.md`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { DOCUMENTS_JSON, PASSAGES_JSON } from '../config/paths';
import type { SafetyDoc } from '../grounding/parse';
import { toPassages } from '../grounding/chunk';

/** The complaint eval case REC-001 turns on. It must survive as ONE passage. */
const CANARY = '11353867';

const n = (x: number) => x.toLocaleString('en-GB');

function main(): number {
  console.log(`\nstage 3.2 · chunk\n  reading ${DOCUMENTS_JSON}\n`);

  const docs = JSON.parse(readFileSync(DOCUMENTS_JSON, 'utf8')) as SafetyDoc[];
  const started = Date.now();
  const { passages, report } = toPassages(docs);
  const ms = Date.now() - started;

  for (const kind of ['complaint', 'recall', 'investigation'] as const) {
    const k = report.byKind[kind];
    const verb = k.passages === k.docs ? 'untouched' : 'cut';
    console.log(
      `  ${kind.padEnd(15)} ${n(k.docs).padStart(7)} → ${n(k.passages).padStart(7)}   ${verb}`,
    );
  }
  const pct = ((100 * (report.documents - report.split)) / report.documents).toFixed(2);
  console.log(
    `\n  ${n(report.documents)} documents → ${n(report.passages)} passages in ${ms}ms`,
  );
  console.log(`  ${n(report.split)} documents were split. ${pct}% passed through untouched.\n`);

  writeFileSync(PASSAGES_JSON, JSON.stringify(passages));
  console.log(`  wrote ${PASSAGES_JSON}\n`);

  let failed = 0;
  const check = (ok: boolean, name: string, detail: string) => {
    if (!ok) failed++;
    console.log(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${name}`);
    console.log(`        ${detail}`);
  };

  // 1 — only investigations were cut. If a complaint ever splits, every
  //     citation in the corpus stops being an ODI number, silently.
  const splitKinds = new Set(
    passages.filter((p) => p.id.includes('#')).map((p) => p.kind),
  );
  check(
    splitKinds.size === 0 || (splitKinds.size === 1 && splitKinds.has('investigation')),
    'only investigations were split — every complaint id is still an ODI number',
    splitKinds.size === 0
      ? 'nothing was split at all'
      : `kinds carrying a #suffix: ${[...splitKinds].join(', ')}`,
  );

  // 2 — the canary survived whole.
  const canary = passages.filter((p) => p.documentId === CANARY);
  check(
    canary.length === 1 && canary[0].id === CANARY,
    `ODI ${CANARY} survived as exactly one passage (REC-001)`,
    canary.length === 1
      ? `id ${canary[0].id}, ${n(canary[0].text.length)} chars, unsplit`
      : `${canary.length} passages — REC-001's citation would no longer be an ODI number`,
  );

  // 3 — nothing was lost on the way through.
  const empty = passages.filter((p) => !p.text.trim()).length;
  const metaless = passages.filter((p) => !p.meta).length;
  check(
    empty === 0 && metaless === 0,
    'no passage is empty and none lost its metadata',
    `${n(empty)} empty, ${n(metaless)} without meta, of ${n(passages.length)}`,
  );

  console.log(`\n  ── the document that WAS cut ──────────────────────────────\n`);
  const cut = passages.filter((p) => p.id.includes('#')).slice(0, 2);
  for (const p of cut) {
    console.log(`  ${p.id}  ${n(p.text.length)} chars, from line ${p.startLine}`);
    console.log(`  ${JSON.stringify(p.text).slice(0, 170)}…\n`);
  }

  console.log(
    failed === 0
      ? '  chunk: PASS — stage 3.3 may begin\n'
      : `  chunk: FAIL — ${failed} check(s). Nothing downstream should run.\n`,
  );
  return failed;
}

process.exit(main() === 0 ? 0 : 1);
