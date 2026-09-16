/**
 * THE ORCHESTRATOR: one sub-agent per lot, plus an assembler, versus one agent
 * doing all twenty-three.
 *
 * ══ WHAT THIS IS FOR ══════════════════════════════════════════════════════
 *
 * `askSupplierImpact` answers the whole question in one loop: it calls the
 * walk, reads all 23 lots in one context, and writes the dossier itself. This
 * answers the SAME question with the SAME schema by a different route, so the
 * two can be compared on the same eval cases. Without that, "multi-agent" is a
 * thing that was built rather than a thing that was measured.
 *
 * ══ WHO FILLS WHICH FIELD, AND WHY IT IS NOT ALL THE MODEL ════════════════
 *
 *   supplier_id / supplier_name / disqualified_on
 *       THE ORCHESTRATOR, from the dossier. These are facts it already holds.
 *       Passing a known fact through a model gives it a chance to be wrong and
 *       no chance to be more right.
 *
 *   rows
 *       ONE SUB-AGENT PER LOT, each seeing only its own evidence.
 *
 *   the ORDER of rows
 *       THE ORCHESTRATOR, deterministically: exposure band, then quantity
 *       within the band — byte-identical to `assess-supplier-impact.ts`'s own
 *       sort. Ranking is comparative and a sub-agent sees one lot, so it CANNOT
 *       rank. Letting the assembler re-rank would mean the comparison measured
 *       two different ranking rules rather than two ways of judging a lot.
 *
 *   preventable / summary / escalate / missing / unverified_claims
 *       THE ASSEMBLER, which is the only participant that sees every row.
 *       These are estate-level: about the supplier and the stock, not about any
 *       one lot. This is the honest cost of isolation made visible — a sub-agent
 *       cannot notice that five rows name the same hospital, so somebody has to.
 *
 * ══ PARTIAL FAILURE IS NOT A DETAIL ═══════════════════════════════════════
 *
 * Twenty-three independent calls will not all succeed forever. A 20-row work
 * list presented as the answer to a 23-lot question is a lie of omission about
 * patient exposure, so the missing lots are named, they are pushed into
 * `missing`, and `ok` goes false. Whether a partial list is usable is a
 * human's call; this refuses to make it quietly. `assessOneLot` never throws
 * for the same reason — one bad row must not cost the other twenty-two.
 *
 * ══ CONCURRENCY IS A REAL CONSTRAINT, NOT A TUNING KNOB ═══════════════════
 *
 * This project hit an Azure rate limit on 2026-09-12 running three evals in
 * half an hour; fourteen runs came back `threw` with zero turns and a baseline
 * was written recording 2/15 for what was a quota, not a quality result. Firing
 * 23 calls at once is the same mistake with more parallelism. Hence a small
 * default and a flag.
 */
import type OpenAI from 'openai';
import { openaiClient, env } from '@fde/foundry';
import { runFanout, loopChoice, engineLabel, type LoopChoice, chatClient, chatModelName } from '@fde/agent';
import { createAnswerValidator } from '@fde/schema';
import { logRequest, priceDetail } from '@fde/telemetry';
import { z } from 'zod';
import { openHandle, type DbHandle } from '../../tools/utils/handle';
import {
  assessSupplierImpact,
  EXPOSURE_ORDER,
  type SupplierImpactDossier,
  type AffectedLotAssessment,
} from '../../tools/functions/assess-supplier-impact';
import { lotBrief, lotAssessorPrompt, LotRowSchema, validateLotRow, type AssessOneLotResult } from './lot-assessor';
import { openStore, hybridSearch } from '@fde/grounding';
import { openEmbeddings } from '../../grounding/embeddings.factory';
import { KB_DB, urlFor } from '../../config/connections';
import {
  validateSupplierImpactAnswer,
  type SupplierImpactAnswer,
  type SupplierImpactRow,
} from '../../schema/supplier-impact-schema';
import '../../telemetry/prices';

