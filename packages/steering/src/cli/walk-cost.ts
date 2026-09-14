/**
 * `pnpm steering:walk-cost` — Phase A, step 2. The hard question, by hand.
 *
 *     "What do we charge for the K2 job?"
 *
 * THIS FILE IS A PRINTER. The reasoning is in `answer/derive.ts`.
 *
 * ── WHY THIS IS THE DANGEROUS ONE ─────────────────────────────────────────
 *
 * Step 1 can fail loudly: no part satisfies the requirement, the shortlist is
 * empty, you notice. Cost cannot fail that way. It will ALWAYS produce a
 * number, and the average of everything the company ever did looks exactly like
 * a number that means something.
 *
 * So this prints the comparable set, its size, and BOTH statistics — because
 * the gap between the mean and the median is the diagnosis.
 *
 * ── ONE MODEL CALL, AND IT IS NOT THE ONE YOU WOULD EXPECT ───────────────
 *
 * This file used to say "NO MODEL IS CALLED", and it was true: rows from
 * Postgres, text from a file whose path was typed into the source.
 *
 * That path was the problem. Step B's evidence — the damping software ships at
 * ASIL B while the new programme needs ASIL D — is the largest item on the page
 * and the output claimed it "only exists if somebody read the document". Nobody
 * read anything. The file was named in this file, and the paragraph was found by
 * a regex tuned to its exact wording. The answer was real; the FINDING of it was
 * staged, and at a real engagement nobody knows that path.
 *
 * So step B now SEARCHES. That costs exactly one embedding call — the question
 * has to become a vector to be compared with the passages — and nothing else
 * here calls a model. No text is generated: the sentence printed is the
 * customer's own, read out of the file retrieval pointed at.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  Walk, derivePrice, num, round, MIN_COMPARABLES,
  ANSWER_KEY, FROM_DOCUMENTS, type Priced, type Source,
} from '../answer/derive';

/**
 * `--from-documents` — read the past jobs out of `vst_derived` instead of `vst_pmo`.
 *
 * THIS FLAG IS THE POINT OF THE WHOLE SORTING PHASE. Without it, every number
 * this walk prints comes from rows that were generated alongside the documents
 * rather than read out of them — a cheat, and one this file was telling a story
 * on top of for weeks.
 *
 * The default is still the answer key, deliberately, so the two can be run back
 * to back and the difference read off. That difference is not a bug report on
 * the extraction; it is a measurement of what the customer's documents can and
 * cannot support.
 */
const SOURCE: Source = process.argv.includes('--from-documents') ? FROM_DOCUMENTS : ANSWER_KEY;
import { openStore } from '@fde/grounding';
import { REPO_ROOT, derivedUrl } from '../config/connections';
import { ANCHORS } from '../db/seed/anchors';
import { openEmbeddings } from '../grounding/embeddings.factory';
import { CHUNK_TABLE } from '../grounding/chunks';
import { searchDocuments, countPassages, type Passage } from '../tools/departments/documents';
import { openDerived } from '../tools/utils/handle';

const CORPUS = process.env.STEERING_CORPUS_DIR
  ? resolve(process.env.STEERING_CORPUS_DIR)
  : resolve(REPO_ROOT, 'docs', 'steering', 'corpus');

const line = (s = ''): void => console.log(s);
const rule = (): void => line('─'.repeat(78));
const eur = (x: number): string => `EUR ${Math.round(x).toLocaleString('en-GB')}`;

