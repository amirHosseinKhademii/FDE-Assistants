/**
 * The SUB-AGENT: one lot in, one work-list row out.
 *
 * ══ WHAT MAKES THIS A "SUB-AGENT" ═════════════════════════════════════════
 *
 * Nothing about the code. It is an ordinary `runLoop` call with its own prompt
 * and its own answer shape — the same machinery `askSupplierImpact` uses. What
 * makes it a sub-agent is only that something OTHER THAN A HUMAN calls it, and
 * that it answers a fragment of a larger question rather than the whole thing.
 *
 * That is worth stating because "multi-agent" sounds like a framework and is
 * not one. An agent whose caller is another agent is the entire idea.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * WHY IT HAS NO TOOLS. The evidence for one lot has ALREADY been gathered —
 * `assessSupplierImpact` walked the databases once and produced all 23 lots'
 * facts in a single pass. Giving each sub-agent tools would mean 23 agents
 * re-querying an estate that was already read, which is slower and can return
 * a different answer per row if anything changes mid-run. So the evidence is
 * handed DOWN in the prompt, and the sub-agent's only job is judgement.
 *
 * This is the first thing the split teaches: deciding what a sub-agent may
 * look up, versus what it must be told, is the actual design work. Tools are
 * the easy part.
 *
 * WHY IT SHARES `AffectedLot` WITH THE SINGLE-AGENT VERSION. The orchestrator
 * assembles rows into the same `SupplierImpactAnswerSchema` the one-agent
 * version produces, so the two can be compared row for row. A sub-agent with
 * its own bespoke shape would need translating, and a translation layer is
 * exactly where a row quietly loses its escalation.
 *
 * WHAT IT DELIBERATELY CANNOT SEE: the other 22 lots. That is the experiment.
 * A row judged in isolation cannot be influenced by its neighbours — which
 * removes a source of drift and also removes any chance of noticing a pattern
 * ACROSS lots. Whether that trade is worth it is the thing being measured, not
 * something to assume in either direction.
 */
import { ToolRegistry, runLoop, loopChoice, type LoopChoice } from '@fde/agent';
import { createAnswerValidator } from '@fde/schema';
import { env } from '@fde/foundry';
import type OpenAI from 'openai';
import { AffectedLot, type SupplierImpactRow } from '../../schema/supplier-impact-schema';
import type { AffectedLotAssessment } from '../../tools/functions/assess-supplier-impact';

/**
 * A sub-agent answers with exactly ONE row, and `strictObject` means it cannot
 * quietly return two or wrap them in something.
 */
export const LotRowSchema = AffectedLot;

export const validateLotRow = createAnswerValidator<SupplierImpactRow>({
  schema: LotRowSchema,
  // NO COHERENCE RULES HERE, and that is not an oversight. The dossier-level
  // rules — "an unresolved finding with no named human is the system quietly
  // deciding" — are enforced by the ORCHESTRATOR on the assembled answer, in
  // one place, exactly as they are for the single-agent version. Duplicating
  // them per row would mean two implementations of the same safety property,
  // which is how they drift apart.
  coherence: [],
});

/**
 * The system prompt for one lot.
 *
 * MUCH SHORTER THAN THE ORCHESTRATOR'S, on purpose. A sub-agent that is told
 * about the whole work list, the ranking rules and the preventable-material
 * section is a sub-agent carrying context it cannot act on — which is the cost
 * the split was supposed to remove.
 *
 * The one rule it MUST carry is the one the whole system exists to protect:
 * it does not decide a recall. A sub-agent is further from human review than
 * the main agent, not closer, so the constraint gets stricter here, not looser.
 */
export function lotAssessorPrompt(procedureText?: string): string {
  return [
    ...LOT_ASSESSOR_RULES,
    '',
    ...(procedureText
      ? [
          'THE GOVERNING PROCEDURE. Your `next_action` must be grounded in the',
          'outcomes this clause permits, in the words it uses. Do not name any',
          'other procedure, record or instrument — if you find yourself reaching',
          'for one that is not below, you are drawing on general knowledge rather',
          "than on this company's rules, and this company does not have it.",
          '',
          'WITH ONE EXCEPTION, AND IT IS THE POINT OF RULE 4 ABOVE. The clause',
          'lists RECALL among its outcomes. THAT ONE IS NOT YOURS TO SELECT.',
          'Quarantine, customer notification and no action are actions you may',
          'name. A recall is a regulatory decision with a legal clock, made by a',
          'named human — so where the evidence points there, write what the human',
          'must DECIDE ("escalate to the Qualified Person for a recall decision"),',
          'never the decision itself. A `next_action` reading "Recall" is this',
          'system making the call it exists not to make.',
          '',
          procedureText,
        ]
      : [
          'YOU HAVE NOT BEEN GIVEN THE GOVERNING PROCEDURE. Say what must happen in',
          'plain terms and NAME NO PROCEDURE, form or record — an invented one is',
          'worse than none, because it gets followed.',
        ]),
  ].join('\n');
}

