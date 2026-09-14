/**
 * "What did work like this cost us before?" — the judgement, as a value.
 *
 * ── WHY THIS DOES NOT CALL `derivePrice`, WHICH ALREADY DOES THIS ────────
 *
 * `answer/derive.ts` prices a comparable set and has done since long before
 * this file. Reusing it was the obvious move and is the wrong one, for three
 * reasons, in descending order of how much they matter:
 *
 * 1. IT INTERPOLATES ITS FILTER INTO SQL. `derivePrice` does
 *    `src.efforts.replace('{where}', opts.where)` — the caller hands it a
 *    finished WHERE clause as a string. That is perfectly safe when the caller
 *    is a CLI with the filter typed into it, which is every caller it has had.
 *    It stops being safe the moment the filter comes from a MODEL. This file's
 *    arguments do. `whereFor` in the department builds placeholders from a
 *    fixed column map instead, so a change class arriving as
 *    `x' or '1'='1` travels as data whatever it contains.
 *
 * 2. `Walk` OPENS AND CLOSES A CONNECTION PER QUERY. That is right for a script
 *    that runs once and exits, and wrong for a tool a loop may call twenty
 *    times: four queries a price, eighty connections to one compute. The
 *    handle in `tools/utils/` is pooled and survives a dropped socket.
 *
 * 3. `Walk` IS A NARRATOR. It accumulates steps so a CLI can print how it got
 *    there. A tool returns a value and the caller decides whether anything is
 *    printed at all.
 *
 * WHAT IS REUSED, AND IT IS THE PART THAT MATTERS: the rules and the maths.
 * `median`, `mean`, `round` and `MIN_COMPARABLES` are imported from
 * `derive.ts`, so the threshold cannot drift between the walk and the tool.
 * Two implementations of "three comparables" is how a refusal rule quietly
 * becomes two different refusal rules.
 *
 * ── THE RULES LIVE IN HERE, WHERE A CALLER CANNOT ROUTE AROUND THEM ──────
 *
 * Price from the median, never the mean. Say `n` every time. Refuse below
 * three. A caller that wanted to ignore any of those would have to reach past
 * this function into the department, and `sql:check` plus the shape of what is
 * returned make that a deliberate act rather than an accident.
 */
import {
  fetchComparableJobs, countPastJobs, fetchDisciplineMix, fetchRates, fetchFactSources,
  whereFor, countWithoutEachField,
  type ComparableKey, type PastJob, type DisciplineHours, type FactSource,
} from '../departments/derived';
import type { DerivedHandle } from '../utils/handle';
import { median, mean, round, MIN_COMPARABLES } from '../../answer/derive';

/** The rate card a price is quoted against. Never defaulted silently — see `priceOf`. */
export interface RateBasis {
  year: number;
  region: string;
}

export const DEFAULT_RATE_BASIS: RateBasis = { year: 2026, region: 'EU' };

/** One past job, with the sentences that say what kind of job it was. */
export interface JobEvidence {
  effortId: string;
  hours: number;
  /** `pmo/closure-reports/EFF-BULK-0067.md` — openable, relative to the corpus. */
  sourcePath: string;
  /** What was read out of that file, and the exact sentence each value came from. */
  facts: Array<{ field: string; value: string | null; line: number | null; sentence: string | null }>;
}

export interface DisciplineCost {
  discipline: string;
  hours: number;
  ratePerHour: number;
  eur: number;
}

export interface ComparableWork {
  found: true;
  /** Which fields were actually used to narrow. Empty means "all of history". */
  matchedOn: string[];
  /** Past jobs in the corpus BEFORE any filter. Zero means nothing is loaded. */
  available: number;
  /** Past jobs matching the filter. Printed with every figure, always. */
  n: number;
  /**
   * What each field is costing the match, when refusing. Counts, never prices.
   *
   * Present only on a refusal. Lets a caller see whether the FILTER or the
   * HISTORY produced the zero — the difference between "we have never done this"
   * and "you asked too narrowly", which are opposite findings.
   */
  looserFilters?: { field: string; without: number; alone: number }[];
  /** False when `n < MIN_COMPARABLES`. When false there is no price. */
  enough: boolean;
  /**
   * Why there is no price, or null. A sentence, not a code — it goes in front
   * of a customer as-is and "INSUFFICIENT_DATA" is not an answer anybody can
   * act on.
   */
  refusal: string | null;
  /** null when `enough` is false. Not zero: zero is a price and this is not. */
  medianHours: number | null;
  meanHours: number | null;
  /** How much higher the mean is than the median, as a fraction. */
  meanInflation: number | null;
  /** Cheapest and dearest job in the set. */
  spread: [number, number] | null;
  rateBasis: RateBasis;
  disciplines: DisciplineCost[];
  totalEur: number | null;
  /** Every job the figure rests on, with the sentence behind each classification. */
  evidence: JobEvidence[];
}

