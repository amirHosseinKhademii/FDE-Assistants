/**
 * search_policy — the bridge between the agent and the policy wordings.
 *
 * Three decisions here are load-bearing:
 *
 * 1. NO SCORE THRESHOLD. We return the top k unconditionally, even when the
 *    best match is poor. Similarity ranks TOPICAL RELEVANCE — it cannot tell
 *    you whether the answer is present. The travel-assistant version measured
 *    this directly: an unanswerable question scored 0.572 while an answerable
 *    one scored 0.472. Filtering on score would reject real questions while
 *    admitting unanswerable ones.
 *
 *    In this domain it is sharper still. "Is a rideshare driver covered?" will
 *    retrieve EXCLUSION B (transporting goods for a fee) at a high score,
 *    because it is the most topically adjacent clause in the corpus. It is also
 *    not the answer — B is about goods, not passengers, and the corpus never
 *    addresses rideshare at all. Whether a retrieved clause APPLIES is reading
 *    comprehension, and it belongs to the model, not to a number.
 *
 * 2. THE policy_form FILTER, APPLIED BEFORE RANKING. Twelve near-identical
 *    forms in this corpus each contain a section 4.4 saying rental
 *    reimbursement is some dollar amount per day. Unfiltered, the top 5 for
 *    "rental car limit" is five different forms' version of the same clause,
 *    and the model has no way to know which one is this customer's. Get the
 *    form from get_policyholder first, then filter. Ranking first and filtering
 *    after would leave the top k already full of the wrong forms.
 *
 * 3. EVERY RESULT CARRIES ITS SOURCE AND FULL HEADING TRAIL. The trail begins
 *    with the form id, so a citation reads
 *    "PA-2023-01 > Part IV > 4.4 Rental Reimbursement" and can be verified
 *    against the corpus months later. A fragment without its form id is not a
 *    citation, it is a rumour. *
 * DOMAIN: the search tool. Swap the metadata filter key; keep no-threshold,
 * filter-before-rank, and returning the source trail with every passage.
 */
import { z } from 'zod';
import type { Tool } from '@fde/agent';
import type { PGVectorStore } from '@langchain/pgvector';
import { hybridSearch } from '@fde/grounding';
import { DOMAIN } from '../config/domain';

export const SEARCH_POLICY = 'search_policy';

/**
 * The CONTRACT family — the only documents that state what a policy pays.
 *
 * Everything else in the corpus (bulletin, circular, procedure, manual,
 * determination, opinion) is guidance or history and belongs to
 * `search_guidance`. A bulletin cannot change a coverage term, so returning one
 * here is not a near-miss, it is the wrong ladder.
 */
const CONTRACT_TYPES = ['form', 'endorsement', 'amendatory', 'schedule'] as const;

interface Args {
  query: string;
  /** Null rather than undefined — see the note on the parameter schema. */
  policy_form: string | null;
  k: number | null;
}

export interface PolicySearchResult {
  document_id: string;
  section: string;
  text: string;
  /** Exposed for debugging and eval analysis. The model is told, in the schema
   *  description, not to treat it as a confidence signal — because it isn't. */
  similarity: number;
}

