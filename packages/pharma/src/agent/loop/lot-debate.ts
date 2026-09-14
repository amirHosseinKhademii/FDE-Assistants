/**
 * TWO ADVOCATES AND AN ADJUDICATOR, for the lots where the answer is genuinely
 * contested.
 *
 * ══ WHY DEBATE HERE AND NOWHERE ELSE ══════════════════════════════════════
 *
 * Most of a supplier-impact work list is not arguable. "Did this lot ship to a
 * hospital" is on file; two agents disputing it is theatre, and theatre costs
 * money and latency like the real thing.
 *
 * What IS arguable is what SOP-SCM-004 §7.3 leaves open on purpose. It offers
 * no action / quarantine / customer notification / recall, and §7.2 says in
 * terms that distribution status CONSTRAINS the available actions and "does not
 * by itself decide the outcome". So for a lot that reached a dispensing
 * customer, carrying material from a supplier disqualified for an undeclared
 * change of synthesis route, the procedure deliberately does not tell you the
 * answer. Two competent people disagree. That is the definition of a question
 * worth arguing, and it is rare — which is why `isContested` below is narrow.
 *
 * AND THE ARGUMENT IS ABOUT SEQUENCE, NOT ABOUT EVIDENCE — protect then test,
 * or test then act. The evidence position is stipulated for both sides; see
 * `STIPULATED`, which exists because getting this wrong cost three runs.
 *
 * ══ THE ADJUDICATOR DOES NOT WIN THE ARGUMENT ═════════════════════════════
 *
 * It cannot. `RECALL_VERDICT` in the answer schema rejects the sentence, and
 * `assess-supplier-impact.ts` says it plainly: a recall is a regulatory
 * decision with a legal clock, made by people with names.
 *
 * So the adjudicator's output is NOT a verdict. It is an escalation that
 * carries BOTH cases to the human who is allowed to decide — which is what a
 * real QA escalation memo is: here is the strongest version of each argument,
 * here is precisely what you must decide, here is what would settle it.
 *
 * That reframing is the point. A single model asked "recall or not?" returns
 * an averaged, confident-sounding middle. A debate hands the QP the two real
 * positions and makes the disagreement visible instead of dissolving it.
 *
 * ══ WHY THERE IS A REBUTTAL ROUND ═════════════════════════════════════════
 *
 * Without one this is not a debate, it is two monologues written in separate
 * rooms. Round 1 is independent so neither advocate anchors on the other;
 * round 2 shows each the opposing case and asks what survives. The interesting
 * output is usually round 2's concession — the point an advocate GIVES UP is
 * more informative than the point it keeps.
 *
 * ══ THE FAILURE MODE, AND WHAT IT TURNED OUT TO BE ════════════════════════
 *
 * Both advocates are the same model reading the same evidence, so the obvious
 * risk is that they collapse into agreeing — polite, symmetrical, useless.
 * `concedes` and `what_would_change_my_mind` exist so that collapse is visible
 * in a field rather than buried in prose, and `rebuttalValue` measures it.
 *
 * It happened three runs in a row, always to the same side, and the diagnosis
 * was wrong the first two times. See `STIPULATED` below: the two sides had been
 * given DIFFERENT QUESTIONS — one about evidence, one about action — and the
 * evidence claim was simply true, so an honest advocate conceded it every time.
 * That was a design error being measured as a model failure. Recorded because
 * the instinct to blame the model is strong and was wrong.
 *
 * An advocate is told to argue its side HONESTLY, never to win. Inventing
 * evidence to strengthen a case is the one thing that would make this worse
 * than no debate at all, so both are held to the same rule as the rest of the
 * system: cite what you were given and nothing else.
 *
 * ══ WHAT THE ADJUDICATOR MAY LOOK UP ══════════════════════════════════════
 *
 * It alone has `search_procedures`, and only because an earlier version,
 * asked to cite the clause setting the urgency and given no way to read one,
 * produced "72 hours per company Field Action SOP" — no such SOP exists, and
 * the real clause (§7.4) says five working days. A participant told to ground a
 * claim in a source it cannot reach will produce a plausible source. The
 * advocates still get nothing: two advocates retrieving their own supporting
 * passages is a debate about two different documents.
 */
