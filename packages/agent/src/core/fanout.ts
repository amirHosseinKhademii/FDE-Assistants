/**
 * Many small agents over many items, then one that reads all of them.
 *
 * ONE AGENT PER ITEM, EACH SEEING ONLY ITS OWN. Then an assembler that sees
 * every result and writes the part no individual agent could — the patterns
 * across items, the shape of the whole, the findings that belong to no single
 * item. That second half is the honest cost of isolation made visible: an agent
 * judging item 6 alone cannot notice that items 6, 11 and 19 all name the same
 * customer.
 *
 * ══ WHAT THIS PACKAGE REFUSES TO DECIDE ═══════════════════════════════════
 *
 * WHAT A PARTIAL RESULT MEANS.
 *
 * Twenty-three independent calls will not all succeed forever. This reports
 * exactly which items failed and which were never attempted — it does NOT
 * decide whether what is left is usable. In the caller this was extracted from,
 * a work list short of the lots it should contain was a lie of omission about
 * patient exposure; somewhere else it is a rounding error. That is a judgement
 * about YOUR domain and it stays with you.
 *
 * The failure that motivated saying so: a `--limit` flag intended as a cheap
 * first look produced a four-row list under a summary describing all
 * twenty-three, because "skipped" and "failed" were conflated and skipped items
 * were counted as neither. Hence `notAttempted` and `failed` are SEPARATE
 * fields here — one was a choice, the other an error, and they read differently
 * to a human.
 *
 * ══ WHAT IS YOURS ═════════════════════════════════════════════════════════
 *
 *   briefFor(item)     what one agent is told. The most important function you
 *                      will write — "the evidence never reached the prompt" is
 *                      a failure that looks exactly like bad reasoning.
 *   itemSystem         the per-item prompt
 *   itemSchema         what one agent returns
 *   assemblerSystem    the across-items prompt
 *   assemblerSchema    what the assembler returns. It should NOT contain the
 *                      items: an assembler that can rewrite judgements it did
 *                      not make can quietly overrule them, and then the fan-out
 *                      measured nothing.
 *   assemblerBrief     the items as judged, plus whatever aggregate facts they
 *                      do not individually carry
 *
 * ══ CONCURRENCY IS A CONSTRAINT, NOT A TUNING KNOB ════════════════════════
 *
 * The default is deliberately small. Firing every item at once is the fastest
 * way to meet a provider rate limit, and a rate-limited run records as a
 * quality failure unless something separates them.
 */
import type OpenAI from 'openai';
import type { ZodType } from 'zod';
import { ToolRegistry } from './registry';
import { runLoop, type LoopChoice } from './loop.factory';
import type { TurnRecord } from './loop.types';
import { cachedInputTokensOf } from './usage';

/** Small on purpose. See the header. */
export const DEFAULT_FANOUT_CONCURRENCY = 4;

export interface FanoutSpec<Item, ItemOut, Assembled> {
  items: Item[];
  /** Items deliberately not attempted — a cap, a filter, a budget. */
  notAttempted?: Item[];
  idOf: (item: Item) => string;

  /** What ONE agent is told about ONE item. */
  briefFor: (item: Item) => string;
  itemSystem: string;
  itemSchema: ZodType;
  validateItem: (raw: string) => { ok: boolean; value?: unknown; errors?: string };

  /** What the assembler is told: the judged results plus aggregate facts. */
  assemblerBrief: (results: ItemOut[], failedIds: string[], notAttemptedIds: string[]) => string;
  assemblerSystem: string;
  assemblerSchema: ZodType;
  validateAssembled: (raw: string) => { ok: boolean; value?: unknown; errors?: string };

  /** Tools for the per-item agents. Usually none — the brief carries the facts. */
  itemTools?: ToolRegistry;
  /** Tools for the assembler. Often retrieval, so it can ground what it states. */
  assemblerTools?: ToolRegistry;

  concurrency?: number;
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
  agentName?: string;
  /**
   * `error` carries WHY an item failed, so a surface can say it while the run
   * is still going. "Could not be assessed" with no reason is the vaguest
   * possible thing to tell somebody watching their money being spent — and the
   * most common reason by far is a provider rate limit, which is a fact about
   * quota rather than about their data and reads completely differently.
   */
  onProgress?: (done: number, total: number, id: string, ok: boolean, error?: string) => void;
}

export interface ItemOutcome<ItemOut> {
  id: string;
  value: ItemOut | null;
  /** Present when this item failed. Never thrown — see `runOne`. */
  error: string | null;
  inputTokens: number;
  cachedInputTokens?: number;
  outputTokens: number;
  ms: number;
}

export interface FanoutOutcome<ItemOut, Assembled> {
  /** Every item's result, in the order given. */
  items: ItemOutcome<ItemOut>[];
  /** Only those that produced a value. */
  values: ItemOut[];
  failedIds: string[];
  notAttemptedIds: string[];
  assembled: Assembled | null;
  /** Why the assembler produced nothing, if it did not. */
  assemblerError: string | null;
  calls: number;
  inputTokens: number;
  cachedInputTokens?: number;
  outputTokens: number;
  ms: number;
}