/** Small on purpose. See the header: a rate limit is not a tuning knob. */
const DEFAULT_CONCURRENCY = 4;

export interface FanoutOptions {
  supplierId: string;
  loop?: string;
  /** How many lots to assess at once. */
  concurrency?: number;
  /** Cap the lots assessed, for a cheap first look. */
  limit?: number;
  handle?: DbHandle;
  client?: OpenAI;
  surface?: string;
  log?: boolean;
  onProgress?: (done: number, total: number, lotId: string, ok: boolean, error?: string) => void;
  /**
   * The work list, announced BEFORE the first sub-agent is dispatched.
   *
   * `onProgress` only fires when a lot COMPLETES, so a surface watching it
   * alone knows nothing for the first ten or twenty seconds — not even how many
   * lots there are, because the total rides on the first completion. That is
   * the whole shape of the job, withheld for exactly as long as somebody is
   * most likely to wonder whether anything is happening.
   *
   * This is known the instant the walk returns and costs nothing to hand over,
   * so it is handed over. It also lets a display NAME the lots that have not
   * reported yet, instead of drawing anonymous placeholders.
   */
  onStart?: (lots: Array<{ lotId: string; productName: string; market: string; exposure: string }>) => void;
}

export interface FanoutResult {
  /** False when any lot failed, or the answer does not satisfy the contract. */
  ok: boolean;
  answer: SupplierImpactAnswer | null;
  /** Why not, when `answer` is null or `ok` is false. */
  problems: string[];
  /** Per-lot outcomes, for reading a partial result. */
  lots: AssessOneLotResult[];
  calls: number;
  inputTokens: number;
  cachedInputTokens?: number;
  outputTokens: number;
  costUsd: number | null;
  costBasis: string;
  ms: number;
}

// ── the assembler ──────────────────────────────────────────────────────────

/**
 * The estate-level half of the answer — everything a sub-agent could not see.
 *
 * `rows` is NOT in this schema. The assembler reads the rows and must not be
 * able to rewrite them: a participant that can edit twenty-three judgements it
 * did not make is a participant that can quietly overrule them, and then the
 * fan-out measured nothing.
 */
const Assembly = z.strictObject({
  summary: z
    .string()
    .describe(
      'What a Qualified Person needs in one short paragraph: how many lots, how ' +
        'far the worst of them got, and what is still preventable. Do not restate ' +
        'the rows — they are on the page underneath you.',
    ),
  preventable: z
    .array(z.string())
    .describe(
      'Estate-level findings that belong to no single lot — material from this ' +
        'supplier still flagged usable, or received after the disqualification. ' +
        'These are the only findings that can still be PREVENTED.',
    ),
  missing: z
    .array(z.string())
    .describe('What could not be checked because a record is absent. One sentence each.'),
  unverified_claims: z
    .array(z.string())
    .describe('Anything you assert that the assessment did not report. Never add lots here.'),
  escalate: z
    .object({
      reason: z.string().describe('Why a human must decide, specifically.'),
      suggested_owner: z.string().describe('Who acts first, by role.'),
    })
    .nullable()
    .describe(
      'Non-null whenever `preventable` is non-empty: material still usable from a ' +
        'disqualified supplier is a decision for a human TODAY, independent of any ' +
        'one lot.',
    ),
});

type AssemblyAnswer = z.infer<typeof Assembly>;

const validateAssembly = createAnswerValidator<AssemblyAnswer>({
  schema: Assembly,
  coherence: [
    (a) =>
      a.preventable.length > 0 && !a.escalate
        ? [
            'preventable findings with no escalation — material still usable from a ' +
              'disqualified supplier with nobody named to act is the system quietly deciding',
          ]
        : [],
  ],
});

