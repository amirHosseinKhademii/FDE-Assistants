/**
 * Did the extraction read the documents correctly — and, more usefully, would
 * we have known without an answer key?
 *
 * ── THE TWO MEASUREMENTS, AND WHY THE SECOND IS THE PRODUCT ───────────────
 *
 * The easy one is accuracy against `vst_pmo`. It is also the one that cannot
 * ship: no customer has a table of right answers, and if they did they would
 * not be paying for this.
 *
 * So the report leads with the signals that need no ground truth —
 *
 *     coverage        how much was answered at all
 *     refusal rate    how often it declined
 *     rejection rate  how often the quoted sentence was not in the file
 *     concentration   WHERE the refusals landed
 *
 * — and only then uses the key to check whether those signals told the truth.
 * If they did, we have something a customer can use. If accuracy is high and
 * the signals said nothing, we have a number that works here and nowhere else.
 *
 * ── WHY "CONCENTRATION" IS THE INTERESTING ONE ────────────────────────────
 *
 * A refusal rate on its own is close to meaningless — 30% could be a careful
 * model or a lazy one. What separates them is WHERE the refusals fall. In this
 * corpus, `reuse_class` is stated in none of the 220 reports and `asil` in
 * about 20. So a good extraction refuses almost exclusively on those two, and a
 * bad one refuses scattered across `change_class` and `element_kind`, which
 * every report states plainly.
 *
 * That shape is visible WITHOUT the key: it is a property of which fields the
 * documents answer, and any customer can be asked "should this field have been
 * there?" for a handful of cases. It is the transferable measurement in here.
 */
import type { Result } from '../../db/init/assertions';
import { FIELDS, findEvidence } from '../extract/classification';

export interface FactsInput {
  facts: { subject: string; file_id: string; field: string; value: string | null; evidence: string | null; evidence_line: number | null }[];
  rejected: { file_id: string; field: string; value: string | null; reason: string }[];
  /** Corpus text, for deciding whether a field was there to be found. */
  text: Map<string, string>;
  /** ANSWER KEY. */
  key: Record<string, Record<string, string>>;
}

/**
 * Is this field actually stated in this document?
 *
 * Deliberately hand-written per field against the phrasings the reports use,
 * NOT derived from the generator. Deriving it would make the whole measurement
 * circular — it would be asking the thing that wrote the documents whether the
 * documents say what it wrote.
 */
export function statedIn(field: string, text: string): boolean {
  // ── FLATTEN FIRST, AND THIS WAS A BUG BEFORE IT WAS A LINE OF CODE ──────
  //
  // The reports are hard-wrapped at 68 columns, so the sentence in the file is
  // `4 interface(s)\n   were affected.` The first version of this function
  // matched against the raw text, found nothing, and therefore declared that
  // the document never stated the field — which turned SEVEN CORRECT ANSWERS
  // into "values invented for a field the documents never state".
  //
  // The model was right and the grader was wrong, which is the third time in
  // this repo's history that a red check has been the bug rather than the
  // finding. `findEvidence` had already solved exactly this, one directory
  // over, and the fix was not carried across.
  const flat = text.replace(/\s+/g, ' ');
  switch (field) {
    // QM IS AN ASIL LEVEL. `[A-D]` alone read `Because the change touched the
    // ASIL QM path` as "no ASIL stated", and then reported the model's correct
    // answer as a value invented out of nothing. Second grader bug in the same
    // function; both were the grader knowing the corpus less well than the
    // thing it was grading.
    case 'asil': return /ASIL\s+(QM|[A-D])\b/.test(flat);
    case 'tooling_required': return /[Tt]ooling was modified/.test(flat);
    case 'interfaces_touched': return /interface\(s\) were affected/.test(flat);
    // Kept after the field itself was dropped from `FIELDS` on 2026-09-13, so
    // that a grade computed over an older extraction still reads correctly
    // rather than silently scoring 83 fabrications as legitimate refusals.
    case 'reuse_class': return false;
    // Every report opens with a sentence naming the work and the element, and
    // closes the paragraph with the safety-case position.
    default: return true;
  }
}

