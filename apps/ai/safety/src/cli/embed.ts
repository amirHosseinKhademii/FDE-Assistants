/**
 * `pnpm safety:embed` — stage 3.3, and nothing else.
 *
 * Reads `passages.json`, writes `vectors.json`, prints three checks. No
 * database, no network, no model call beyond the local embedder.
 *
 * TAKES ABOUT 47 MINUTES for 73,442 passages. It prints progress, because a
 * silent hour is indistinguishable from a hang.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { LocalEmbeddings } from '@fde/grounding';
import { PASSAGES_JSON, VECTORS_JSON } from '../config/paths';
import type { Passage } from '../grounding/chunk';
import { cosine, embedPassages } from '../grounding/embed';

/** REC-001's complaint, and the question it must sit closest to. */
const CANARY = '11353867';
const RELEVANT = 'F-150 will not go into park, transmission shift';
const UNRELATED = 'windscreen wiper motor failure';

const n = (x: number) => x.toLocaleString('en-GB');

async function main(): Promise<number> {
  console.log(`\nstage 3.3 · embed\n  reading ${PASSAGES_JSON}\n`);
  const passages = JSON.parse(readFileSync(PASSAGES_JSON, 'utf8')) as Passage[];
  console.log(`  ${n(passages.length)} passages, local bge-small, nothing leaves this machine\n`);

  let last = Date.now();
  const { embedded, report } = await embedPassages(passages, (done, total) => {
    if (Date.now() - last < 15000 && done < total) return;
    last = Date.now();
    const pct = ((100 * done) / total).toFixed(1);
    process.stdout.write(`\r  ${n(done)} / ${n(total)}  (${pct}%)          `);
  });

  const mins = (report.ms / 60000).toFixed(1);
  console.log(`\r  ${n(report.passages)} vectors of ${report.dimensions} dimensions in ${mins} min\n`);

  writeFileSync(VECTORS_JSON, JSON.stringify(embedded));
  console.log(`  wrote ${VECTORS_JSON}\n`);

  let failed = 0;
  const check = (ok: boolean, name: string, detail: string) => {
    if (!ok) failed++;
    console.log(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${name}`);
    console.log(`        ${detail}`);
  };

  check(
    report.passages === passages.length && report.dimensions === 384,
    'every passage got exactly one vector of 384 dimensions',
    `${n(report.passages)} of ${n(passages.length)}, ${report.dimensions} dims`,
  );

  // THE ONE THAT MATTERS. A vector on the wrong passage does not error and does
  // not look wrong — it just makes retrieval seem mediocre. So check MEANING,
  // not counts: the canary must be nearer the question it answers.
  const q = new LocalEmbeddings();
  const [relevant, unrelated] = [await q.embedQuery(RELEVANT), await q.embedQuery(UNRELATED)];
  const canary = embedded.find((e) => e.id === CANARY);
  const near = canary ? cosine(relevant, canary.vector) : 0;
  const far = canary ? cosine(unrelated, canary.vector) : 0;
  check(
    !!canary && near > far && near > 0.7,
    `ODI ${CANARY}'s vector is in the right place, not just present`,
    canary
      ? `${near.toFixed(4)} to "${RELEVANT}" vs ${far.toFixed(4)} to "${UNRELATED}"`
      : 'canary missing — REC-001 cannot be answered',
  );

  check(
    report.zeroVectors === 0,
    'no vector is all zeros',
    `${n(report.zeroVectors)} zero vectors — each would be a silently empty passage`,
  );

  console.log(
    failed === 0
      ? '\n  embed: PASS — stage 3.4 may begin\n'
      : `\n  embed: FAIL — ${failed} check(s). Nothing downstream should run.\n`,
  );
  return failed;
}

main().then((f) => process.exit(f === 0 ? 0 : 1));
