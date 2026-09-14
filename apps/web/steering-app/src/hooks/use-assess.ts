/**
 * One assessment, from "go" to an answer or a failure.
 *
 * WHY A HOOK AND NOT STATE IN THE PAGE. The page has to render four different
 * things — idle, running with a live trace, answered, failed — and each of them
 * from the same run. Keeping the state machine here means the page is a
 * rendering of it rather than a second copy of it.
 *
 * THE TRACE IS APPENDED, NEVER REPLACED. A tool result matches back to the call
 * it belongs to by turn and name, so the finished trace reads as a sequence of
 * completed steps rather than as a cursor that moved.
 */
import { useCallback, useRef, useState } from 'react';
import { assessStream } from '../lib/assess-stream';

/** What the loop is doing, as it does it. */
export interface TraceStep {
  turn: number;
  name: string;
  args?: any;
  /** Absent while the call is still running — which is what makes it live. */
  done?: { ok: boolean; ms: number; summary?: string };
}

export interface RunStats {
  turns: number;
  toolCalls: number;
  ms: number;
  engine: string;
  stoppedBecause: string;
  schemaRetries: number;
}

/**
 * NULLABLE WHERE THE ESTATE MIGHT NOT HAVE IT. A requirement picked from the
 * specification carries a section, a safety level and a priority; one typed
 * into the box carries none of them, because nobody has decided them yet. The
 * page renders the absence rather than a blank.
 */
export interface Requirement {
  ref: string;
  section: string | null;
  title: string;
  text: string;
  attribute: string | null;
  unit: string | null;
  asil: string | null;
  priority: string | null;
  verificationMethod: string | null;
  revision: string;
  specTitle: string;
}

export type Phase = 'idle' | 'running' | 'answered' | 'failed';

export interface AssessState {
  phase: Phase;
  requirement?: Requirement;
  assessment?: any;
  citations?: { exact: number; corrected: number; unresolved: Array<{ file: string; quote: string }> };
  run?: RunStats;
  error?: { message: string; stoppedBecause?: string };
  trace: TraceStep[];
  /** Retries the contract rejected. Kept even when a later attempt succeeded. */
  retries: string[];
}

const EMPTY: AssessState = { phase: 'idle', trace: [], retries: [] };

export function useAssess() {
  const [state, setState] = useState<AssessState>(EMPTY);
  const abort = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abort.current?.abort();
    abort.current = null;
  }, []);

  /**
   * `what` is either a picked requirement (`{ ref }`) or a typed one
   * (`{ text }`). Never both — see the route: the page drops the ref the moment
   * the text is edited, because at that point it is no longer that requirement.
   */
  const start = useCallback(
    async (what: { ref?: string; text?: string }, opts?: { loop?: string; apiKey?: string }) => {
      cancel();
      const controller = new AbortController();
      abort.current = controller;
      setState({ ...EMPTY, phase: 'running' });

      try {
        for await (const { event, data } of assessStream({
          ...what,
          loop: opts?.loop,
          apiKey: opts?.apiKey,
          signal: controller.signal,
        })) {
          setState((s) => {
            switch (event) {
              case 'requirement':
                return { ...s, requirement: data };
              case 'tool_call':
                return { ...s, trace: [...s.trace, { turn: data.turn, name: data.name, args: data.args }] };
              case 'tool_result': {
                // Matched to the LAST unfinished call of that name, because a
                // loop may call the same tool twice in one turn and the second
                // result must not overwrite the first.
                const trace = [...s.trace];
                for (let i = trace.length - 1; i >= 0; i--) {
                  if (trace[i].name === data.name && !trace[i].done) {
                    trace[i] = { ...trace[i], done: { ok: data.ok, ms: data.ms, summary: data.summary } };
                    break;
                  }
                }
                return { ...s, trace };
              }
              case 'schema_retry':
                return { ...s, retries: [...s.retries, data.error] };
              case 'answer':
                return {
                  ...s,
                  phase: 'answered',
                  assessment: data.assessment,
                  citations: data.citations,
                  run: data.run,
                };
              case 'error':
                return { ...s, phase: 'failed', error: data, run: data.run ?? s.run };
              default:
                return s;
            }
          });
        }
      } catch (e: any) {
        // An abort is the reader stopping it on purpose, not a failure.
        if (e?.name === 'AbortError') return;
        setState((s) => ({ ...s, phase: 'failed', error: { message: e?.message ?? String(e) } }));
      } finally {
        abort.current = null;
      }
    },
    [cancel],
  );

  const reset = useCallback(() => {
    cancel();
    setState(EMPTY);
  }, [cancel]);

  return { ...state, start, cancel, reset };
}
