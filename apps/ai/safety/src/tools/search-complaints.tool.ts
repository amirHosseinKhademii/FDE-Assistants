/**
 * STAGE 4.3 — `search_complaints`, which filters BEFORE it searches.
 *
 * Read `docs/safety/STAGE4.md` §3.3 first; it is the specification this matches.
 *
 * ── THIS IS THE TOOL STAGE 3.7 ASKED FOR ──────────────────────────────────
 *
 * The plan called for "search_complaints, hybrid". 3.7 measured recall@6 = 0.40
 * and showed why that was the wrong tool:
 *
 *   20V197000  (the recall)      keyword rank    93
 *   11353867   (the complaint)   keyword rank 3,026
 *
 * The question was "we run 2020 F-150s, is the transmission park problem a
 * known defect" — and `2020 F-150` is not a phrase to match, it is a FILTER.
 * Matched as prose it competes with 54,541 documents containing ordinary words
 * like "run", "2020" and "problem". Used as a filter it leaves 681, and the
 * target moves from rank 3,026 to 8.
 *
 * Same hybrid search as stage 3.5 and 3.6. Different universe.
 *
 * ── WHY THE FILTER IS RESOLVED TO IDS FIRST, AND NOT PASSED THROUGH ───────
 *
 * `hybridSearch` takes a filter, and it would have been the obvious thing to
 * use. It cannot be used here, and the reason is a silent-wrongness trap:
 *
 *   the DENSE arm  filters through PGVectorStore — supports `in`, gt/gte/lt/lte
 *   the SPARSE arm filters with `metadata @> $n::jsonb` — containment only
 *
 * Containment cannot express `deaths >= 1`, a date range, or a component
 * PREFIX. So a filter rich enough for these questions would be applied by one
 * arm and quietly ignored by the other — the two halves would search DIFFERENT
 * SETS and fuse the results, and nothing would error.
 *
 * So the predicate is resolved to an explicit id set once, in SQL we control,
 * and both arms are restricted to exactly that set. One universe, both arms.
 *
 * The fusion itself is `fuseByRank` from `@fde/grounding` — the same arithmetic
 * stage 3.6 uses, imported rather than reimplemented, because two copies of a
 * scoring rule drift without anything failing.
 */
import { Client } from 'pg';
import { Document as LCDocument } from '@langchain/core/documents';
import { fuseByRank, LocalEmbeddings } from '@fde/grounding';
import { safetyDatabaseUrl } from '../config/connections';
import { TABLE } from '../grounding/search';

export const SEARCH_COMPLAINTS = 'search_complaints';

/** How many passages an answer may rest on. Same as stage 3.5. */
export const DEFAULT_K = 6;

/**
 * Candidates each arm fetches before fusion.
 *
 * `k * 4`, the same over-fetch stage 3.5 uses and for the same reason: a
 * passage ranked 20th by meaning and 2nd by keywords must be IN both lists
 * before fusion can promote it.
 */
const OVER_FETCH = 4;

export interface ComplaintFilter {
  make?: string;
  model?: string;
  year?: number;
  /** Component, or any parent of one. Prefix match — STAGE4.md §7. */
  component?: string;
  /** ISO dates, inclusive. Compared against the filing date. */
  filed_after?: string;
  filed_before?: string;
  crash?: boolean;
  fire?: boolean;
  min_deaths?: number;
  min_injuries?: number;
}

export interface ComplaintHit {
  odi_number: string;
  make: string;
  model: string;
  year: number | null;
  filed: string | null;
  components: string[];
  deaths: number;
  injuries: number;
  crash: boolean;
  fire: boolean;
  text: string;
  denseRank?: number;
  sparseRank?: number;
  score: number;
  source: string;
}

export interface SearchComplaintsResult {
  filter: ComplaintFilter;
  query: string;
  /** How many complaints the filter left to search inside. The headline number. */
  candidates: number;
  hits: ComplaintHit[];
  note: string;
}

/**
 * Build the WHERE clause for the filter.
 *
 * Returns SQL and parameters together so a caller cannot get them out of step.
 * Every clause is on `metadata`, which is where stage 3.4 put these fields.
 */
