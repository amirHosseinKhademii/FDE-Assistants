/**
 * `mrd_qms` — hop 3. What the laboratory found, and what was decided.
 *
 * THE SILO THAT MAKES THE NAIVE ANSWER WRONG. Read alone, this hop says five of
 * five tests passed and the batch was released — which is true, and which is why
 * an assistant that stops here answers "yes, ship it" with total confidence and
 * a real citation. Everything that contradicts it lives in hops 4 and 5.
 *
 * LIMITS ARE PER SPECIFICATION VERSION, AND A VERSION IS PER MARKET. The EU and
 * US authorisations for the same product are granted against different
 * specification versions with different limits — which is trap T6, and the
 * reason `specVersionRef` is an argument here rather than something this module
 * looks up for itself. The caller decides which market's question is being
 * asked; this module does not guess.
 */
import type { DbHandle } from '../utils/handle';

const DB = 'mrd_qms';

export interface SpecLimit {
  attribute: string;
  lowerLimit: string | null;
  upperLimit: string | null;
  unit: string;
}

export interface QcTest {
  testId: string;
  attribute: string;
  stage: string;
  testedOn: Date;
  analystRef: string;
  resultNum: string;
  unit: string;
  inSpec: boolean;
  /** Set when this test repeats an earlier one — the shape trap T7 hides in. */
  retestOfTestId: string | null;
}

export interface OosInvestigation {
  oosId: string;
  openedOn: Date;
  outcome: string | null;
}

export interface Disposition {
  dispositionId: string;
  market: string;
  decision: string;
  decidedOn: Date;
  /** Soft key → `mrd_hcm.employees`. The person hop 4 is about. */
  decidedByRef: string;
  /** Soft key → `mrd_reg.sop_revisions` — the EXACT revision captured at decision time. */
  governingSopRef: string;
  qpCertified: boolean;
}

/** A test, the limit it was judged against, and whether the follow-up it required happened. */
export interface CheckedTest extends QcTest {
  limit: SpecLimit | undefined;
  /**
   * THE FINDING (T7). An out-of-specification result requires an investigation
   * under 21 CFR 211.192; a failing test with none is a missing investigation,
   * not a failing test. A passing test is never a finding here, which is why
   * this is `false` rather than `null` for them.
   */
  missingOosInvestigation: boolean;
  oos: OosInvestigation | undefined;
  /**
   * A LATER TEST REPEATS THIS ONE. Under 21 CFR 211.192 an out-of-specification
   * result that was investigated, attributed to laboratory error and repeated
   * to a pass is a CLOSED finding, not a failing batch. Without this flag a
   * correctly-handled OOS reads exactly like an unhandled one, and the strict
   * answer blocks a lot that should ship — which is the same class of mistake as
   * flagging a supplier disqualified before the run.
   */
  supersededByRetest: boolean;
}

export async function fetchQcTests(h: DbHandle, lotId: string): Promise<QcTest[]> {
  const rows = await h.query(DB, 'select * from qc_tests where lot_ref = $1 order by attribute', [lotId]);
  return rows.map((r) => ({
    testId: r.test_id,
    attribute: r.attribute,
    stage: r.stage,
    testedOn: r.tested_on,
    analystRef: r.analyst_ref,
    resultNum: r.result_num,
    unit: r.unit,
    inSpec: r.in_spec,
    retestOfTestId: r.retest_of_test_id ?? null,
  }));
}

export async function fetchSpecLimits(h: DbHandle, specVersionId: string): Promise<SpecLimit[]> {
  const rows = await h.query(DB, 'select * from spec_limits where spec_version_id = $1', [specVersionId]);
  return rows.map((r) => ({
    attribute: r.attribute,
    lowerLimit: r.lower_limit ?? null,
    upperLimit: r.upper_limit ?? null,
    unit: r.unit,
  }));
}

export async function fetchOosInvestigations(h: DbHandle, testId: string): Promise<OosInvestigation[]> {
  const rows = await h.query(DB, 'select * from oos_investigations where test_id = $1', [testId]);
  return rows.map((r) => ({ oosId: r.oos_id, openedOn: r.opened_on, outcome: r.outcome ?? null }));
}

/**
 * Every release decision taken on this lot.
 *
 * A LIST, NOT A ROW, BECAUSE `unique (lot_ref, market)` ALLOWS ONE PER MARKET.
 * The same tablets can be released to the US and certified for the EU as two
 * separate acts under two sets of rules. Callers that already know the
 * destination should use `fetchDispositionFor`.
 */
export async function fetchDispositions(h: DbHandle, lotId: string): Promise<Disposition[]> {
  const rows = await h.query(DB, 'select * from batch_dispositions where lot_ref = $1', [lotId]);
  return rows.map((r) => ({
    dispositionId: r.disposition_id,
    market: r.market,
    decision: r.decision,
    decidedOn: r.decided_on,
    decidedByRef: r.decided_by_ref,
    governingSopRef: r.governing_sop_ref,
    qpCertified: r.qp_certified,
  }));
}

/** The decision for one destination. The exact lookup the release question wants. */
export async function fetchDispositionFor(
  h: DbHandle,
  lotId: string,
  market: string,
): Promise<Disposition | undefined> {
  return (await fetchDispositions(h, lotId)).find((x) => x.market === market);
}

/** Everything hop 3 knows, in one call. */
export interface QmsFacts {
  specVersionRef: string;
  tests: CheckedTest[];
  dispositions: Disposition[];
}

export async function fetchQmsFacts(
  h: DbHandle,
  lotId: string,
  specVersionRef: string,
): Promise<QmsFacts> {
  const tests = await fetchQcTests(h, lotId);
  const limits = await fetchSpecLimits(h, specVersionRef);
  const dispositions = await fetchDispositions(h, lotId);

  const checked: CheckedTest[] = [];
  for (const test of tests) {
    const oos = test.inSpec ? [] : await fetchOosInvestigations(h, test.testId);
    checked.push({
      ...test,
      limit: limits.find((l) => l.attribute === test.attribute),
      oos: oos[0],
      missingOosInvestigation: !test.inSpec && oos.length === 0,
      supersededByRetest: tests.some((t) => t.retestOfTestId === test.testId),
    });
  }

  return { specVersionRef, tests: checked, dispositions };
}
