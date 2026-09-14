/**
 * THE DERIVATIONS. One copy, used by both the walks and the check.
 *
 * ── WHY THIS MODULE EXISTS ────────────────────────────────────────────────
 *
 * `walk-angle` and `walk-cost` print an answer. `walk-check` asserts that the
 * answer is still the expected one. If those were two implementations of the
 * same reasoning they would drift, and the one that drifts is always the one
 * nobody runs — which here is the check, because it only speaks up when it
 * fails.
 *
 * So the reasoning lives here once. The walks are printers. The check is an
 * assertion over the same returned values. Exactly the arrangement
 * `db/init/assertions.ts` already uses for the estate.
 *
 * ── EVERY DERIVATION CARRIES ITS OWN TRACE ────────────────────────────────
 *
 * A `Walk` records each query it runs: what it was asking, which database, the
 * SQL, and what came back. The printers render that trace; the check ignores it.
 *
 * That is not just a convenience for formatting. The whole point of this tool
 * is that a person has to be able to DISAGREE with the answer, and you cannot
 * disagree with a number — only with the route that produced it. When an
 * assistant is built on top of this, the same trace is what it will have to
 * show for its working.
 *
 * NO MODEL IS CALLED ANYWHERE IN THIS FILE.
 */
import { Client } from 'pg';
import { DERIVED_DB, derivedUrl, urlFor } from '../config/connections';

export interface TraceStep {
  what: string;
  where: string;
  sql: string;
  rows: any[];
}

/** Accumulates the queries a derivation ran, in order. */
export class Walk {
  readonly steps: TraceStep[] = [];

  /**
   * `db` may be given short (`alm`) or full (`vst_alm`).
   *
   * IT ACCEPTS BOTH BECAUSE IT ONCE ACCEPTED NEITHER RELIABLY. The first
   * version passed the caller's string straight to `urlFor` while formatting a
   * prefixed version for display, so every call site read correctly and every
   * connection failed with `database "alm" does not exist`. Normalise once,
   * here, rather than asking eleven call sites to remember.
   */
  async q(what: string, db: string, sql: string, params: unknown[] = []): Promise<any[]> {
    const full = db.startsWith('vst_') ? db : `vst_${db}`;
    // `vst_derived` is ours and is reached through `derivedUrl`, not `urlFor` — it is not
    // a member of SYSTEMS and `urlFor` would happily build a URL for it anyway,
    // which is exactly the kind of accidental reach the separation exists to
    // prevent. One branch, stated, rather than a name that resolves by luck.
    const client = new Client({ connectionString: full === DERIVED_DB ? derivedUrl() : urlFor(full) });
    await client.connect();
    const { rows } = await client.query(sql, params);
    await client.end();
    this.steps.push({ what, where: full, sql, rows });
    return rows;
  }

  /** Record a step that was not a query — a file read, or a decision made in code. */
  note(what: string, where: string, detail: string, rows: any[] = []): void {
    this.steps.push({ what, where, sql: detail, rows });
  }
}

// ── shared numeric helpers ─────────────────────────────────────────────────
//
// `Number()` on everything, always: pg returns `numeric` columns as STRINGS,
// and `'710' > 100` is false. See the `Numeric` type in db/schema/rows.ts.

export const num = (v: unknown): number => Number(v);
export const round = (x: number, dp = 0): number => Number(x.toFixed(dp));

export function median(xs: number[]): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export const mean = (xs: number[]): number =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;

/** pg returns `date` as a JS Date; the generator wrote a string. Normalise. */
export const day = (v: unknown): string =>
  v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? '').slice(0, 10);

// ═══════════════════════════════════════════════════════════════════════════
// A · "DO WE ALREADY HAVE SOMETHING THAT DOES THIS?"
// ═══════════════════════════════════════════════════════════════════════════

export interface Candidate {
  part_no: string;
  demonstrated: number;
  lifecycle: string;
  test: any;
  ships: any[];
  comparablePrograms: any[];
  /** null = survives every condition. */
  reject: string | null;
}

export interface CapabilityAnswer {
  inForceRevision: string;
  supersededRevisions: string[];
  requirement: { cr_id: string; section: string; title: string; attribute: string; unit: string; operator: string; value: number; condition: string };
  changedBetweenRevisions: boolean;
  claims: any[];
  proven: any[];
  candidates: Candidate[];
  kept: Candidate[];
  best: Candidate | null;
  margin: number | null;
  /** Candidates that beat the winner but cannot be ordered — a meeting item. */
  betterButUnbuyable: Candidate[];
  architecture: string;
}

