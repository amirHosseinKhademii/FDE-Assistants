/**
 *   pnpm retrieval:check
 *
 * Does the retrieval scorer work? OFFLINE — no model, no database, no cost.
 *
 * NOT "is retrieval good". This asserts the SCORER: that a label is built from
 * the right parts, that a miss is reported as a miss, and that the wrong
 * revision's clause does not score as the right one. The live measurement is
 * `pnpm retrieval:eval`, which needs the ingested index.
 *
 * The order matters. `NEXT.md` records three separate occasions in this repo
 * where a red check was the CHECK's fault and not the system's, and P4a's own
 * write-up is two more. A scorer proved against hand-written rankings first is
 * a scorer whose first live red result is worth believing.
 *
 * RULE 20, the one this file exists to honour: a checker that has not been
 * watched to FIRE is not evidence of anything. Every assertion below states
 * which way it should go, and a scorer that passed everything would fail here.
 *
 * The heading trails are VERBATIM from `pnpm chunks` on the real corpus, not
 * invented — a self-test against a shape the corpus does not have proves the
 * scorer works on a corpus nobody has.
 */
import {
  clauseOf,
  labelOf,
  revisionOf,
  scoreCase,
  retrievalSummary,
  type RetrievalCase,
} from './retrieval';

const T = 'SOP-QC-014 Rev 7 — Batch Release and QP Certification';
const T6 = 'SOP-QC-014 Rev 6 — Batch Release and QP Certification';

/** Real trails, copied from the chunker's own output. */
const TRAIL = {
  r7_73: `${T} > 7. Disposition and certification > 7.3 Personnel precondition to certification`,
  r7_74: `${T} > 7. Disposition and certification > 7.4 Records`,
  r7_72: `${T} > 7. Disposition and certification > 7.2 Certification for the European Union`,
  r7_3: `${T} > 3. Responsibilities`,
  r7_10: `${T} > 10. Revision history`,
  r7_preamble: T,
  r6_73: `${T6} > 7. Disposition and certification > 7.3 Records`,
  r6_72: `${T6} > 7. Disposition and certification > 7.2 Certification for the European Union`,
};

let failed = 0;