const ASSEMBLER_PROMPT = [
  'You are given a work list of affected product lots that has ALREADY been judged,',
  'one lot at a time, by assessors who each saw only their own lot. Your job is the',
  'part none of them could do: the view ACROSS the lots.',
  '',
  'YOU DO NOT EDIT THE ROWS. They are not yours and you cannot return them.',
  '',
  'What only you can see, and what you are here for:',
  '  - patterns across lots — the same consignee appearing repeatedly is ONE',
  '    conversation, not five separate ones',
  '  - the shape of the whole exposure, which no single row states',
  '  - estate-level material findings, which belong to no lot at all',
  '',
  'YOU DO NOT DECIDE A RECALL, and you do not clear anything. A recall is a',
  'regulatory decision with a legal clock, made by people with names. Report the',
  'exposure and escalate to a named human.',
  '',
  'If lots FAILED to be assessed, say so in `missing`. A work list short of the',
  'lots it should contain is not a shorter answer, it is an incomplete one, and a',
  'reader who is not told cannot know.',
].join('\n');

// ── the pure half, checkable with no model and no database ────────────────

/**
 * The judged rows, in the order a reader should work through them.
 *
 * BYTE-IDENTICAL TO THE WALK'S OWN SORT — exposure band first, then the most
 * product at stake inside the band. Not a re-implementation for convenience: if
 * this ranked differently from `askSupplierImpact`, a comparison between the
 * two routes would measure two ranking rules rather than two ways of judging a
 * lot, and the whole fan-out experiment would be uninterpretable.
 *
 * PURE, and separated out for that reason. Ranking is the one part of this
 * orchestrator with a right answer that can be asserted offline.
 *
 * TAKES ROWS, NOT OUTCOMES, since 2026-09-12: `runFanout` in `@fde/agent`
 * already separates the items that produced a value from the ones that did
 * not, so filtering here would be a second place that decides what a failure
 * is. Sorts a COPY — a ranking function that reorders its input in place is a
 * function you cannot call twice.
 */
export function rankRows(
  rows: SupplierImpactRow[],
  affected: SupplierImpactDossier['affected'],
): SupplierImpactRow[] {
  const byLot = new Map(affected.map((a) => [a.lotId, a]));
  return [...rows]
    .sort((a, b) => {
      const ea = byLot.get(a.lot_id)?.exposure;
      const eb = byLot.get(b.lot_id)?.exposure;
      return (
        EXPOSURE_ORDER.indexOf(ea as any) - EXPOSURE_ORDER.indexOf(eb as any) ||
        b.quantity_units - a.quantity_units
      );
    });
}

/**
 * The dossier-shaped answer: facts from the orchestrator, rows from the
 * sub-agents, prose from the assembler, and BOTH kinds of absence.
 *
 * PURE, AND THIS IS THE ONE THAT HAD THE BUG. The first version counted only
 * lots that were attempted and FAILED, so `--limit 4` produced a four-row work
 * list under a summary claiming 23 — a sample indistinguishable from the
 * estate. Separating it from the orchestration means the merge can be asserted
 * without spending a model call to reach it, which is exactly what was missing
 * when it shipped wrong.
 *
 * Not-assessed and failed stay separate in the prose because they mean
 * different things to a reader: one was a choice, the other an error.
 */
export function buildAnswer(
  dossier: SupplierImpactDossier,
  assembly: AssemblyAnswer,
  rows: SupplierImpactRow[],
  failedLotIds: string[],
  notAssessedLotIds: string[],
): SupplierImpactAnswer {
  return {
    summary: assembly.summary,
    supplier_id: dossier.supplier.supplierId,
    supplier_name: dossier.supplier.name,
    disqualified_on: dossier.supplier.disqualifiedOn ?? '',
    rows,
    preventable: assembly.preventable,
    missing: [
      ...assembly.missing,
      ...failedLotIds.map((id) => `${id} could not be assessed, so it is neither cleared nor ranked`),
      ...(notAssessedLotIds.length
        ? [
            `${notAssessedLotIds.length} of ${dossier.affected.length} affected lots were not ` +
              `assessed at all (--limit): ${notAssessedLotIds.join(', ')}. ` +
              'This work list is a SAMPLE, not the estate.',
          ]
        : []),
    ],
    unverified_claims: assembly.unverified_claims,
    escalate: assembly.escalate,
  } as SupplierImpactAnswer;
}