/**
 * Run `work` over `items`, at most `n` at a time.
 *
 * Hand-rolled rather than a dependency: it is eight lines, and the usual
 * alternatives are ESM-only, which is a fight in a CommonJS project.
 */
export async function pooled<T, R>(items: T[], n: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(Math.max(1, n), items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await work(items[i]);
    }
  });
  await Promise.all(runners);
  return out;
}

function tally(turns: TurnRecord[]): Pick<ItemOutcome<never>, 'inputTokens' | 'outputTokens' | 'cachedInputTokens'> {
  return {
    inputTokens: turns.reduce((a, t) => a + t.inputTokens, 0),
    outputTokens: turns.reduce((a, t) => a + t.outputTokens, 0),
    cachedInputTokens: cachedInputTokensOf(turns),
  };
}

/**
 * Fan out, then assemble.
 *
 * NEVER THROWS FOR ONE BAD ITEM. Twenty-three calls run here and one malformed
 * response must not cost the other twenty-two; a failed item comes back with a
 * reason and the run continues. The assembler is still called, and is TOLD what
 * failed, because an assembler that silently summarises a short list is how a
 * partial answer becomes indistinguishable from a whole one.
 */
export async function runFanout<Item, ItemOut, Assembled>(
  choice: LoopChoice,
  client: OpenAI,
  model: string,
  spec: FanoutSpec<Item, ItemOut, Assembled>,
): Promise<FanoutOutcome<ItemOut, Assembled>> {
  const started = Date.now();
  const noTools = new ToolRegistry([]);
  let done = 0;

  const items = await pooled(
    spec.items,
    spec.concurrency ?? DEFAULT_FANOUT_CONCURRENCY,
    async (item): Promise<ItemOutcome<ItemOut>> => {
      const id = spec.idOf(item);
      const t0 = Date.now();
      try {
        const r = await runLoop<ItemOut>(choice, client, model, spec.itemTools ?? noTools, spec.briefFor(item), {
          system: spec.itemSystem,
          responseFormat: spec.itemSchema,
          validate: spec.validateItem,
          agentName: `${spec.agentName ?? 'fanout'}:${id}`,
          reasoningEffort: spec.reasoningEffort ?? 'low',
          // Room for a retry; more only if the item agent has tools to call.
          maxTurns: spec.itemTools ? 4 : 2,
        });
        done += 1;
        const failure = r.structured
          ? null
          : `no valid result after ${r.turns.length} turn(s): ${r.schemaErrors.join('; ') || r.stoppedBecause}`;
        spec.onProgress?.(done, spec.items.length, id, !!r.structured, failure ?? undefined);
        return {
          id,
          value: r.structured ?? null,
          error: failure,
          ms: Date.now() - t0,
          ...tally(r.turns),
        };
      } catch (e: any) {
        done += 1;
        const why = String(e?.message ?? e);
        spec.onProgress?.(done, spec.items.length, id, false, why);
        return { id, value: null, error: why, inputTokens: 0, outputTokens: 0, ms: Date.now() - t0 };
      }
    },
  );

  const values = items.filter((i) => i.value !== null).map((i) => i.value as ItemOut);
  const failedIds = items.filter((i) => i.value === null).map((i) => i.id);
  const notAttemptedIds = (spec.notAttempted ?? []).map(spec.idOf);

  const assembly = await runLoop<Assembled>(
    choice, client, model, spec.assemblerTools ?? noTools,
    spec.assemblerBrief(values, failedIds, notAttemptedIds),
    {
      system: spec.assemblerSystem,
      responseFormat: spec.assemblerSchema,
      validate: spec.validateAssembled,
      agentName: `${spec.agentName ?? 'fanout'}:assembler`,
      reasoningEffort: spec.reasoningEffort ?? 'low',
      maxTurns: spec.assemblerTools ? 4 : 3,
    },
  );

  const a = tally(assembly.turns);
  const cachedSeen =
    items.some((i) => typeof i.cachedInputTokens === 'number') || typeof a.cachedInputTokens === 'number';

  return {
    items,
    values,
    failedIds,
    notAttemptedIds,
    assembled: assembly.structured ?? null,
    assemblerError: assembly.structured
      ? null
      : `assembler produced no valid output: ${assembly.schemaErrors.join('; ') || assembly.stoppedBecause}`,
    calls: items.length + assembly.turns.length,
    inputTokens: items.reduce((s, i) => s + i.inputTokens, 0) + a.inputTokens,
    outputTokens: items.reduce((s, i) => s + i.outputTokens, 0) + a.outputTokens,
    cachedInputTokens: cachedSeen
      ? items.reduce((s, i) => s + (i.cachedInputTokens ?? 0), 0) + (a.cachedInputTokens ?? 0)
      : undefined,
    ms: Date.now() - started,
  };
}