import { z } from 'zod';
import { ToolRegistry, runLoop, loopChoice, type LoopChoice } from '@fde/agent';
import { createAnswerValidator } from '@fde/schema';
import { env } from '@fde/foundry';
import type OpenAI from 'openai';
import { lotBrief } from './lot-assessor';
import { recallVerdictIn } from '../../schema/supplier-impact-schema';
import { measureAgreement, type AgreementResult } from '@fde/evals';
import type { AffectedLotAssessment } from '../../tools/functions/assess-supplier-impact';

// ── who argues what ────────────────────────────────────────────────────────

export type Side = 'precaution' | 'proportion';

/**
 * WHAT BOTH SIDES MUST ACCEPT BEFORE THEY START.
 *
 * ══ WHY THIS EXISTS: THREE RUNS, THREE COLLAPSES, ALWAYS THE SAME SIDE ═════
 *
 * The first design had precaution arguing "the hazard has not been excluded" —
 * a claim about EVIDENCE — and proportion arguing "the response must be
 * proportionate" — a claim about ACTION. Those are not the same question, and
 * the asymmetry decided the debate before it began.
 *
 * Nobody tested for an impurity nobody knew to look for, so "not excluded" is
 * simply TRUE on this evidence. Proportion was being asked to dispute a true
 * statement, and an honest model concedes a true statement. Every run it did:
 * `concedes` ended up carrying the opposing thesis verbatim. That was read as
 * an advocate being weak. It was an advocate being HONEST inside a badly framed
 * debate — a design error measured as a model failure.
 *
 * So the evidence gap is now STIPULATED, symmetrically, and taken off the
 * table. Neither side may claim the hazard has been excluded; neither may claim
 * a defect has been demonstrated. Both statements are true of the record and
 * neither side can win by conceding.
 *
 * What remains is a real disagreement that cannot be conceded away, because it
 * is about what to DO under acknowledged uncertainty — which is precisely the
 * judgement SOP-SCM-004 §7.3 leaves to a human, and therefore the only thing
 * worth putting in front of one.
 */
export const STIPULATED = [
  'STIPULATED — BOTH SIDES ACCEPT THIS AND NEITHER MAY RE-ARGUE IT:',
  '',
  '  1. The hazard has NOT been excluded. The supplier was disqualified for an',
  '     undeclared change of synthesis route and incomplete impurity data, so the',
  '     material is not fully characterised and routine release testing looks for',
  '     expected attributes, not unknown ones.',
  '',
  '  2. A defect has NOT been demonstrated. No lot-specific test failure appears',
  '     in the record. The lot met every specification applied to it.',
  '',
  'Both statements are true of this record. An argument that spends itself',
  'proving either one has argued for nothing, and an argument that CONCEDES',
  'either one has conceded nothing — they were never in dispute.',
  '',
  'YOU ARE ARGUING ABOUT WHAT TO DO NEXT, under uncertainty that will not resolve',
  'before someone has to act.',
].join('\n');

export const SIDES: Record<Side, { label: string; brief: string }> = {
  /**
   * "Protect first." NOT "argue for a recall" — the schema forbids that
   * sentence, and asking a model to write it and then punishing it is a trap
   * rather than a test. It argues about SEQUENCE: protection before proof.
   */
  precaution: {
    label: 'protect patients now; testing can follow',
    brief: [
      'You argue that where a hazard cannot be excluded and product has already',
      'reached people, PROTECTIVE ACTION COMES FIRST and confirmatory testing',
      'follows it. Waiting for proof is a decision to leave exposure in place while',
      'you gather it.',
      '',
      'Your case usually rests on: that the people holding this product cannot',
      'consent to a risk nobody has told them about; that testing takes time the',
      'exposed population is already spending; that §7.3 sets the bar at "cannot',
      'exclude", so the trigger for action is already met and further evidence can',
      'only lift the restriction, not justify delaying it; and that an action taken',
      'early and later relaxed is recoverable, while exposure that continues while',
      'you test is not.',
      '',
      'DO NOT re-argue that the hazard is unexcluded — it is stipulated. Arguing it',
      'again is arguing with nobody.',
    ].join('\n'),
  },

  /**
   * "Investigate first." Arguing the same question — what to do — from the
   * opposite end. Its strength is that withdrawal is itself a patient-safety
   * event, which is true, unpopular, and not conceded away by admitting the
   * evidence gap.
   */
  proportion: {
    label: 'test first; act on what the testing shows',
    brief: [
      'You argue that where no defect has been demonstrated, TARGETED TESTING COMES',
      'FIRST and the action follows the result. Acting before you know what you are',
      'acting on is not caution, it is guessing with consequences.',
      '',
      'Your case usually rests on: that withdrawing a medicine is itself a',
      'patient-safety event — a shortage of an antibiotic harms real people, and',
      '"do something" is not a neutral default; that retained samples can be tested',
      'in days, which is inside the clock §7.4 sets; that §7.2 says distribution',
      'status constrains the options but does not decide the outcome, and §7.3',
      'expressly permits closing a lot that reached a dispensing customer with no',
      'action; and that an action taken on no evidence cannot be defended to a',
      'regulator afterwards, which matters because you will have to.',
      '',
      'DO NOT re-argue that no defect was demonstrated — it is stipulated. And do',
      'NOT concede the evidence gap as though it settled the question: it is',
      'granted, it is not an argument against you, and treating it as one is how',
      'this side has lost three debates it should have won.',
    ].join('\n'),
  },
};