// ── the orchestrator ───────────────────────────────────────────────────────

export async function askSupplierImpactFanout(opts: FanoutOptions): Promise<FanoutResult> {
  const started = Date.now();
  const choice: LoopChoice = loopChoice(opts.loop);
  const client = opts.client ?? chatClient(() => openaiClient());
  const handle = opts.handle ?? openHandle();
  const problems: string[] = [];

  const dossier = await assessSupplierImpact(handle, opts.supplierId);
  if ('found' in dossier) {
    return {
      ok: false, answer: null, problems: [dossier.reason], lots: [],
      calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, costBasis: '', ms: Date.now() - started,
    };
  }

  /**
   * A SUPPLIER THAT WAS NEVER DISQUALIFIED HAS NOTHING TO ASSESS.
   *
   * ══ CAUGHT BY THE EVAL ON ITS FIRST HONEST RUN ════════════════════════════
   *
   * `assessSupplierImpact` returns a MISS only when the supplier does not
   * exist. For one that exists and was never disqualified it correctly returns
   * every lot that consumed its material — "which lots used this supplier" is a
   * factual question with a factual answer.
   *
   * The single agent then READS `disqualifiedOn: null` and answers "nothing has
   * been affected by a disqualification". That is a judgement, and this
   * orchestrator skipped it: it saw a dossier with lots in it and fanned out
   * over all twenty, spending model calls assessing lots that were never
   * affected by anything, and hit a rate limit doing so.
   *
   * Same class as the `--limit` bug — the mechanical step taken without the
   * domain judgement the single-agent route makes. A fan-out will always do
   * exactly what it is told, which is why what it is told has to be right.
   */
  if (!dossier.supplier.disqualifiedOn) {
    const answer = {
      summary:
        `${dossier.supplier.name} (${dossier.supplier.supplierId}) has not been disqualified, ` +
        'so no lot is affected by a disqualification. ' +
        `${dossier.affected.length} lot(s) consumed material from this supplier, which is a ` +
        'normal supply relationship and not a finding.',
      supplier_id: dossier.supplier.supplierId,
      supplier_name: dossier.supplier.name,
      disqualified_on: '',
      rows: [],
      preventable: [],
      missing: [],
      unverified_claims: [],
      escalate: null,
    } as unknown as SupplierImpactAnswer;

    const verdict = validateSupplierImpactAnswer(JSON.stringify(answer));
    if (!verdict.ok) problems.push(`assembled answer fails the contract: ${verdict.errors}`);

    return {
      ok: verdict.ok,
      answer,
      problems,
      lots: [],
      calls: 0,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      costBasis: 'no model call — the supplier was never disqualified',
      ms: Date.now() - started,
    };
  }

  const supplier = {
    supplierId: dossier.supplier.supplierId,
    name: dossier.supplier.name,
    disqualifiedOn: dossier.supplier.disqualifiedOn,
    reason: dossier.supplier.disqualifiedReason,
  };

  // ── the rulebook, fetched ONCE for all of them ──────────────────────────
  //
  // Retrieved here rather than by each sub-agent for the reason recorded on
  // `AssessOneLotOptions.procedureText`: 23 lookups of one clause cost 23 times
  // as much and can disagree with each other. One lookup, one text, one
  // rulebook.
  //
  // A FAILURE HERE IS NOT FATAL AND IS NOT SILENT. If retrieval cannot reach
  // the procedure the sub-agents are told to name no procedure at all, and the
  // problem is recorded — a work list grounded in nothing is still usable, a
  // work list grounded in an invented rule is not.
  const procedureText = await fetchGoverningClause(client).catch((e) => {
    problems.push(`could not retrieve the governing procedure: ${String(e?.message ?? e)}`);
    return undefined;
  });
  if (!procedureText) {
    problems.push(
      'sub-agents ran WITHOUT the governing procedure — they were instructed to ' +
        'name no procedure rather than guess one',
    );
  }

  const lotsToDo = opts.limit ? dossier.affected.slice(0, opts.limit) : dossier.affected;

  /**
   * Lots deliberately NOT assessed, because `--limit` was passed.
   *
   * A REAL BUG, SHIPPED AND CAUGHT ON THE FIRST RUN. `--limit 4` produced a
   * four-row work list under a summary reading "there are 23 affected supplier
   * lots", with nothing saying the other 19 had never been looked at — because
   * the handling only ever counted lots ATTEMPTED AND FAILED.
   *
   * `@fde/agent` now keeps `failed` and `notAttempted` apart for everyone, and
   * the reason is here: one was an error and the other a choice, and they read
   * differently to a human. What the package still refuses to decide is what a
   * short list MEANS — that is `buildAnswer` below, and it is a judgement about
   * patient exposure rather than about orchestration.
   */
  const notAssessed = opts.limit ? dossier.affected.slice(opts.limit) : [];

  // Announced before the first call goes out — see `onStart`.
  opts.onStart?.(
    lotsToDo.map((l) => ({
      lotId: l.lotId,
      productName: l.productName,
      market: l.market,
      exposure: l.exposure,
    })),
  );

  // ── fan out, then assemble ──────────────────────────────────────────────
  //
  // The loop, the bounded concurrency, the never-throw-for-one-item rule and
  // the token tally all live in `@fde/agent` now. What is supplied here is the
  // only part that could not: what one assessor is TOLD, what it may return,
  // and what the assembler sees.
  const out = await runFanout<AffectedLotAssessment, SupplierImpactRow, AssemblyAnswer>(
    choice,
    client,
    chatModelName(env.chatDeployment()),
    {
      items: lotsToDo,
      notAttempted: notAssessed,
      idOf: (lot) => lot.lotId,

      briefFor: (lot) => lotBrief(lot, supplier),
      itemSystem: lotAssessorPrompt(procedureText),
      itemSchema: LotRowSchema,
      validateItem: validateLotRow,

      // RANKED HERE, inside the brief, because ranking is comparative and no
      // per-lot assessor can do it — and because the order must be byte-identical
      // to the walk's own sort or a comparison against the single-agent route
      // measures two ranking rules rather than two ways of judging a lot.
      assemblerBrief: (rows, failedIds, notAttemptedIds) =>
        assemblerBrief(dossier, rankRows(rows, dossier.affected), failedIds, notAttemptedIds),
      assemblerSystem: ASSEMBLER_PROMPT,
      assemblerSchema: Assembly,
      validateAssembled: validateAssembly,

      concurrency: opts.concurrency ?? DEFAULT_CONCURRENCY,
      agentName: 'supplier-impact',
      onProgress: opts.onProgress,
    },
  );

  for (const f of out.items.filter((i) => i.value === null)) problems.push(`${f.id}: ${f.error}`);
  if (out.notAttemptedIds.length) {
    problems.push(
      `${out.notAttemptedIds.length} affected lot(s) were NOT assessed because --limit was ` +
        `passed: ${out.notAttemptedIds.join(', ')}`,
    );
  }

  const rows = rankRows(out.values, dossier.affected);
  const { costUsd, basis: costBasis } = priceDetail(
    chatModelName(env.chatDeployment()), out.inputTokens, out.outputTokens, out.cachedInputTokens,
  );

  const lots: AssessOneLotResult[] = out.items.map((i) => ({
    lotId: i.id,
    row: i.value,
    error: i.error,
    inputTokens: i.inputTokens,
    cachedInputTokens: i.cachedInputTokens,
    outputTokens: i.outputTokens,
    ms: i.ms,
  }));

  if (!out.assembled) {
    problems.push(out.assemblerError ?? 'assembler produced no valid output');
    return {
      ok: false, answer: null, problems, lots,
      calls: out.calls, inputTokens: out.inputTokens, cachedInputTokens: out.cachedInputTokens,
      outputTokens: out.outputTokens, costUsd, costBasis, ms: Date.now() - started,
    };
  }

  const answer = buildAnswer(dossier, out.assembled, rows, out.failedIds, out.notAttemptedIds);

  // ── the one place the whole answer is checked ───────────────────────────
  // The SAME validator the single-agent version uses. Two implementations of a
  // safety rule is how they drift apart, and this path must not be the softer
  // one just because it arrived by a different route.
  const verdict = validateSupplierImpactAnswer(JSON.stringify(answer));
  if (!verdict.ok) problems.push(`assembled answer fails the contract: ${verdict.errors}`);

  if (opts.log !== false) {
    logRequest({
      subject: opts.supplierId,
      question: `supplier impact (fan-out) for ${opts.supplierId}`,
      model: chatModelName(env.chatDeployment()),
      engine: `${engineLabel(choice)}+fanout`,
      turns: out.calls,
      toolCalls: 0,
      inputTokens: out.inputTokens,
      cachedInputTokens: out.cachedInputTokens,
      outputTokens: out.outputTokens,
      ms: Date.now() - started,
      stoppedBecause: verdict.ok && out.failedIds.length === 0 ? 'model_finished' : 'partial',
      schemaRetries: 0,
      surface: opts.surface ?? 'fanout',
    });
  }

  return {
    // A sample is not a complete answer, so `--limit` can never report ok.
    ok: verdict.ok && out.failedIds.length === 0 && out.notAttemptedIds.length === 0,
    answer,
    problems,
    lots,
    calls: out.calls,
    inputTokens: out.inputTokens,
    cachedInputTokens: out.cachedInputTokens,
    outputTokens: out.outputTokens,
    costUsd,
    costBasis,
    ms: Date.now() - started,
  };
}

