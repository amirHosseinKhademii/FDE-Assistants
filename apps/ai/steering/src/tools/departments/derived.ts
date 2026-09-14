/**
 * `vst_derived` — what we derived from the customer's documents, and the only
 * database on the answer path.
 *
 * ── THESE FUNCTIONS RETURN DATA AND PRINT NOTHING ────────────────────────
 *
 * Pharma's departments file states this and it is worth restating, because
 * steering has the same scar: the judgement in `walk-cost` — a set too small to
 * price, an outlier dragging a mean — was a colour in a terminal, which meant
 * nothing but a human reading that terminal could ever act on it. **A finding
 * has to survive as a value.** Everything below hands back a shape; whether it
 * is printed, refused on, or sent to a model is somebody else's decision.
 *
 * ── WHY NOT THE ESTATE, WHICH HAS THE SAME COLUMNS AND MORE ROWS ────────
 *
 * Because those rows were never derived from anything. They were generated
 * alongside the documents and are the ANSWER KEY — useful once, for grading,
 * and disqualifying if the product reads them.
 *
 * The customer's databases are not named anywhere in this directory, including
 * in prose, and `sql:check` enforces that. It has now caught the same mistake
 * three times, every time in a COMMENT explaining why the thing must not
 * happen — which is exactly what a commented-out shortcut looks like from the
 * outside. The reasoning lives in `src/guard/sql-write-selftest.ts`, where
 * naming them is allowed.
 */
import type { DerivedHandle, Row } from '../utils/handle';

// ── the comparables key ────────────────────────────────────────────────────

/**
 * How two pieces of engineering work are judged alike.
 *
 * EVERY FIELD IS OPTIONAL, and that is the design rather than convenience. A
 * new requirement is described in the terms that are known about it, which is
 * rarely all six — and a filter that demanded all six would answer "no
 * comparables" for every real question. Narrowing is the caller's decision and
 * `matched` in the result says which ones were actually used.
 */
export interface ComparableKey {
  changeClass?: string;
  elementKind?: string;
  asil?: string;
  safetyCaseImpact?: boolean;
  toolingRequired?: boolean;
  interfacesTouched?: number;
}

/** One past job, as the documents describe it. */
export interface PastJob {
  effortId: string;
  /** Reconciled to the hour against the timesheets — see `derived:reconcile`. */
  hours: number;
  changeClass: string | null;
  elementKind: string | null;
  asil: string | null;
  safetyCaseImpact: boolean | null;
  /** The closure report this was read out of. Provenance, not decoration. */
  fileId: string;
}

const COLUMNS: Record<keyof ComparableKey, string> = {
  changeClass: 'change_class',
  elementKind: 'element_kind',
  asil: 'asil',
  safetyCaseImpact: 'safety_case_impact',
  toolingRequired: 'tooling_required',
  interfacesTouched: 'interfaces_touched',
};

/**
 * `{ changeClass: 'modify_hardware' }` → `change_class = $1`, `['modify_hardware']`.
 *
 * Parameterised, never interpolated. The keys come from a constant and the
 * values never touch the SQL string — so a change class arriving from a model
 * is data, whatever it contains.
 */
export function whereFor(key: ComparableKey): { sql: string; params: unknown[]; matched: string[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];
  const matched: string[] = [];

  for (const [field, column] of Object.entries(COLUMNS) as [keyof ComparableKey, string][]) {
    const value = key[field];
    if (value === undefined || value === null) continue;
    params.push(value);
    clauses.push(`${column} = $${params.length}`);
    matched.push(`${column} = ${JSON.stringify(value)}`);
  }

  return {
    sql: clauses.length ? clauses.join(' and ') : 'true',
    params,
    matched,
  };
}

const toJob = (r: Row): PastJob => ({
  effortId: r.effort_id,
  hours: Number(r.booked_hours),
  changeClass: r.change_class,
  elementKind: r.element_kind,
  asil: r.asil,
  safetyCaseImpact: r.safety_case_impact,
  fileId: r.file_id,
});

/**
 * Past jobs matching the key, cheapest first.
 *
 * `booked_hours is not null` is not a tidy-up: a job whose charge code appears
 * in no closure report has no hours that can be attributed to it, and including
 * it at zero would drag every median it touched toward nothing.
 */
export async function fetchComparableJobs(h: DerivedHandle, key: ComparableKey): Promise<PastJob[]> {
  const { sql, params } = whereFor(key);
  const rows = await h.query(
    `select effort_id, booked_hours, change_class, element_kind, asil, safety_case_impact, file_id
       from derived_effort
      where booked_hours is not null and ${sql}
      order by booked_hours`,
    params,
  );
  return rows.map(toJob);
}

export interface FilterCount {
  field: string;
  /** Matches with this field dropped and the rest kept. */
  without: number;
  /** Matches on this field ALONE — what the dimension holds at all. */
  alone: number;
}

