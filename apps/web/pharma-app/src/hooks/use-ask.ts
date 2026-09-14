/**
 * All the state one question produces, and nothing about how it looks.
 *
 * Keeping the stream handling here is what lets the page components stay
 * presentational — and it is the same separation the domain makes one level
 * down, where `askRelease()` owns the assembly and the surfaces only render.
 *
 * COPIED FROM `apps/insurance-app`, NOT SHARED — yet. It is genuinely
 * domain-free and both apps now want it, which is the second occurrence that
 * justifies extracting it. That comes AFTER both apps run: an API designed
 * against a caller that does not work yet encodes guesses, not requirements.
 * See `docs/pharma/EXTRACTION.md`.
 */
import { useRef, useState } from 'react';
import { askStream } from '../lib/ask-stream';
import { toTraceLine } from '../lib/trace-lines';
import type { TraceLine } from '@fde/uikit';

export type { TraceLine };

export interface AskInput {
  question: string;
  loop: string;
  apiKey?: string;
  /** 'loop' | 'fanout'. Ignored by the release endpoint. */
  topology?: string;
}

/**
 * `path` picks WHICH question this hook asks. The state it produces — busy, the
 * trace, an answer, a failure — is the same either way, because the SSE protocol
 * is the same either way; only the body of the `answer` event differs, and this
 * hook deliberately does not look inside it. That is what lets the supplier desk
 * reuse this without either page learning the other's shape.
 */
/**
 * What a fan-out has finished so far.
 *
 * KEPT AS EVENTS, NOT AS A SENTENCE. The working notes get one collapsed line
 * because twenty-three lines would bury the live step; the panel wants the
 * opposite — every lot that has reported, in the order it reported, with
 * whether it succeeded. Two consumers, two shapes, one stream.
 *
 * THE PLAN ARRIVES FIRST, THE RESULTS AFTER. `fanout_start` carries every lot
 * the orchestrator is about to work on — so the panel can draw the real job,
 * named, from the first instant rather than growing anonymously from nothing.
 * `fanout_progress` then marks them off.
 *
 * WHAT THIS STILL DOES NOT CLAIM: which four are running right now. Progress
 * fires on COMPLETION, so "finished" and "not yet finished" are the only two
 * states the surface can honestly distinguish. A lot that has not reported is
 * drawn as waiting — never as running, which would be a guess.
 */
export interface FanoutLot {
  lotId: string;
  productName: string;
  market: string;
  exposure: string;
  /** undefined until it reports. */
  ok?: boolean;
  /** Why it failed, when it did. */
  error?: string;
  /** Arrival index, for showing what came back most recently. */
  at?: number;
}

export interface FanoutState {
  done: number;
  total: number;
  /** Every lot in the job, in the order the walk ranked them. */
  lots: FanoutLot[];
  startedAt: number;
}

/**
 * A debate, as it forms.
 *
 * THE STAGES ARRIVE IN THE ORDER THEY HAPPEN, which is the entire point of
 * showing it at all: two positions form INDEPENDENTLY, then answer each other,
 * then a third participant writes up what is actually in dispute. A single
 * finished memo hides that the two sides were reached separately — and that
 * separation is the only reason to believe the disagreement is real rather than
 * one model playing both parts of a script.
 */
export interface DebateArgument {
  position: string;
  strongest_point: string;
  argument: string;
  evidence_refs: string[];
  holds: string;
  concedes: string;
  what_would_change_my_mind: string;
}

export interface DebateState {
  lot: {
    lotId: string; productName: string; market: string;
    exposure: string; quantityUnits: number; findings: string[];
  };
  supplier: { supplierId: string; name: string; disqualifiedOn: string | null; reason: string | null };
  sides: { precaution: string; proportion: string };
  contestedCount: number;
  opening: Partial<Record<'precaution' | 'proportion', DebateArgument | null>>;
  rebuttal: Partial<Record<'precaution' | 'proportion', DebateArgument | null>>;
  adjudication: any | null;
  /** Which round is still being waited on. Null once the memo lands. */
  waitingOn: 'opening' | 'rebuttal' | 'adjudication' | null;
  errors: string[];
  run?: any;
}

