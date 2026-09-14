/**
 *   pnpm --filter @vantis/steering retrieval-scorer:check
 *
 * Does the retrieval SCORER work? OFFLINE — no model, no database, no cost.
 *
 * NOT "is retrieval good". This asserts that a label is built from the right
 * parts, that a miss is reported as a miss, and that the superseded revision of
 * a requirement spec does not score as the one in force. The live measurement
 * is `retrieval:eval`, which needs the index and spends money.
 *
 * The order is deliberate and this repo has paid for it three times: `NEXT.md`
 * records three separate occasions where a red check was the CHECK's fault and
 * not the system's. A scorer proved against hand-written rankings first is a
 * scorer whose first live red result is worth believing.
 *
 * RULE 20, which this file exists to honour: a checker that has not been
 * watched to FIRE is not evidence of anything. Every assertion states which way
 * it should go, and a scorer that passed everything would fail here.
 *
 * THE TRAILS BELOW ARE VERBATIM from the indexed corpus, read out of
 * `document_chunks` on 2026-09-14 — not invented. A self-test against a shape
 * the corpus does not have proves the scorer works on a corpus nobody has.
 */
import {
  anchorOf,
  labelOf,
  scoreCase,
  retrievalSummary,
  type SteeringRetrievalCase,
} from './retrieval';

/** Real paths and trails, copied out of the index. */
const SAFETY = 'eps-steering-feel/docs/safety-assessment-2021.md';
const SAFETY_TITLE = 'Safety assessment — steering feel components';
const SRS_ALT = 'requirements/PRG-ALT-08/system-requirements-PRG-ALT-08.md';
const SRS_ALT_TITLE = 'System Requirements Specification — Calder';
const CRS_A = 'requirements/PRG-ALT-08/CRS-ALT-08-001_RevA.md';
const CRS_B = 'requirements/PRG-ALT-08/CRS-ALT-08-001_RevB.md';
const CLOSURE = 'pmo/closure-reports/EFF-BULK-0002.md';
const CODE = 'eps-calibration-tools/src/a2l_export.c';

/** The CRS "trail": a six-line confidentiality banner, not a heading. */
const CRS_BANNER =
  '========================================================================\n' +
  'Altura Mobility — CONFIDENTIAL\n' +
  'Calder Electric Power Steering — Customer Requirement Specification\n' +
  'Document: CRS-ALT-08-001     Revision: Rev A\n' +
  'Issued:   2020-01-28          Effective: 2020-01-28\n' +
  'SUPERSEDED: 2020-05-27 — see the later revision';

const CHUNK = {
  safety_preamble: { documentId: SAFETY, section: SAFETY_TITLE },
  safety_s3: { documentId: SAFETY, section: `${SAFETY_TITLE} > 3. Component classification` },
  safety_s4: { documentId: SAFETY, section: `${SAFETY_TITLE} > 4. Limitations — read this before reuse` },
  srs_0181: { documentId: SRS_ALT, section: `${SRS_ALT_TITLE} > 2. Requirements > SR-ALT-08-0181 — assist latency ms` },
  srs_0194: { documentId: SRS_ALT, section: `${SRS_ALT_TITLE} > 2. Requirements > SR-ALT-08-0194 — nvh limit db` },
  srs_s1: { documentId: SRS_ALT, section: `${SRS_ALT_TITLE} > 1. Purpose` },
  crs_a: { documentId: CRS_A, section: CRS_BANNER },
  crs_b: { documentId: CRS_B, section: CRS_BANNER.replace('Rev A', 'Rev B') },
  closure: { documentId: CLOSURE, section: '' },
  code_export: { documentId: CODE, section: `${CODE} > a2l_export.c — SWC-PLT-001 / Calibration tooling > A2l_Export()` },
  code_header: { documentId: CODE, section: `${CODE} > a2l_export.c — SWC-PLT-001 / Calibration tooling > file header` },
  review_points: {
    documentId: 'requirements/PRG-BRD-09/review-notes-PRG-BRD-09.md',
    section: 'Requirements review — Solen > Points raised',
  },
};

let failed = 0;

