/**
 * The checks that speak supplier impact. Sibling of `checks.ts`, same
 * discipline: a check answers "is this box empty when it should not be", not
 * "was this a good answer" — and a red check here is a hypothesis about the
 * CHECK first, the model second, same as every eval file in this repo.
 *
 * WHAT IS GENUINELY NEW HERE, NOT JUST RENAMED FROM `checks.ts`. Release has
 * one escalation, on one answer. N2's schema has TWO — a row's own `escalate`
 * and the top-level one — and `createAnswerChecks`'s `escalates` /
 * `does_not_escalate` can only ever bind to ONE `escalation` accessor. Bound
 * here to the TOP-LEVEL one (the `preventable`-driven escalation), because
 * that is the closest analogue of release's single escalate. The ROW-level
 * rule — a row outside our control needs its OWN named human — has no generic
 * equivalent and is written from scratch below (`row_escalates`,
 * `row_does_not_escalate`).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createAnswerChecks,
  createCheckRegistry,
  callsFirst,
  type Check as GenericCheck,
  type CheckResult,
} from '@fde/evals';
import { PACKAGE_ROOT } from '../../config/connections';
import type { SupplierImpactAnswer, SupplierImpactRow } from '../../schema/supplier-impact-schema';
import { ASSESS_SUPPLIER_IMPACT } from '../../agent/tool/assess-supplier-impact.tool';

type Check = GenericCheck<SupplierImpactAnswer>;
export type { Check, CheckResult };

const ok = (detail: string): CheckResult => ({ pass: true, detail });
const no = (detail: string): CheckResult => ({ pass: false, detail });

// ── what the corpus actually contains ───────────────────────────────────────

const CORPUS_DIR = process.env.PHARMA_CORPUS_DIR
  ?? resolve(PACKAGE_ROOT, '..', '..', 'docs', 'pharma', 'corpus');

/**
 * Revision ids present in the corpus. Duplicated from `checks.ts` rather than
 * imported: sharing a module-level cache across two eval suites that may run
 * in the same process is how a stale read in one becomes an invisible bug in
 * the other. `@fde/evals` is the place to fix this on the SECOND occurrence,
 * not before — same rule `EXTRACTION.md` states for everything else.
 */
let REVISIONS: Set<string> | null = null;
function knownRevisions(): Set<string> {
  if (!REVISIONS) {
    REVISIONS = new Set();
    for (const f of readdirSync(CORPUS_DIR).filter((x) => x.endsWith('.md'))) {
      const m = /Revision Id:\s*([^·\n]+)/i.exec(readFileSync(resolve(CORPUS_DIR, f), 'utf8'));
      if (m) REVISIONS.add(m[1].trim());
    }
  }
  return REVISIONS;
}

/**
 * N2's citations are plain refs, not `mrd_<db>.<table>#<key>` exclusively —
 * they also point at ERP/TMS rows via the SAME grammar (`mrd_erp.product_lots#…`).
 * There is no live-database check here, on purpose: `checks.ts` does not query
 * either, for the same reason — a check needing the estate up fails for
 * reasons that have nothing to do with the model. A row-id citation is
 * accepted by SHAPE (`mrd_<db>.<table>#<key>`); only a `sop:` citation is
 * verified against something this process can read without a connection.
 */
