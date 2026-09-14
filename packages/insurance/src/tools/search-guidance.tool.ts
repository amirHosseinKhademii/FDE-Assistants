/**
 * search_guidance — the insurer's own guidance and history.
 *
 * WHY THIS IS A SECOND TOOL AND NOT A WIDER FILTER ON search_policy.
 * (CORPUS-PLAN.md §2.6 records the decision and the option that was rejected.)
 *
 * The corpus holds two families of document that answer different questions:
 *
 *   CONTRACT   forms, endorsements, amendatories, exclusion schedules
 *              → what the policy PAYS. search_policy.
 *   GUIDANCE   bulletins, DOI circulars, procedures, manuals, prior
 *              determinations, coverage opinions
 *              → how a claim must be HANDLED, or what was decided before.
 *
 * A bulletin binds the adjuster, not the contract. It cannot change what a
 * policy pays. A form says nothing about claim-handling deadlines. Keeping them
 * in one result set invites the model to answer a coverage question from a
 * bulletin, which is the single most plausible-looking wrong answer available.
 *
 * A WIDER FILTER WAS TRIED ON PAPER AND FAILS ON THE DATA. Guidance documents
 * carry `applies_to`, so the obvious move is to match a form against it. But
 * filtering the corpus on the base form returns 24 of 24 bulletins, 10 of 10
 * circulars and 6 of 6 procedures — `applies_to` is a pass-through, not a
 * filter. What actually narrows is jurisdiction, status and date, and those are
 * gates rather than ranking hints, which is what this tool applies.
 *
 * THE RISK THIS CARRIES, recorded so it is diagnosable rather than mysterious.
 * A question can straddle the two families. "Does a total loss settlement
 * include sales tax?" is answered by a DOI circular, but it SOUNDS like a
 * coverage question, so a model may call search_policy alone, read "actual cash
 * value", and never learn the circular exists. That failure looks like bad
 * reasoning and is actually bad routing. The mitigation lives in
 * search-policy.tool.ts, which points here when guidance exists for the form.
 * If a settlement-amount case fails, CHECK THE TOOL CALLS BEFORE THE PROMPT.
 *
 * DOMAIN: the doc types and the conduct/coverage split are insurance. The shape
 * — a second retrieval tool gated on metadata rather than ranked by it —
 * transfers to any corpus with authority tiers.
 */
import { z } from 'zod';
import type { Tool } from '@fde/agent';
import type { PGVectorStore } from '@langchain/pgvector';
import { hybridSearch } from '@fde/grounding';
import { DOMAIN } from '../config/domain';

export const SEARCH_GUIDANCE = 'search_guidance';

/** Document types this tool serves. Contract documents are search_policy's. */
const GUIDANCE_TYPES = [
  'bulletin', 'circular', 'procedure', 'manual', 'determination', 'opinion',
] as const;

interface Args {
  query: string;
  doc_type: string | null;
  jurisdiction: string | null;
  include_superseded: boolean | null;
  k: number | null;
}

export interface GuidanceResult {
  document_id: string;
  doc_type: string;
  section: string;
  text: string;
  jurisdiction: string;
  effective_on: string;
  status: string;
  similarity: number;
}