const LOT_ASSESSOR_RULES = [
  'You assess ONE product lot affected by a disqualified supplier, and return ONE row.',
  '',
  'You are given every fact already gathered about this lot. You have no tools and',
  'cannot look anything up: if a fact is not below, it is not available, and you say',
  'so rather than inferring it.',
  '',
  'RULES.',
  '1. Judge ONLY this lot. You cannot see the other affected lots and must not',
  '   speculate about them, compare against them, or refer to "the other lots".',
  '2. `exposure` is given to you and is NOT yours to change. It is derived from',
  '   shipment records, and a model that second-guesses it is overriding a fact',
  '   with an impression.',
  '3. `next_action` is what a named human should DO next, in the imperative, and',
  '   it must be possible given where the lot actually is. Do not tell anyone to',
  '   recall something that never left the building.',
  '4. YOU DO NOT DECIDE A RECALL. A recall is a regulatory decision with a legal',
  '   clock, made by people with names. Where the evidence cannot exclude a',
  '   hazard reaching a patient, escalate to a named owner and say what they must',
  '   decide. Never write that the lot is being recalled, or that it is cleared.',
  '5. `escalate` is required when this lot is outside our control and carries any',
  '   finding. It is null only when the lot is still ours, or genuinely clean.',
  '6. `in_short` is one sentence a reviewer reads at a glance. Not a summary of',
  '   the rules — a statement about THIS lot.',
];

/** Kept for callers that want the rules without a procedure attached. */
export const LOT_ASSESSOR_PROMPT = LOT_ASSESSOR_RULES.join('\n');

/**
 * Everything one lot's assessor is told, rendered as text.
 *
 * A FUNCTION, NOT A TEMPLATE STRING INLINE, so it can be unit-checked without
 * a model: what a sub-agent is told is the most important thing about it, and
 * "the evidence never made it into the prompt" is a failure that looks exactly
 * like a model that reasoned badly.
 */
export function lotBrief(
  lot: AffectedLotAssessment,
  supplier: { supplierId: string; name: string; disqualifiedOn: string | null; reason: string | null },
): string {
  const deliveries = lot.deliveries.length
    ? lot.deliveries
        .map(
          (d) =>
            `  - ${d.shipmentId}: ${d.quantityUnits} units to ${d.consigneeName} ` +
            `(${d.consigneeKind}, ${d.consigneeCountry}), dispatched ${d.dispatchedOn}` +
            `${d.deliveredOn ? `, delivered ${d.deliveredOn}` : ', not yet delivered'} [${d.status}]`,
        )
        .join('\n')
    : '  - none. This lot never left our control.';

  return [
    `SUPPLIER: ${supplier.name} (${supplier.supplierId})`,
    `DISQUALIFIED: ${supplier.disqualifiedOn ?? 'unknown'}`,
    `REASON: ${supplier.reason ?? 'not recorded'}`,
    '',
    `LOT: ${lot.lotId}`,
    `PRODUCT: ${lot.productName} (${lot.productId})`,
    `MARKET: ${lot.market}`,
    `STATUS: ${lot.status}`,
    `MANUFACTURED: ${lot.manufacturedOn}   EXPIRES: ${lot.expiryOn}`,
    `QUANTITY: ${lot.quantityUnits} units`,
    `EXPOSURE (given, do not change): ${lot.exposure}`,
    `SUPPLIER MATERIAL CONSUMED: ${lot.materialLotIds.join(', ') || 'none recorded'}`,
    '',
    'DELIVERIES:',
    deliveries,
    '',
    `FINDINGS: ${lot.findings.length ? lot.findings.join(', ') : 'none'}`,
    '',
    'EVIDENCE (cite these refs, and no others):',
    ...lot.evidence.map((e) => `  - ${e}`),
    '',
    'Return one row for this lot.',
  ].join('\n');
}

