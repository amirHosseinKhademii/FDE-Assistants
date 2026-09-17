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

    if (!matching) {
      return {
        count,
        filter,
        note:
          `${count.toLocaleString('en-GB')} complaints match the filter. This counts the ` +
          'COMPONENT, not the defect — narrow it with `matching` before calling it a defect count.',
      };
    }

    // A ZERO HERE IS CHECKED, NOT REPORTED. See the header: an over-constrained
    // phrase and a genuinely empty answer are the same number and must not be
    // the same sentence.
    if (count === 0) {
      const { rows: baseRows } = await client.query(
        `select count(*) n from ${TABLE} where ${sql}`,
        params,
      );
      const base = Number(baseRows[0].n);
      if (base > 0) {
        return {
          count: 0,
          filter,
          matching,
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
      note:
        `${count.toLocaleString('en-GB')} complaints match the filter AND describe "${matching}". ` +
        'Run without `matching` for the filter alone; the difference is the complaints ' +
        'that share a component but not a defect.',
    };
  } finally {
    await client.end();
  }
}
