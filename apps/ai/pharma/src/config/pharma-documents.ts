/**
 * THE 10%. Everything about this corpus that is pharmaceutical manufacturing
 * rather than retrieval, in one object.
 *
 * `@fde/grounding` is generic machinery and is handed this. It is the sibling
 * of `packages/insurance/src/config/insurance-documents.ts`, and writing it
 * required changing nothing in `grounding/` — which is the claim this second
 * domain exists to test.
 *
 * Read the two files side by side. They agree on shape and disagree on almost
 * every judgment, and the disagreements are the point: a superseded document is
 * dead in one domain and load-bearing in the other.
 */
import type { DocumentDomain, DocumentFields } from '@fde/grounding';

/**
 * The two families, and why the split is load-bearing.
 *
 *   PROCEDURE  what Meridian must DO — SOPs, policies, work instructions.
 *              Written by us, binding on us, and changeable by us through
 *              change control.
 *   STANDARD   what the world requires — 21 CFR parts, EU GMP annexes, ICH
 *              guidelines, USP monographs. Written by somebody else, binding
 *              regardless of what our procedures say, and not ours to edit.
 *
 * MIXING THEM PRODUCES THE MOST PLAUSIBLE WRONG ANSWER AVAILABLE, in both
 * directions. "What must the QP check before certifying?" answered from
 * 21 CFR 211.165 gives a true sentence about American law and misses that
 * SOP-QC-014 Rev 7 §7.3 imposes a stricter internal rule. "Is this compliant?"
 * answered from our own SOP is circular — it proves only that we followed our
 * own procedure, which is exactly what an inspector is not asking.
 *
 * A procedure may be STRICTER than the standard it implements. It may never be
 * laxer. That asymmetry is the whole reason both families are indexed and the
 * reason they are kept apart when searched.
 */
export const PROCEDURE_TYPES = ['sop', 'policy', 'work_instruction'] as const;
export const STANDARD_TYPES = ['regulation', 'annex', 'guideline', 'monograph'] as const;

const ALL_TYPES: string[] = [...PROCEDURE_TYPES, ...STANDARD_TYPES];

/**
 * Id shape → type.
 *
 * Anchored at the end with `(?![-\w])` for the same reason the insurance file
 * is: an unanchored `CFR-211` matches `CFR-211.192`, and a prefix match across
 * a clause boundary is how a general subpart gets returned in place of the
 * specific clause that decides the question.
 */
const TYPE_BY_ID: Array<[RegExp, string]> = [
  // A SOP revision. The revision suffix is part of the DOCUMENT id — see the
  // note on identity below.
  [/^SOP-[A-Z]{2,4}-\d{3}(?:\s+Rev\s+\d+)?(?![-\w])/i, 'sop'],
  [/^POL-[A-Z]{2,4}-\d{2}(?![-\w])/i, 'policy'],
  [/^WI-[A-Z]{2,4}-\d{3}(?![-\w])/i, 'work_instruction'],
  // 21 CFR 210/211, and their individual clauses.
  [/^CFR-\d{3}(?:\.\d+)?(?![-\w])/i, 'regulation'],
  // EU GMP: the annexes and Part I, plus clause ids like ANNEX16-1.5.
  [/^(?:EU-GMP-ANNEX-\d+|ANNEX\d+)(?:-[\d.]+)?(?![-\w])/i, 'annex'],
  [/^EU-GMP-P\d+(?:-[\d.]+)?(?![-\w])/i, 'annex'],
  [/^EUGMP-[\d.]+(?![-\w])/i, 'annex'],
  [/^(?:ICH-Q\d+|ICHQ\d+)(?:-[\d.]+)?(?![-\w])/i, 'guideline'],
  [/^(?:EU-GDP|GDP)(?:-[\d.]+)?(?![-\w])/i, 'guideline'],
  [/^USP-[A-Z]{3}(?![-\w])/i, 'monograph'],
];