function buildWhere(f: ComplaintFilter): { sql: string; params: unknown[] } {
  const params: unknown[] = [];
  const clauses: string[] = [`metadata->>'kind' = 'complaint'`];
  const p = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };

  if (f.make) clauses.push(`upper(metadata->>'make') = ${p(f.make.trim().toUpperCase())}`);
  if (f.model) clauses.push(`upper(metadata->>'model') = ${p(f.model.trim().toUpperCase())}`);
  if (f.year !== undefined) clauses.push(`(metadata->>'year')::int = ${p(f.year)}`);

  if (f.component) {
    // PREFIX MATCH ON THE COLON HIERARCHY, over the components ARRAY, and three
    // spellings because NHTSA punctuates inconsistently inside one vehicle's
    // own records — STAGE4.md §7.
    //
    // `exists` rather than a join: unnesting in the FROM clause would multiply
    // rows, which is the trap this engagement has now met five times.
    const c = p(f.component.trim().toUpperCase());
    clauses.push(
      `exists (select 1 from jsonb_array_elements_text(metadata->'components') comp
                where comp = ${c} or comp like ${c} || ':%' or comp like ${c} || ': %')`,
    );
  }

  // DATES COMPARED AS DATES, not as strings. Stage 3.1 normalised every date to
  // ISO precisely so this comparison is possible; `docs/safety/WALKTHROUGH.md`
  // REC-008 exists to catch it silently regressing.
  if (f.filed_after) clauses.push(`(metadata->>'filed')::date >= ${p(f.filed_after)}::date`);
  if (f.filed_before) clauses.push(`(metadata->>'filed')::date <= ${p(f.filed_before)}::date`);

  if (f.crash !== undefined) clauses.push(`(metadata->>'crash')::boolean = ${p(f.crash)}`);
  if (f.fire !== undefined) clauses.push(`(metadata->>'fire')::boolean = ${p(f.fire)}`);
  if (f.min_deaths !== undefined) clauses.push(`(metadata->>'deaths')::int >= ${p(f.min_deaths)}`);
  if (f.min_injuries !== undefined) {
    clauses.push(`(metadata->>'injuries')::int >= ${p(f.min_injuries)}`);
  }

  return { sql: clauses.join('\n          and '), params };
}

function toHit(doc: LCDocument, score: number, denseRank?: number, sparseRank?: number): ComplaintHit {
  const m = (doc.metadata ?? {}) as Record<string, any>;
  return {
    odi_number: String(m.id ?? ''),
    make: String(m.make ?? ''),
    model: String(m.model ?? ''),
    year: typeof m.year === 'number' ? m.year : null,
    filed: m.filed ?? null,
    components: Array.isArray(m.components) ? m.components : [],
    deaths: Number(m.deaths ?? 0),
    injuries: Number(m.injuries ?? 0),
    crash: Boolean(m.crash),
    fire: Boolean(m.fire),
    text: doc.pageContent,
    denseRank,
    sparseRank,
    score,
    source: `NHTSA ODI complaint ${m.id ?? ''}`,
  };
}

export async function searchComplaints(
  filter: ComplaintFilter,
  query: string,
  k: number = DEFAULT_K,
  connectionString: string = safetyDatabaseUrl(),
): Promise<SearchComplaintsResult> {
  const { sql: where, params } = buildWhere(filter);
  const depth = k * OVER_FETCH;

  const client = new Client({ connectionString, keepAlive: true, connectionTimeoutMillis: 30_000 });
  await client.connect();
  try {
    // 1 — HOW BIG IS THE HAYSTACK NOW. Reported because it is the whole point
    //     of the tool: 70,194 became 681, and that is what moved the answer.
    const { rows: countRows } = await client.query(
      `select count(*) n from ${TABLE} where ${where}`,
      params,
    );
    const candidates = Number(countRows[0].n);

    if (candidates === 0) {
      return {
        filter,
        query,
        candidates: 0,
        hits: [],
        note:
          'No complaint matches that filter, so there was nothing to search. ' +
          'The filter is wrong or the corpus does not cover it — do NOT widen it ' +
          'silently and answer from whatever comes back.',
      };
    }

    // 2 — THE MEANING ARM, restricted to the filtered set.
    const vector = await new LocalEmbeddings().embedQuery(query);
    const { rows: denseRows } = await client.query(
      `select content, metadata
         from ${TABLE}
        where ${where}
        order by vector <=> $${params.length + 1}
        limit $${params.length + 2}`,
      [...params, `[${vector.join(',')}]`, depth],
    );

    // 3 — THE KEYWORD ARM, restricted to the SAME set. `websearch_to_tsquery`
    //     rather than hand-built OR terms: it takes a phrase as a person typed
    //     it and never throws on punctuation, which `to_tsquery` does.
    const { rows: sparseRows } = await client.query(
      `select content, metadata
         from ${TABLE}
        where ${where}
          and content_ts @@ websearch_to_tsquery('english', $${params.length + 1})
        order by ts_rank(content_ts, websearch_to_tsquery('english', $${params.length + 1})) desc
        limit $${params.length + 2}`,
      [...params, query, depth],
    );

    const asDocs = (rows: any[]) =>
      rows.map((r) => new LCDocument({ pageContent: r.content, metadata: r.metadata }));

    // 4 — fused by the SAME arithmetic stage 3.6 uses, imported not copied.
    const fused = fuseByRank(asDocs(denseRows), asDocs(sparseRows), k);

    return {
      filter,
      query,
      candidates,
      hits: fused.map((s) => toHit(s.doc, s.score, s.denseRank, s.sparseRank)),
      note: `Searched ${candidates.toLocaleString('en-GB')} complaints matching the filter.`,
    };
  } finally {
    await client.end();
  }
}
