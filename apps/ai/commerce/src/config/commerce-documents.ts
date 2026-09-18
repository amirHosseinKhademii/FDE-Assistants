/**
 * THE 10%. Everything about this corpus that is retail policy rather than
 * retrieval, in one object.
 *
 * `@fde/grounding` is generic machinery and is handed this. It is the sibling
 * of `apps/ai/pharma/src/config/pharma-documents.ts`, and writing it required
 * changing nothing in `grounding/` — which is the claim a fifth domain exists
 * to test.
 *
 * Read the two side by side. They agree on shape and disagree on every
 * judgment, and the disagreements are the point.
 */
import type { DocumentDomain, DocumentFields } from '@fde/grounding';

/**
 * THE SPLIT THAT MATTERS HERE — and it is NOT pharma's.
 *
 * Pharma splits what WE must do from what the WORLD requires. This domain's
 * dangerous line runs somewhere else entirely:
 *
 *   PUBLISHED  the customer was shown it and can hold us to it.
 *              POL-RET-001 Rev 3 says 30 days, on a page anyone can read.
 *   INTERNAL   true, binding on staff, and the customer has never seen it.
 *              BUL-RET-2025-03 says electronics are 14 days.
 *
 * MIXING THEM PRODUCES THE MOST PLAUSIBLE WRONG ANSWER AVAILABLE, in both
 * directions. "Is this customer entitled to a refund?" answered from the
 * bulletin alone gives a true sentence about our configuration and misses that
 * the customer read 30 days on a public page and relied on it. Answered from
 * the public policy alone, it misses that the returns tool will refuse and that
 * a real rule was issued for a real reason.
 *
 * **Neither document is wrong. Neither settles it.** That is planted flaw T2,
 * and the reason `audience` is a facet rather than a note: it has to be a
 * filter the database applies, not a distinction the model is trusted to
 * notice inside prose.
 */
export const PUBLISHED_TYPES = ['policy'] as const;
export const INTERNAL_TYPES = [
  'procedure',
  'standard',
  'bulletin',
  'guidance',
  'contract',
  'reference',
] as const;

const ALL_TYPES: string[] = [...PUBLISHED_TYPES, ...INTERNAL_TYPES];

/**
 * Id shape → type.
 *
 * Anchored with `(?![-\w])` for the reason both siblings are: an unanchored
 * `POL-RET-001` matches `POL-RET-0011`, and a prefix match across an id
 * boundary is how the wrong policy answers a question.
 */
const TYPE_BY_ID: Array<[RegExp, string]> = [
  [/^POL-[A-Z]{3}-\d{3}(?:\s+Rev\s+\d+)?(?![-\w])/i, 'policy'],
  [/^STD-[A-Z]{3}-\d{3}(?:\s+Rev\s+\d+)?(?![-\w])/i, 'standard'],
  [/^BUL-[A-Z]{2,4}-\d{4}-\d{2}(?![-\w])/i, 'bulletin'],
  [/^CON-CAR-[A-Z]+(?:-\d{4})?(?![-\w])/i, 'contract'],
  [/^REF-[A-Z]{3}-[A-Z]{2}-\d{4}(?![-\w])/i, 'reference'],
  [/^NOTE-[A-Z]+-\d{4}(?![-\w])/i, 'guidance'],
];

/** `POL-RET-001 Rev 3` → `POL-RET-001`. The PARENT, not the document. */
const DOC_PARENT = /^([A-Z]{3,4}-[A-Z]{3}-[\w-]+?)(?:\s+Rev\s+\d+)?$/i;
const REVISION_NO = /\bRev\s+(\d+)\b/i;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A date field, or null. An unparseable date is null, never today. */
function date(v: string | undefined): string | null {
  const t = (v ?? '').trim();
  return DATE.test(t) ? t : null;
}

/** A trimmed field, or null. Empty string is not a value. */
function text(v: string | undefined): string | null {
  return (v ?? '').trim() || null;
}

/** `Audience: public` → 'public'. Anything else, including absent, is internal. */
function audienceOf(fields: DocumentFields): 'public' | 'internal' {
  return (fields.get('audience') ?? '').trim().toLowerCase() === 'public' ? 'public' : 'internal';
}