function assert(what: string, got: unknown, want: unknown, why: string): void {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${what}`);
  console.log(`        why: ${why}`);
  if (!ok) console.log(`        \x1b[31mgot ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}\x1b[0m`);
}

console.log('\nRetrieval scorer self-test — offline, no database, no model\n');

// ── reading a heading trail ────────────────────────────────────────────────

console.log('reading a heading trail');
assert('clauseOf a sub-clause', clauseOf(TRAIL.r7_73), '7.3',
  'the leaf segment carries the clause; the parent §7 must not win');
assert('clauseOf a top-level clause', clauseOf(TRAIL.r7_3), '3',
  'a one-level clause is still a clause');
assert('clauseOf a two-digit clause', clauseOf(TRAIL.r7_10), '10',
  'PLANTED AND WATCHED FIRE: a single-digit `\\d` here makes §10 UNLABELLED, not §1 — ' +
  '"10" matches "1" and then fails the separator. An unlabelled chunk can never satisfy an ' +
  'expectation and never shows up as an intruder, so §10 would quietly leave the measurement entirely');
assert('clauseOf a document preamble', clauseOf(TRAIL.r7_preamble), null,
  'the title states no clause; two of the thirty-one chunks are this, and null is the honest answer');
assert('revisionOf', revisionOf(TRAIL.r7_73), 'SOP-QC-014 Rev 7',
  'the revision is the document identity, read from the title segment');
assert('labelOf', labelOf(TRAIL.r7_73), 'SOP-QC-014 Rev 7 §7.3',
  'revision plus clause number, and no heading prose — a reworded heading must not read as a retrieval miss');
assert('labelOf a preamble', labelOf(TRAIL.r7_preamble), null,
  'no clause, no label; it can never satisfy an expectation and must never accidentally match one');

// ── THE TRAP: the same clause number in two revisions ──────────────────────

console.log('\nthe same clause number in two revisions');
assert('Rev 6 §7.3 and Rev 7 §7.3 are different labels',
  labelOf(TRAIL.r6_73) === labelOf(TRAIL.r7_73), false,
  'Rev 6 §7.3 is "Records"; Rev 7 §7.3 is the training precondition, Records having moved to §7.4. ' +
  'A label of "§7.3" alone scores the wrong revision\'s filing rule as a hit on the rule that blocks a batch');

const trapCase: RetrievalCase = {
  id: 'trap',
  query: 'training required before a QP may certify',
  sop_id: 'SOP-QC-014',
  k: 5,
  expect: ['SOP-QC-014 Rev 7 §7.3'],
  reject: ['SOP-QC-014 Rev 6 §7.3'],
  tags: ['selftest'],
  note: 'synthetic',
};

assert('retrieving Rev 6 §7.3 does NOT satisfy an expectation of Rev 7 §7.3',
  scoreCase(trapCase, [labelOf(TRAIL.r6_73), labelOf(TRAIL.r7_72)]).pass, false,
  'this is the whole reason the label carries a revision; if it passed, the suite would bless the rel-007 failure');

assert('...and the sibling revision is named as an intruder',
  scoreCase(trapCase, [labelOf(TRAIL.r6_73)]).intruders, ['SOP-QC-014 Rev 6 §7.3'],
  'a miss says "we did not find it"; an intruder says "we found the confusable one instead", which is worse and different');

// ── scoring ───────────────────────────────────────────────────────────────

console.log('\nscoring');
const two: RetrievalCase = {
  id: 'two',
  query: 'EU certification and the personnel precondition',
  sop_id: 'SOP-QC-014',
  k: 5,
  expect: ['SOP-QC-014 Rev 7 §7.2', 'SOP-QC-014 Rev 7 §7.3'],
  tags: ['selftest'],
  note: 'synthetic',
};

const perfect = scoreCase(two, [labelOf(TRAIL.r7_73), labelOf(TRAIL.r7_72)]);
assert('both expected clauses found', [perfect.recall, perfect.pass], [1, true],
  'the pass condition is every expected label present, not most of them');

const half = scoreCase(two, [labelOf(TRAIL.r7_72), labelOf(TRAIL.r7_3), labelOf(TRAIL.r7_10)]);
assert('one of two found scores 0.5 and FAILS', [half.recall, half.pass], [0.5, false],
  'half the evidence is a failure, not a partial credit — the model reads what it is handed');
assert('...and the miss is named', half.missing, ['SOP-QC-014 Rev 7 §7.3'],
  'a red line that does not say WHICH clause went missing sends you reading all 31 chunks');

const beyondK = scoreCase({ ...two, k: 2 }, [labelOf(TRAIL.r7_3), labelOf(TRAIL.r7_10), labelOf(TRAIL.r7_72), labelOf(TRAIL.r7_73)]);
assert('found at rank 3 and 4 with k=2 is a MISS', beyondK.pass, false,
  'k is what the model actually sees; retrieved-but-not-shown is not retrieved');

// ── rank: measured, never gated ───────────────────────────────────────────

console.log('\nrank is measured but never gated');
const one: RetrievalCase = { ...two, expect: ['SOP-QC-014 Rev 7 §7.3'] };
const atRank1 = scoreCase(one, [labelOf(TRAIL.r7_73), labelOf(TRAIL.r7_3)]);
const atRank2 = scoreCase(one, [labelOf(TRAIL.r7_3), labelOf(TRAIL.r7_73)]);

assert('rank 1 and rank 2 both PASS', [atRank1.pass, atRank2.pass], [true, true],
  'tools:check already learned this: §7.3 comes first for one phrasing and second for another, ' +
  'behind "3. Responsibilities", and both retrievals are correct. Gating on rank re-creates a check ' +
  'that was already relaxed once for going red at embedding tie-breaking');
assert('...while the reciprocal rank does move', [atRank1.rr, atRank2.rr], [1, 0.5],
  'the number is still recorded, because a drift from 1.0 to 0.5 across a corpus change is worth SEEING — ' +
  'it is just not worth failing a build over');
assert('reciprocal rank of a total miss is 0', scoreCase(one, [labelOf(TRAIL.r7_3)]).rr, 0,
  'no expected label at any rank; 0 rather than an undefined that would poison the mean');

// ── the summary ───────────────────────────────────────────────────────────

console.log('\nthe summary');
const summary = retrievalSummary([perfect, half, atRank1]);
assert('mean recall and pass count', [summary.cases, summary.passed, Number(summary.recall.toFixed(4))],
  [3, 2, 0.8333],
  'recall averages per case, so a suite of one hard case and nine easy ones does not read as healthy');
assert('mean reciprocal rank', Number(summary.mrr.toFixed(4)), Number(((1 + 1 + 1) / 3).toFixed(4)),
  'all three found an expected label at rank 1 — reported alongside recall, gating nothing');

// ── the plant: does the scorer fire? ──────────────────────────────────────

console.log('\nthe plant — a scorer that cannot go red is not evidence');
const plantedMiss = scoreCase(one, [labelOf(TRAIL.r6_72), labelOf(TRAIL.r7_10), labelOf(TRAIL.r7_preamble)]);
assert('a ranking with none of the expected clauses fails',
  [plantedMiss.pass, plantedMiss.recall, plantedMiss.rr], [false, 0, 0],
  'the wrong revision, an irrelevant clause and an unlabelled preamble — if this passed, every ' +
  'green result above would mean nothing');

console.log(`\n  retrieval scorer: ${failed ? `${failed} FAILING` : 'PASS'}\n`);
process.exit(failed ? 1 : 0);
