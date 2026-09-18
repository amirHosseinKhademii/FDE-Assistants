/**
 * STAGE 4.4 — `count_complaints`, which returns a number and never a passage.
 *
 * Read `docs/safety/STAGE4.md` §3.4 first; it is the specification this matches.
 *
 * ── WHY COUNTING IS A TOOL AND NOT A READING TASK ─────────────────────────
 *
 * Three of the eight questions in `docs/safety/WALKTHROUGH.md` want a number:
 * REC-001 wants 103 and not 1,060; REC-004 wants 5; REC-007 wants 103 and 957.
 *
 * NO SIX PASSAGES CONTAIN A COUNT. Retrieval returns examples, and a model
 * asked to count from examples produces a number that sounds right — which on
 * this corpus is the most dangerous failure available, because REC-001's whole
 * trap is that a confident wrong number is indistinguishable from a right one.
 *
 * ── AND IT RETURNS THE FILTER WITH THE NUMBER ─────────────────────────────
 *
 * Not decoration. Stage 5's contract has a `counts` field and a coherence rule
 * that a number appearing in the prose must appear in `counts` — which is only
 * checkable if a count carries the question it answered. "1,057" is not a fact;
 * "1,057 F-150 power-train complaints filed after 2020-04-27" is.
 *
 * REC-001 is the reason: 1,057 and 103 are BOTH TRUE. 1,057 matched on
 * component, 103 on defect. A system reporting 1,057 has done the arithmetic
 * correctly and answered a different question.
 */
import { Client } from 'pg';
import { safetyDatabaseUrl } from '../config/connections';
import { TABLE } from '../grounding/search';
import { buildWhere, type ComplaintFilter } from './search-complaints.tool';

export const COUNT_COMPLAINTS = 'count_complaints';

export interface CountResult {
  count: number;
  /**
   * WHAT THIS NUMBER IS, WRITTEN BY THE TOOL AND NOT BY THE MODEL.
   *
   * MEASURED: a run counted `POWER TRAIN:AUTOMATIC TRANSMISSION` filed after
   * the recall — 6, correct — and labelled it "F-150 power-train complaints
   * after the recall". The power-train figure is 351. The number was right, its
   * provenance was right, `from` was right, the filter was recorded, and the
   * SENTENCE A HUMAN READS was wrong by a factor of sixty.
   *
   * Rule 4 cannot catch that: it checks that a number came from a tool, and
   * this one did. `STAGE6.md` §7 listed "have the loop attach this rather than
   * asking the model to restate its own arguments" as an open decision, on the
   * grounds that a model asked to restate its arguments will paraphrase them.
   * This is the evidence, so the decision is made.
   */
  describes: string;
  /** The question this number answers. Required by stage 5's `counts` rule. */
  filter: ComplaintFilter;
  /** The narrowing phrase, when one was applied. */
  matching?: string;
  note: string;
}

/**
 * Count complaints matching a filter, optionally narrowed by a phrase.
 *
 * `matching` is what separates REC-001's two numbers: the filter alone gives
 * every power-train complaint, and the phrase gives the ones describing the
 * recalled defect. Run it twice and the difference is the complaints that share
 * a component but not a defect — itself a finding, not a leftover.
 *
 * ── THE PHRASE IS GOOGLE SYNTAX, AND SPACES MEAN **AND** ──────────────────
 *
 * `websearch_to_tsquery` joins bare terms with `&`, so:
 *
 *   "park prndl rollaway shift cable"   ->  'park' & 'prndl' & 'rollaway' & …
 *                                           0 complaints
 *   "park or prndl or \"shift cable\""    ->  'park' | 'prndl' | 'shift' <-> 'cabl'
 *                                           89 complaints
 *
 * MEASURED, and it is how this tool's own check first failed. Use `or`
 * explicitly. Quotes make a phrase, `-` negates.
 *
 * ── AND A ZERO FROM A NARROWED COUNT IS TREATED AS SUSPECT ────────────────
 *
 * That first failure returned 0 and said nothing was wrong. On this corpus a
 * bare zero reads as "no complaints describe this defect" — a FALSE ALL-CLEAR,
 * which is the most dangerous direction to be wrong in here.
 *
 * So when a phrase narrows a non-empty set to nothing, the result says so and
 * reports what the filter alone matched. An over-constrained query and a
 * genuinely empty answer produce the same number, and they must not produce the
 * same sentence.
 */
/**
 * A count is not a quotation, and a reader wants one of each.
 *
 * MEASURED: REC-004's "cites at least one complaint by ODI number" scored 1 of
 * 3, and the model-routed recall measurement saw the same behaviour from the
 * other side — in two runs of three it reported the number of death complaints
 * and retrieved not one of them to quote. An answer that says "5" and shows
 * nothing is weaker than the corpus allows it to be.
 */
