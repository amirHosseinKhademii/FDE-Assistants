/**
 * search_procedures — the procedure and standard TEXT behind a finding.
 *
 * WHY THIS EXISTS AS A SECOND TOOL. `assess_release` returns findings, each
 * with the row it came from. It does not return the RULE — it returns
 * `CERTIFIER_TRAINING_LAPSED` and a revision id. In the first live run the model
 * described §7.3 correctly without ever reading it, inferring the rule from the
 * code and the revision number. The inference was right. It was still a guess,
 * and no eval can tell a lucky guess from a quotation. This tool is what makes
 * the difference visible.
 *
 * THE ONE DECISION THAT DIFFERS FROM EVERY OTHER SEARCH TOOL IN THIS REPO:
 * SUPERSEDED REVISIONS ARE NOT EXCLUDED. The insurance sibling drops them, and
 * is right to — a superseded policy edition pays nothing today. Here, Rev 6
 * governed every batch certified between 2023-07-01 and 2026-02-28, batches
 * still within shelf life and still subject to inspection. "What did the
 * procedure require in 2024?" is not historical curiosity; it is the question
 * an inspector asks. Hiding Rev 6 would make it unanswerable.
 *
 * So precedence is applied PER QUESTION, by `as_of`, rather than once for all
 * questions by a status filter.
 *
 * NO SCORE THRESHOLD, for the same reason as everywhere else in this repo:
 * similarity ranks topical relevance and cannot tell you whether the answer is
 * present. Whether a retrieved clause APPLIES is reading comprehension, and it
 * belongs to the model.
 */
import { z } from 'zod';
import type { Tool } from '@fde/agent';
import type { PGVectorStore } from '@langchain/pgvector';
import { hybridSearch } from '@fde/grounding';
import { KB_DB, urlFor } from '../../config/connections';
import { asOfDay } from '../../tools/utils/dates';

export const SEARCH_PROCEDURES = 'search_procedures';

/** Where the pharma index lives. Never the six systems of record. */
const TABLE = 'document_chunks';

interface Args {
  query: string;
  sop_id: string | null;
  as_of: string | null;
  k: number | null;
}

/** One citable passage. Everything needed to quote it and find it again. */
export interface Passage {
  /** The citation, in the form the answer schema expects. */
  ref: string;
  /** `SOP-QC-014 Rev 7` — the REVISION, which is the document's real identity. */
  revision_id: string;
  /** Full heading trail, so a fragment can say where in the document it sat. */
  section: string;
  effective_from: string | null;
  /** `null` means still in force — must be read as "open", never as "expired". */
  effective_to: string | null;
  status: string;
  text: string;
}

export interface SearchProceduresMiss {
  results: [];
  note: string;
}

// ── small pieces, each doing one thing ──────────────────────────────────────

/**
 * Was this revision in force on `day`?
 *
 * THE `null` ON `effective_to` IS THE TRAP. A plain `day <= effectiveTo`
 * silently excludes the CURRENT revision, whose end date is open — so every
 * recent question would be answered out of a superseded document, confidently.
 * Coalescing is not a nicety here.
 */
export function inForceOn(p: { effectiveFrom: string | null; effectiveTo: string | null }, day: string): boolean {
  const from = p.effectiveFrom ?? '0000-01-01';
  const to = p.effectiveTo ?? '9999-12-31';
  return day >= from && day <= to;
}

/**
 * The section heading a passage sits under, WITHOUT the document title.
 *
 * The stored trail begins with the document's own title, so a citation read
 * back as:
 *
 *   sop:SOP-QC-014 Rev 7#SOP-QC-014 Rev 7 — Batch Release and QP Certification
 *                        > 7. Disposition and certification > 7.3 Personnel …
 *
 * — the revision id twice, once as the key and once inside the value. Observed
 * in the first run with this tool. The leading segment is dropped when it
 * repeats the revision id, which leaves `7. Disposition… > 7.3 Personnel…`:
 * the part that actually locates the clause.
 */
function sectionOf(meta: Record<string, any>): string {
  const trail = String(meta.section ?? meta.headings ?? '').trim();
  const revision = String(meta.revisionId ?? '').trim();
  const parts = trail.split('>').map((x) => x.trim()).filter(Boolean);
  if (revision && parts[0]?.startsWith(revision)) parts.shift();
  return parts.join(' > ');
}

/**
 * The citation string.
 *
 * `sop:<REVISION_ID>#<section>` — the shape `release-schema.ts` documents and
 * the coherence rules accept. The REVISION, never the SOP: `SOP-QC-014` alone
 * names two documents that say opposite things.
 */