export function searchGuidanceTool(store: PGVectorStore): Tool<Args, {
  results: GuidanceResult[];
  note: string;
}> {
  return {
    hasUpstream: true,

    schema: {
      type: 'function',
      name: SEARCH_GUIDANCE,
      description:
        "Search the insurer's GUIDANCE and claim HISTORY: adjuster bulletins, " +
        'Department of Insurance circulars, claims handling procedures, ' +
        'underwriting manuals, prior claim determinations and coverage ' +
        'opinions. ' +
        'Use this for how a claim must be HANDLED, what documentation is ' +
        'required, what deadlines apply, or what was decided on an earlier ' +
        'claim. ' +
        'Do NOT use it to decide what a policy PAYS — that is search_policy. ' +
        'A bulletin binds the adjuster, not the contract, and cannot change a ' +
        'coverage term. A prior determination is authority for a later claim ' +
        'only where the policy in force then used the same wording as the ' +
        'policy in force now. A coverage opinion is advice and binds nobody. ' +
        'Pass jurisdiction whenever you know the rated state: a circular in ' +
        'one state does not reach a policy issued in another. ' +
        'Superseded and withdrawn documents are excluded unless you ask for ' +
        'them; a document may be dead while its own text says nothing about it.',
      parameters: z.strictObject({
        query: z
          .string()
          .describe('What to look for. Natural language works best.'),
        doc_type: z
          .enum(GUIDANCE_TYPES)
          .nullable()
          .describe(
            'Restrict to one kind of document. Pass null to search all ' +
              'guidance. Use "determination" for what was decided on an ' +
              'earlier claim, "bulletin" for internal guidance, "circular" ' +
              'for a regulator\'s position.',
          ),
        jurisdiction: z
          .string()
          .nullable()
          .describe(
            'The rated state from the policyholder record, e.g. "Illinois". ' +
              'Returns documents for that state AND national ones. Pass null ' +
              'only when the question is genuinely state-independent.',
          ),
        include_superseded: z
          .boolean()
          .nullable()
          .describe(
            'Pass true only when you are deliberately asking what an older ' +
              'document said — for a claim with an early date of loss, say. ' +
              'Null or false excludes superseded and withdrawn documents.',
          ),
        k: z.number().nullable().describe('How many passages. Null for 5.'),
      }),
    },

    async execute({ query, doc_type, jurisdiction, include_superseded, k }) {
      const want = k ?? 5;

      // OVER-FETCH, THEN GATE. Postgres applies an equality filter on doc_type
      // before ranking, which is the selective one. Status and jurisdiction
      // need OR / inequality semantics the metadata filter cannot express, so
      // they are applied here — and that only works if we ask for more rows
      // than we intend to return. Filtering the top 5 down to 1 would look like
      // a sparse corpus when it is really a narrow gate.
      const filter = doc_type ? { docType: doc_type } : undefined;
      const { hits: fusedHits, fullText } = await hybridSearch(store, query, want * 6, filter, { tableName: DOMAIN.vectorTable });
      const hits = fusedHits.map((h) => [h.doc, 1 - h.score] as [typeof h.doc, number]);
      void fullText;

      const gated = hits
        .filter(([d]) => GUIDANCE_TYPES.includes(String(d.metadata.docType) as never))
        .filter(([d]) => {
          // Jurisdiction is a HARD GATE, not a ranking hint: a Texas circular
          // does not reach an Illinois policy at any similarity score. National
          // documents (null jurisdiction) always apply.
          const j = d.metadata.jurisdiction;
          return !jurisdiction || !j || String(j) === jurisdiction;
        })
        .filter(([d]) => {
          if (include_superseded) return true;
          const st = String(d.metadata.status ?? 'unknown');
          // 'unknown' is ALLOWED through: a document whose status we cannot
          // determine is not thereby dead, and silently dropping it would hide
          // real guidance. Only an explicit retirement excludes it.
          return st !== 'superseded' && st !== 'withdrawn' && st !== 'rescinded';
        })
        .slice(0, want);

      if (gated.length === 0) {
        return {
          results: [],
          note:
            'No guidance document matched those filters. This does NOT mean no ' +
            'guidance exists — check whether the jurisdiction or doc_type was ' +
            'too narrow, and search again before concluding the corpus is ' +
            'silent. A coverage question may simply have no guidance to find, ' +
            'in which case the policy form governs and search_policy is the ' +
            'right tool.',
        };
      }

      return {
        results: gated.map(([doc, score]) => ({
          document_id: String(doc.metadata.docRef || doc.metadata.documentId || ''),
          doc_type: String(doc.metadata.docType ?? ''),
          section: String(doc.metadata.section || '(no heading)'),
          text: String(doc.metadata.body ?? doc.pageContent),
          jurisdiction: String(doc.metadata.jurisdiction ?? 'national'),
          effective_on: String(doc.metadata.effectiveOn ?? 'not stated'),
          status: String(doc.metadata.status ?? 'unknown'),
          similarity: Number((1 - score).toFixed(3)),
        })),
        note:
          'These are GUIDANCE documents. None of them changes what a policy ' +
          'pays — for that, read the form via search_policy. Where two of ' +
          'these disagree, resolve it only if one of them STATES that it ' +
          'supersedes the other; "amends and supplements" means both remain in ' +
          'force. Ranked by topical similarity only.',
      };
    },
  };
}
