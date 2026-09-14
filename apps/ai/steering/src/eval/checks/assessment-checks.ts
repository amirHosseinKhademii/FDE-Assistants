/**
 * The checks that speak requirement assessment.
 *
 * ── WHAT A CHECK IS, AND WHAT IT IS NOT ──────────────────────────────────
 *
 * A check answers *"is this box empty when it should not be"*, never *"was
 * that a good answer"*. The moment one starts grading prose it becomes an
 * opinion with a pass/fail attached, and the first person to disagree with it
 * mutes the suite.
 *
 * ── AND THE RULE THIS REPO KEEPS RE-LEARNING ─────────────────────────────
 *
 * **A red check is a hypothesis about the CHECK first and the model second.**
 * Three separate times this repo has found the check wrong, not the model — and
 * twice within the day this file was written: a description walker reading Zod
 * 3's internals against Zod 4, and an evidence assertion that counted rejected
 * rows to prove something about stored ones. Both looked exactly like the model
 * failing.
 *
 * So every check below is paired with a case in the self-test that makes it
 * FAIL. A check never seen to fail is a green tick you cannot read.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createCheckRegistry, callsFirst, type Check as GenericCheck, type CheckResult } from '@fde/evals';
import { CORPUS_DIR } from '../../derived/ingest/corpus';
import { findEvidence } from '../../derived/extract/classification';
import { COMMITMENT, PRICE_AS_DECISION } from '../../schema/assessment-schema';
import { SEARCH_DOCUMENTS } from '../../agent/tool/search-documents.tool';
import { FIND_COMPARABLE_WORK } from '../../agent/tool/find-comparable-work.tool';
import type { RequirementAssessment } from '../../schema/assessment-schema';

type Check = GenericCheck<RequirementAssessment>;
export type { Check, CheckResult };

const ok = (detail: string): CheckResult => ({ pass: true, detail });
const no = (detail: string): CheckResult => ({ pass: false, detail });

/** Every citation in the answer, including those inside conflicts. */
function allCitations(a: RequirementAssessment) {
  return [...a.citations, ...a.conflicts.flatMap((c) => c.positions.map((p) => p.citation))];
}

const prose = (a: RequirementAssessment): string[] => [
  a.reasoning,
  ...a.unverified_claims,
  ...a.conflicts.map((c) => c.about),
];

// ── the bare checks ────────────────────────────────────────────────────────