function assert(what: string, got: unknown, want: unknown, why: string): void {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${what}`);
  console.log(`        why: ${why}`);
  if (!ok) console.log(`        \x1b[31mgot ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}\x1b[0m`);
}

console.log('\nSteering retrieval scorer self-test — offline, no database, no model\n');

// ── reading the anchor out of a heading trail ──────────────────────────────

console.log('the anchor a trail leaf carries');
assert('a requirement id', anchorOf(CHUNK.srs_0181.section), 'SR-ALT-08-0181',
  'the leaf begins with the id; the prose after the em dash is not part of the label, because a ' +
  'reworded heading must not read as a retrieval miss');
assert('a numbered clause', anchorOf(CHUNK.safety_s3.section), '3',
  'the leaf segment carries the clause; the document title in front of it must not win');
assert('a C function', anchorOf(CHUNK.code_export.section), 'A2l_Export()',
  'the code chunker names a passage by its symbol; the parentheses are what make it a symbol and not a word');
assert('a two-digit clause', anchorOf(`${SAFETY_TITLE} > 10. Revision history`), '10',
  'PLANTED AND WATCHED FIRE: a single-digit `\\d` here makes §10 UNLABELLED, not §1 — "10" matches "1" ' +
  'and then fails the separator. An unlabelled section collapses to the DOCUMENT label, so §10 would ' +
  'silently merge with the preamble instead of erroring');
assert('a prose leaf has no anchor', anchorOf(CHUNK.review_points.section), null,
  '"Points raised" is prose. Anchoring on it would break the moment somebody reworded the heading');
assert('a code file header has no anchor', anchorOf(CHUNK.code_header.section), null,
  '"file header" is prose too — the banner passage falls back to naming the file, which is correct');
assert('no trail at all', anchorOf(''), null,
  '293 passages — every closure report, every MISRA report — have no trail. This is the common case, not an edge one');

// ── THE TRAP: the banner that is not a heading trail ───────────────────────

console.log('\nthe CRS banner, which is not a heading trail');
assert('a banner yields no anchor', anchorOf(CRS_BANNER), null,
  'PLANTED AND WATCHED FIRE: the banner contains `CRS-ALT-08-001` and `Rev A`. A scan of the whole ' +
  'string instead of the leaf\'s FIRST LINE pulls a document number out of a confidentiality notice ' +
  'and calls it a section anchor — 259 passages mislabelled, and each one looking perfectly plausible');

// ── the label ─────────────────────────────────────────────────────────────

console.log('\nthe label');
assert('path plus anchor', labelOf(CHUNK.srs_0181), `${SRS_ALT} §SR-ALT-08-0181`,
  'the path is the spine and the anchor refines it');
assert('path alone when the trail says nothing', labelOf(CHUNK.closure), CLOSURE,
  'THE REASON THIS SCHEME IS NOT PHARMA\'S. A trail-only label is null here, and the 220 closure ' +
  'reports are what find_comparable_work prices from — unnameable evidence is unmeasurable retrieval');
assert('a preamble is still named', labelOf(CHUNK.safety_preamble), SAFETY,
  'pharma returns null for a preamble; here it is the document, because an unlabelled hit occupies a ' +
  'top-k slot while being neither hit nor intruder, and that is invisible in a recall number');
assert('no documentId is the one unnameable case', labelOf({ documentId: '', section: 'x' }), null,
  'there are none in this corpus. If one appears it must be loudly unscoreable rather than quietly ' +
  'labelled "unknown", which would make every such chunk collide with every other');

// ── THE TRAP: a superseded revision at a sibling path ─────────────────────

console.log('\nthe superseded revision — steering\'s Rev 6 / Rev 7');
assert('Rev A and Rev B are different labels', labelOf(CHUNK.crs_a) === labelOf(CHUNK.crs_b), false,
  '`_RevA.md` is marked SUPERSEDED and `_RevB.md` is IN FORCE. Both are indexed on purpose, because ' +
  'a question about a 2021 programme is legitimately answered from the revision in force then. The ' +
  'path is what tells them apart, and it does so without the label reaching into the document');

const trap: SteeringRetrievalCase = {
  id: 'trap',
  query: 'what rack force does the customer require',
  k: 5,
  expect: [CRS_B],
  reject: [CRS_A],
  tags: ['selftest'],
  note: 'synthetic',
};

assert('retrieving Rev A does NOT satisfy an expectation of Rev B',
  scoreCase(trap, [labelOf(CHUNK.crs_a), labelOf(CHUNK.safety_preamble)]).pass, false,
  'if this passed, the suite would bless an answer quoting a withdrawn requirement spec');
assert('...and the superseded revision is named as an intruder',
  scoreCase(trap, [labelOf(CHUNK.crs_a)]).intruders, [CRS_A],
  'a miss says "we did not find it"; an intruder says "we found the withdrawn one instead", which is ' +
  'worse and different, and only one of the two is worth waking somebody for');

// ── THE GRANULARITY TRAP, documented in retrieval.ts ──────────────────────

console.log('\nthe granularity trap — exact matching cuts both ways');
const s3: SteeringRetrievalCase = {
  id: 'granularity', query: 'what ASIL do the steering feel components ship at', k: 5,
  expect: [`${SAFETY} §3`], tags: ['selftest'], note: 'synthetic',
};
assert('the preamble of the SAME FILE does not satisfy a §3 expectation',
  scoreCase(s3, [labelOf(CHUNK.safety_preamble), labelOf(CHUNK.safety_s4)]).pass, false,
  'precision behaving correctly, and the easiest way to write a case that fails for a reason that has ' +
  'nothing to do with the retriever. Write cases against labels you have SEEN — `--show-labels` prints them');

// ── scoring ───────────────────────────────────────────────────────────────

console.log('\nscoring');
const two: SteeringRetrievalCase = {
  id: 'two', query: 'assist latency and NVH limits for Calder', k: 5,
  expect: [`${SRS_ALT} §SR-ALT-08-0181`, `${SRS_ALT} §SR-ALT-08-0194`],
  tags: ['selftest'], note: 'synthetic',
};

const perfect = scoreCase(two, [labelOf(CHUNK.srs_0181), labelOf(CHUNK.srs_0194)]);
assert('both expected passages found', [perfect.recall, perfect.pass], [1, true],
  'the pass condition is every expected label present, not most of them');

const half = scoreCase(two, [labelOf(CHUNK.srs_0181), labelOf(CHUNK.srs_s1), labelOf(CHUNK.closure)]);
assert('one of two found scores 0.5 and FAILS', [half.recall, half.pass], [0.5, false],
  'half the evidence is a failure, not partial credit — the model reads what it is handed');
assert('...and the miss is named', half.missing, [`${SRS_ALT} §SR-ALT-08-0194`],
  'a red line that does not say WHICH passage went missing sends you reading 3,854 chunks');

const beyondK = scoreCase({ ...two, k: 2 },
  [labelOf(CHUNK.srs_s1), labelOf(CHUNK.closure), labelOf(CHUNK.srs_0181), labelOf(CHUNK.srs_0194)]);
assert('found at rank 3 and 4 with k=2 is a MISS', beyondK.pass, false,
  'k is what the model actually sees; retrieved-but-not-shown is not retrieved');

// ── rank: measured, never gated ───────────────────────────────────────────

console.log('\nrank is measured but never gated');
const one: SteeringRetrievalCase = { ...two, expect: [`${SRS_ALT} §SR-ALT-08-0181`] };
const atRank1 = scoreCase(one, [labelOf(CHUNK.srs_0181), labelOf(CHUNK.srs_s1)]);
const atRank2 = scoreCase(one, [labelOf(CHUNK.srs_s1), labelOf(CHUNK.srs_0181)]);

assert('rank 1 and rank 2 both PASS', [atRank1.pass, atRank2.pass], [true, true],
  'which of two CORRECT passages edges ahead is embedding tie-breaking, not quality. Gating on rank ' +
  'is the assertion every retrieval suite writes first and relaxes second');
assert('...while the reciprocal rank does move', [atRank1.rr, atRank2.rr], [1, 0.5],
  'the number is still recorded, because a drift from 1.0 to 0.5 across a corpus change is worth ' +
  'SEEING — and it is the number a reranker should move, which is why this suite exists at all');
assert('reciprocal rank of a total miss is 0', scoreCase(one, [labelOf(CHUNK.closure)]).rr, 0,
  '0 rather than an undefined that would poison the mean');

// ── the summary ───────────────────────────────────────────────────────────

console.log('\nthe summary');
const summary = retrievalSummary([perfect, half, atRank1]);
assert('mean recall and pass count',
  [summary.cases, summary.passed, Number(summary.recall.toFixed(4))], [3, 2, 0.8333],
  'recall averages per case, so a suite of one hard case and nine easy ones does not read as healthy');
assert('mean reciprocal rank', Number(summary.mrr.toFixed(4)), 1,
  'all three found an expected label at rank 1 — reported alongside recall, gating nothing');

// ── the plant: does the scorer fire? ──────────────────────────────────────

console.log('\nthe plant — a scorer that cannot go red is not evidence');
const planted = scoreCase(one, [labelOf(CHUNK.crs_a), labelOf(CHUNK.closure), labelOf(CHUNK.code_export)]);
assert('a ranking with none of the expected passages fails',
  [planted.pass, planted.recall, planted.rr], [false, 0, 0],
  'a withdrawn spec, a closure report and a C function — if this passed, every green result above ' +
  'would mean nothing');

console.log(`\n  steering retrieval scorer: ${failed ? `\x1b[31m${failed} FAILING\x1b[0m` : 'PASS'}\n`);
process.exit(failed ? 1 : 0);
