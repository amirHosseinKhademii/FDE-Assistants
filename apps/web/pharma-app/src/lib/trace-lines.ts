/**
 * One streamed event → one line of the working notes.
 *
 * WHY THIS IS ITS OWN FILE NOW. `useAsk` built these lines inline while the
 * stream arrived, which was fine while a trace only ever existed live. History
 * stores the RAW events and renders them later, so the same mapping is needed
 * in two places — and two copies of it would drift into a page where an old
 * answer's notes are worded differently from a fresh one's, for no reason a
 * reader could see.
 *
 * WHY THE RAW EVENTS ARE WHAT GET STORED, and not these lines. The sentences in
 * `explain.ts` are PRESENTATION — they get reworded as we learn what a reviewer
 * misreads. Storing them would freeze today's wording into the database and
 * leave old rows explaining the system in language it no longer uses. What
 * happened is a fact; how it is explained is a choice, and choices belong
 * outside the row.
 */
import { describeArgs, explainCall, explainResult, RETRY_EXPLANATION } from './explain';
import type { TraceLine } from '@fde/uikit';

/**
 * What the `/api/ask` stream emits, in the shape it is stored in.
 *
 * Deliberately loose. This is a record of what a past run did, and a record
 * that fails to parse because the event shape moved is worse than one with a
 * field the renderer ignores.
 */
export interface AskEvent {
  type: 'tool_call' | 'tool_result' | 'schema_retry' | 'fanout_progress';
  turn?: number;
  name?: string;
  args?: unknown;
  ok?: boolean;
  ms?: number;
  summary?: string;
  error?: string;
  /** fan-out only: how many sub-agents have finished, of how many. */
  done?: number;
  total?: number;
  lotId?: string;
}

/** Null for an event with no line of its own — a `turn_start` carries no news. */
export function toTraceLine(ev: AskEvent): TraceLine | null {
  if (ev.type === 'tool_call') {
    const name = ev.name ?? 'tool';
    return {
      kind: 'call',
      name,
      detail: describeArgs(ev.args),
      why: explainCall(name, ev.args),
    };
  }
  if (ev.type === 'tool_result') {
    const name = ev.name ?? 'tool';
    return {
      kind: 'result',
      name,
      detail: `${ev.summary ?? ''} — ${ev.ms ?? 0}ms`,
      ok: ev.ok,
      why: explainResult(name, ev),
    };
  }
  if (ev.type === 'fanout_progress') {
    // ONE LINE FOR THE WHOLE FAN-OUT, carrying a count rather than a name per
    // lot — see `use-ask.ts` for why twenty-three lines would be worse than
    // none. The name is constant so the reducer there can replace in place.
    const done = ev.done ?? 0;
    const total = ev.total ?? 0;
    return {
      kind: 'call',
      name: 'sub-agents',
      detail: `${done} of ${total} lots assessed${ev.lotId ? ` — ${ev.lotId}` : ''}`,
      ok: ev.ok,
      why:
        'One sub-agent per lot, four at a time. Each is handed a single lot’s evidence and ' +
        'asked for a single row; none of them can reach another lot, so no one request can ' +
        'expose more than one.',
    };
  }
  if (ev.type === 'schema_retry') {
    return { kind: 'retry', name: 'schema', detail: ev.error ?? '', why: RETRY_EXPLANATION };
  }
  return null;
}

export function toTraceLines(events: AskEvent[] | undefined): TraceLine[] {
  if (!Array.isArray(events)) return [];
  return events.map(toTraceLine).filter((l): l is TraceLine => l !== null);
}