export interface AssessOneLotOptions {
  lot: AffectedLotAssessment;
  /**
   * The governing procedure text, RETRIEVED ONCE BY THE ORCHESTRATOR and handed
   * to every sub-agent unchanged.
   *
   * ══ WHY NOT GIVE EACH SUB-AGENT `search_procedures`? ══════════════════════
   *
   * Because 23 sub-agents would make 23 lookups of the same clause, at 23 times
   * the cost, and could each retrieve something slightly different — and then
   * the work list would be judged against 23 nearly-identical rulebooks.
   *
   * ══ WHY GIVE IT AT ALL? ═════════════════════════════════════════════════
   *
   * MEASURED, not anticipated. Without it, ten of twenty-three rows told a
   * Qualified Person to "open a field-alert record". That is a real FDA
   * instrument, it is NOT in this corpus, and SOP-SCM-004 §7.3 names four
   * outcomes of which it is not one. Every sub-agent independently reached for
   * the same piece of general knowledge, because each had been asked for a next
   * action and given no rule to draw it from.
   *
   * Same root cause as the adjudicator's invented "72 hours per company Field
   * Action SOP" — and at 23x, so it read as a house style rather than a slip.
   *
   * This is the third answer to "what may a sub-agent look up versus what must
   * it be told": NEITHER. Something above it looks up once and hands the text
   * down. Absent, the sub-agent is told to name no procedure at all.
   */
  procedureText?: string;
  supplier: { supplierId: string; name: string; disqualifiedOn: string | null; reason: string | null };
  client: OpenAI;
  loop?: string;
  /** Reasoning effort. Sub-agents judge one small thing; the default is low. */
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
}

export interface AssessOneLotResult {
  lotId: string;
  row: SupplierImpactRow | null;
  /** Present when this lot's assessment failed. The orchestrator's problem. */
  error: string | null;
  inputTokens: number;
  cachedInputTokens?: number;
  outputTokens: number;
  ms: number;
}

/**
 * Assess one lot.
 *
 * NEVER THROWS, and that is the orchestrator's whole safety story. Twenty-three
 * of these run at once; one bad JSON response must not take down the other
 * twenty-two. A failed row comes back as `row: null` with a reason, and the
 * orchestrator decides what a partial work list means — which is a judgement
 * about patient safety and therefore not something a helper may make silently.
 */
export async function assessOneLot(opts: AssessOneLotOptions): Promise<AssessOneLotResult> {
  const started = Date.now();
  const choice: LoopChoice = loopChoice(opts.loop);

  try {
    const result = await runLoop<SupplierImpactRow>(
      choice,
      opts.client,
      env.chatDeployment(),
      // An EMPTY registry, deliberately. See the header: the evidence is handed
      // down, not looked up.
      new ToolRegistry([]),
      lotBrief(opts.lot, opts.supplier),
      {
        system: lotAssessorPrompt(opts.procedureText),
        responseFormat: LotRowSchema,
        validate: validateLotRow,
        agentName: `lot-assessor:${opts.lot.lotId}`,
        reasoningEffort: opts.reasoningEffort ?? 'low',
        // One round trip is all this can need — there are no tools to call, so
        // a second turn would only ever be a schema retry.
        maxTurns: 2,
      },
    );

    const inputTokens = result.turns.reduce((a, t) => a + t.inputTokens, 0);
    const outputTokens = result.turns.reduce((a, t) => a + t.outputTokens, 0);
    const reported = result.turns.filter((t) => typeof t.cachedInputTokens === 'number');

    return {
      lotId: opts.lot.lotId,
      row: result.structured ?? null,
      error: result.structured
        ? null
        : `no valid row after ${result.turns.length} turn(s): ${result.schemaErrors.join('; ') || result.stoppedBecause}`,
      inputTokens,
      cachedInputTokens: reported.length
        ? reported.reduce((a, t) => a + (t.cachedInputTokens as number), 0)
        : undefined,
      outputTokens,
      ms: Date.now() - started,
    };
  } catch (e: any) {
    return {
      lotId: opts.lot.lotId,
      row: null,
      error: String(e?.message ?? e),
      inputTokens: 0,
      outputTokens: 0,
      ms: Date.now() - started,
    };
  }
}
