/**
 * THE 10%. Everything about this corpus that is a steering supplier's paperwork
 * rather than retrieval, in one object.
 *
 * `@fde/grounding` is generic machinery and is handed this. Insurance and
 * pharma each wrote a sibling of this file and changed nothing inside the
 * package; steering is the third, and the fact that it needed no edit there
 * either is the only real evidence that split was drawn in the right place.
 *
 * ── WHY THE TYPES BELOW ARE THE ONES THEY ARE ────────────────────────────
 *
 * Not because a steering programme produces exactly eight kinds of document —
 * it produces more — but because these are the kinds that answer DIFFERENT
 * QUESTIONS, and mixing them is how a plausible wrong answer gets made:
 *
 *   what the CUSTOMER asked for      crs
 *   what WE committed to build       system_requirements
 *   how it is put together           architecture
 *   what it is SAFE to do            safety_assessment   ← the expensive one
 *   what a module does today         module_doc
 *   what was tested                  test_report
 *   what shipped                     release_note
 *   what it cost / was quoted        closure_report, quotation
 *
 * `safety_assessment` is split out from `module_doc` deliberately. The single
 * most valuable sentence in this corpus — that the damping software ships at
 * ASIL B while a new programme needs ASIL D — is in a safety assessment, and a
 * search that returns it alongside twenty module manuals has technically
 * succeeded and practically failed.
 */
import type { DocumentDomain, DocumentFields } from '@fde/grounding';

export const REQUIREMENT_TYPES = ['crs', 'system_requirements', 'architecture', 'review_notes'] as const;
export const ENGINEERING_TYPES = [
  'safety_assessment', 'module_doc', 'test_report', 'misra_report', 'release_note', 'repo_readme',
] as const;
export const COMMERCIAL_TYPES = ['closure_report', 'quotation'] as const;

/**
 * The code, added when the source tree was indexed.
 *
 * Separate from `ENGINEERING_TYPES` because a search over documentation and a
 * search over implementation answer different questions, and the one question
 * this estate exists to answer — *what do we already have that does this?* — is
 * mostly about the second. Filing them together would make that distinction
 * unfilterable.
 *
 * `test_source` is its own type on the strength of what the test files say
 * about themselves: *"THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS
 * MODULE IS SUPPOSED TO DO. The design note is from 2018 and the behaviour has
 * moved since; the tests have not been allowed to."* A corpus where the tests
 * are more current than the documentation is one where telling them apart
 * matters.
 */
export const CODE_TYPES = ['source', 'header', 'test_source'] as const;

/**
 * Path shape → type, tried in order.
 *
 * KEYED ON THE PATH, NOT ON A HEADER FIELD, and that is a statement about this
 * customer rather than a shortcut. Their documents carry no `Document type:`
 * line — the only reliable signal of what a file IS is where somebody filed it,
 * which is exactly the kind of thing that cannot be guessed from the code and
 * has to be written down by whoever looked.
 */
const TYPE_BY_PATH: Array<[RegExp, string]> = [
  [/^pmo\/closure-reports\//i, 'closure_report'],
  [/^pmo\/quotes\//i, 'quotation'],
  [/^releases\//i, 'release_note'],
  [/^requirements\/.*\/CRS-/i, 'crs'],
  [/^requirements\/.*\/system-requirements-/i, 'system_requirements'],
  [/^requirements\/.*\/architecture-/i, 'architecture'],
  [/^requirements\/.*\/review-notes-/i, 'review_notes'],
  [/\/docs\/safety-assessment/i, 'safety_assessment'],
  [/\/reports\/hil-/i, 'test_report'],
  // ── THE 81 THAT NEARLY WENT IN AS "other" ──────────────────────────────
  //
  // A static-analysis report is half a fixed SUMMARY block and half free prose
  // under DEVIATIONS, and the prose half is why this line exists: deviation
  // D-07 is the ONLY place in 1,069 files that explains why the damping module
  // compiles at ASIL D while its header and its safety assessment both say
  // ASIL B. Filed as `other` it would still have been searchable, and it would
  // have been unfilterable — indistinguishable from a README.
  [/\/reports\/misra-/i, 'misra_report'],
  // Tested before the generic `src/` rule, because a test file lives under
  // `test/` and would otherwise fall through to `source`.
  [/\/test\/.*\.c$/i, 'test_source'],
  [/\.h$/i, 'header'],
  [/\.c$/i, 'source'],
  [/\/docs\//i, 'module_doc'],
  [/^eps-[a-z-]+\/(README|CHANGELOG)/i, 'repo_readme'],
];

/** `requirements/PRG-KST-K2/CRS-KST-K2-001_RevB` → `PRG-KST-K2`. */
function programmeOf(id: string, fields: DocumentFields): string | null {
  const declared = fields.get('programme') ?? fields.get('programmes') ?? fields.get('program');
  if (declared) return declared.split(/[,;]/)[0].trim();
  return /(PRG-[A-Z]{3}-[A-Z0-9]{1,3})/.exec(id)?.[1] ?? null;
}

/** `eps-steering-feel/docs/damping.md` → `eps-steering-feel`. */
function repoOf(id: string): string | null {
  return /^(eps-[a-z-]+)\//.exec(id)?.[1] ?? null;
}

export const STEERING_DOCUMENTS: DocumentDomain = {
  name: 'steering-eps',

  /**
   * These documents put their identity in the title, not in a header key — so
   * the list is short and the fallback (the file path) does the work. Stated
   * rather than left as an empty array somebody later reads as an oversight.
   */
  idFields: ['reference', 'baseline', 'document'],

  classify(id: string): string {
    return TYPE_BY_PATH.find(([re]) => re.test(id))?.[1] ?? 'other';
  },

  /**
   * A superseded revision is retired; a *draft* is NOT.
   *
   * The corpus holds several revisions of the same specification, and answering
   * a 2026 question out of a 2024 revision without saying so is the failure
   * this list exists to prevent. `unknown` is deliberately absent: a document
   * whose status cannot be read is not thereby dead, and treating it as dead
   * hides real content silently.
   */
  retiredStatuses: ['superseded', 'withdrawn', 'obsolete'],

  relationFields: {
    supersedes: 'supersedes',
    'derived from': 'derives_from',
    'traces to': 'traces_to',
  },

  /**
   * What a search needs to filter on, beyond type and status.
   *
   * `programme` and `repo` because almost every real question is about one of
   * them — *"what does K2 need"*, *"what does the steering-feel code do"* — and
   * a result set spanning eleven programmes answers neither.
   */
  facets(fields: DocumentFields, doc: { id: string; title: string }): Record<string, unknown> {
    return {
      programme: programmeOf(doc.id, fields),
      repo: repoOf(doc.id),
      revision: fields.get('revision') ?? fields.get('baseline') ?? null,
    };
  },
};
