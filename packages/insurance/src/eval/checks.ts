/**
 * The checks that speak insurance.
 *
 * Everything generic is supplied by packages: `@fde/evals` provides the
 * registry, the trace checks and the standard answer checks (does it cite
 * anything, do the citations resolve, did it escalate, did it notice a
 * conflict); `@fde/grounding` provides the corpus index those citations are
 * checked against.
 *
 * What is left here is what only this domain has: a policy FORM, a policyholder
 * RECORD, and the two prefixes a citation can carry.
 *
 * THE DISCIPLINE THESE CHECKS EXIST UNDER: a check answers "is this box empty
 * when it should not be", NOT "was this a good answer". The second needs a
 * human or an LLM judge, costs money, and disagrees with itself between runs.
 */
import { readdirSync } from 'node:fs';
import { createCorpusIndex } from '@fde/grounding';
import {
  callsFirst,
  createAnswerChecks,
  createCheckRegistry,
  type Check as GenericCheck,
  type CheckContext as GenericContext,
  type CheckResult,
} from '@fde/evals';
import { DOMAIN } from '../config/domain';
import { formIdOf } from '../config/form-id';
import type { CoverageAnswer } from '../schema/coverage-schema';

/** Bound once, so every check below reads this domain's answer. */
type Check = GenericCheck<CoverageAnswer>;
export type { CheckResult, Check };
export type CheckContext = GenericContext<CoverageAnswer>;

const CORPUS = createCorpusIndex(DOMAIN.corpusDir);

/** Policyholder record ids on disk. Read once. */
let RECORDS: Set<string> | null = null;
const knownRecords = (): Set<string> => {
  if (!RECORDS) {
    RECORDS = new Set(
      readdirSync(DOMAIN.recordsDir)
        .filter((f) => f.endsWith('.md'))
        .map((f) => f.replace(/\.md$/, '').toUpperCase()),
    );
  }
  return RECORDS;
};

/**
 * Which FORM a citation names, or '' when it names none.
 *
 * DIFFERENT FROM "does this document exist", and conflating the two is what
 * scored 67 of 79 real documents as fabricated. A bulletin exists and belongs
 * to no form; both answers are correct and they are not the same question.
 */
export function resolveCitedForm(raw: string): string {
  const doc = CORPUS.resolve(raw);
  if (!doc) return '';
  // The heading is authoritative for the form id — for an exclusions schedule
  // it is the only place it appears.
  return formIdOf(doc.ref) || formIdOf(doc.file.toUpperCase());
}

const sources = (a: CoverageAnswer) => a.citations.map((c) => c.source);

/**
 * Does this citation name something REAL?
 *
 * THE PREFIX IS NOT PART OF THE QUESTION. `citations_resolve` exists to catch
 * INVENTED sources — "a fabricated citation is strictly worse than no citation:
 * it looks like evidence, so nobody re-checks it." A source with the wrong
 * prefix but a real id is not a fabrication; an auditor following it finds the
 * document. Failing it is a formatting test wearing a correctness test's
 * clothes, and this file's own header records what that costs.
 *
 * OBSERVED 2026-09-11: the model cited `record:DET-2024-004473-ROR` — a
 * reservation of rights, which is a document — and it was scored as a dangerous
 * false answer. The vocabulary invites that: `policy:` was accurate for twelve
 * policy forms and is now wrong for 67 of 79 documents, and a determination
 * genuinely IS a record of a decision. The prefix name is the real defect; see
 * NEXT.md.
 *
 * WHAT THIS DOES NOT FORGIVE: an id that exists in neither store. `record:
 * AUT-9999` and `policy:BUL-9999-99` still fail, so the fabrication check keeps
 * every tooth it had. Leniency about SPELLING, never about EXISTENCE.
 *
 * `cites_form` deliberately still requires `policy:` — it asks a different
 * question ("which form did you cite"), and there a wrong prefix is a real miss
 * rather than a typo.
 */
const RESOLVER = {
  exists(source: string): boolean {
    const body = source.includes(':') ? source.slice(source.indexOf(':') + 1) : source;
    const id = body.split('#')[0].trim().toUpperCase();
    return knownRecords().has(id) || CORPUS.resolve(body) !== null;
  },
};

const generic = createAnswerChecks<CoverageAnswer>(
  {
    answer: (a) => a.answer,
    citations: sources,
    conflicts: (a) => a.conflicts.map((c) => ({ topic: c.topic, resolvedBy: c.resolved_by })),
    escalation: (a) => (a.escalate ? { owner: a.escalate.suggested_owner } : null),
  },
  RESOLVER,
);

/** Did it cite a passage from this specific policy form? */
const citesForm =
  (form: string): Check =>
  ({ answer: a }) => {
    const cited = sources(a)
      .filter((s) => s.startsWith('policy:'))
      .map((s) => resolveCitedForm(s.slice('policy:'.length)))
      .filter(Boolean);
    return cited.some((f) => f.toUpperCase() === form.toUpperCase())
      ? { pass: true, detail: `cited ${form}` }
      : {
          pass: false,
          detail: `did not cite ${form}; cited forms: [${[...new Set(cited)].join(', ') || 'none'}]`,
        };
  };

/** Did it cite this policyholder record? */
const citesRecord =
  (id: string): Check =>
  ({ answer: a }) =>
    sources(a).some((s) => s.toUpperCase().includes(id.toUpperCase()))
      ? { pass: true, detail: `cited record ${id}` }
      : { pass: false, detail: `did not cite record ${id}; sources: [${sources(a).join(', ')}]` };

/** Which form did it say it used? */
const policyFormIs =
  (form: string): Check =>
  ({ answer: a }) =>
    a.policy_form?.toUpperCase() === form.toUpperCase()
      ? { pass: true, detail: `policy_form is ${form}` }
      : { pass: false, detail: `policy_form is ${a.policy_form ?? 'null'}, expected ${form}` };

const REGISTRY = createCheckRegistry<CoverageAnswer>({
  bare: {
    ...generic.bare,
    /** Step 1 of the procedure: establish whose policy it is before searching. */
    calls_record_first: callsFirst<CoverageAnswer>('get_policyholder'),
  },
  parameterised: {
    ...generic.parameterised,
    cites_form: citesForm,
    cites_record: citesRecord,
    policy_form_is: policyFormIs,
  },
});

/**
 * Every check name. Exported so `scorecard-selftest.ts` can assert each one is
 * classified into a severity bucket — adding a check without classifying it is
 * the bug that put a wrong dollar figure into `uncategorised` while the printed
 * card said "false answers: 1".
 */
export const CHECK_NAMES: string[] = REGISTRY.names();

export const resolveCheck = (spec: string): Check => REGISTRY.resolve(spec);