export function searchPolicyTool(
  store: PGVectorStore,
): Tool<Args, { results: PolicySearchResult[]; note: string }> {
  return {
    hasUpstream: true,

    schema: {
      type: 'function',
      name: SEARCH_POLICY,
      description:
        'Search the insurer\'s policy WORDINGS — the forms, endorsements, and ' +
        'exclusion schedules — and return the most relevant passages, each ' +
        'with its source document and section. Use this for questions about ' +
        'what a policy form says. Do NOT use it for questions about a specific ' +
        'customer; use get_policyholder for those. ' +
        'Pass policy_form whenever you know which form the customer is on — ' +
        'the corpus contains many near-identical forms whose numbers differ, ' +
        'and without the filter you will retrieve the right clause from the ' +
        'wrong form. ' +
        'Results are ranked by topical similarity ONLY. A high score does NOT ' +
        'mean the answer is present, and a clause that is merely adjacent to ' +
        'the question is not an answer. Read the passages and judge for ' +
        'yourself; if they do not settle the question, say so and escalate ' +
        'rather than reasoning by analogy from a nearby clause. ' +
        'You may search more than once with different wording.',
      // NOTE ON NULLABLE-INSTEAD-OF-OPTIONAL. OpenAI strict mode requires every
      // property to be in `required`, so a genuinely optional argument has to be
      // expressed as required-but-nullable. `.nullable()` says that; `.optional()`
      // would be dropped from `required` and rejected. The execute signature
      // therefore receives `null`, not `undefined`, when the model omits one.
      parameters: z.strictObject({
        query: z
          .string()
          .describe('What to look for. Natural language works best.'),
        policy_form: z
          .string()
          .nullable()
          .describe(
            'Restrict the search to one form, e.g. "PA-2023-01" or ' +
              '"PA-END-2024-03". Matched against the form id at the start of ' +
              'each document. Pass null only when the question is genuinely ' +
              'about the corpus as a whole.',
          ),
        k: z
          .number()
          .nullable()
          .describe('How many passages to return. Pass null for the default of 5.'),
      }),
    },

    async execute({ query, policy_form, k }) {
      const want = k ?? 5;
      // Exact form-id match, never a prefix — "PA-2023-01" must not also match
      // the four state amendatory forms, which have different liability limits
      // and are otherwise word-for-word identical. See retrieval/form-id.ts.
      //
      // This is now a metadata equality filter applied by Postgres, which is
      // the same semantics the hand-rolled `matchesForm` predicate had, and
      // it is still applied BEFORE ranking: filter-then-sort, never
      // sort-then-filter, or the top k is already full of the wrong form.
      const filter = policy_form ? { formId: policy_form } : undefined;

      // OVER-FETCH, THEN GATE BY DOCUMENT TYPE AND STATUS.
      //
      // WHY THIS IS HERE, and it was missing until 2026-09-11. `search_guidance`
      // was added as a second tool so that "what does the policy PAY" and "how
      // must the claim be HANDLED" would be answered from different document
      // families. But this tool was never narrowed to match, so
      // `policy_form: null` searched ALL 555 chunks — and a traced run on the
      // rideshare question showed it returning bulletins, circulars, prior
      // determinations and a coverage opinion through the COVERAGE tool, while
      // `search_guidance` was never called once in ten tool calls.
      //
      // A split that only one side honours is not a split. It is a second tool
      // the model has no reason to reach for.
      //
      // The status gate matters just as much: that same run returned
      // CIR-IL-2021-08 (superseded) and two superseded form EDITIONS paying
      // different amounts. `search_guidance` already excluded retired
      // documents; this one handed them to the model.
      // HYBRID: dense vectors AND Postgres full-text, fused by rank. Policy
      // language is full of rare terms — "livery", "for hire", a form id — that
      // embeddings are poor at and a keyword index finds instantly.
      const { hits: fusedHits, fullText } = await hybridSearch(store, query, want * 6, filter, { tableName: DOMAIN.vectorTable });
      const hits = fusedHits.map((h) => [h.doc, 1 - h.score] as [typeof h.doc, number])
        .filter(([d]) => {
          // Contract documents only. `null` passes so a chunk with no docType —
          // an index built before this field existed — is not silently dropped;
          // a missing value is not evidence of the wrong type.
          const t = d.metadata.docType;
          return !t || CONTRACT_TYPES.includes(String(t) as never);
        })
        .filter(([d]) => {
          const st = String(d.metadata.status ?? 'unknown');
          // 'unknown' passes for the same reason. Only an EXPLICIT retirement
          // excludes — a document we cannot classify is not thereby dead.
          return st !== 'superseded' && st !== 'withdrawn' && st !== 'rescinded';
        })
        .slice(0, want);

      // An empty result under a filter means the form id was wrong, not that
      // the corpus is silent. Those are very different facts and the model must
      // not confuse them — one is "ask again", the other is "escalate".
      if (hits.length === 0) {
        return {
          results: [],
          note:
            (policy_form
              ? `No CURRENT contract document matched form id "${policy_form}". ` +
                `Either the form id is wrong — check the policyholder record — ` +
                `or the only matches were superseded editions, which this tool ` +
                `excludes. `
              : 'No contract document matched. ') +
            `This tool searches policy forms, endorsements, state amendatory ` +
            `endorsements and exclusion schedules ONLY. Bulletins, Department ` +
            `of Insurance circulars, claims procedures, prior determinations ` +
            `and coverage opinions are NOT here — use search_guidance for ` +
            `those. An empty result is not the same as the corpus being ` +
            `silent, and it is not an answer.`,
        };
      }

      // THE MITIGATION THAT SHIPS WITH THE TWO-TOOL SPLIT (CORPUS-PLAN.md §2.6).
      //
      // Some questions sound like coverage and are answered by guidance. "Does
      // a total loss settlement include sales tax?" is the worked example: the
      // form says "actual cash value" and is silent, while a DOI circular
      // requires tax, title and registration in one state and tax but not title
      // in another. A model that reads that as a coverage question calls this
      // tool alone, finds a confident-sounding answer, and never learns the
      // circular exists.
      //
      // So the tool that HAS the information says so. This is the same move the
      // empty-result branch above makes: an answer and a silence are different
      // facts, and the model must not confuse them.
      // Questions this tool cannot answer from a form, even when they sound like
      // coverage. Settlement amounts and timeframes live in state regulation and
      // claims guidance; "does anything address X" is answered by what the
      // corpus SAYS, and the forms' silence is not an answer.
      const NEEDS_GUIDANCE =
        /\b(tax|taxes|title|registration|transfer fee|fees|total loss|totall?ed|salvage|deadline|days to|timeframe|notify|acknowledge|documentation|required before|prior claim|previously|decided before|rideshare|for hire|livery)\b/i;
      const mayNeedGuidance = NEEDS_GUIDANCE.test(query) || hits.length === 0;

      return {
        results: hits.map(([doc, score]) => ({
          document_id: String(doc.metadata.documentId ?? ''),
          section: String(doc.metadata.section || '(no heading)'),
          // The body alone, not the heading-trail-prefixed text that was
          // embedded — the trail is already reported in `section`, and
          // repeating it inside the passage reads like part of the clause.
          text: String(doc.metadata.body ?? doc.pageContent),
          // pgvector returns a cosine DISTANCE; similarity is 1 - distance, so
          // the number the model sees means the same thing it did before the
          // swap. Reporting a distance as a "similarity" would silently invert
          // the scale.
          similarity: Number((1 - score).toFixed(3)),
        })),
        note:
          'Ranked by topical similarity only. Similarity does not indicate ' +
          'whether the answer is present. If these passages do not settle the ' +
          'question, escalate instead of inferring from an adjacent clause.' +
          (fullText ? '' : ' (Keyword search was unavailable on this query — ' +
            'these results are vector-only. Re-run `pnpm ingest` to build the ' +
            'full-text index.)') +
          (mayNeedGuidance
            ? ' NOTE: this question touches amounts or timeframes that a policy ' +
              'form often does not state — sales tax and fees on a total loss, ' +
              'claim-handling deadlines, storage and salvage. Those are ' +
              'governed by the rated state\'s regulations and by claims ' +
              'guidance, not by the form, and the form\'s silence is NOT an ' +
              'answer. Call search_guidance with the jurisdiction from the ' +
              'record before concluding.'
            : ''),
      };
    },
  };
}