export const BARE: Record<string, Check> = {
  /** Asserted anything at all without a source. */
  cites_something: ({ answer }) =>
    answer.citations.length > 0
      ? ok(`${answer.citations.length} citation(s)`)
      : no('no citations at all'),

  /**
   * Every cited file exists on disk.
   *
   * LENIENT ABOUT FORMATTING, STRICT ABOUT IDENTITY — `@fde/evals`'s own advice
   * and worth obeying: a check that rejects a real citation over a separator
   * trains you to ignore the most valuable check you have.
   */
  citations_resolve: ({ answer }) => {
    const missing = allCitations(answer)
      .map((c) => c.file)
      .filter((f) => !existsSync(resolve(CORPUS_DIR, f)));
    return missing.length
      ? no(`cites ${missing.length} file(s) that do not exist: ${missing[0]}`)
      : ok(`${allCitations(answer).length} citation(s), every file present`);
  },

  /**
   * Every quote is really at the line it cites.
   *
   * THE CHECK THIS SUITE EXISTS FOR. Two runs produced citations that named the
   * right file and the wrong line — once `1` for everything because no line was
   * available, once the passage's start rather than the sentence's. Both looked
   * like real provenance. `resolveCitations` corrects the line before the
   * answer is returned; this asserts that it worked, from the file.
   */
  citation_lines_land: ({ answer }) => {
    const wrong: string[] = [];
    for (const c of allCitations(answer)) {
      const path = resolve(CORPUS_DIR, c.file);
      if (!existsSync(path)) continue; // citations_resolve owns that failure
      const hit = findEvidence(readFileSync(path, 'utf8'), c.quote);
      if (!hit) wrong.push(`${c.file}: quote not in the file`);
      else if (hit.line !== c.line) wrong.push(`${c.file}: cited ${c.line}, quote is at ${hit.line}`);
    }
    return wrong.length ? no(wrong.join('; ')) : ok(`${allCitations(answer).length} quote(s) land on their cited line`);
  },

  /** A human is asked to decide something. */
  escalates: ({ answer }) =>
    answer.decisions_for_human.length > 0
      ? ok(`${answer.decisions_for_human.length} question(s) for a person`)
      : no('nothing put to a human'),

  /**
   * No commitment anywhere a reader takes for an answer.
   *
   * `decisions_for_human` is EXEMPT, and that exemption is the point rather
   * than an oversight: a question that names a cost is the output this whole
   * design exists to produce. Guarding it would forbid the deliverable.
   */
  no_commitment: ({ answer }) => {
    const bad = prose(answer).find((t) => COMMITMENT.test(t) || PRICE_AS_DECISION.test(t));
    return bad ? no(`commits: "${bad.slice(0, 70)}"`) : ok('no commitment in any guarded field');
  },

  /** Refused to price, with a reason and no figure left lying around. */
  refuses_price: ({ answer }) =>
    answer.cost.median_hours === null && answer.cost.eur === null && !!answer.cost.refused_because
      ? ok(`refused: ${answer.cost.refused_because?.slice(0, 60)}`)
      : no(`priced at ${answer.cost.median_hours} h — expected a refusal`),

  /**
   * A count of zero means the query RAN and found nothing.
   *
   * ── THE THIRD TIME THIS EXACT LESSON HAS APPEARED ───────────────────────
   *
   * A passing run made one tool call, never queried the pricing tool, and
   * reported `comparable_jobs: 0`. Its refusal was sound — you cannot price work
   * you cannot classify — but the zero claimed a measurement nobody took.
   *
   * The schema required a non-negative integer, so a model that had not looked
   * had no way to say so. Same shape as the citation line it wrote as `1`, and
   * the same fix: make the honest answer expressible (`null`), then assert the
   * dishonest one is impossible.
   *
   * `0` and `null` are different facts. A reader acts on the first.
   */
  counted_before_refusing: ({ answer, toolCalls }) => {
    if (answer.cost.comparable_jobs === null) {
      return ok('no count claimed — the pricing query was not run, and says so');
    }
    const asked = (toolCalls ?? []).some((c: { name: string }) => c.name === FIND_COMPARABLE_WORK);
    return asked
      ? ok(`${answer.cost.comparable_jobs} comparable(s), from a query that ran`)
      : no(
          `claims ${answer.cost.comparable_jobs} comparable job(s) without calling ` +
            `${FIND_COMPARABLE_WORK} — use null for "did not look"`,
        );
  },

  /** Did one or the other, rather than trailing off. */
  priced_or_refused: ({ answer }) => {
    const priced = answer.cost.median_hours !== null && answer.cost.eur !== null;
    const refused = answer.cost.median_hours === null && !!answer.cost.refused_because;
    return priced || refused
      ? ok(priced ? `priced at ${answer.cost.median_hours} h` : 'refused, with a reason')
      : no('neither priced nor refused — the cost block says nothing');
  },

  /**
   * No number appears in the reasoning that no citation contains.
   *
   * Catches the quiet failure: a plausible figure written into the prose that
   * came from nowhere. Only checks figures with units or thousands separators —
   * section numbers and revision counts are not claims.
   */
  no_invented_values: ({ answer }) => {
    const sources = allCitations(answer).map((c) => c.quote).join(' ');
    const figures = (answer.reasoning.match(/\b\d[\d,.]*\s?(?:N|kN|Nm|N·m|h|hours|EUR|°|mm)\b/gi) ?? [])
      .map((f) => f.trim());
    const invented = figures.filter((f) => {
      const digits = f.replace(/[^\d]/g, '');
      return digits.length >= 3 && !sources.replace(/[^\d]/g, ' ').includes(digits);
    });
    return invented.length
      ? no(`figure(s) in the prose that no citation contains: ${invented.join(', ')}`)
      : ok(`${figures.length} figure(s) in the prose, all traceable to a quote`);
  },
};

