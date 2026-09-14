/**
 * `mrd_reg` — hop 5. What the rule WAS on the day. Not what it is now.
 *
 * THE ONLY SILO WHOSE QUESTION IS A RANGE, NOT A KEY. The other five answer
 * "give me row X". This one answers "which revision of procedure P governed on
 * date D" — a lookup into `[effective_from, effective_to)`. Every function here
 * therefore takes a date, and `fetchSopRevisionAsOf` is the one the answer turns
 * on.
 *
 * WHY THAT MATTERS MORE THAN IT LOOKS. `SOP-QC-014` Rev 6 carried no personnel
 * training precondition; Rev 7 added §7.3 and took effect 2026-03-01. The same
 * batch, the same lapsed training, decided in 2025 instead of 2026, is a
 * RELEASABLE batch. The answer flips on which revision was in force — so a
 * lookup that returns "the current one" is not a shortcut, it is a different
 * question with a different answer.
 *
 * TWO REVISION IDS, AND THEY ARE NOT THE SAME THING:
 *   `cited`    — what the disposition SAYS it followed, captured at the time
 *   `inForce`  — what actually governed on that date
 * Trap T2 is a work order where those two differ. Collapsing them loses it.
 */
import type { DbHandle } from '../utils/handle';
import { asOfDay } from '../utils/dates';

const DB = 'mrd_reg';

export interface SopRevision {
  revisionId: string;
  sopId: string;
  revision: number;
  effectiveFrom: Date;
  /** `null` means still in force. */
  effectiveTo: Date | null;
  changeSummary: string;
}

export interface ImplementedClause {
  clauseId: string;
  title: string;
}

export async function fetchSopRevision(h: DbHandle, revisionId: string): Promise<SopRevision | undefined> {
  const r = await h.one(DB, 'select * from sop_revisions where revision_id = $1', [revisionId]);
  return r && toRevision(r);
}

/**
 * Which revision of `sopId` governed on `onDate`.
 *
 * `coalesce(effective_to, '9999-12-31')` rather than `is null` so the open-ended
 * current revision and a closed historical one are one range test, not two code
 * paths — the second path being where an off-by-one lives.
 */
export async function fetchSopRevisionAsOf(
  h: DbHandle,
  sopId: string,
  onDate: Date | string,
): Promise<SopRevision | undefined> {
  const r = await h.one(
    DB,
    `select * from sop_revisions
      where sop_id = $1 and $2::date between effective_from and coalesce(effective_to, '9999-12-31')`,
    [sopId, asOfDay(onDate)],
  );
  return r && toRevision(r);
}

/** The regulatory clauses a revision implements — its authority, not its text. */
export async function fetchImplementedClauses(
  h: DbHandle,
  revisionId: string,
): Promise<ImplementedClause[]> {
  const rows = await h.query(
    DB,
    `select c.clause_id, c.title from sop_clause_links l
       join standard_clauses c on c.clause_id = l.clause_id where l.revision_id = $1`,
    [revisionId],
  );
  return rows.map((r) => ({ clauseId: r.clause_id, title: r.title }));
}

/** Everything hop 5 knows about one cited revision on one day. */
export interface RegFacts {
  /** What the act claims to have followed. */
  cited: SopRevision;
  /** What actually governed on `asOf`. Undefined if nothing did — itself a finding. */
  inForce: SopRevision | undefined;
  /** THE FINDING (T2). `false` means the act cited a superseded revision. */
  citedWasInForce: boolean;
  asOf: Date;
  clauses: ImplementedClause[];
}

export async function fetchRegFacts(
  h: DbHandle,
  citedRevisionId: string,
  asOf: Date,
): Promise<RegFacts | undefined> {
  const cited = await fetchSopRevision(h, citedRevisionId);
  if (!cited) return undefined;

  const inForce = await fetchSopRevisionAsOf(h, cited.sopId, asOf);
  return {
    cited,
    inForce,
    citedWasInForce: inForce?.revisionId === cited.revisionId,
    asOf,
    clauses: await fetchImplementedClauses(h, cited.revisionId),
  };
}

function toRevision(r: Record<string, any>): SopRevision {
  return {
    revisionId: r.revision_id,
    sopId: r.sop_id,
    revision: r.revision,
    effectiveFrom: r.effective_from,
    effectiveTo: r.effective_to ?? null,
    changeSummary: r.change_summary,
  };
}