const Argument = z.strictObject({
  position: z
    .string()
    .describe(
      'Your position in one sentence, as a claim about WHAT SHOULD HAPPEN NEXT and ' +
        'in what order — not about what the evidence shows. The evidence is ' +
        'stipulated; the sequence of action is what is in dispute.',
    ),
  strongest_point: z
    .string()
    .describe(
      'The single reason your SEQUENCE is right, if you could keep only one. ' +
        'Specific to THIS lot. Restating a stipulated fact is not a point.',
    ),
  argument: z.string().describe('Your case, in a few sentences. No headings, no bullet lists.'),
  evidence_refs: z
    .array(z.string())
    .describe(
      'Refs from the brief you were given, verbatim. Cite ONLY these. An argument ' +
        'that needs a fact you were not given is an argument you must weaken instead.',
    ),
  holds: z
    .string()
    .describe(
      'What in YOUR case survives the opposing argument, and why it survives. ' +
        'Answer this before conceding anything. If nothing survives, say that ' +
        'plainly — but do not reach for the other side\'s position to fill the gap.',
    ),
  concedes: z
    .string()
    .describe(
      'The strongest thing the OTHER side has ABOUT WHAT TO DO, stated fairly. ' +
        'NOT a stipulated fact: conceding "the hazard cannot be excluded" or "no ' +
        'defect was demonstrated" concedes nothing, because both were granted ' +
        'before you began. Name a real cost of your own sequence instead — every ' +
        'sequence has one, and an advocate that cannot name its own is reciting.',
    ),
  what_would_change_my_mind: z
    .string()
    .describe(
      'A specific fact or test result that would move you. "More information" is ' +
        'not an answer; name what information.',
    ),
});

export type LotArgument = z.infer<typeof Argument>;

const validateArgument = createAnswerValidator<LotArgument>({ schema: Argument, coherence: [] });

/**
 * The adjudicator's output: an ESCALATION, not a verdict.
 *
 * `decision_for_human` is the question the QP must answer, phrased as a
 * question. If the adjudicator ever finds itself writing an answer there, the
 * design has failed — and `RECALL_VERDICT` on the assembled dossier is the
 * backstop that catches it.
 */
const Adjudication = z.strictObject({
  decision_for_human: z
    .string()
    .describe(
      'The question the Qualified Person must decide, phrased AS A QUESTION. You ' +
        'are not answering it. You are making it precise enough to be answerable.',
    ),
  case_for_precaution: z
    .string()
    .describe('The case for protecting first and testing after, at its strongest, in one or two sentences.'),
  case_for_proportion: z
    .string()
    .describe('The case for testing first and acting on the result, at its strongest, in one or two sentences.'),
  where_they_agree: z
    .string()
    .describe(
      'What both advocates accept. Often the most useful line on the page: it is ' +
        'the part the human does not have to re-litigate.',
    ),
  what_would_settle_it: z
    .string()
    .describe(
      'The specific evidence that would resolve the disagreement — a test, a ' +
        'record, a supplier response. Name it.',
    ),
  suggested_owner: z
    .string()
    .describe('Who must decide, by role, e.g. "Qualified Person, DEPT-QA". Routing, not a decision.'),
  urgency_basis: z
    .string()
    .describe(
      'Why this timescale, QUOTING the clause you retrieved and naming its ' +
        'revision. Not an adjective, and not a number from general knowledge: if ' +
        'the procedures state no timescale for this situation, say exactly that. ' +
        'An invented deadline is worse than an absent one, because it gets acted on.',
    ),
});