/**
 * For each field in the key: matches without it, and matches on it alone.
 *
 * ── `without` ALONE WAS NOT ENOUGH, AND THE FIRST TEST SHOWED IT ────────
 *
 * A real refusal filtered on five fields and matched nothing. Dropping any ONE
 * of them still gave 0 or 1, so the diagnostic said "the filter is not the
 * problem" — and that was an artefact of only ever removing one at a time. The
 * `alone` column showed what was really happening: `validation_only` holds 19
 * jobs and `mechanical` holds 17, but together they hold 2.
 *
 * Two fields that are each common and rarely co-occur is a completely different
 * situation from a corpus that has nothing, and `without` cannot tell them
 * apart. The pair is the constraint, and only `alone` reveals it.
 *
 * ── COUNTS ONLY. NEVER A MEDIAN, NEVER A PRICE ──────────────────────────
 *
 * An agent was passing all five comparable fields, matching zero jobs, and
 * refusing five times out of five — on a requirement the deterministic walk
 * prices from six comparables at EUR 81,455. A refusal a plain query could have
 * answered is not caution; it is a capability regression wearing caution's
 * clothes, and it teaches people to discount the refusals that matter.
 *
 * So a refusal can now say what a looser filter WOULD have matched — and stop
 * there. `walk-check` asserts that dropping the ASIL filter produces an answer
 * 3.5x too low, and that assertion stands: **a median attached to a widened set
 * is the wrong answer pre-computed and waiting to be quoted.**
 *
 * A count is different. It lets somebody judge whether dropping a field is
 * legitimate for THIS question — and dropping ASIL on a safety-case question is
 * not — which is a judgement they can make with the numbers in front of them
 * and cannot make blind.
 */
export async function countWithoutEachField(
  h: DerivedHandle,
  key: ComparableKey,
): Promise<FilterCount[]> {
  const present = (Object.keys(COLUMNS) as (keyof ComparableKey)[]).filter(
    (f) => key[f] !== undefined && key[f] !== null,
  );
  if (!present.length) return [];

  const count = async (k: ComparableKey): Promise<number> => {
    const { sql, params } = whereFor(k);
    const rows = await h.query(
      `select count(*)::int n from derived_effort where booked_hours is not null and ${sql}`,
      params,
    );
    return Number(rows[0]?.n ?? 0);
  };

  const out: FilterCount[] = [];
  for (const f of present) {
    out.push({
      field: COLUMNS[f],
      // Drop this one, keep the rest.
      without: await count({ ...key, [f]: undefined }),
      // This one ON ITS OWN — the number that says what the dimension holds.
      alone: await count({ [f]: key[f] } as ComparableKey),
    });
  }
  return out.sort((a, b) => b.alone - a.alone);
}

/**
 * How many past jobs exist AT ALL, before any filter.
 *
 * The difference between "we have not done enough of this" and "nothing has
 * been loaded" — two opposite claims that an earlier version of the cost walk
 * printed identically, once, for a whole run. A refusal is only honest if it
 * can say what it is refusing from.
 */
export async function countPastJobs(h: DerivedHandle): Promise<number> {
  const r = await h.one('select count(*)::int n from derived_effort where booked_hours is not null');
  return Number(r?.n ?? 0);
}

// ── the money ──────────────────────────────────────────────────────────────

export interface DisciplineHours {
  discipline: string;
  hours: number;
}

/**
 * The discipline mix of a SET of jobs, not of one representative job.
 *
 * One job's mix is one project manager's booking habits. The set's mix is a
 * fact about the work, and it is what the median gets apportioned across.
 */
export async function fetchDisciplineMix(h: DerivedHandle, effortIds: string[]): Promise<DisciplineHours[]> {
  if (!effortIds.length) return [];
  const rows = await h.query(
    `select discipline, sum(hours)::numeric total
       from effort_split_lines where subject = any($1)
      group by discipline order by total desc`,
    [effortIds],
  );
  return rows.map((r) => ({ discipline: r.discipline, hours: Number(r.total) }));
}

/**
 * Approved rates for a year and region, read from the rate cards.
 *
 * Hours become euros using this and nothing else. A rate hardcoded in an
 * estimator is a rate nobody can audit, and it is wrong the moment a year rolls
 * over.
 */
export async function fetchRates(h: DerivedHandle, year: number, region: string): Promise<Map<string, number>> {
  const rows = await h.query(
    'select discipline, rate_eur_per_hour from rate_card_lines where year = $1 and region = $2',
    [year, region],
  );
  return new Map(rows.map((r) => [r.discipline as string, Number(r.rate_eur_per_hour)]));
}

// ── provenance ─────────────────────────────────────────────────────────────

export interface FactSource {
  effortId: string;
  field: string;
  value: string | null;
  /** `pmo/closure-reports/EFF-BULK-0067.md` */
  fileId: string;
  /** Found by us when the fact was stored, not supplied by the model. */
  line: number | null;
  sentence: string | null;
}

/**
 * Where each fact about these jobs came from.
 *
 * SEPARATE FROM THE JOBS THEMSELVES, so a caller that only wants a number pays
 * for one query and a caller that has to defend the number pays for two. The
 * defence is the sentence: a challenged figure has to end at something a human
 * can open and read, not at a row nobody can justify.
 */
export async function fetchFactSources(h: DerivedHandle, effortIds: string[]): Promise<FactSource[]> {
  if (!effortIds.length) return [];
  const rows = await h.query(
    `select subject, field, value, file_id, evidence_line, evidence
       from extracted_facts where subject = any($1) and value is not null
      order by subject, field`,
    [effortIds],
  );
  return rows.map((r) => ({
    effortId: r.subject,
    field: r.field,
    value: r.value,
    fileId: r.file_id,
    line: r.evidence_line === null ? null : Number(r.evidence_line),
    sentence: r.evidence,
  }));
}