export function useAsk(onAuthRequired: () => void, path?: string) {
  const [busy, setBusy] = useState(false);
  const [fanout, setFanout] = useState<FanoutState | null>(null);
  const [debate, setDebate] = useState<DebateState | null>(null);
  const [trace, setTrace] = useState<TraceLine[]>([]);
  const [answer, setAnswer] = useState<any>(null);
  // `run` is carried on failures too. A question that failed still spent tokens
  // and still took a minute, and hiding that makes the cost figure a lie by
  // omission. (Insurance's copy of this hook drops it; the route already sends
  // it. Reconcile when this is extracted — see docs/pharma/EXTRACTION.md.)
  const [failure, setFailure] = useState<
    { message: string; stoppedBecause?: string; run?: any } | null
  >(null);
  const abort = useRef<AbortController | null>(null);

  async function ask(input: AskInput): Promise<void> {
    // A second question abandons the first rather than racing it.
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;

    setBusy(true);
    setTrace([]);
    setAnswer(null);
    setFailure(null);
    setFanout(null);
    setDebate(null);

    try {
      for await (const ev of askStream({ ...input, path, signal: controller.signal })) {
        // The three trace-producing events share one mapping with the history
        // view — see `trace-lines.ts` for why it stopped living inline here.
        if (ev.event === 'debate_start') {
          const d = ev.data ?? {};
          setDebate({
            lot: d.lot, supplier: d.supplier, sides: d.sides,
            contestedCount: d.contestedCount ?? 0,
            opening: {}, rebuttal: {}, adjudication: null,
            waitingOn: 'opening', errors: [],
          });
        } else if (ev.event === 'debate_stage') {
          const { round, side, value } = ev.data ?? {};
          setDebate((d) => {
            if (!d) return d;
            if (round === 'adjudication') {
              return { ...d, adjudication: value, waitingOn: null };
            }
            const bucket = { ...(d as any)[round], [side]: value };
            // Both sides of a round are in → the next round is what we wait on.
            const complete = bucket.precaution !== undefined && bucket.proportion !== undefined;
            return {
              ...d,
              [round]: bucket,
              waitingOn: complete
                ? round === 'opening'
                  ? 'rebuttal'
                  : 'adjudication'
                : d.waitingOn,
            };
          });
        } else if (ev.event === 'debate') {
          const d = ev.data ?? {};
          setDebate((prev) =>
            prev
              ? {
                  ...prev,
                  opening: d.opening ?? prev.opening,
                  rebuttal: d.rebuttal ?? prev.rebuttal,
                  adjudication: d.adjudication ?? prev.adjudication,
                  errors: d.errors ?? [],
                  waitingOn: null,
                  run: d.run,
                }
              : prev,
          );
        } else if (ev.event === 'fanout_start') {
          const lots: FanoutLot[] = ev.data?.lots ?? [];
          setFanout({ done: 0, total: lots.length, lots, startedAt: Date.now() });
        } else if (ev.event === 'fanout_progress') {
          const { done = 0, total = 0, lotId, ok, error } = ev.data ?? {};
          setFanout((f) => {
            const startedAt = f?.startedAt ?? Date.now();
            // `fanout_start` should always have arrived first; if it somehow did
            // not, fall back to appending rather than dropping the event.
            const known = f?.lots ?? [];
            const seen = known.some((l) => l.lotId === lotId);
            const lots = seen
              ? known.map((l) => (l.lotId === lotId ? { ...l, ok: ok !== false, error, at: done } : l))
              : [...known, { lotId, productName: '', market: '', exposure: '', ok: ok !== false, error, at: done }];
            return { done, total: total || lots.length, lots, startedAt };
          });
          // ONE LINE THAT UPDATES, NOT TWENTY-THREE THAT ACCUMULATE. A sub-agent
          // per lot would push the notes past the sticky column and bury the
          // live step the animation exists to mark. `WorkingNotes` treats the
          // LAST line as the running one, so replacing in place keeps that true.
          const line = toTraceLine({ type: 'fanout_progress', ...ev.data });
          if (line) {
            setTrace((t) => {
              const last = t[t.length - 1];
              return last?.name === line.name ? [...t.slice(0, -1), line] : [...t, line];
            });
          }
        } else if (
          ev.event === 'tool_call' ||
          ev.event === 'tool_result' ||
          ev.event === 'schema_retry'
        ) {
          const line = toTraceLine({ type: ev.event, ...ev.data });
          if (line) setTrace((t) => [...t, line]);
        } else if (ev.event === 'answer') {
          setAnswer(ev.data);
        } else if (ev.event === 'error') {
          // 401 and 503 come from the guard, not from the model.
          if (ev.data.status === 401 || ev.data.status === 503) onAuthRequired();
          setFailure({
            message: ev.data.message,
            stoppedBecause: ev.data.stoppedBecause,
            run: ev.data.run,
          });
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') setFailure({ message: String(err?.message ?? err) });
    } finally {
      setBusy(false);
    }
  }

  return { busy, trace, answer, failure, fanout, debate, ask };
}