const quotable = (n: number) =>
  n > 0
    ? ' To QUOTE any of these, call search_complaints with the same filter — a number on its own ' +
      'gives the reader nothing to check.'
    : '';

export async function countComplaints(
  filter: ComplaintFilter,
  matching?: string,
  connectionString: string = safetyDatabaseUrl(),
): Promise<CountResult> {
  const { sql, params } = buildWhere(filter);
  const all = [...params];
  let where = sql;

  if (matching) {
    all.push(matching);
    where += `\n          and content_ts @@ websearch_to_tsquery('english', $${all.length})`;
  }

  const client = new Client({ connectionString, keepAlive: true, connectionTimeoutMillis: 30_000 });
  await client.connect();
  try {
    // COUNT(*) IS CORRECT HERE ONLY BECAUSE `buildWhere` USES `exists` FOR THE
    // COMPONENT PREDICATE RATHER THAN UNNESTING IN THE FROM CLAUSE.
    //
    // Unnesting would multiply rows — 21,747 of 70,194 complaints name more
    // than one component — and this engagement has met that trap five times:
    // 1,407 recalls that were 107 campaigns, 12 death complaints that were 5,
    // 675 Odyssey complaints that were 400, three rows for one campaign, and
    // 675 again on the first attempt at the component filter. It is the tool
    // whose entire output is a number, so it does not get to be the sixth.
    const { rows } = await client.query(`select count(*) n from ${TABLE} where ${where}`, all);
    const count = Number(rows[0].n);

    // WHAT WAS THIS COUNTED ACROSS? A real run called this with a component and
    // no make or model, counting that component over all 70,194 complaints —
    // and then never used the number. An unscoped count is a legitimate
    // question ("how many complaints mention fire at all") and an easy mistake,
    // and the two produce the same shape of result. So the result says which
    // one it is rather than leaving the caller to notice.
    const scope =
      filter.make || filter.model
        ? ''
        : ' NOTE: no make or model was given, so this counts ACROSS EVERY VEHICLE in the corpus. ' +
          'If you meant one vehicle, pass make and model and ask again.';

    // Built from the filter, so it cannot drift from what was counted.
    const parts = [
      filter.year ? String(filter.year) : null,
      filter.make ?? null,
      filter.model ?? null,
      filter.component ? `component ${filter.component}` : null,
      filter.min_deaths ? `at least ${filter.min_deaths} death(s)` : null,
      filter.min_injuries ? `at least ${filter.min_injuries} injuries` : null,
      filter.crash === true ? 'crash reported' : null,
      filter.fire === true ? 'fire reported' : null,
      filter.filed_after ? `filed on or after ${filter.filed_after}` : null,
      filter.filed_before ? `filed on or before ${filter.filed_before}` : null,
      matching ? `describing "${matching}"` : null,
    ].filter(Boolean);
    const describes = parts.length
      ? `complaints: ${parts.join(', ')}`
      : 'complaints: every complaint in the corpus';

    // ── THE FACT, PUT WHERE IT IS READ ────────────────────────────────────
    //
    // MEASURED: REC-001's key requires an escalation, because "is the fix
    // holding" cannot be answered from a corpus that records no repair
    // completions. Across seven runs — four in stage 6, three in the first
    // baseline — the model escalated ZERO times, while the prompt said almost
    // verbatim that completion is not recorded here.
    //
    // STAGE7.md §7 set the rule before the number existed: fails 3 of 3 means
    // change the MECHANISM, not the wording. A prompt is read once at the
    // start; a tool result is read at the moment the number is being used, and
    // this is the moment the inference gets made.
    //
    // It is the same move that worked three times today — `find_recalls`
    // returning what IS recalled when it finds nothing, and the tools writing
    // their own captions after a model mislabelled one. PUT THE FACT WHERE THE
    // MODEL READS IT.
    //
    // ONLY WHEN `filed_after` IS SET, because "how many since X" is the shape
    // that invites "so did the fix work". REC-008 also filters on a date and
    // does not need to escalate — the note is harmless there, since its answer
    // makes no claim about a remedy.
    //
    // AND THIS IS A NUDGE, NOT A GUARANTEE. Nothing here can force an
    // escalation, and a contract rule cannot tell REC-001's question from
    // REC-008's. Whether it works is the next baseline's to say.
    // ── THE AMBIGUOUS SHAPE, NAMED WHEN IT APPEARS ───────────────────────
    //
    // A component filter, a date, and no `matching` is exactly the question
    // REC-007 asks: "how many complaints about the 2020 F-150 transmission were
    // filed after the recall". It has TWO true answers — every complaint
    // against the component, and the subset describing the recalled defect —
    // and the key requires refusing the premise and giving both.
    //
    // MEASURED: 2 successes in 9 runs across three baselines. The generic note
    // below already said "this counts the COMPONENT, not the defect", and that
    // was not enough. Advice about a distinction is easy to read past; a
    // SPECIFIC NEXT CALL is not, which is what worked for the AND-versus-OR
    // zero and for the empty find_recalls.
    //
    // It cannot supply the defect terms itself — it does not know which defect
    // is meant. It can say where they come from.
    const twoAnswers =
      filter.component && filter.filed_after && !matching
        ? ' THIS QUESTION HAS TWO TRUE ANSWERS AND THIS IS THE BROADER ONE. It counts every ' +
          `complaint against ${filter.component}, including faults the recall never claimed to ` +
          'fix. For the narrower one, call again with `matching` set to words from the recall\u2019s ' +
          'own defect description. REPORT BOTH NUMBERS and say what separates them — reporting ' +
          'only this one answers a different question than the one asked.'
        : '';

    const afterRecall = filter.filed_after
      ? ' NOTE: this corpus records complaints and campaigns, NOT repair completions. ' +
        'A complaint filed after a recall does not establish that the vehicle had the remedy ' +
        'applied, so this count cannot show whether a fix is working. If the question asks ' +
        'whether a fix is holding, say what was filed and ESCALATE the effectiveness question.'
      : '';

    if (!matching) {
      // ONE INSTRUCTION, NOT FOUR.
      //
      // This concatenated every applicable note — scope, the two-answers
      // warning, the completions caveat, and an invitation to quote. MEASURED
      // consequence: a model asked the SAME count nine times in a row, each
      // identical, each served from cache but each costing a model round trip.
      // It is the picker-subtitle mistake in a worse place: a tool result is
      // read at the moment of deciding what to do next, and four instructions
      // there is not guidance, it is a stall.
      //
      // So the most specific applicable note wins, and at most two are sent.
      const notes = [twoAnswers, scope, afterRecall, quotable(count)].filter(Boolean);
      return {
        count,
        filter,
        describes,
        note:
          `${count.toLocaleString('en-GB')} complaints match the filter — the COMPONENT, not the ` +
          'defect.' + notes.slice(0, 2).join(''),
      };
    }

    // THE UNNARROWED COUNT IS ALWAYS FETCHED WHEN `matching` IS SET, because
    // two different failures both hide in the comparison and neither is visible
    // from the narrowed number alone.
    const { rows: baseRows } = await client.query(
      `select count(*) n from ${TABLE} where ${sql}`,
      params,
    );
    const base = Number(baseRows[0].n);

    // FAILURE TWO: A PHRASE THAT NARROWS NOTHING.
    //
    // MEASURED. Asked how many 2020 F-150 transmission complaints were filed
    // after the recall, a run counted component POWER TRAIN:AUTOMATIC
    // TRANSMISSION and then "narrowed" it with
    //
    //   "shift or linkage or cable or prndl or gear or park or transmission"
    //
    // inside a component that IS the transmission. Both counts came back 6, and
    // the answer reported "6 complaints, all of which matched the
    // defect-related terms" — which reads as an analysis and was a tautology.
    //
    // REC-001's whole trap is a component count wearing a defect's clothes.
    // This is that trap rebuilt by a model that did call the second tool.
    if (count > 0 && count === base) {
      return {
        count,
        filter,
        matching,
        describes,
        note:
          `${count.toLocaleString('en-GB')} complaints — BUT "${matching}" NARROWED NOTHING. ` +
          `The same ${count.toLocaleString('en-GB')} match the filter without it, so this is a ` +
          'COMPONENT count and not a defect count, whatever the phrase says. A term like ' +
          '"transmission" inside a transmission component matches everything. Narrow it to the ' +
          'SYMPTOM the recall describes, or report this as the component figure and say so.',
      };
    }

    // A ZERO HERE IS CHECKED, NOT REPORTED. See the header: an over-constrained
    // phrase and a genuinely empty answer are the same number and must not be
    // the same sentence.
    if (count === 0) {
      if (base > 0) {
        return {
          count: 0,
          filter,
          matching,
          describes,
          note:
            `NO complaints matched "${matching}", but ${base.toLocaleString('en-GB')} match the ` +
            'filter alone. Spaces in a phrase mean AND, so several terms together may be ' +
            'impossible to satisfy at once — join them with `or`. DO NOT report this zero as ' +
            'evidence that no complaint describes the defect.',
        };
      }
    }

    return {
      count,
      filter,
      matching,
      describes,
      note:
        `${count.toLocaleString('en-GB')} complaints match the filter AND describe "${matching}". ` +
        'Run without `matching` for the filter alone; the difference is the complaints ' +
        'that share a component but not a defect.',
    };
  } finally {
    await client.end();
  }
}
