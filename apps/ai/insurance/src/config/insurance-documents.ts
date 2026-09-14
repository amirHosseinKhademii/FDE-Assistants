/**
 * THE 10%. Everything about this corpus that is insurance rather than
 * retrieval, in one object.
 *
 * `grounding/` is generic machinery and is handed this. A second customer
 * writes a sibling of this file and changes nothing else in `grounding/`.
 *
 * Every rule below came from a specific failure or a sourced piece of research
 * — see `docs/corpus-research.md` and `CORPUS-PLAN.md` §2.2. None of it is
 * guessable from the code it configures, which is exactly why it is the part
 * that does not transfer.
 */
import type { DocumentDomain, DocumentFields } from '@fde/grounding';
import { formIdOf } from './form-id';

/**
 * The two families, and why the split is load-bearing.
 *
 *   CONTRACT  what the policy PAYS — forms, endorsements, amendatories,
 *             exclusion schedules
 *   GUIDANCE  how a claim must be HANDLED, or what was decided before —
 *             bulletins, DOI circulars, procedures, manuals, determinations,
 *             coverage opinions
 *
 * A bulletin binds the adjuster, not the contract: it cannot change a coverage
 * term. Mixing the families in one result set is how a coverage question gets
 * answered from a bulletin, which is the most plausible-looking wrong answer
 * available. `search_policy` and `search_guidance` exist to keep them apart.
 */
export const CONTRACT_TYPES = ['form', 'endorsement', 'amendatory', 'schedule'] as const;
export const GUIDANCE_TYPES = [
  'bulletin', 'circular', 'procedure', 'manual', 'determination', 'opinion',
] as const;

/**
 * Id shape → type. Anchored with `(?![-\w])` so a claim id cannot prefix-match
 * every determination beneath it — the PA-2023-01 / PA-2023-01-TX bug wearing a
 * different costume.
 */
const TYPE_BY_ID: Array<[RegExp, string]> = [
  [/^BUL-\d{4}-\d{2}(?:\.\d+)?(?![-\w])/i, 'bulletin'],
  [/^CIR-[A-Z]{2}-\d{4}-\d{2}(?![-\w])/i, 'circular'],
  [/^PRC-\d{3}(?![-\w])/i, 'procedure'],
  [/^UWM-\d{3}(?![-\w])/i, 'manual'],
  [/^OPN-\d{4}-\d{3}(?![-\w])/i, 'opinion'],
  [/^(?:DET|CLM)-\d{4}-\d{3,6}/i, 'determination'],
];

const ALL_TYPES: string[] = [...CONTRACT_TYPES, ...GUIDANCE_TYPES];

const POLICY_ID = /^AUT-\d{4}$/;

const list = (v: string | undefined): string[] =>
  (v ?? '').split(/[,;]/).map((s) => s.trim()).filter(Boolean);

export const INSURANCE_DOCUMENTS: DocumentDomain = {
  name: 'insurance-personal-auto',

  idFields: [
    'form id', 'bulletin id', 'circular id', 'determination id', 'opinion id', 'document',
  ],

  /**
   * Classify from what the document already says. The committed corpus carries
   * no `Type:` field on its oldest documents and must not be edited to add one,
   * so the fallbacks read the id shape and then the title.
   */
  classify(id: string, title: string, fields: DocumentFields): string {
    const declared = (fields.get('type') ?? fields.get('document type') ?? '').toLowerCase().trim();
    if (ALL_TYPES.includes(declared)) return declared;

    for (const [re, type] of TYPE_BY_ID) if (re.test(id)) return type;

    if (/^SCHEDULE OF EXCLUSIONS/i.test(title)) return 'schedule';
    if (/-END-/i.test(id)) return 'endorsement';
    // A state amendatory in the retired scheme encoded its state in the id.
    if (/^P[APE]-\d{4}-\d{2}-[A-Z]{2}$/i.test(id)) return 'amendatory';
    return 'form';
  },

  /**
   * `unknown` is deliberately absent. NY DFS withdraws circular letters BY
   * INDEX — a document can be dead while its own text says nothing — so an
   * undeterminable status is a gap to report, not a reason to hide the
   * document. Only an explicit retirement excludes.
   */
  retiredStatuses: ['superseded', 'withdrawn', 'rescinded'],

  /**
   * FOUR VERBS, NOT ONE. The research found four distinct effects and they are
   * not interchangeable: `amends_and_supplements` means BOTH documents stay
   * operative and must be read together. Flattening them to "supersedes" loses
   * the control case for the superseded-bulletin trap.
   */
  relationFields: {
    supersedes: 'supersedes',
    'amends and supplements': 'amends_and_supplements',
    withdraws: 'withdraws',
    rescinds: 'rescinds',
  },

  /**
   * Insurance precedence metadata. All of this used to be columns on the
   * documents table; it is now one jsonb value, so a different customer needs a
   * different config rather than a migration.
   */
  facets(fields: DocumentFields, ctx: { id: string; title: string }): Record<string, unknown> {
    // "National (all states unless …)" → national → null. NEVER parsed from the
    // id: real ISO form numbers do not encode jurisdiction (PP 01 99 is
    // Virginia), and any code that inferred it from digits would be correct on
    // our old corpus and wrong on every real one.
    const j = (fields.get('jurisdiction') ?? '').replace(/\s*\(.*$/, '').trim();
    const policy = (fields.get('policy id') ?? '').trim();

    return {
      // Which FORM this belongs to — distinct from the document's own id,
      // because the exclusions schedule and the base form share a form id on
      // purpose and keying on it merges two documents into one row.
      // Named `formId` because that is the key `search_policy` filters on, and
      // it is spread into chunk metadata verbatim. Distinct from the DOCUMENT's
      // own id: the exclusions schedule and the base form share a form id on
      // purpose, and keying on it would merge two documents into one row.
      formId:
        fields.get('form id') ?? (formIdOf(ctx.title) || formIdOf(ctx.id.toUpperCase()) || null),
      jurisdiction: !j || /^national$/i.test(j) ? null : j,
      appliesTo: list(fields.get('applies to')),
      policyId: POLICY_ID.test(policy) ? policy : null,
      claimId: (fields.get('claim id') ?? '').trim() || null,
    };
  },

  /** A guidance document that names no forms cannot be precedence-checked. */
  requiredFacets: ['appliesTo'],

  /** Contract documents ARE the root; they apply to themselves. */
  rootTypes: ['form', 'schedule'],
};