/**
 * THE FOUR CONDITIONS, and the reason there are four rather than one.
 *
 * The first version of this took the highest demonstrated value and stopped.
 * It answered VS-RACK-2001-D: best number, genuine rig test behind it, and
 * `lifecycle = 'obsolete'` — a part that cannot be ordered. That is trap T6,
 * and this code walked into it on its first run.
 *
 * "Best number wins" is the rule everyone writes first. These four are what it
 * should have been, and they are listed rather than folded into a sort because
 * a person reviewing the shortlist has to be able to disagree with a specific
 * exclusion.
 */
export const CONDITIONS = [
  'test evidence at or above the requirement',
  "lifecycle = 'production' — it can actually be ordered",
  'it has actually shipped on something',
  'on at least one programme of the same steering architecture',
] as const;

export async function deriveCapability(
  w: Walk,
  opts: { specId: string; crId: string; programId: string },
): Promise<CapabilityAnswer> {
  // 1. Which revision governs. FIRST, not last: answering against a superseded
  // revision produces a confident answer to a question the customer withdrew.
  const revs = await w.q('which revision of the customer spec is in force?', 'alm', `
    select spec_revision_id, revision, effective_from, effective_to
    from spec_revisions where spec_id = $1 order by effective_from`, [opts.specId]);
  const inForce = revs.find((r) => r.effective_to === null);
  if (!inForce) throw new Error(`no in-force revision for ${opts.specId}`);

  // 2. What it asks for.
  const [cr] = await w.q('what does that requirement ask for, exactly?', 'alm', `
    select cr.cr_id, cr.section, cr.title, cr.attribute, cr.unit,
           v.operator, v.value_num, v.condition, v.verification_method, v.priority
    from customer_requirements cr
    join customer_requirement_versions v on v.cr_id = cr.cr_id
    where cr.cr_id = $1 and v.spec_revision_id = $2`, [opts.crId, inForce.spec_revision_id]);

  // 3. Did it move between revisions? A fact to establish, not assume.
  const vers = await w.q('did this requirement change between revisions?', 'alm', `
    select spec_revision_id, value_num from customer_requirement_versions
    where cr_id = $1 order by spec_revision_id`, [opts.crId]);
  const changed = new Set(vers.map((v) => num(v.value_num))).size > 1;

  // 4. Cross the boundary. No join is possible: the requirement is in vst_alm
  // and the parts are in vst_plm. The attribute name is all they share, and it
  // is shared by convention rather than by constraint.
  const claims = await w.q('which parts CLAIM at least that?', 'plm', `
    select c.part_no, c.value, c.unit, c.source, c.qualified, p.kind, p.lifecycle, p.line_id
    from part_capabilities c join parts p on p.part_no = c.part_no
    where c.attribute = $1 and c.value >= $2 order by c.value desc`,
    [cr.attribute, num(cr.value_num)]);

  // 5. A claim is not evidence. `source = 'analysis', qualified = false` is an
  // engineering opinion, and stopping here is how the gearbox gets reported as
  // a clean carryover when it is 400 N short.
  const tests = claims.length ? await w.q('which of those has a TEST behind the claim?', 'plm', `
    select part_no, test_id, standard, condition, max_value_demonstrated, result, tested_on, report_ref
    from qualification_tests where attribute = $1 and part_no = any($2)
    order by max_value_demonstrated desc`, [cr.attribute, claims.map((c) => c.part_no)]) : [];
  const proven = tests.filter((t) => num(t.max_value_demonstrated) >= num(cr.value_num) && t.result === 'pass');

  // 6. Does it ship? A part that passed a rig and never shipped is a prototype,
  // and calling it a carryover is how a plan acquires a risk nobody priced.
  const usage = proven.length ? await w.q('do those parts actually ship?', 'plm', `
    select part_no, program_ref, from_sop, volume_per_year
    from part_program_usage where part_no = any($1) order by from_sop`,
    [proven.map((t) => t.part_no)]) : [];

  // 7. On a comparable vehicle? A column-assist result cannot answer a
  // rack-assist question however good the number looks.
  const [k2] = await w.q('what kind of steering system is the new programme?', 'crm',
    'select model, eps_architecture, force_class_n from programs where program_id = $1', [opts.programId]);
  const progs = usage.length ? await w.q('are those the same kind of steering system?', 'crm',
    'select program_id, model, eps_architecture, force_class_n, status from programs where program_id = any($1)',
    [usage.map((u) => u.program_ref)]) : [];

  // 8. Shortlist.
  const byPart = new Map(claims.map((c) => [c.part_no, c]));
  const progById = new Map(progs.map((p) => [p.program_id, p]));

  const candidates: Candidate[] = proven.map((t) => {
    const part = byPart.get(t.part_no);
    const ships = usage.filter((u) => u.part_no === t.part_no);
    const comparablePrograms = ships
      .map((u) => progById.get(u.program_ref))
      .filter((p) => p && p.eps_architecture === k2.eps_architecture &&
        (p.status === 'production' || p.status === 'ended'));
    let reject: string | null = null;
    if (part.lifecycle !== 'production') reject = `lifecycle is "${part.lifecycle}" — cannot be ordered`;
    else if (!ships.length) reject = 'has never shipped on any programme';
    else if (!comparablePrograms.length) reject = `ships, but on no ${k2.eps_architecture} programme`;
    return {
      part_no: t.part_no, demonstrated: num(t.max_value_demonstrated),
      lifecycle: part.lifecycle, test: t, ships, comparablePrograms, reject,
    };
  });

  w.note('shortlist — four conditions, all must hold', 'stitched in code',
    CONDITIONS.map((c, i) => `${i + 1}. ${c}`).join('\n'), candidates);

  const kept = candidates.filter((c) => !c.reject);
  const best = kept.length ? [...kept].sort((a, b) => b.demonstrated - a.demonstrated)[0] : null;

  return {
    inForceRevision: inForce.spec_revision_id,
    supersededRevisions: revs.filter((r) => r.effective_to !== null).map((r) => r.spec_revision_id),
    requirement: {
      cr_id: cr.cr_id, section: cr.section, title: cr.title, attribute: cr.attribute,
      unit: cr.unit, operator: cr.operator, value: num(cr.value_num), condition: cr.condition,
    },
    changedBetweenRevisions: changed,
    claims, proven, candidates, kept, best,
    margin: best ? round(best.demonstrated - num(cr.value_num), 2) : null,
    betterButUnbuyable: best
      ? candidates.filter((c) => c.reject?.startsWith('lifecycle') && c.demonstrated > best.demonstrated)
      : [],
    architecture: k2.eps_architecture,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// B · "WHAT DID WORK LIKE THIS COST US BEFORE?"
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The refusal threshold.
 *
 * Three is not magic; it is the smallest set on which a median means anything.
 * Below it the honest output is "we have no basis", and saying so is worth more
 * than a figure with a false decimal point on it.
 *
 * This is the same refusal `@fde/agent`'s fan-out makes when it declines to
 * decide what a partial result means. A tool that always produces a number is
 * not more useful — it is less, because you can no longer tell the grounded
 * answers from the invented ones.
 */
export const MIN_COMPARABLES = 3;

export interface Priced {
  label: string;
  filter: string;
  /** Which half of the estate this was read from. Printed, never inferred. */
  source: string;
  n: number;
  /** Past jobs in the source before any filter. Zero means nothing was loaded. */
  available: number;
  enough: boolean;
  medianHours: number;
  meanHours: number;
  /** How much higher the mean is than the median, as a fraction. */
  meanInflation: number;
  spread: [number, number];
  disciplines: { discipline: string; hours: number; rate: number; eur: number }[];
  totalEur: number;
  /** The record with a story attached — the one that will distort a mean. */
  outlier: { effort_id: string; hours: number; note: string } | null;
}

/**
 * WHERE THE PAST JOBS ARE READ FROM. Two sources, one set of reasoning.
 *
 * `ANSWER_KEY` is `vst_pmo` — the estate as generated, which for most of this
 * package's life was the only thing the walks could read. It is a cheat: those
 * rows were never derived from a document.
 *
 * `FROM_DOCUMENTS` is `vst_derived.derived_effort` — the same jobs, assembled out of
 * the closure reports and timesheets by the sorting pipeline. It is the honest
 * source and it answers LESS, which is the entire point of building it.
 *
 * Both go through the identical filter, statistic and refusal rule below.
 * Nothing about the reasoning changes; only what it is allowed to see. That is
 * what makes the difference between the two outputs a measurement of the
 * DOCUMENTS rather than of two different programs.
 */
export interface Source {
  readonly name: string;
  readonly db: string;
  /** Past jobs: must expose effort_id, hours, and the comparables columns. */
  readonly efforts: string;
  /** Per-discipline hours for a set of effort ids. */
  readonly split: string;
  readonly rates: string;
  /**
   * HOW MANY PAST JOBS EXIST AT ALL, before any filter.
   *
   * Added because the two sentences below are completely different claims and
   * the walk was printing the same one for both:
   *
   *   "we have not done enough of this to know"   ← about the CUSTOMER
   *   "nothing has been loaded"                   ← about US
   *
   * The first goes in front of a customer as a finding. The second is a broken
   * pipeline. When `derived:extract` died mid-run and left `extracted_facts` empty,
   * the walk reported three confident refusals and every word of them was
   * false — it had no history to be short of.
   *
   * A refusal is only honest if it can say what it is refusing FROM.
   */
  readonly total: string;
}

export const ANSWER_KEY: Source = {
  name: 'the answer key',
  db: 'pmo',
  efforts: `select effort_id, title, actual_hours, calendar_weeks, region, year, outcome_note
            from effort_records where {where} order by actual_hours`,
  split: `select discipline, sum(hours)::numeric total from effort_by_discipline
          where effort_id = any($1) group by discipline order by total desc`,
  rates: 'select discipline, rate_eur_per_hour from rate_cards where year = $1 and region = $2',
  total: 'select count(*)::int n from effort_records',
};

export const FROM_DOCUMENTS: Source = {
  name: 'the documents',
  db: DERIVED_DB,
  // `booked_hours` — reconciled to the hour against the timesheets — stands in
  // for `actual_hours`. `outcome_note` is null BY CONSTRUCTION: the explanation
  // of why a number is strange lives in prose nobody has extracted, so the
  // outlier warning simply cannot be produced here. Stated in the column rather
  // than discovered as a missing paragraph in the output.
  efforts: `select effort_id, effort_id as title, booked_hours as actual_hours,
                   calendar_weeks, null::text as region, null::int as year,
                   null::text as outcome_note
            from derived_effort where booked_hours is not null and {where}
            order by booked_hours`,
  split: `select discipline, sum(hours)::numeric total from effort_split_lines
          where subject = any($1) group by discipline order by total desc`,
  rates: 'select discipline, rate_eur_per_hour from rate_card_lines where year = $1 and region = $2',
  total: 'select count(*)::int n from derived_effort where booked_hours is not null',
};

export async function derivePrice(
  w: Walk,
  opts: { label: string; filter: string; where: string; params: unknown[]; year?: number; region?: string; source?: Source },
): Promise<Priced> {
  const year = opts.year ?? 2026;
  const region = opts.region ?? 'EU';
  const src = opts.source ?? ANSWER_KEY;

  const available = Number(
    (await w.q('how much history is there to compare against at all?', src.db, src.total))[0]?.n ?? 0,
  );

  const rows = await w.q(`what did "${opts.label}" cost us before?`, src.db,
    src.efforts.replace('{where}', opts.where), opts.params);

  const hours = rows.map((r) => num(r.actual_hours));
  const med = median(hours);
  const mn = mean(hours);

  // The note is the ONLY place the estate records why a number is strange, so
  // it is the only way to find these without eyeballing every row.
  const odd = rows.filter((r) => r.outcome_note);
  const outlier = odd.length
    ? { effort_id: odd[odd.length - 1].effort_id, hours: num(odd[odd.length - 1].actual_hours), note: odd[odd.length - 1].outcome_note }
    : null;

  // The discipline mix of the WHOLE comparable set, scaled to the median total
  // — not the mix of one representative job, which is one project manager's
  // booking habits rather than a fact about the work.
  const ids = rows.map((r) => r.effort_id);
  const split = ids.length
    ? await w.q('how do those hours split across disciplines?', src.db, src.split, [ids])
    : [];
  const splitTotal = split.reduce((a, d) => a + num(d.total), 0);

  // Hours become euros HERE and nowhere else. A rate hardcoded in an estimator
  // is a rate nobody can audit, and it is wrong the moment a year rolls over.
  const rates = await w.q(`what are the ${year} ${region} rates?`, src.db, src.rates, [year, region]);
  const rateOf = new Map(rates.map((r) => [r.discipline, num(r.rate_eur_per_hour)]));

  const disciplines = splitTotal > 0 ? split.map((d) => {
    const h = med * (num(d.total) / splitTotal);
    const rate = rateOf.get(d.discipline) ?? 0;
    return { discipline: d.discipline, hours: h, rate, eur: h * rate };
  }) : [];

  return {
    label: opts.label, filter: opts.filter, source: src.name, n: rows.length,
    available,
    enough: rows.length >= MIN_COMPARABLES,
    medianHours: med, meanHours: mn,
    meanInflation: Number.isFinite(mn / med) ? mn / med - 1 : NaN,
    spread: [hours[0] ?? NaN, hours[hours.length - 1] ?? NaN],
    disciplines, totalEur: disciplines.reduce((a, d) => a + d.eur, 0),
    outlier,
  };
}