export type LotAdjudication = z.infer<typeof Adjudication>;

const validateAdjudication = createAnswerValidator<LotAdjudication>({
  schema: Adjudication,
  coherence: [
    (a) => {
      const errs: string[] = [];

      // The whole design in one rule: a question, not an answer.
      if (!a.decision_for_human.trim().endsWith('?')) {
        errs.push(
          'decision_for_human must be a QUESTION for the Qualified Person. ' +
            'An adjudicator that answers it has made the decision this system is ' +
            'built not to make.',
        );
      }

      // ── THE GUARD THIS PATH WAS MISSING ────────────────────────────────
      //
      // Added 2026-09-12 after the adjudicator wrote "a recall ... is
      // warranted" and nothing objected. The dossier schema had carried this
      // rule since it was written; the debate was a SECOND route to an answer
      // and inherited the machinery without inheriting the guarantee.
      // `NEXT.md` §N1 already puts it in one line: inheriting is not asserting.
      //
      // `decision_for_human` is DELIBERATELY EXEMPT. It is a question by
      // construction — enforced above — and "should this lot be recalled?" put
      // TO a Qualified Person is the correct output of this whole exercise.
      // Guarding it would forbid the one sentence the design exists to produce.
      const assertions: [string, string][] = [
        ['case_for_precaution', a.case_for_precaution],
        ['case_for_proportion', a.case_for_proportion],
        ['where_they_agree', a.where_they_agree],
        ['what_would_settle_it', a.what_would_settle_it],
        ['urgency_basis', a.urgency_basis],
      ];
      for (const [where, text] of assertions) {
        const err = recallVerdictIn(where, text);
        if (err) errs.push(err);
      }

      return errs;
    },
  ],
});

// ── which lots are worth arguing about ─────────────────────────────────────

/**
 * A lot is contested when the procedure genuinely leaves the answer open.
 *
 * NARROW ON PURPOSE. Every lot here costs five model calls instead of one, so
 * the test has to earn that. Two conditions, both required:
 *
 *   it left our control          — a lot in the warehouse is quarantined, and
 *                                  nobody argues about quarantining it
 *   it carries at least one finding — a clean lot has nothing to weigh
 *
 * Expired lots are excluded even when they travelled: §7.2 puts them beyond
 * recovery, so the available actions are the same whoever argues.
 */
export function isContested(lot: AffectedLotAssessment): boolean {
  if (lot.exposure === 'in_our_control' || lot.exposure === 'expired') return false;
  return lot.findings.length > 0;
}

// ── did the rebuttal round earn its two extra calls? ───────────────────────

/**
 * THE MEASUREMENT NOW LIVES IN `@fde/evals` — extracted 2026-09-12.
 *
 * Word overlap, the convergence delta and the verdicts are arithmetic over two
 * pairs of strings and know nothing about medicines. What stays here is WHICH
 * FIELDS to compare and at what thresholds, and that choice is not incidental:
 * a measurement that watches one field gets evaded in another.
 *
 * This suite reported "held apart" on a run where the proportion advocate had
 * conceded, in `concedes`, that "patient exposure cannot be excluded" — the
 * opposing thesis verbatim, and under §7.3 the whole test. Positions had
 * diverged; the collapse had moved to the field nobody was reading. So
 * `conceded` is passed, and the package's own documentation now says to watch
 * the field where giving up is CHEAPEST rather than most visible.
 */
export function rebuttalValue(d: Pick<DebateResult, 'opening' | 'rebuttal'>): AgreementResult | null {
  const o1 = d.opening.precaution;
  const o2 = d.opening.proportion;
  const r1 = d.rebuttal.precaution;
  const r2 = d.rebuttal.proportion;
  if (!o1 || !o2 || !r1 || !r2) return null;

  // Position AND strongest point together: an advocate can hold a bland
  // position while its one kept argument drifts to the other side.
  const stance = (a: LotArgument): string => `${a.position} ${a.strongest_point}`;

  return measureAgreement({
    opening: [stance(o1), stance(o2)],
    rebuttal: [stance(r1), stance(r2)],
    conceded: [r1.concedes, r2.concedes],
  });
}

