/**
 * All the state one question produces, and nothing about how it looks.
 *
 * Keeping the stream handling here is what lets the page components stay
 * presentational — and it is the same separation the domain makes one level
 * down, where `askCoverage()` owns the assembly and the surfaces only render.
 */
import { useRef, useState } from 'react';
import { askStream } from './ask-stream';
import { describeArgs, explainCall, explainResult, RETRY_EXPLANATION } from './explain';

export interface TraceLine {
  kind: 'call' | 'result' | 'retry';
  name: string;
  detail: string;
  why: string;
  ok?: boolean;
}

export interface AskInput {
  question: string;
  policy?: string;
  loop: string;
  apiKey?: string;
}

export function useAsk(onAuthRequired: () => void) {
  const [busy, setBusy] = useState(false);
  const [trace, setTrace] = useState<TraceLine[]>([]);
  const [answer, setAnswer] = useState<any>(null);
  const [failure, setFailure] = useState<{ message: string; stoppedBecause?: string } | null>(null);
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

    try {
      for await (const ev of askStream({ ...input, signal: controller.signal })) {
        if (ev.event === 'tool_call') {
          setTrace((t) => [
            ...t,
            {
              kind: 'call',
              name: ev.data.name,
              detail: describeArgs(ev.data.args),
              why: explainCall(ev.data.name, ev.data.args),
            },
          ]);
        } else if (ev.event === 'tool_result') {
          setTrace((t) => [
            ...t,
            {
              kind: 'result',
              name: ev.data.name,
              detail: `${ev.data.summary} — ${ev.data.ms}ms`,
              ok: ev.data.ok,
              why: explainResult(ev.data.name, ev.data),
            },
          ]);
        } else if (ev.event === 'schema_retry') {
          setTrace((t) => [
            ...t,
            { kind: 'retry', name: 'schema', detail: ev.data.error, why: RETRY_EXPLANATION },
          ]);
        } else if (ev.event === 'answer') {
          setAnswer(ev.data);
        } else if (ev.event === 'error') {
          // 401 and 503 come from the guard, not from the model.
          if (ev.data.status === 401 || ev.data.status === 503) onAuthRequired();
          setFailure({ message: ev.data.message, stoppedBecause: ev.data.stoppedBecause });
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') setFailure({ message: String(err?.message ?? err) });
    } finally {
      setBusy(false);
    }
  }

  return { busy, trace, answer, failure, ask };
}