/**
 * The clause that says what may be DONE about an affected lot.
 *
 * SOP-SCM-004 §7.3 lists exactly four outcomes — no action, quarantine,
 * customer notification, recall — and §7.2's rider that distribution status
 * constrains the options without deciding them. Those are the words a
 * `next_action` has to live inside.
 *
 * `sop_id` FILTERED, NOT AN OPEN SEARCH. The supplier procedure is the one that
 * governs here, and an unfiltered query can return a passage from the release
 * SOP that reads plausibly and is about a different question entirely.
 *
 * No `as_of`: this is the rule in force now, for a decision being made now.
 * That differs from the release path, where the governing revision is the one
 * in force on the day of the act being judged — a distinction worth keeping
 * visible rather than copying the wrong default across.
 */
async function fetchGoverningClause(client: OpenAI): Promise<string | undefined> {
  const connectionString = urlFor(KB_DB);
  const store = await openStore(openEmbeddings(client), {
    connectionString,
    tableName: 'document_chunks',
  });
  try {
    const { hits } = await hybridSearch(
      store,
      'outcome for an affected lot: no action, quarantine, customer notification or recall',
      3,
      { sopId: 'SOP-SCM-004' },
      { tableName: 'document_chunks', connectionString },
    );
    if (!hits.length) return undefined;
    return hits
      .map((h) => `${String(h.doc.metadata?.section ?? '')}\n${h.doc.pageContent.trim()}`)
      .join('\n\n');
  } finally {
    // The pool behind the index outlives every query through it. Left open, the
    // process lingers until Neon drops the connection and the command exits 1
    // on a run that succeeded — exactly what `lot-debate.ts` shipped with.
    await Promise.resolve((store as any).end?.() ?? (store as any).pool?.end?.()).catch(() => {});
  }
}