// ── the debate ─────────────────────────────────────────────────────────────

export interface DebateOptions {
  lot: AffectedLotAssessment;
  supplier: { supplierId: string; name: string; disqualifiedOn: string | null; reason: string | null };
  client: OpenAI;
  loop?: string;
  /** Skip the rebuttal round. Cheaper, and no longer really a debate. */
  rebuttal?: boolean;
  /**
   * Tools for the ADJUDICATOR only — in practice `search_procedures`, so the
   * urgency it states is the clock SOP-SCM-004 §7.4 actually sets rather than
   * one it invented. Omit and it will say so instead of guessing.
   */
  procedures?: ToolRegistry;
  /**
   * Called as each stage finishes, so a surface can show the argument being
   * made rather than a spinner over the whole thing.
   *
   * A DEBATE IS THE ONE PLACE WHERE WATCHING IT HAPPEN IS THE POINT. The output
   * is an escalation memo a human reads in thirty seconds; the value of seeing
   * it assembled is that you watch two positions form independently and then
   * answer each other, which is precisely what a single confident paragraph
   * hides. A progress percentage over that would throw away the only part worth
   * looking at.
   *
   * STAGES, NOT TOKENS. Each call is validated against its schema before it
   * counts, so there is nothing honest to stream mid-sentence — a half-arrived
   * argument has not been checked yet.
   */
  onStage?: (stage: {
    round: 'opening' | 'rebuttal' | 'adjudication';
    side?: Side;
    /** Null when that participant produced nothing valid. */
    value: LotArgument | LotAdjudication | null;
  }) => void;
}

export interface DebateResult {
  lotId: string;
  opening: Partial<Record<Side, LotArgument>>;
  rebuttal: Partial<Record<Side, LotArgument>>;
  adjudication: LotAdjudication | null;
  /** Every failure, named. A debate missing a side is not a debate. */
  errors: string[];
  calls: number;
  inputTokens: number;
  cachedInputTokens?: number;
  outputTokens: number;
  ms: number;
}

interface Tally {
  inputTokens: number;
  outputTokens: number;
  cached: number;
  cachedSeen: boolean;
  calls: number;
}

async function speak<T>(
  tally: Tally,
  client: OpenAI,
  choice: LoopChoice,
  name: string,
  system: string,
  user: string,
  schema: z.ZodType,
  validate: (raw: string) => { ok: boolean; value?: unknown; errors?: string },
  /**
   * Tools, for the one participant that needs them.
   *
   * ADVOCATES GET NONE AND THE ADJUDICATOR GETS `search_procedures`. That split
   * is a finding, not a preference: the first run invented "within 72 hours ...
   * per company Field Action SOP timeline", when the real clock is
   * SOP-SCM-004 §7.4's five working days. It had been ASKED to cite the rule
   * setting the urgency and given no way to read one. A participant told to
   * ground a claim in a source it cannot reach will produce a plausible source.
   *
   * The advocates still get none, because their job is to argue over evidence
   * already in the brief — and two advocates each retrieving their own
   * supporting passages is how you get a debate about different documents.
   */
  registry?: ToolRegistry,
): Promise<T | null> {
  const result = await runLoop<T>(choice, client, env.chatDeployment(), registry ?? new ToolRegistry([]), user, {
    system,
    responseFormat: schema,
    validate: validate as any,
    agentName: name,
    reasoningEffort: 'low',
    // Room for a retrieval round-trip when a registry is supplied; still tight,
    // because an adjudicator that keeps searching is one that cannot decide.
    maxTurns: registry ? 4 : 2,
  });
  tally.calls += 1;
  for (const t of result.turns) {
    tally.inputTokens += t.inputTokens;
    tally.outputTokens += t.outputTokens;
    if (typeof t.cachedInputTokens === 'number') {
      tally.cached += t.cachedInputTokens;
      tally.cachedSeen = true;
    }
  }
  return result.structured ?? null;
}

/**
 * Run the debate for one contested lot.
 *
 * NEVER THROWS, same as `assessOneLot`: this runs across several lots at once
 * and one failed advocate must not take the rest down. A missing side comes
 * back in `errors` and the adjudication is skipped rather than being made on
 * half an argument — a one-sided "debate" presented as a balanced escalation
 * would be worse than no debate, because it would look like one.
 */
