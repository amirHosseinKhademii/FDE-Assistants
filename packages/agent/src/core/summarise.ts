/**
 * The `--trace` one-liner for a tool result.
 *
 * ITS OWN MODULE ON PURPOSE. Both engines need it, and importing it from
 * whichever engine happens to define it would make that engine's dependencies
 * load for the other — `mastra/loop.ts` would drag in `@openai/agents` merely
 * to print a line of trace output. The whole point of two interchangeable
 * engines is that either can be deleted, and a shared helper living inside one
 * of them quietly removes that property. A typecheck cannot see it.
 */
/**
 * One line per tool result for `--trace`. Shared by both engines.
 *
 * Only the shapes EVERY retrieval system has are handled here: a `results`
 * array from a search, a `found: false` miss. Anything else is truncated JSON
 * rather than guessed at — a summary that invents structure is worse than one
 * that admits it does not know. Pass `summariseResult` to do better.
 */
export function summariseResult(result: any, custom?: (r: unknown) => string | null): string {
  const mine = custom?.(result);
  if (mine) return mine;

  if (Array.isArray(result?.results)) {
    if (result.results.length === 0) return 'no results';
    // `section` is the heading trail every chunk carries — see @fde/grounding.
    const groups = [
      ...new Set(result.results.map((r: any) => String(r.section ?? '').split(' > ')[0])),
    ].filter(Boolean);
    return groups.length
      ? `${result.results.length} passage(s) from ${groups.length} document(s): ${groups.join(' | ')}`
      : `${result.results.length} result(s)`;
  }
  if (result?.found === false) return 'not found';

  const s = JSON.stringify(result);
  return s.length > 120 ? `${s.slice(0, 120)}…` : s;
}
