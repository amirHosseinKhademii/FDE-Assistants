/**
 * THE CHECKS EVERY GROUNDED-ANSWER SYSTEM WANTS — without knowing your answer
 * type.
 *
 * A grounded assistant's answer has the same skeleton in every domain: some
 * prose, some cited sources, optionally a record of where documents disagreed,
 * and optionally a hand-off to a human. The CHECKS over that skeleton are the
 * same too — and every one below was written because a specific failure got
 * past a suite that lacked it.
 *
 * You supply accessors for your own shape; the checks come back bound to it.
 *
 * WHAT IS DELIBERATELY NOT HERE: anything that names one of your document
 * types. `cites_form` is insurance vocabulary and belongs in the application,
 * even though `cites_something` does not.
 */
import type { Check, CheckResult } from './checks';

/** How to read the parts of YOUR answer that these checks care about. */
export interface AnswerAccessors<A> {
  /** The prose answer, or null when the system could not answer. */
  answer(a: A): string | null;
  /** Every cited source string, verbatim as the model wrote it. */
  citations(a: A): string[];
  /** Recorded disagreements between sources. Omit if your domain has none. */
  conflicts?(a: A): Array<{ topic: string; resolvedBy: string | null }>;
  /** Non-null when a human must decide. Omit if your domain has no hand-off. */
  escalation?(a: A): { owner: string } | null;
}

/**
 * Whether a cited source names something real.
 *
 * Supplied by the application because only it knows where its corpus lives and
 * how its identifiers are spelled. The one piece of advice worth repeating:
 * **be lenient about formatting and strict about identity.** A check that
 * rejects a real citation over a separator trains you to ignore the single most
 * valuable check you have.
 */
export interface DocumentResolver {
  /** Does this source, minus any section fragment, name a real document? */
  exists(source: string): boolean;
}

/**
 * The standard checks, bound to your answer type.
 *
 * Returns registry-shaped maps so they can be spread straight into
 * `createCheckRegistry` alongside your domain-specific ones.
 */
export function createAnswerChecks<A>(
  acc: AnswerAccessors<A>,
  resolver: DocumentResolver,
): {
  bare: Record<string, Check<A>>;
  parameterised: Record<string, (arg: string) => Check<A>>;
} {
  const bare: Record<string, Check<A>> = {
    /** Claimed an answer and gave none. */
    has_answer: ({ answer }) => {
      const text = acc.answer(answer);
      return text && text.trim().length > 0
        ? { pass: true, detail: 'gave an answer' }
        : { pass: false, detail: 'answer is null or empty' };
    },

    /** Asserted something with no source at all. */
    cites_something: ({ answer }) => {
      const n = acc.citations(answer).length;
      return n > 0
        ? { pass: true, detail: `${n} citation(s)` }
        : { pass: false, detail: 'no citations at all' };
    },

    /**
     * Every cited source must name a document that exists.
     *
     * THE HIGHEST-VALUE CHECK HERE, and the one most specific to a regulated
     * domain. A fabricated citation is strictly worse than no citation: it
     * looks like evidence, so nobody re-checks it. And it is free to verify,
     * because the corpus is right there.
     *
     * It is also the check most likely to lie in the other direction. Three
     * separate times on 2026-09-11 a formatting difference — an unfamiliar id
     * prefix, a missing '#' — made it report real documents as fabrications,
     * which poisons the exact metric you steer by. Leniency belongs in the
     * resolver.
     */
    citations_resolve: ({ answer }) => {
      const bad = acc.citations(answer).filter((s) => !resolver.exists(s));
      return bad.length === 0
        ? {
            pass: true,
            detail: `all ${acc.citations(answer).length} citation source(s) resolve to real documents`,
          }
        : { pass: false, detail: `unresolvable citation(s): ${bad.join('; ')}` };
    },
  };

  if (acc.escalation) {
    const esc = acc.escalation;
    /** Did not hand over a question the corpus cannot settle. */
    bare.escalates = ({ answer }) => {
      const e = esc(answer);
      return e
        ? { pass: true, detail: `escalated to ${e.owner}` }
        : { pass: false, detail: 'did not escalate' };
    };
    /** The only failure here that is merely annoying rather than dangerous. */
    bare.does_not_escalate = ({ answer }) => {
      const e = esc(answer);
      return e
        ? { pass: false, detail: 'escalated when it should have answered' }
        : { pass: true, detail: 'answered without escalating' };
    };
  }

  if (acc.conflicts) {
    const con = acc.conflicts;
    /**
     * Did not report a contradiction that is really there — i.e. quietly picked
     * a side. The worst of the failure modes, because the answer looks
     * confident and cites a real document.
     */
    bare.flags_conflict = ({ answer }) => {
      const c = con(answer);
      return c.length > 0
        ? { pass: true, detail: `flagged ${c.length} conflict(s): ${c.map((x) => x.topic).join('; ')}` }
        : { pass: false, detail: 'conflicts is empty — it never noticed the documents disagree' };
    };
  }

  const contains =
    (needle: string, want: boolean) =>
    ({ answer }: { answer: A }): CheckResult => {
      const text = acc.answer(answer) ?? '';
      const hit = text.toLowerCase().includes(needle.toLowerCase());
      if (want) {
        return hit
          ? { pass: true, detail: `answer contains "${needle}"` }
          : { pass: false, detail: `answer does not contain "${needle}": "${text.slice(0, 140)}"` };
      }
      return hit
        ? { pass: false, detail: `answer wrongly contains "${needle}": "${text.slice(0, 140)}"` }
        : { pass: true, detail: `answer does not contain "${needle}"` };
    };

  return {
    bare,
    parameterised: {
      /**
       * A SUBSTRING SEARCH, with everything that implies. It cannot tell "the
       * answer is $40" from "the endorsement replaces the form's $40" — a
       * distinction that cost three correct answers a dangerous-failure label
       * on 2026-09-11, twice, because the lesson was documented in one case and
       * repeated in the next. Prefer a positive assertion where you can.
       */
      answer_contains: (needle) => contains(needle, true),
      answer_lacks: (needle) => contains(needle, false),
    },
  };
}