/**
 * The system prompt for one advocate, in one round.
 *
 * LIFTED OUT OF `debateLot` 2026-09-12. It was a closure inside a 163-line
 * async function, which meant the single most consequential text in this file —
 * the thing that decided three debates before anyone noticed the framing was
 * wrong — could not be read, diffed or asserted without spending five model
 * calls to reach it.
 *
 * PURE. Given a side and optionally the opposing case, it returns a string.
 * That is the whole contract, and it is now checkable offline.
 */
export function advocateSystem(side: Side, opposing?: LotArgument): string {
  return [
    `You are an advocate in a structured disagreement about ONE product lot.`,
    `Your side: ${SIDES[side].label}.`,
    '',
    STIPULATED,
    '',
    SIDES[side].brief,
    '',
    'ARGUE HONESTLY, NOT TO WIN. Cite only refs from the brief. If you need a',
    'fact you were not given, weaken your claim rather than inventing it — an',
    'advocate caught inventing evidence makes the whole exercise worthless.',
    '',
    'DO NOT write that the lot must be recalled, or that it is cleared. Neither',
    'is yours to say. You are arguing about what the EVIDENCE supports; a human',
    'decides what happens.',
    ...(opposing
      ? [
          '',
          'THE OPPOSING CASE HAS NOW BEEN PUT TO YOU:',
          `  position: ${opposing.position}`,
          `  strongest point: ${opposing.strongest_point}`,
          `  argument: ${opposing.argument}`,
          '',
          'ANSWER IT — do not absorb it. Start from what in YOUR case still',
          'stands after reading theirs, and say why it stands. Only then name',
          'what you genuinely concede.',
          '',
          'THE FAILURE TO AVOID, which is the common one when both advocates are',
          'the same model: drifting into agreement. If your `strongest_point`',
          'has become a point that HELPS the other side, you have stopped',
          'advocating. Your job is not to reach the balanced view — the',
          'adjudicator does that, and it cannot do it if both sides hand it the',
          'same answer. Hold your position unless the evidence in the brief',
          'actually defeats it.',
        ]
      : []),
  ].join('\n');
}

