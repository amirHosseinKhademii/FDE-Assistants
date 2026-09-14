/**
 * LangGraph's accumulated message list, rebuilt as the `TurnRecord[]` every
 * engine reports.
 *
 * DELIBERATELY NOT SHARED with the other engines, for the same reason
 * `mastra/turns.ts` says: three engines, three reply shapes, three real
 * implementations. LangGraph's is the awkward one — `allMessages` is the FULL
 * conversation on every call, not a delta, so this only reads the AI messages
 * past `turnOffset`.
 */
import type { ToolCallRecord } from '../core/tool.types';
import type { TurnRecord } from '../core/loop.types';

const { AIMessage } = require('@langchain/core/messages');

/**
 * Rebuild `TurnRecord[]` from LangGraph's accumulated message list.
 *
 * One `AIMessage` is one model round-trip, matching what `sdk/loop.ts` and
 * `mastra/loop.ts` call a turn — so turn counts and token counts stay
 * comparable across all three engines. `allMessages` is the FULL conversation
 * on every call (LangGraph returns accumulated state, not a delta), so this
 * only processes the AI messages past `turnOffset` — the same slicing trick
 * the other two loops use to avoid re-counting a schema retry's earlier turns.
 */
export function turnsFrom(
  allMessages: any[],
  dispatched: ToolCallRecord[],
  turnOffset: number,
  toolOffset: number,
): TurnRecord[] {
  const aiMessages = allMessages.filter((m) => m instanceof AIMessage);
  const newAi = aiMessages.slice(turnOffset);
  const turns: TurnRecord[] = [];
  let taken = toolOffset;
  newAi.forEach((m: any, i: number) => {
    const wanted = (m.tool_calls ?? []).length;
    const calls = dispatched.slice(taken, taken + wanted);
    taken += wanted;
    const usage = m.usage_metadata ?? {};
    turns.push({
      turn: turnOffset + i + 1,
      // LangGraph does not time individual round-trips either — same choice
      // the other two engines make. Wall clock is the caller's.
      ms: 0,
      inputTokens: usage.input_tokens ?? 0,
      // `cache_read`, NOT `cache_creation`. LangChain splits the two: a READ is
      // a hit, billed at the discounted rate; a CREATION is a miss that seeded
      // the cache, and on some providers it is billed at a PREMIUM rather than
      // a discount. Summing them would apply a discount to tokens that may have
      // cost extra — wrong in the flattering direction. Azure OpenAI charges no
      // cache-creation premium today; reading only `cache_read` stays correct
      // if that ever stops being true, or if this engine meets another provider.
      cachedInputTokens: usage.input_token_details?.cache_read ?? undefined,
      outputTokens: usage.output_tokens ?? 0,
      toolCalls: calls,
      text: typeof m.content === 'string' && m.content ? m.content : undefined,
    });
  });
  return turns;
}