/**
 * What the assembler is shown: the rows AS JUDGED, plus the estate-level facts
 * no row carries, plus the lots that failed.
 *
 * A FUNCTION so it can be read and checked without a model — "the evidence
 * never reached the prompt" is a failure that looks exactly like bad reasoning.
 */
export function assemblerBrief(
  dossier: SupplierImpactDossier,
  rows: SupplierImpactRow[],
  failedLotIds: string[],
  notAssessedLotIds: string[] = [],
): string {
  const m = dossier.materials;
  return [
    `SUPPLIER: ${dossier.supplier.name} (${dossier.supplier.supplierId})`,
    `DISQUALIFIED: ${dossier.supplier.disqualifiedOn ?? 'unknown'} — ${dossier.supplier.disqualifiedReason ?? 'not recorded'}`,
    `ASSESSED ON: ${dossier.assessedOn}`,
    '',
    `TOTALS: ${dossier.totals.lots} affected lot(s), ${dossier.totals.units} units`,
    `BY EXPOSURE: ${Object.entries(dossier.totals.byExposure).map(([k, v]) => `${k}=${v}`).join(', ')}`,
    '',
    'ESTATE-LEVEL MATERIAL FACTS (these belong to no single lot):',
    `  material lots from this supplier: ${m.total}`,
    `  delivered but never consumed: ${m.inStockUnused}`,
    `  received AFTER the disqualification: ${m.receivedAfterDisqualification.join(', ') || 'none'}`,
    `  still flagged usable despite the disqualification: ${m.notQuarantined.join(', ') || 'none'}`,
    '',
    'ESTATE-LEVEL FINDINGS FROM THE ASSESSMENT:',
    ...(dossier.findings.length ? dossier.findings.map((f) => `  - ${f}`) : ['  - none']),
    '',
    `THE WORK LIST AS JUDGED (${rows.length} row(s), already ranked — do not reorder):`,
    ...rows.map(
      (r) =>
        `  ${r.lot_id} [${r.exposure}] ${r.quantity_units} units — ${r.in_short}` +
        `${r.escalate ? ` (escalated to ${r.escalate.suggested_owner})` : ''}`,
    ),
    '',
    // BOTH KINDS OF ABSENCE, STATED SEPARATELY. Without this the assembler was
    // handed 4 rows and a "23 affected lots" total and wrote a summary about 23
    // — describing a sample as the estate, which is the failure this whole file
    // claims to prevent.
    ...(failedLotIds.length
      ? [
          `LOTS THAT COULD NOT BE ASSESSED — ${failedLotIds.length}: ${failedLotIds.join(', ')}.`,
          'These are neither cleared nor ranked. Say so in `missing`.',
        ]
      : []),
    ...(notAssessedLotIds.length
      ? [
          `LOTS NOT ASSESSED AT ALL — ${notAssessedLotIds.length} of ` +
            `${dossier.totals.lots}: ${notAssessedLotIds.join(', ')}.`,
          '',
          'THE WORK LIST BELOW IS A SAMPLE, NOT THE ESTATE. Your summary must say so',
          'in its first sentence. Do NOT describe the full estate totals as though',
          `they were assessed — ${rows.length} lot(s) were judged, not ${dossier.totals.lots}.`,
          '',
          'DO NOT LIST THEM IN `missing`. They are already recorded there, once, by',
          'the caller. The first run of this listed all twenty-one individually and',
          'the caller added the same list again, burying the records that were',
          'genuinely absent under twenty-two lines of the same fact. `missing` is',
          'for what could not be CHECKED, not for what was not attempted.',
        ]
      : []),
    ...(!failedLotIds.length && !notAssessedLotIds.length ? ['Every affected lot was assessed.'] : []),
    '',
    'Write the estate-level half of the answer.',
  ].join('\n');
}