function wrap(s: string, n: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const word of s.split(/\s+/)) {
    if ((cur + ' ' + word).trim().length > n) { out.push(cur.trim()); cur = word; } else cur += ' ' + word;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

let section = 0;
/**
 * Which database the cost steps are actually reading, for the step heading.
 *
 * HARDCODED AS `vst_pmo` UNTIL NOW, AND IT WAS A LIE UNDER `--from-documents`:
 * the heading named the customer's estate while the line four rows below it
 * said "read from: the documents". Two contradictory claims about provenance in
 * one screen, and the wrong one was the bigger type.
 *
 * Small, and exactly the sort of thing this walk exists to be trusted about. A
 * tool that misreports where a number came from is worse than one that does not
 * report it, because the second invites the question and the first answers it
 * wrongly.
 */
function costSource(): string {
  return SOURCE.db.startsWith('vst_') ? SOURCE.db : `vst_${SOURCE.db}`;
}

function heading(what: string, where: string): void {
  line();
  rule();
  line(`STEP ${++section}  ${what}`);
  line(`        ${where}`);
  rule();
  line();
}

function report(p: Priced): void {
  line(`  comparable set: ${p.filter}`);
  // Printed on every priced answer, never assumed. Two runs of this walk can
  // give different numbers, and which half of the estate each was read from is
  // the first thing anybody comparing them needs to know.
  line(`  read from:      ${p.source}`);
  line(`  found ${p.n} past job(s)` + (p.n ? `, from ${round(p.spread[0])} to ${round(p.spread[1])} hours` : ''));
  line();
  // An empty source is not a short one. Said first, and said differently.
  if (p.available === 0) {
    line(`  ✗ THE SOURCE IS EMPTY — ${p.source} holds no past jobs at all.`);
    line('    This says nothing about what we have or have not done. It says the');
    line('    knowledge base was never built, or was built and lost. Run the ingest');
    line('    before reading anything below as a finding about the customer.');
    return;
  }
  if (!p.enough) {
    line(`  ✗ FEWER THAN ${MIN_COMPARABLES} COMPARABLES, out of ${p.available} past jobs. No price.`);
    line('    This is not a gap in the tool — it is the honest answer: we have not');
    line('    done enough of this to know. It goes to the meeting as an open item,');
    line('    not as a number with a caveat attached to it.');
    return;
  }
  line(`  median  ${String(round(p.medianHours)).padStart(6)} h    ← price from this`);
  line(`  mean    ${String(round(p.meanHours)).padStart(6)} h    ` +
    (p.meanInflation > 0.15
      ? `← ${round(p.meanInflation * 100)}% HIGHER. Something in the set is dragging it.`
      : '  (close to the median — the set is well behaved)'));
  if (p.outlier) {
    line();
    line(`  the record doing the dragging: ${p.outlier.effort_id}, ${round(p.outlier.hours)} h`);
    for (const l of wrap(p.outlier.note, 68)) line(`      "${l}"`);
    line('    → a real number answering a different question. Excluded by using the');
    line('      median rather than by deleting it: deleting history is how you lose');
    line('      the reason it was strange.');
  }
  line();
  line('  hours → euros, using the 2026 EU rate card:');
  for (const d of p.disciplines) {
    line(`      ${d.discipline.padEnd(12)} ${String(round(d.hours)).padStart(5)} h  ×  ` +
      `${String(round(d.rate, 2)).padStart(6)} EUR/h  =  ${eur(d.eur).padStart(12)}`);
  }
  line(`      ${''.padEnd(12)} ${String(round(p.medianHours)).padStart(5)} h${' '.repeat(22)}=  ${eur(p.totalEur).padStart(12)}`);
}

/**
 * Which document states the safety classification of the damping software, and
 * what does it say?
 *
 * ── WHAT IS LEGITIMATELY KNOWN HERE, AND WHAT WAS THE CHEAT ──────────────
 *
 * Naming the COMPONENT is not a cheat. "What safety level does the damping
 * software ship at" is the question, and a person asking it knows which
 * component they mean; `ANCHORS.swcDamping` is the subject, not the answer.
 *
 * Naming the FILE was the cheat, and so was the regex. The old version opened
 * `eps-steering-feel/docs/safety-assessment-2021.md` by a path typed into this
 * source and found the paragraph with `/developed\s+to/i` — a pattern tuned to
 * that one document's wording. Change the sentence to "is classified as ASIL B"
 * and the walk would have found nothing while looking like it worked.
 *
 * ── WHY IT SEARCHES UNFILTERED AND THEN PICKS ────────────────────────────
 *
 * The obvious shortcut is `filter: { docType: 'safety_assessment' }`. It would
 * work, and on THIS corpus it would be nearly meaningless: there is exactly one
 * such document in 702, so the filter would do the finding and retrieval would
 * be along for the ride. `retrieval:check` already proves the unfiltered search
 * surfaces it in the top three, so the honest thing is to make the walk depend
 * on that and take the best-ranked safety assessment among the hits.
 *
 * ── AND WHY IT THEN READS THE WHOLE FILE ─────────────────────────────────
 *
 * Because retrieval's job is "which of 702 documents", not "which paragraph".
 * The passage that ranks first for this question is §4, the limitations — the
 * classification itself is in §3. Both are correct; which one a chunk boundary
 * happens to land on is an implementation detail of the chunker, and building
 * the walk on "the top passage must contain the sentence" would make a costing
 * answer fragile to a change in chunk size.
 *
 * A person who has found the safety assessment reads it. So does this.
 */
interface Classified {
  ok: true;
  shipsAt: string;
  classification: string;
  limits: string | undefined;
  sourcePath: string;
  rank: number;
  foundBy: Passage['foundBy'];
}

async function findSafetyClassification(): Promise<Classified | { ok: false; why: string }> {
  // Free, and asked FIRST. "Nothing came back" means one of two opposite
  // things, and only a count can tell them apart — see `countPassages`.
  const h = openDerived();
  let indexed: number;
  try {
    indexed = await countPassages(h);
  } finally {
    await h.close();
  }
  if (indexed === 0) {
    return {
      ok: false,
      why: 'THE INDEX IS EMPTY — no passages have been stored. This says nothing about\n' +
        '  what the customer does or does not document; it says the corpus was never\n' +
        '  indexed. Run `pnpm steering:index`.',
    };
  }

  const store = await openStore(openEmbeddings(), {
    connectionString: derivedUrl(),
    tableName: CHUNK_TABLE,
  });

  let hits: Passage[];
  try {
    // The question as somebody would actually type it. No document name in it,
    // no field name, nothing that presumes the answer's shape.
    const { passages } = await searchDocuments(
      store,
      `what safety level is the ${ANCHORS.swcDamping} damping software developed to?`,
      8,
    );
    hits = passages;
  } finally {
    // The pool behind the index outlives every query through it.
    await store.end();
  }

  const idx = hits.findIndex((p) => p.docType === 'safety_assessment');
  if (idx < 0) {
    const saw = hits.slice(0, 3).map((p) => `${p.sourcePath} (${p.docType})`).join(', ');
    return {
      ok: false,
      why: `NO SAFETY ASSESSMENT SURFACED for this question, out of ${indexed} indexed passages.\n` +
        `  The top hits were: ${saw || 'nothing at all'}.\n` +
        '  That is a finding about the corpus, not a failure of the tool: on this evidence\n' +
        '  no released document states a safety classification for this component.',
    };
  }
  const hit = hits[idx];

  const full = resolve(CORPUS, hit.sourcePath);
  if (!existsSync(full)) {
    return {
      ok: false,
      why: `The index points at ${hit.sourcePath}, which is not on disk. The index and the\n` +
        '  corpus have diverged — re-run `pnpm steering:corpus` then `pnpm steering:index`.',
    };
  }

  const paragraphs = readFileSync(full, 'utf8').split(/\n\s*\n/);

  // Keyed on the COMPONENT and an ASIL level, not on a turn of phrase. This
  // survives "are developed to ASIL B", "is classified ASIL B" and "ASIL B
  // applies to SWC-DAMP"; the old pattern survived only the first.
  const classification = paragraphs.find(
    (p) => p.includes(ANCHORS.swcDamping) && /ASIL\s+[A-D]\b/.test(p),
  );
  const shipsAt = (classification?.match(/ASIL\s+([A-D])\b/) ?? [])[1];

  if (!classification || !shipsAt) {
    return {
      ok: false,
      why: `${hit.sourcePath} was found, and states no ASIL for ${ANCHORS.swcDamping}.\n` +
        '  The document exists and does not answer the question — which is itself worth\n' +
        '  knowing, and is not the same as having failed to look.',
    };
  }

  // Context rather than evidence, so a miss costs a paragraph and not the step.
  const limits = paragraphs.find((p) => /cannot inherit|platform specific/i.test(p));

  return {
    ok: true,
    shipsAt,
    classification,
    limits,
    sourcePath: hit.sourcePath,
    rank: idx + 1,
    foundBy: hit.foundBy,
  };
}

async function main(): Promise<void> {
  line();
  line('  PHASE A · STEP 2 — the money question, answered by hand');
  line();
  line('  QUESTION: what do we charge for the K2 job?');
  line();
  line('  Rows from Postgres. Text from the customer\'s own files, FOUND by searching');
  line('  them — one embedding call, no generated text, every quote verbatim.');

  const w = new Walk();

  // ── A · the gearbox ──────────────────────────────────────────────────────
  heading('A · the gearbox — is there work here at all?', 'vst_alm + vst_plm');

  const [cr] = await w.q('what does the customer need?', 'alm', `
    select v.value_num, cr.unit from customer_requirements cr
    join customer_requirement_versions v on v.cr_id = cr.cr_id
    join spec_revisions r on r.spec_revision_id = v.spec_revision_id
    where cr.cr_id = $1 and r.effective_to is null`, [ANCHORS.crRackForce]);
  const [claim] = await w.q('what does the datasheet claim?', 'plm',
    `select value, source, qualified from part_capabilities where part_no = $1 and attribute = 'max_rack_force_n'`,
    [ANCHORS.gearbox]);
  const [test] = await w.q('what did a rig demonstrate?', 'plm',
    `select max_value_demonstrated, report_ref from qualification_tests
     where part_no = $1 and attribute = 'max_rack_force_n'`, [ANCHORS.gearbox]);

  const gap = num(cr.value_num) - num(test.max_value_demonstrated);
  line(`    customer needs   ${num(cr.value_num)} ${cr.unit}   (${ANCHORS.crRackForce}, in-force revision)`);
  line(`    datasheet claims ${num(claim.value)} N     by ${claim.source}, qualified=${claim.qualified}`);
  line(`    rig demonstrated ${num(test.max_value_demonstrated)} N     ${test.report_ref}`);
  line();
  line(`  → ${gap} N short ON EVIDENCE. The datasheet says we are there; nothing tested says so.`);
  line('    Reading the capability row alone gives "carryover, no cost" and is wrong.');
  line('    This is a CHANGE, and it has to be priced.');

  heading('A · what did changes like that cost us before?', costSource());
  const gearbox = await derivePrice(w, {
    label: 'gearbox change',
    filter: "change_class = 'modify_hardware', element_kind = 'gearbox', no safety case",
    where: `change_class = 'modify_hardware' and element_kind = 'gearbox' and safety_case_impact = false`,
    params: [], source: SOURCE,
  });
  report(gearbox);

  // ── B · the damping safety case ──────────────────────────────────────────
  heading('B · the damping software — what safety level does it ship at?',
    'docs/steering/corpus/ — SEARCHED, not opened by name');

  const found = await findSafetyClassification();
  if (!found.ok) {
    line(`  ${found.why}`);
    line();
    line('  Step B cannot continue, and the rest of this page is worth less without it.');
    process.exit(1);
  }
  const { shipsAt, classification, limits, sourcePath, rank, foundBy } = found;

  line(`  ${sourcePath}`);
  line(`    found by SEARCHING the corpus — rank ${rank} of the hits, matched on ${foundBy}.`);
  line('    The path is not written anywhere in this program.');
  line();
  for (const l of wrap(classification.replace(/\s+/g, ' '), 70)) line(`    ${l}`);
  line();
  line(`  → ships at ASIL ${shipsAt}. There is NO COLUMN ANYWHERE in the estate that says this.`);
  if (limits) {
    line();
    line('  and, in the same document, the limits on reusing that argument:');
    line();
    for (const l of wrap(limits.replace(/\s+/g, ' '), 70)) line(`    ${l}`);
  }

  heading('B · what does the new programme require?', 'vst_alm');
  const [srv] = await w.q('what ASIL does the new programme allocate?', 'alm', `
    select sr.sr_id, v.asil, v.text_body from system_requirements sr
    join system_requirement_versions v on v.sr_id = sr.sr_id
    where sr.sr_id = $1 and v.effective_to is null`, [ANCHORS.srDampingAsil]);
  line(`    ${srv.sr_id}  ASIL ${srv.asil}`);
  for (const l of wrap(srv.text_body, 70)) line(`    ${l}`);
  line();
  line(`  → ships at ASIL ${shipsAt}, needed at ASIL ${srv.asil}.`);
  line('    The C code very likely survives. The safety ARGUMENT does not: requirements,');
  line('    verification evidence, tool qualification and the case itself are all new work.');
  line();
  line('  THIS IS THE COST ITEM THAT ONLY EXISTS IF SOMEBODY READ THE DOCUMENT.');
  line('  Nothing in four databases would have told us this work was needed.');

  heading('B · what did safety re-classifications cost us before?', costSource());
  const safety = await derivePrice(w, {
    label: 'damping safety case',
    filter: `change_class = 'safety_case_only', asil = '${srv.asil}'`,
    where: `change_class = 'safety_case_only' and asil = $1`,
    params: [srv.asil], source: SOURCE,
  });
  report(safety);

  // ── C · something we have barely done ────────────────────────────────────
  //
  // DELIBERATELY INCLUDED SO THE REFUSAL IS VISIBLE. Two healthy comparable
  // sets in a row teaches the wrong lesson — that a price always comes out.
  // This slice is real work on the K2 job and the estate genuinely has almost
  // no history of it, which is the case the MIN_COMPARABLES rule exists for.
  heading('C · and one where we have almost no history', costSource());
  const thin = await derivePrice(w, {
    label: 'new ASIL D software function',
    filter: "change_class = 'new_function', element_kind = 'software_domain', asil = 'D'",
    where: `change_class = 'new_function' and element_kind = 'software_domain' and asil = 'D'`,
    params: [], source: SOURCE,
  });
  report(thin);

  // ── the answer ───────────────────────────────────────────────────────────
  line();
  rule();
  line('THE ANSWER — three items of the K2 job');
  rule();
  line();
  const items = [gearbox, safety, thin];
  for (const p of items) {
    line(`  ${p.label.padEnd(30)} ` + (p.enough
      ? `${String(round(p.medianHours)).padStart(5)} h   ${eur(p.totalEur).padStart(12)}   (n=${p.n})`
      : `no basis — only ${p.n} comparable(s)`));
  }
  const priced = items.filter((p) => p.enough);
  const unpriced = items.filter((p) => !p.enough);
  line();
  line(`  ${'priced'.padEnd(30)} ${String(round(priced.reduce((a, p) => a + p.medianHours, 0))).padStart(5)} h   ` +
    `${eur(priced.reduce((a, p) => a + p.totalEur, 0)).padStart(12)}`);
  line(`  ${'not priced'.padEnd(30)} ${unpriced.length} item(s) — insufficient history`);
  line();
  line('  THIS IS NOT THE QUOTE. It is three line items out of twenty-four requirements,');
  line('  and it is deliberately not extrapolated: multiplying three items by eight is');
  line('  the kind of arithmetic that produces a confident number from nothing.');
  line();
  line('  WHAT A PERSON STILL HAS TO DECIDE:');
  line(`    · Is ${gap} N of missing evidence a re-TEST or a re-DESIGN? The gearbox may well`);
  line('      already do 8000 N — nobody has tried. A rig week is cheap; a redesign is not,');
  line('      and the price above assumes the expensive reading.');
  line('    · Does the damping safety case have to be rebuilt at all, or can the K2');
  line('      architecture keep damping out of the assist path and inherit the 2021');
  line('      decomposition? Worth more than every other line on this page.');
  line(`    · The ${unpriced.length} unpriced item(s) need a bottom-up estimate from somebody who has`);
  line('      done one. History cannot help and should not be made to look like it can.');
  line();
  rule();
  line('WHAT THIS STEP PROVED');
  rule();
  line();
  line('  The cost question IS answerable from this estate — with three conditions:');
  line();
  line('    1. price from the MEDIAN of a filtered set, never the mean. The gearbox set');
  line(`       shows why: mean ${round(gearbox.meanHours)} h against median ${round(gearbox.medianHours)} h, ` +
    `a ${round(gearbox.meanInflation * 100)}% difference.`);
  line('    2. say n every time. A price without its evidence count cannot be judged.');
  line(`    3. refuse below ${MIN_COMPARABLES} comparables rather than produce a figure — item C above.`);
  line();
  line('  AND the largest item on the page was only findable by READING A DOCUMENT.');
  line('  Any tool built on the databases alone would have quoted this job without it.');
  line();
}

/**
 * Guarded so that importing this file — for a constant, a type, anything — does
 * not run it. `index-cli.ts` was imported for one string and re-embedded the
 * whole corpus; `sql:check` now asserts every entry point here does this.
 */
if (require.main === module) {
  main().catch((e: unknown) => {
    console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  });
}