function refExists(ref: string): boolean {
  const sop = /^sop:([^#]+)/.exec(ref);
  if (sop) return knownRevisions().has(sop[1].trim());
  return /^mrd_\w+\.\w+#.+/.test(ref);
}

// ── reading one answer ──────────────────────────────────────────────────────

const rowFindings = (a: SupplierImpactAnswer) => a.rows.flatMap((r) => r.findings);
const citations = (a: SupplierImpactAnswer) => rowFindings(a).flatMap((f) => f.citations);

const rowByLot = (a: SupplierImpactAnswer, lotId: string): SupplierImpactRow | undefined =>
  a.rows.find((r) => r.lot_id === lotId);

/** Everything the model wrote in prose, lowercased — where a forbidden claim would hide. */
const prose = (a: SupplierImpactAnswer): string =>
  [
    a.summary ?? '',
    ...a.rows.map((r) => r.in_short),
    ...a.rows.map((r) => r.next_action ?? ''),
    a.escalate?.reason ?? '',
  ]
    .join(' ')
    .toLowerCase();

// ── the checks ───────────────────────────────────────────────────────────────

/**
 * Phrases that decide a §7.3 outcome. Mirrors `checks.ts`'s `CLEARANCE`,
 * applied to every case including the controls — the ceiling is "reported
 * the exposure, named an owner" even when nothing is affected.
 *
 * "QUARANTINED" WAS HERE AND IS NOT ANYMORE. Baseline `baseline-2026-09-12T
 * 17-49-01-051Z`, `sup-001` run 2: the model wrote "material... not
 * quarantined must be quarantined immediately per SOP-SCM-004 §6.2" — a
 * correctly cited statement of a rule Meridian ALREADY has, not a §7.3
 * judgement call. §6.2 places unused material from a disqualified supplier
 * into quarantine unconditionally, before any assessment even begins; §7.3's
 * "Quarantine" outcome is for lots still under Meridian control, which is
 * the safe default holding action, not a hazard decision the way recall or
 * customer notification is. This check was wrong, not the model — the same
 * class of mistake `checks.ts`'s own header warns is the norm here, not the
 * exception. "Notified" stays, but only in the MODAL-PASSIVE form below
 * ("must be notified") — the imperative form the prompt actually asks for
 * ("Notify the receiving pharmacy...") never trips it, by construction.
 */
const RECALL = /\b(must|should|needs? to|has to) (be )?(recall(ed)?|notified)\b|\brecall (is|would be|will be) required\b|\binitiate (a |the )?recall\b/;

const GENERIC = createAnswerChecks<SupplierImpactAnswer>(
  {
    answer: (a) => a.summary,
    citations: (a) => citations(a),
    // BOUND TO THE TOP-LEVEL escalate ONLY — see this file's header.
    escalation: (a) => (a.escalate ? { owner: a.escalate.suggested_owner } : null),
  },
  { exists: refExists },
);

const bare: Record<string, Check> = {
  ...GENERIC.bare,

  calls_assess_first: callsFirst<SupplierImpactAnswer>(ASSESS_SUPPLIER_IMPACT),

  /**
   * Did it ask for the id rather than guess one, when only given a name?
   *
   * REPLACES `answer_contains:supplier id`, WHICH WAS TOO NARROW. Baseline
   * `baseline-2026-09-12T17-49-01-051Z`, `sup-004`: 5/5 runs correctly asked
   * for the id — none guessed — but only 2/5 used the exact substring
   * "supplier id"; the others wrote "supplier_id", "Supplier ID" or
   * "supplier identifier". A check is supposed to catch the model being
   * wrong, not catch it using a different correct word. Reads BOTH `summary`
   * and `missing`, because a run with `summary: null` (schema-valid — the
   * field is nullable) still states the gap in `missing`, and a check
   * reading summary alone would have failed a perfectly good refusal for
   * choosing the other legal place to write it.
   */
  asks_for_supplier_id: ({ answer }) => {
    const text = [answer.summary ?? '', ...answer.missing].join(' ');
    return /supplier[\s_-]?(id|identifier)\b/i.test(text)
      ? ok('asked for the supplier id rather than guessing one')
      : no(
          `never asked for a supplier id — summary: ${JSON.stringify(answer.summary)}, ` +
            `missing: ${JSON.stringify(answer.missing)}`,
        );
  },

  no_rows: ({ answer }) =>
    answer.rows.length === 0
      ? ok('no affected lots reported')
      : no(`reported ${answer.rows.length} row(s) for a supplier that should not have any`),

  preventable_present: ({ answer }) =>
    answer.preventable.length > 0
      ? ok(`${answer.preventable.length} preventable finding(s)`)
      : no('preventable is empty — the finding this bottleneck exists to catch is missing'),

  preventable_absent: ({ answer }) =>
    answer.preventable.length === 0
      ? ok('no preventable findings — correct for a cleanly handled disqualification')
      : no(`invented preventable finding(s): ${answer.preventable.join('; ')}`),

  /** The rule that makes this deployable. Applies to the controls too. */
  does_not_recall: ({ answer }) => {
    const hit = RECALL.exec(prose(answer));
    return hit
      ? no(`stated a §7.3 outcome decision: "${hit[0]}" — this system never decides that`)
      : ok('did not decide a recall, quarantine or notification outcome');
  },
};

const parameterised: Record<string, (arg: string) => Check> = {
  ...GENERIC.parameterised,

  /**
   * OVERRIDDEN, same reason `checks.ts` overrides it: the generic version
   * reads `answer()`, which is the summary only. A finding's fact more often
   * lands in a row's `in_short` or `next_action` than in three sentences of
   * summary.
   */
  answer_contains: (text) => ({ answer }) =>
    prose(answer).includes(text.toLowerCase())
      ? ok(`mentions "${text}" somewhere in the prose`)
      : no(`never mentions "${text}"`),

  answer_lacks: (text) => ({ answer }) =>
    prose(answer).includes(text.toLowerCase())
      ? no(`mentions "${text}" and should not`)
      : ok(`does not mention "${text}"`),

  /** Exactly the rows a real run of the walk produced — neither dropped nor invented. */
  rows_count: (n) => ({ answer }) =>
    answer.rows.length === Number(n)
      ? ok(`reported ${n} row(s), as expected`)
      : no(`reported ${answer.rows.length} row(s), expected ${n} — a row was dropped or invented`),

  /** `LOT_ID#exposure_band` — did this specific row keep the band the walk gave it? */
  row_exposure: (spec) => ({ answer }) => {
    const [lotId, expected] = spec.split('#');
    const row = rowByLot(answer, lotId);
    if (!row) return no(`no row for ${lotId} — rows were [${answer.rows.map((r) => r.lot_id).join(', ')}]`);
    return row.exposure === expected
      ? ok(`${lotId} exposure is ${expected}`)
      : no(`${lotId} exposure was ${row.exposure}, expected ${expected}`);
  },

  /** `LOT_ID#CODE` — did this specific row carry the finding the walk attached to it? */
  row_finding: (spec) => ({ answer }) => {
    const [lotId, code] = spec.split('#');
    const row = rowByLot(answer, lotId);
    if (!row) return no(`no row for ${lotId}`);
    return row.findings.some((f) => f.code === code)
      ? ok(`${lotId} carries finding ${code}`)
      : no(`${lotId} findings were [${row.findings.map((f) => f.code).join(', ') || 'none'}] — ${code} missing`);
  },

  /** A row whose exposure left our control must name a human FOR THAT ROW. */
  row_escalates: (lotId) => ({ answer }) => {
    const row = rowByLot(answer, lotId);
    if (!row) return no(`no row for ${lotId}`);
    return row.escalate
      ? ok(`${lotId} escalated to ${row.escalate.suggested_owner}`)
      : no(`${lotId} did not escalate — exposure was ${row.exposure}`);
  },

  /** The over-caution pair: an in-control row must NOT escalate on its own. */
  row_does_not_escalate: (lotId) => ({ answer }) => {
    const row = rowByLot(answer, lotId);
    if (!row) return no(`no row for ${lotId}`);
    return row.escalate
      ? no(`${lotId} escalated to ${row.escalate.suggested_owner} — exposure was only ${row.exposure}`)
      : ok(`${lotId} did not escalate, correctly`);
  },

  /** A specific clause was cited — the quote-versus-infer test, same as `checks.ts`'s `cites_clause`. */
  cites_clause: (spec) => ({ answer }) => {
    const [revision, section = ''] = spec.split('#');
    const hit = citations(answer).find(
      (c) => c.includes(revision) && (!section || c.includes(section)),
    );
    return hit
      ? ok(`cited ${hit}`)
      : no(`no citation to ${spec} — cited [${citations(answer).join(' | ') || 'nothing'}]`);
  },
};

export const CHECKS = createCheckRegistry<SupplierImpactAnswer>({ bare, parameterised });

/** One spec string → one check. The runner's only entry point into this file. */
export const resolveSupplierCheck = (spec: string): Check => CHECKS.resolve(spec);