/**
 * The tool was asked something it cannot answer from the corpus.
 *
 * SEPARATE FROM A REFUSAL, and the distinction is the whole reason this type
 * exists. A refusal says *we have not done enough work like this to know* — a
 * fact about the customer, and a useful answer. A miss says *that question does
 * not parse against what is here* — a fact about the question. Reporting one as
 * the other sends somebody looking for missing history that was never missing.
 */
export interface ComparableWorkMiss {
  found: false;
  reason: string;
  /** What the documents actually contain for the field that missed. */
  known?: Record<string, string[]>;
}

/** Which values each filterable column actually holds. Read, never hardcoded. */
async function knownValues(h: DerivedHandle): Promise<Record<string, string[]>> {
  const rows = await h.query(
    `select 'changeClass' as field, change_class as value from derived_effort
      where change_class is not null
      union select 'elementKind', element_kind from derived_effort where element_kind is not null
      union select 'asil', asil from derived_effort where asil is not null
      order by 1, 2`,
  );
  const out: Record<string, string[]> = {};
  for (const r of rows) (out[r.field] ??= []).push(String(r.value));
  return out;
}

/**
 * Does every supplied value exist in the corpus at all?
 *
 * WITHOUT THIS, A TYPO AND A GENUINE GAP LOOK IDENTICAL: both return zero rows
 * and both would be reported as "we have never done work like this". A model
 * that invents `modify_gearbox` would be told the company has no history of it,
 * which is true of a string nobody uses and says nothing about the work.
 *
 * Enum-like fields only. Booleans and numbers cannot be misspelled into
 * something plausible, and checking them would reject a legitimate question
 * about a combination that happens to be absent — which IS a refusal.
 */
function unknownValues(key: ComparableKey, known: Record<string, string[]>): string[] {
  const problems: string[] = [];
  for (const field of ['changeClass', 'elementKind', 'asil'] as const) {
    const value = key[field];
    if (value === undefined || value === null) continue;
    if (!known[field]?.includes(String(value))) {
      problems.push(`${field} "${value}" appears in no document`);
    }
  }
  return problems;
}

/**
 * Hours to euros, apportioned across the discipline mix OF THE WHOLE SET.
 *
 * Not the mix of one representative job — that is one project manager's booking
 * habits. The set's mix is a fact about the work.
 *
 * A discipline with no rate on the card contributes ZERO EUROS AND KEEPS ITS
 * HOURS, so the shortfall is visible in the breakdown rather than silently
 * shrinking the total. A missing rate is a finding about the rate card.
 */
function priceOf(
  medianHours: number,
  mix: DisciplineHours[],
  rates: Map<string, number>,
): DisciplineCost[] {
  const total = mix.reduce((a, d) => a + d.hours, 0);
  if (total <= 0) return [];
  return mix.map((d) => {
    const hours = medianHours * (d.hours / total);
    const ratePerHour = rates.get(d.discipline) ?? 0;
    return { discipline: d.discipline, hours: round(hours), ratePerHour, eur: round(hours * ratePerHour) };
  });
}

/** Group the facts by the job they describe, so evidence travels with its number. */
function evidenceOf(jobs: PastJob[], sources: FactSource[]): JobEvidence[] {
  const byJob = new Map<string, FactSource[]>();
  for (const s of sources) byJob.set(s.effortId, [...(byJob.get(s.effortId) ?? []), s]);

  return jobs.map((j) => ({
    effortId: j.effortId,
    hours: j.hours,
    sourcePath: j.fileId,
    facts: (byJob.get(j.effortId) ?? []).map((s) => ({
      field: s.field,
      value: s.value,
      line: s.line,
      sentence: s.sentence,
    })),
  }));
}

/**
 * What a looser filter would have matched, as a sentence. Counts only.
 *
 * Appended to a refusal so the reader can see whether the filter, rather than
 * the history, is what produced the zero. Says nothing about what those jobs
 * COST: see `countWithoutEachField` for why that line is not crossed.
 */