export async function debateLot(opts: DebateOptions): Promise<DebateResult> {
  const started = Date.now();
  const choice: LoopChoice = loopChoice(opts.loop);
  const tally: Tally = { inputTokens: 0, outputTokens: 0, cached: 0, cachedSeen: false, calls: 0 };
  const errors: string[] = [];
  const brief = lotBrief(opts.lot, opts.supplier);

  try {
    // ── round 1: independent, so neither anchors on the other ──────────────
    const [a, b] = await Promise.all([
      speak<LotArgument>(tally, opts.client, choice, `advocate:precaution:${opts.lot.lotId}`,
        advocateSystem('precaution'), brief, Argument, validateArgument),
      speak<LotArgument>(tally, opts.client, choice, `advocate:proportion:${opts.lot.lotId}`,
        advocateSystem('proportion'), brief, Argument, validateArgument),
    ]);

    const opening: Partial<Record<Side, LotArgument>> = {};
    if (a) opening.precaution = a; else errors.push('precaution advocate produced no valid opening');
    if (b) opening.proportion = b; else errors.push('proportion advocate produced no valid opening');
    opts.onStage?.({ round: 'opening', side: 'precaution', value: a ?? null });
    opts.onStage?.({ round: 'opening', side: 'proportion', value: b ?? null });

    // ── round 2: each sees the other, and must answer it ───────────────────
    const rebuttal: Partial<Record<Side, LotArgument>> = {};
    if (opts.rebuttal !== false && a && b) {
      const [ar, br] = await Promise.all([
        speak<LotArgument>(tally, opts.client, choice, `rebut:precaution:${opts.lot.lotId}`,
          advocateSystem('precaution', b), brief, Argument, validateArgument),
        speak<LotArgument>(tally, opts.client, choice, `rebut:proportion:${opts.lot.lotId}`,
          advocateSystem('proportion', a), brief, Argument, validateArgument),
      ]);
      if (ar) rebuttal.precaution = ar; else errors.push('precaution advocate produced no valid rebuttal');
      if (br) rebuttal.proportion = br; else errors.push('proportion advocate produced no valid rebuttal');
      opts.onStage?.({ round: 'rebuttal', side: 'precaution', value: ar ?? null });
      opts.onStage?.({ round: 'rebuttal', side: 'proportion', value: br ?? null });
    }

    // ── the adjudicator: frames the decision, never makes it ───────────────
    let adjudication: LotAdjudication | null = null;
    const finalA = rebuttal.precaution ?? opening.precaution;
    const finalB = rebuttal.proportion ?? opening.proportion;

    if (finalA && finalB) {
      const put = (side: string, x: LotArgument): string =>
        [
          `${side}:`,
          `  position: ${x.position}`,
          `  strongest point: ${x.strongest_point}`,
          `  argument: ${x.argument}`,
          `  concedes: ${x.concedes}`,
          `  would change its mind if: ${x.what_would_change_my_mind}`,
          `  cites: ${x.evidence_refs.join('; ') || 'none'}`,
        ].join('\n');

      adjudication = await speak<LotAdjudication>(
        tally, opts.client, choice, `adjudicator:${opts.lot.lotId}`,
        [
          'You have heard two advocates disagree about one product lot affected by a',
          'disqualified supplier. You are NOT deciding who wins.',
          '',
          STIPULATED,
          '',
          'Both advocates accepted the two stipulated facts. Do not present either as',
          'though it favoured one side — `where_they_agree` should record them as',
          'settled and then say what the two sides agree about ACTION, if anything.',
          'The disagreement in front of you is about SEQUENCE: protect then test, or',
          'test then act.',
          '',
          'Your job is to hand a Qualified Person a decision they can actually make:',
          'the question stated precisely, both cases at their strongest, what the two',
          'sides already agree on, and the specific evidence that would settle it.',
          '',
          'YOU DO NOT DECIDE A RECALL AND YOU DO NOT CLEAR THE LOT. Neither is yours.',
          'A recall is a regulatory decision with a legal clock, made by people with',
          'names. `decision_for_human` must end in a question mark, because it is a',
          'question.',
          '',
          'You may ASK whether a recall is the right answer. You may not SAY that it',
          'is. "Should this lot be recalled?" is your job; "a recall is warranted"',
          'is not, and neither is "justified", "appropriate" or "necessary". When',
          'reporting the precaution case, report what that advocate ARGUED — that a',
          'hazard has not been excluded — not the action you think follows from it.',
          '',
          'Do not split the difference. An averaged position that neither advocate',
          'argued is the thing this whole exercise exists to avoid — if the two are',
          'genuinely far apart, say so plainly and let the human see the gap.',
          '',
          'URGENCY: call search_procedures to READ the clause that sets the timescale',
          'for a lot at this distribution status, and quote the revision and clause in',
          '`urgency_basis`. SOP-SCM-004 is the supplier disqualification procedure.',
          'IF YOU CANNOT FIND IT, WRITE THAT NO TIMESCALE WAS FOUND IN THE PROCEDURES.',
          'Do not supply a number from general knowledge. An earlier version of this',
          'agent, asked for a rule and given no way to read one, produced "72 hours per',
          'company Field Action SOP" — no such SOP exists and the real clause says',
          'something different. An invented regulatory deadline is worse than an absent',
          'one, because it gets acted on.',
        ].join('\n'),
        [brief, '', '── THE ARGUMENTS ──', '', put('PRECAUTION', finalA), '', put('PROPORTION', finalB)].join('\n'),
        Adjudication, validateAdjudication,
        opts.procedures,
      );
      if (!adjudication) errors.push('adjudicator produced no valid escalation');
      opts.onStage?.({ round: 'adjudication', value: adjudication });
    } else {
      errors.push('adjudication skipped — a one-sided debate presented as balanced would mislead');
    }

    return {
      lotId: opts.lot.lotId,
      opening, rebuttal, adjudication, errors,
      calls: tally.calls,
      inputTokens: tally.inputTokens,
      cachedInputTokens: tally.cachedSeen ? tally.cached : undefined,
      outputTokens: tally.outputTokens,
      ms: Date.now() - started,
    };
  } catch (e: any) {
    return {
      lotId: opts.lot.lotId,
      opening: {}, rebuttal: {}, adjudication: null,
      errors: [...errors, String(e?.message ?? e)],
      calls: tally.calls,
      inputTokens: tally.inputTokens,
      cachedInputTokens: tally.cachedSeen ? tally.cached : undefined,
      outputTokens: tally.outputTokens,
      ms: Date.now() - started,
    };
  }
}