export const COMMERCE_DOCUMENTS: DocumentDomain = {
  name: 'commerce-retail-resolutions',

  /**
   * `revision id` FIRST, for the reason pharma gives and this domain shares:
   * the identity of a policy document is the REVISION. `POL-RET-001 Rev 2` and
   * `Rev 3` say different things — 28 days with a category table, versus 30 for
   * everything — and were in force at different times. Keying either on
   * `POL-RET-001` collapses them into one row and loses the only thing that
   * makes "what applied when this order was placed?" answerable.
   */
  idFields: ['revision id', 'doc id', 'document'],

  classify(id: string, title: string, fields: DocumentFields): string {
    const declared = (fields.get('category') ?? fields.get('type') ?? '').toLowerCase().trim();
    if (ALL_TYPES.includes(declared)) return declared;

    for (const [re, type] of TYPE_BY_ID) if (re.test(id)) return type;

    if (/\bpolicy\b/i.test(title)) return 'policy';
    if (/\bschedule\b|\bagreement\b/i.test(title)) return 'contract';
    return 'guidance';
  },

  /**
   * `retired` ONLY, and `superseded` IS DELIBERATELY ABSENT.
   *
   * Generic code excludes these from search by default, so a status listed here
   * is a decision to make those documents unreachable.
   *
   * **A superseded policy is not a dead policy.** POL-RET-001 Rev 2 governed
   * every order placed between 2023-06-01 and 2024-10-31, and a claim on one of
   * those orders has to be read against the policy of the day. Hiding it would
   * make the commonest awkward question — "what did we promise when they
   * bought it?" — unanswerable. Precedence is carried by the effective-date
   * range in `facets()` instead, where a filter applies it per question rather
   * than a list applying it once for all questions.
   *
   * **What IS retired is a document that was WRONG**, not one that merely
   * expired. NOTE-ELEC-2022 told customers unsealed electronics could not be
   * returned; that misstated the law, cost complaints, and applies to no date
   * and no order. It stays in the corpus only because old case notes quote it
   * and a reader of those needs to be able to discover it was withdrawn.
   *
   * `unknown` is absent, as in both siblings: a status that cannot be
   * determined is a gap to report, never a reason to hide a document.
   */
  retiredStatuses: ['retired', 'withdrawn'],

  /**
   * THREE VERBS, AND `amends` IS THE ONE DOING THE WORK.
   *
   * `supersedes` chains revisions: Rev 3 replaces Rev 2, and Rev 2 stops
   * applying to new orders.
   *
   * **`amends` does NOT replace.** A bulletin that amends a policy leaves that
   * policy in force and changes part of it — which is precisely how
   * BUL-RET-2025-03 and POL-RET-001 Rev 3 can both be `current` and contradict
   * each other on the same question. Flattening `amends` into `supersedes`
   * would make the bulletin look like it replaced the policy, and the
   * contradiction — the whole of T2 — would disappear into a tidy chain.
   */
  relationFields: {
    supersedes: 'supersedes',
    amends: 'amends',
    references: 'references',
  },

  /**
   * Retail precedence metadata. One jsonb column, spread into every chunk's
   * metadata, so these are filters the database applies rather than facts the
   * model has to spot in prose.
   *
   * `effectiveFrom` AND `effectiveTo` are both here for the reason pharma
   * spells out: the generic layer carries `effectiveOn` into chunk metadata but
   * NOT `expiresOn`, and a range needs two ends. Without the second, an as-of
   * question filtered to "took effect before this order" happily returns a
   * policy that had already been replaced by then.
   */
  facets(fields: DocumentFields, ctx: { id: string; title: string }): Record<string, unknown> {
    const parent = DOC_PARENT.exec(ctx.id.trim());
    const revision = REVISION_NO.exec(ctx.id) ?? REVISION_NO.exec(fields.get('revision') ?? '');

    return {
      // The POLICY this revision belongs to, distinct from the document's own id.
      docId: text(fields.get('doc id')) ?? (parent ? parent[1].toUpperCase() : null),
      revisionNo: revision ? Number(revision[1]) : null,
      revisionId: text(fields.get('revision id')),

      // `null` on effectiveTo means STILL IN FORCE and must be coalesced by any
      // query reading it — a plain `date <= effectiveTo` silently returns
      // nothing for the current revision.
      effectiveFrom: date(fields.get('effective') ?? fields.get('effective from')),
      effectiveTo: date(fields.get('expires') ?? fields.get('effective to')),

      /**
       * THE FACET THIS DOMAIN EXISTS FOR. See the header.
       *
       * A public document is a promise the customer can hold us to. An internal
       * one may be equally true and equally binding on staff, and the customer
       * has never seen it. An answer that refuses a customer something a public
       * page granted them needs a human, and that judgment is only reachable if
       * this is a filter rather than a sentence buried in a chunk.
       */
      audience: audienceOf(fields),

      owningDepartment: text(fields.get('owner')),
      category: (fields.get('category') ?? '').toLowerCase().trim() || null,

      /**
       * Which carrier's contract this is, or null. The lateness question is not
       * answerable without it: Northgate counts WORKING days and Pelham counts
       * CALENDAR days, so the same parcel is due on different dates depending
       * on which contract it travelled under. A filter, not a footnote.
       */
      carrier: text(fields.get('carrier')),
    };
  },

  /**
   * A document with no effective date cannot be placed in time, and in this
   * domain placement in time is what decides which promise applied. Reported by
   * `corpus:load`, never repaired — a missing date is a fact about the
   * customer's records, not a defect to paper over.
   */
  requiredFacets: ['effectiveFrom'],

  /** Nothing is exempt. A carrier contract has a commencement date like everything else. */
  rootTypes: [],
};

/** Which family a document belongs to. The distinction T2 turns on. */
export function audienceFamilyOf(audience: unknown): 'published' | 'internal' {
  return audience === 'public' ? 'published' : 'internal';
}