function looserFilters(counts: { field: string; without: number; alone: number }[]): string {
  const useful = counts.filter((c) => c.without >= MIN_COMPARABLES || c.alone >= MIN_COMPARABLES);
  if (!useful.length) return '';
  const list = useful
    .map((c) => `${c.field}: ${c.alone} on its own, ${c.without} without it`)
    .join(' · ');
  return (
    ` What each part of the filter costs you — ${list}. ` +
    `Those are COUNTS, not prices: a median over a wider set is a different ` +
    `number about different work, and dropping a field that matters to this ` +
    `requirement would produce a confident wrong answer. Drop one only if it is ` +
    `genuinely irrelevant here, and say which you dropped.`
  );
}

/** The sentence shown when there is no basis. Written once, used everywhere. */
function refusalFor(n: number, available: number, matchedOn: string[], looser = ''): string {
  if (available === 0) {
    return 'There is no cost history loaded at all, so this is not a statement about ' +
      'what the company has or has not done. Run the ingest before reading this as a finding.';
  }
  const filter = matchedOn.length ? matchedOn.join(', ') : 'no filter';
  return `Only ${n} past job(s) match ${filter}, out of ${available} with attributable hours. ` +
    `Fewer than ${MIN_COMPARABLES} is not enough for a median to mean anything, so there is no ` +
    `price.${looser} This needs a bottom-up estimate from somebody who has done one; history ` +
    `cannot help and should not be made to look like it can.`;
}

/**
 * Find comparable past work and price it, or say why not.
 *
 * Never throws on a bad argument. A throw is reserved for the plumbing — a dead
 * socket, an expired credential — because the caller above treats the two
 * completely differently: an informative miss is a result the model can act on,
 * and a throw is an error it can only apologise for.
 */
export async function findComparableWork(
  h: DerivedHandle,
  key: ComparableKey,
  rateBasis: RateBasis = DEFAULT_RATE_BASIS,
): Promise<ComparableWork | ComparableWorkMiss> {
  const known = await knownValues(h);

  const problems = unknownValues(key, known);
  if (problems.length) {
    return {
      found: false,
      reason: `${problems.join('; ')}. These are the values the closure reports actually use.`,
      known,
    };
  }

  const [available, jobs] = await Promise.all([countPastJobs(h), fetchComparableJobs(h, key)]);
  const matchedOn = whereFor(key).matched;
  const hours = jobs.map((j) => j.hours);
  const enough = jobs.length >= MIN_COMPARABLES;

  // Evidence is fetched even when refusing. "We have two, and here they are" is
  // a far more useful refusal than "we have two", and it is what lets a person
  // decide whether the two are actually comparable.
  const sources = await fetchFactSources(h, jobs.map((j) => j.effortId));
  const evidence = evidenceOf(jobs, sources);

  if (!enough) {
    // Only when refusing. A run that priced successfully has no use for what a
    // looser filter would have matched, and offering it would invite widening
    // an answer that was already sound.
    const looser = await countWithoutEachField(h, key);
    return {
      found: true, matchedOn, available, n: jobs.length, enough: false,
      refusal: refusalFor(jobs.length, available, matchedOn, looserFilters(looser)),
      looserFilters: looser,
      medianHours: null, meanHours: null, meanInflation: null, spread: null,
      rateBasis, disciplines: [], totalEur: null, evidence,
    };
  }

  const med = median(hours);
  const avg = mean(hours);
  const [mix, rates] = await Promise.all([
    fetchDisciplineMix(h, jobs.map((j) => j.effortId)),
    fetchRates(h, rateBasis.year, rateBasis.region),
  ]);
  const disciplines = priceOf(med, mix, rates);

  return {
    found: true,
    matchedOn,
    available,
    n: jobs.length,
    enough: true,
    refusal: null,
    medianHours: round(med),
    meanHours: round(avg),
    // Reported rather than corrected. A mean far above the median means one job
    // in the set is answering a different question, and the caller should see
    // that rather than have it quietly averaged away.
    meanInflation: Number.isFinite(avg / med) ? round(avg / med - 1, 2) : null,
    spread: [hours[0], hours[hours.length - 1]],
    rateBasis,
    disciplines,
    totalEur: round(disciplines.reduce((a, d) => a + d.eur, 0)),
    evidence,
  };
}