/** `SOP-QC-014 Rev 7` → `SOP-QC-014`. The PARENT, not the document. */
const SOP_PARENT = /^(SOP-[A-Z]{2,4}-\d{3})(?:\s+Rev\s+\d+)?$/i;
const REVISION_NO = /\bRev\s+(\d+)\b/i;

const list = (v: string | undefined): string[] =>
  (v ?? '').split(/[,;]/).map((s) => s.trim()).filter(Boolean);

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const date = (v: string | undefined): string | null => {
  const t = (v ?? '').trim();
  return DATE.test(t) ? t : null;
};

export const PHARMA_DOCUMENTS: DocumentDomain = {
  name: 'pharma-gmp-manufacturing',

  /**
   * Where a document's own id might be written.
   *
   * `revision id` comes FIRST and that ordering is the single most important
   * line in this file. The identity of a procedure document is the REVISION —
   * `SOP-QC-014 Rev 7` — never the SOP. Rev 6 and Rev 7 are two documents that
   * say different things and were in force at different times; keying either on
   * `SOP-QC-014` collapses them into one row and destroys the only question
   * this domain exists to answer. The SOP id survives as a facet, exactly as
   * `formId` does in the insurance sibling for exactly the same reason.
   */
  idFields: ['revision id', 'sop id', 'standard id', 'clause id', 'policy id', 'document'],

  classify(id: string, title: string, fields: DocumentFields): string {
    const declared = (fields.get('type') ?? fields.get('document type') ?? '').toLowerCase().trim();
    if (ALL_TYPES.includes(declared)) return declared;

    for (const [re, type] of TYPE_BY_ID) if (re.test(id)) return type;

    // Title fallbacks, for documents whose id scheme predates this one. Real
    // quality systems accumulate several, and the older ones are always the
    // documents nobody wants to renumber.
    if (/^standard operating procedure/i.test(title)) return 'sop';
    if (/\bpolicy\b/i.test(title)) return 'policy';
    if (/\bmonograph\b/i.test(title)) return 'monograph';
    return 'sop';
  },

  /**
   * WHAT "RETIRED" MEANS HERE, AND WHY `superseded` IS DELIBERATELY ABSENT.
   *
   * This is the sharpest disagreement with the insurance sibling, which lists
   * `superseded` first. Generic code excludes retired documents from search by
   * default, so putting a status in this list is a decision to make those
   * documents unreachable.
   *
   * Under GMP the revision that governs an act is the one in force WHEN THE ACT
   * HAPPENED. `SOP-QC-014 Rev 6` is superseded and is also the document that
   * governed every batch certified between 2023-07-01 and 2026-02-28 — batches
   * still within shelf life, still subject to inspection, still capable of
   * being recalled. Marking it retired would make "what did the procedure
   * require in 2024?" unanswerable, and that question is not historical
   * curiosity: it is the question an inspector asks.
   *
   * So superseded revisions stay searchable, and precedence is carried by the
   * effective-date range in `facets()` instead — where a filter can apply it
   * per question rather than a list applying it once for all questions.
   *
   * What IS retired: a document that was pulled outright and never applies to
   * any date. `unknown` is absent for the same reason as in the sibling — an
   * undeterminable status is a gap to report, not a reason to hide a document.
   */
  retiredStatuses: ['withdrawn', 'cancelled', 'obsolete'],

  /**
   * FOUR VERBS, AND `implements` IS THE ONE THAT DOES NOT EXIST IN INSURANCE.
   *
   * `supersedes` chains revisions of one procedure. `implements` crosses the
   * family boundary — SOP-QC-014 Rev 7 implements CFR-211.25 and ANNEX16-1.7 —
   * and it is what lets "why does our procedure say that?" be answered with a
   * regulator's own words rather than our paraphrase of them. Flattening it to
   * `references` would lose the distinction between a clause a procedure is
   * DISCHARGING and one it merely mentions.
   */
  relationFields: {
    supersedes: 'supersedes',
    implements: 'implements',
    references: 'references',
    withdraws: 'withdraws',
  },

  /**
   * GMP precedence metadata. One jsonb column, spread into every chunk's
   * metadata, so these become filters the database applies rather than facts
   * the model has to notice inside prose.
   *
   * `effectiveFrom` AND `effectiveTo` ARE BOTH HERE ON PURPOSE, and the second
   * one is not redundant. The generic layer already carries `effectiveOn` into
   * chunk metadata — but NOT `expiresOn`, which stays a column on the documents
   * table and never reaches a chunk. A range needs two ends. Without the second
   * one, an as-of question can be filtered to "took effect before the date" and
   * will happily return a revision that had already been replaced by then,
   * which is the exact failure this domain is built around. Supplying both from
   * here costs one line and no change to `@fde/grounding`.
   */
  facets(fields: DocumentFields, ctx: { id: string; title: string }): Record<string, unknown> {
    const parent = SOP_PARENT.exec(ctx.id.trim());
    const revision = REVISION_NO.exec(ctx.id) ?? REVISION_NO.exec(fields.get('revision') ?? '');

    return {
      // The PROCEDURE this revision belongs to — distinct from the document's
      // own id, and the key a search filter narrows on when the question is
      // about a procedure rather than about one of its revisions.
      sopId: fields.get('sop id') ?? (parent ? parent[1].toUpperCase() : null),
      revisionNo: revision ? Number(revision[1]) : null,

      // The catalogue's own key for this document, carried so a retrieved chunk
      // can be matched back to its `mrd_reg.sop_revisions` row directly. The
      // DOCUMENT id is a filename slug (`sop-qc-014-rev-7`) because that is
      // what the file source derives identity from; the two are not the same
      // string and guessing one from the other is a parser nobody needs.
      revisionId: (fields.get('revision id') ?? '').trim() || null,

      // The range. `null` on `effectiveTo` means "still in force" and MUST be
      // coalesced by any query that reads it — a plain `date <= effectiveTo`
      // silently returns nothing for the current revision, which is how every
      // recent record ends up pointing at a superseded procedure.
      effectiveFrom: date(fields.get('effective') ?? fields.get('effective from')),
      effectiveTo: date(fields.get('expires') ?? fields.get('effective to')),

      // Which family, so the two can be searched apart. Derived from type by
      // the caller rather than stored twice.
      owningDepartment: (fields.get('owner') ?? '').trim() || null,
      category: (fields.get('category') ?? '').toLowerCase().trim() || null,

      // For standards only: whose law it is. Internal procedures are null —
      // never 'NL' because the site is in Leiden. A procedure has no
      // jurisdiction; the standards it implements do.
      jurisdiction: (fields.get('jurisdiction') ?? '').trim().toUpperCase() || null,

      // The clauses this document discharges. Carried as a facet AS WELL AS a
      // relation because a relation answers "what does this implement" and a
      // facet answers "find me everything implementing CFR-211.25" — the second
      // is a filter and filters live in metadata.
      standardRefs: list(fields.get('implements')),

      // The change control that brought it into force. The loop back into
      // mrd_qms, kept as data so provenance is checkable rather than asserted.
      changeControl: (fields.get('change control') ?? '').trim() || null,
    };
  },

  /**
   * A document with no effective date cannot be placed in time, and in this
   * domain placement in time IS precedence. Reported by `corpus:load`, never
   * repaired — a missing date is a fact about the customer's records.
   */
  requiredFacets: ['effectiveFrom'],

  /**
   * NOTHING IS EXEMPT, and that is a deliberate difference from the insurance
   * sibling, where contract documents are the root and apply to themselves.
   *
   * Here the required facet is a date rather than a parent, and an external
   * standard has one just as surely as an internal procedure does: 21 CFR 211
   * came into force on 1978-09-29. A regulation with no in-force date is as
   * unplaceable as an SOP with none.
   */
  rootTypes: [],
};

/** Which family a type belongs to. The two are searched apart, never fused. */
export function familyOf(docType: string): 'procedure' | 'standard' | 'unknown' {
  if ((PROCEDURE_TYPES as readonly string[]).includes(docType)) return 'procedure';
  if ((STANDARD_TYPES as readonly string[]).includes(docType)) return 'standard';
  return 'unknown';
}