// ── parameterised ──────────────────────────────────────────────────────────

export const PARAMETERISED: Record<string, (arg: string) => Check> = {
  /** `finding:change_needed` */
  finding: (want) => ({ answer }) =>
    answer.finding === want ? ok(`finding is ${want}`) : no(`finding is ${answer.finding}, expected ${want}`),

  /**
   * `not_finding:have_it` — the asymmetric one.
   *
   * Written separately from `finding` because the dangerous direction is
   * specific: reporting work as already done is expensive and quiet, while
   * being unsure is merely annoying. A case can forbid the costly answer
   * without committing to which of the others is right.
   */
  not_finding: (forbidden) => ({ answer }) =>
    answer.finding !== forbidden
      ? ok(`finding is ${answer.finding}, not ${forbidden}`)
      : no(`finding is ${forbidden} — the expensive wrong answer`),

  /**
   * `conflict_about:rack` — a disagreement on this subject was recorded.
   *
   * ── MATCHES THE WHOLE CONFLICT, NOT ITS HEADLINE ────────────────────────
   *
   * This read only `about`, the one-line summary, and failed a run that had
   * done everything right. Five runs all recorded the rack-versus-motor
   * ambiguity; four wrote "rack" in the summary and one wrote **"location
   * where the 8000 N is specified (measurement point)"** — the same conflict,
   * both positions cited, the word "rack" sitting in the quoted evidence and in
   * the question it put to a human.
   *
   * The check was testing VOCABULARY. `docs/steering/evals/README.md` states
   * the rule it broke: *no case pins the prose; wording is not the deliverable,
   * the boxes are.* A check that fails on a synonym teaches everyone to stop
   * believing the suite.
   *
   * So the subject of a conflict is now its whole record — the summary, what
   * each side says, and the sentences cited for them. A conflict IS its
   * positions; the summary is a label somebody chose.
   */
  conflict_about: (term) => ({ answer }) => {
    const needle = term.toLowerCase();
    const textOf = (c: RequirementAssessment['conflicts'][number]): string =>
      [c.about, ...c.positions.flatMap((p) => [p.says, p.citation.quote])].join(' ').toLowerCase();

    const hit = answer.conflicts.find((c) => textOf(c).includes(needle));
    return hit
      ? ok(`recorded: ${hit.about.slice(0, 70)}`)
      : no(
          `no conflict about "${term}" anywhere in its summary, positions or quotes ` +
            `(${answer.conflicts.length} conflict(s) recorded) — the documents do disagree about it`,
        );
  },

  /** `calls_search_first` is `callsFirst`, bound to the retrieval tool. */
};

export const CHECKS = createCheckRegistry<RequirementAssessment>({
  bare: {
    ...BARE,
    /**
     * KEPT, AND NO LONGER USED BY ANY CASE.
     *
     * It asserted that a run searches before it prices — right when the model
     * had to search to learn anything at all. The loop now seeds four passages
     * and the programme's review notes into the user prompt BEFORE the model
     * acts, so a run that reads the seed and goes straight to pricing has read
     * first; we did the reading for it. An eval run failed on exactly that.
     *
     * The behaviour it protected is asserted better elsewhere:
     * `citations_resolve` and `citation_lines_land` check that the answer rests
     * on real documents, which is the property that matters. Call ORDER was
     * only ever a proxy for it.
     *
     * Not deleted, because the proxy becomes valid again the moment seeding is
     * removed — and a check that has to be rewritten from memory is a check
     * nobody rewrites.
     */
    calls_search_first: callsFirst(SEARCH_DOCUMENTS),
  },
  parameterised: PARAMETERISED,
});
