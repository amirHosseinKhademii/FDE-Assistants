/**
 * `pnpm safety:embed` — stage 3.3, and nothing else.
 *
 * Reads `passages.json`, writes `vectors.ndjson`, prints three checks. No
 * database, no network, no model call beyond the local embedder.
 *
 * ── WHY NDJSON, AND WHY IT IS WRITTEN AS IT GOES ──────────────────────────
 *
 * The first version embedded everything and then called
 * `JSON.stringify(embedded)`. It computed all 73,442 vectors in 37.9 minutes
 * and threw on the last line:
 *
 *   RangeError: Invalid string length
 *
 * MEASURED AFTERWARDS: a real record serialises to ~9,101 characters, because
 * a float arrives as `0.019854292273521423` — TWENTY characters, full double
 * precision from a float32 model. 73,442 x 9,101 is 637 MB against V8's 512 MB
 * maximum string length. An estimate using short floats had said 346 MB and
 * would have passed review.
 *
 * So: one JSON object per line, appended with a stream. No single string is
 * ever built, and the file stays greppable — `head -1 vectors.ndjson` still
 * shows you one record.
 *
 * AND IT IS WRITTEN SLAB BY SLAB, which is the more important half. The work
 * completed and the write destroyed it — the same shape as `ingestDocuments`
 * emptying the table before embedding, where a crash takes the index with it.
 * Thirty-eight minutes of finished work should never be one unhandled call
 * away from nothing.
 *
 * ── AND IT RESUMES ────────────────────────────────────────────────────────
 *
 * If the file already holds N records, the first N passages of the sorted
 * order are skipped. A crash, a reboot or a Ctrl-C costs one slab, not a run.
 */
import { appendFileSync, createReadStream, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { LocalEmbeddings } from '@fde/grounding';
import { PASSAGES_JSON, VECTORS_NDJSON } from '../config/paths';
import type { Passage } from '../grounding/chunk';
import { cosine, embedPassages } from '../grounding/embed';

/** REC-001's complaint, and the question it must sit closest to. */
const CANARY = '11353867';
const RELEVANT = 'F-150 will not go into park, transmission shift';
const UNRELATED = 'windscreen wiper motor failure';

/** Passages embedded before each write. Small enough to lose, large enough to be fast. */
const SLAB = Number(process.env.SAFETY_EMBED_SLAB ?? 4000);

const n = (x: number) => x.toLocaleString('en-GB');

/** How many records are already on disk, counted without loading the file. */
async function existingRecords(path: string): Promise<number> {
  if (!existsSync(path)) return 0;
  let count = 0;
  const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  for await (const line of rl) if (line.trim()) count++;
  return count;
}

async function main(): Promise<number> {
  console.log(`\nstage 3.3 · embed\n  reading ${PASSAGES_JSON}\n`);
  const passages = JSON.parse(readFileSync(PASSAGES_JSON, 'utf8')) as Passage[];

  // SORTED GLOBALLY, THEN SLABBED. `@fde/grounding` sorts within whatever it is
  // given; sorting all 73,442 first makes every slab length-homogeneous, which
  // is strictly better. Tie-broken on id so the order is identical on a resume —
  // otherwise a resume would skip the wrong N passages.
  const sorted = [...passages].sort(
    (a, b) => a.text.length - b.text.length || a.id.localeCompare(b.id),
  );

  const done = await existingRecords(VECTORS_NDJSON);
  if (done > 0 && done < sorted.length) {
    console.log(`  resuming: ${n(done)} of ${n(sorted.length)} already on disk\n`);
  } else if (done >= sorted.length) {
    console.log(`  ${n(done)} records already written — delete ${VECTORS_NDJSON} to redo\n`);
  } else {
    writeFileSync(VECTORS_NDJSON, '');
    console.log(`  ${n(passages.length)} passages, local bge-small, nothing leaves this machine\n`);
  }

  const started = Date.now();
  let written = done;

  for (let i = done; i < sorted.length; i += SLAB) {
    const slab = sorted.slice(i, i + SLAB);
    const { embedded } = await embedPassages(slab);
    // One line per record. Never one string for the corpus.
    appendFileSync(VECTORS_NDJSON, embedded.map((e) => JSON.stringify(e)).join('\n') + '\n');
    written += embedded.length;

    const elapsed = (Date.now() - started) / 1000;
    const rate = (written - done) / elapsed;
    const left = (sorted.length - written) / (rate || 1);
    process.stdout.write(
      `\r  ${n(written)} / ${n(sorted.length)}  ` +
        `(${((100 * written) / sorted.length).toFixed(1)}%)  ` +
        `${rate.toFixed(0)}/s  ~${(left / 60).toFixed(0)} min left      `,
    );
  }

  const mins = ((Date.now() - started) / 60000).toFixed(1);
  console.log(`\r  ${n(written)} vectors written in ${mins} min${done ? ` (resumed from ${n(done)})` : ''}          \n`);
  console.log(`  wrote ${VECTORS_NDJSON}\n`);

  // ── the checks, read back off disk rather than from memory ───────────────
  //
  // Deliberately re-read: the point is to verify what was WRITTEN, not what was
  // computed. The bug this file exists because of was entirely in the writing.
  let failed = 0;
  const check = (ok: boolean, name: string, detail: string) => {
    if (!ok) failed++;
    console.log(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${name}`);
    console.log(`        ${detail}`);
  };

  let count = 0;
  let dims = 0;
  let zeros = 0;
  let canaryVector: number[] | null = null;
  const rl = createInterface({ input: createReadStream(VECTORS_NDJSON), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const rec = JSON.parse(line) as { id: string; vector: number[] };
    count++;
    dims = rec.vector.length;
    if (rec.vector.every((x) => x === 0)) zeros++;
    if (rec.id === CANARY) canaryVector = rec.vector;
  }

  check(
    count === passages.length && dims === 384,
    'every passage got exactly one vector of 384 dimensions, on disk',
    `${n(count)} records of ${dims} dims, against ${n(passages.length)} passages`,
  );

  // THE ONE THAT MATTERS. A vector on the wrong passage does not error and does
  // not look wrong — it makes retrieval seem mediocre, and the obvious response
  // is to go and change the chunker. So check MEANING, not counts.
  const q = new LocalEmbeddings();
  const [relevant, unrelated] = [await q.embedQuery(RELEVANT), await q.embedQuery(UNRELATED)];
  const near = canaryVector ? cosine(relevant, canaryVector) : 0;
  const far = canaryVector ? cosine(unrelated, canaryVector) : 0;
  check(
    !!canaryVector && near > far && near > 0.7,
    `ODI ${CANARY}'s vector is in the right place, not just present`,
    canaryVector
      ? `${near.toFixed(4)} to "${RELEVANT}" vs ${far.toFixed(4)} to "${UNRELATED}"`
      : 'canary missing — REC-001 cannot be answered',
  );

  check(zeros === 0, 'no vector is all zeros', `${n(zeros)} zero vectors of ${n(count)}`);

  console.log(
    failed === 0
      ? '\n  embed: PASS — stage 3.4 may begin\n'
      : `\n  embed: FAIL — ${failed} check(s). Nothing downstream should run.\n`,
  );
  return failed;
}

main().then((f) => process.exit(f === 0 ? 0 : 1));