export function gradeFacts(input: FactsInput): { r: Result; table: string[] } {
  const r: Result = { ok: [], fail: [] };
  const { facts, rejected, text, key } = input;
  const subjects = [...new Set(facts.map((f) => f.subject))];
  const total = subjects.length * FIELDS.length;

  const answered = facts.filter((f) => f.value !== null);
  const refused = facts.filter((f) => f.value === null);

  // ── the signals that need no answer key ─────────────────────────────────

  const coverage = (answered.length / total) * 100;
  const refusalRate = (refused.length / total) * 100;
  const rejectionRate = (rejected.length / total) * 100;

  r.ok.push({
    label: 'signals available WITHOUT ground truth',
    detail: `${subjects.length} documents × ${FIELDS.length} fields = ${total} · ` +
      `${coverage.toFixed(0)}% answered · ${refusalRate.toFixed(0)}% refused · ` +
      `${rejectionRate.toFixed(0)}% rejected for evidence not found in the file`,
  });

  // ── CONCENTRATION: of everything refused, how much SHOULD have been? ────
  //
  // The first version asked a narrower question — "is this refusal on
  // `reuse_class` or `asil`?" — and scored 58% against a threshold of 60%,
  // which read as a failure. It was not. The eleven refusals it counted against
  // the model were nine on `tooling_required` and one each on two other fields
  // whose documents genuinely say nothing, which is EXACTLY the behaviour the
  // prompt asks for. The check was penalising the instruction it was written to
  // verify.
  //
  // Hardcoding two field names was the mistake. The real question is whether a
  // refusal landed on a field the document does not state, whatever field that
  // is — which is what `statedIn` already answers.
  //
  // AND IT STILL NEEDS NO ANSWER KEY. `statedIn` is a per-field statement of
  // "what would a mention of this look like", written by reading a handful of
  // documents. Any customer can produce that in an afternoon. A table of right
  // answers, they cannot produce at all.
  const misplaced = refused.filter((f) => statedIn(f.field, text.get(f.file_id) ?? ''));
  const concentration = refused.length ? ((refused.length - misplaced.length) / refused.length) * 100 : 100;
  (concentration >= 90 ? r.ok : r.fail).push({
    label: 'refusals land on fields the document does not state',
    detail: `${concentration.toFixed(0)}% of ${refused.length} refusals are on fields their document ` +
      `genuinely does not carry` +
      (misplaced.length
        ? ` · ${misplaced.length} declined work the document answers: ${misplaced.slice(0, 3).map((m) => `${m.subject}/${m.field}`).join(', ')}`
        : ' · none declined work the document answers'),
  });

  // ── THE EVIDENCE CHECK, RE-RUN FROM THE DATABASE ────────────────────────
  //
  // Two assertions, and separating them was the fix. One statement used to do
  // both jobs and could therefore never be true:
  //
  //   "no fact rests on a sentence that is not in the document"
  //
  // That is a claim about STORED facts, and it was being tested by counting
  // REJECTED ones — rows the pipeline had already thrown away precisely so the
  // claim would hold. The check was red because the safety mechanism had
  // worked, which is the wrong direction for a light to point.
  //
  // So: the first assertion re-verifies every stored fact against the file, on
  // the way OUT of the database rather than on the way in, so a bug in the
  // ingest cannot satisfy it by construction. It must be exactly zero.
  const unbacked = facts.filter(
    (f) => f.value !== null && (!f.evidence || findEvidence(text.get(f.file_id) ?? '', f.evidence) === null),
  );
  (unbacked.length === 0 ? r.ok : r.fail).push({
    label: 'every stored fact still points at a sentence in its file',
    detail: unbacked.length === 0
      ? `all ${facts.filter((f) => f.value !== null).length} answered facts re-verified against the corpus, ` +
        `reading from the database rather than trusting the writer`
      : `${unbacked.length} stored without a locatable sentence — e.g. ${unbacked[0].subject}/${unbacked[0].field}`,
  });

  // The second is a RATE, not a zero, and the difference is the point of having
  // measured it. Across 1,320 fields the rejections have never once been an
  // invented claim. They have been an em dash arriving as control bytes, and —
  // twice — the model looping: `integration only \n\n integration only \n\n
  // integration only` where the file says `integration only — Lumen.` Both are
  // output defects, both are correctly thrown away, and demanding zero of them
  // would mean tuning the matcher until it accepted a quote that repeats itself.
  //
  // A ceiling rather than a target: if this climbs, something has changed about
  // the model or the documents and is worth looking at BEFORE it becomes a
  // fabrication rate.
  const rejectRate = (rejected.length / Math.max(1, total)) * 100;
  (rejectRate <= 1 ? r.ok : r.fail).push({
    label: 'quotes that could not be located stay rare, and are discarded not stored',
    detail: `${rejected.length} of ${total} fields (${rejectRate.toFixed(1)}%, ceiling 1%) — ` +
      (rejected.length
        ? `kept in rejected_facts, e.g. ${rejected[0].file_id.split('/').pop()} / ${rejected[0].field}`
        : 'none'),
  });

  // ── now, and only now, the answer key ───────────────────────────────────

  const outcome = { correct: 0, wrong: 0, refusedRightly: 0, missed: 0 };
  const wrongList: string[] = [];
  const fabricated: string[] = [];

  for (const f of facts) {
    const want = key[f.subject]?.[f.field];
    const src = text.get(f.file_id) ?? '';
    const there = statedIn(f.field, src);

    if (f.value === null) {
      if (there) { outcome.missed++; wrongList.push(`${f.subject}/${f.field}: refused, but the document says it`); }
      else outcome.refusedRightly++;
      continue;
    }
    if (!there) { fabricated.push(`${f.subject}/${f.field} = ${f.value}`); }
    if (want !== undefined && String(want) === String(f.value)) outcome.correct++;
    else { outcome.wrong++; wrongList.push(`${f.subject}/${f.field}: read ${f.value}, key says ${want}`); }
  }

  const graded = outcome.correct + outcome.wrong;
  const accuracy = graded ? (outcome.correct / graded) * 100 : 0;
  r.ok.push({
    label: 'accuracy against the answer key — the number that cannot ship',
    detail: `${outcome.correct}/${graded} answered fields correct (${accuracy.toFixed(0)}%) · ` +
      `${outcome.refusedRightly} correctly refused · ${outcome.missed} refused although the document said it`,
  });

  // A value for a field no document in this corpus states. Distinct from being
  // WRONG: the model did not misread a sentence, it produced one from nowhere,
  // and it is the failure a customer would never catch.
  (fabricated.length === 0 ? r.ok : r.fail).push({
    label: 'no value invented for a field the documents never state',
    detail: fabricated.length === 0
      ? 'reuse_class and the unstated fields came back null, as they must'
      : `${fabricated.length} invented — ${fabricated.slice(0, 3).join(' · ')}`,
  });

  const table = [
    ...wrongList.slice(0, 12).map((w) => `      ${w}`),
  ];
  return { r, table };
}