function refFor(meta: Record<string, any>): string {
  const revision = String(meta.revisionId ?? meta.docRef ?? 'unknown');
  const section = sectionOf(meta);
  return section ? `sop:${revision}#${section}` : `sop:${revision}`;
}

function toPassage(doc: { pageContent: string; metadata: Record<string, any> }): Passage {
  const m = doc.metadata;
  return {
    ref: refFor(m),
    revision_id: String(m.revisionId ?? m.docRef ?? 'unknown'),
    section: sectionOf(m),
    effective_from: m.effectiveFrom ?? null,
    effective_to: m.effectiveTo ?? null,
    status: String(m.status ?? 'unknown'),
    text: doc.pageContent.trim(),
  };
}

/**
 * What to say when nothing came back.
 *
 * An empty result under a filter and an empty corpus are different facts, and
 * the model must not merge them: one means "ask differently", the other means
 * "the procedures are silent, escalate".
 */
function emptyNote(sopId: string | null, asOf: string | null): string {
  const because = [
    sopId ? `no document has SOP id "${sopId}"` : null,
    asOf ? `no revision was in force on ${asOf}` : null,
  ].filter(Boolean);

  return (
    (because.length ? `Nothing matched: ${because.join(', or ')}. ` : 'Nothing matched. ') +
    'This tool searches Meridian procedures and the standards they implement. ' +
    'An empty result is NOT the same as the procedures permitting something — ' +
    'silence in the corpus is not permission. If the rule you need is not here, ' +
    'say so and escalate rather than inferring one.'
  );
}

// ── the tool ────────────────────────────────────────────────────────────────

export function searchProceduresTool(store: PGVectorStore): Tool<Args, { results: Passage[] } | SearchProceduresMiss> {
  return {
    hasUpstream: true,

    schema: {
      type: 'function',
      name: SEARCH_PROCEDURES,
      description:
        'Search the text of Meridian procedures (SOPs, policies) and the ' +
        'regulations they implement. Use this to find the RULE behind a ' +
        'finding — assess_release tells you a certification was invalid and ' +
        'names the governing revision; this returns the clause that says why. ' +
        'Quote it rather than describing it from the revision number. ' +
        'Superseded revisions ARE searchable on purpose: the revision that ' +
        'governs an act is the one in force when the act happened, so pass ' +
        'as_of to get that one rather than the newest.',
      parameters: z.strictObject({
        query: z
          .string()
          .describe('What to look for, in natural language. e.g. "training required before certification".'),
        sop_id: z
          .string()
          .nullable()
          .describe(
            'Restrict to one procedure, e.g. "SOP-QC-014". This is the SOP id, ' +
              'NOT a revision id — "SOP-QC-014 Rev 7" will not match. Pass null ' +
              'to search everything.',
          ),
        as_of: z
          .string()
          .nullable()
          .describe(
            'YYYY-MM-DD. Return only revisions in force on that day — normally ' +
              'the date of the act you are judging, not today. A procedure ' +
              'changed since then does not govern what was done before it took ' +
              'effect. Pass null only when the question is about the current rule.',
          ),
        k: z.number().nullable().describe('How many passages. Pass null for the default of 5.'),
      }),
    },

    async execute({ query, sop_id, as_of, k }) {
      const want = k ?? 5;

      // FILTER BEFORE RANKING, for the sop id, which Postgres can do as a
      // metadata equality. Ranking first and filtering after leaves the top k
      // already full of the wrong procedure.
      const filter = sop_id ? { sopId: sop_id } : undefined;

      // HYBRID: vectors and full text, fused. Procedure text is full of rare
      // tokens — clause numbers, "TRN-GMP-REF", a revision id — that embeddings
      // are poor at and a keyword index finds instantly.
      const { hits } = await hybridSearch(store, query, want * 6, filter, {
        tableName: TABLE,
        // Must match the store's own database, or the two arms fuse results
        // from two different indexes and nothing looks wrong.
        connectionString: urlFor(KB_DB),
      });

      // The date range is applied HERE and not in the store filter because it is
      // a range, not an equality, and pgvector metadata filters do equality.
      // Hence the over-fetch above: enough depth that filtering still leaves k.
      const day = as_of ? asOfDay(as_of) : null;
      const passages = hits
        .map((h) => toPassage(h.doc))
        .filter((p) => !day || inForceOn({ effectiveFrom: p.effective_from, effectiveTo: p.effective_to }, day))
        .slice(0, want);

      return passages.length ? { results: passages } : { results: [], note: emptyNote(sop_id, day) };
    },
  };
}
