/**
 * `/desk` — answer a question about one customer case.
 *
 * THE DESIGN MATCHES INDEX AND STEPS. Same accent colors, same utility
 * classes, same fonts. The left panel shows the case list; the right shows
 * the question, the tool events as they arrive, and the answer.
 *
 * THE MODEL NEVER TOUCHES THE DATABASE. All facts come from MCP tool calls,
 * and each call is recorded: the tool name, how long it took, whether it
 * succeeded, and a preview of the result.
 */
import { useCallback, useRef, useState } from 'react';
import { Mono } from '@fde/uikit';
import { Aurora } from '@veresk/surface';
import type { AskEvent } from '@thornbury/commerce';
import { askStream } from '../lib/ask-stream';
import { AURORA } from '../lib/aurora';
import { CASES } from '../lib/cases';
import { VERESK } from '../lib/links';
import { AnswerCard } from '../components/AnswerCard';

interface TraceEvent {
  turn?: number;
  name: string;
  ms: number;
  ok: boolean;
  cause?: string;
  args: unknown;
  preview: string;
}

interface StreamState {
  phase: 'idle' | 'running' | 'answered' | 'error';
  trace: TraceEvent[];
  answer?: { text: string; turns: number };
  error?: string;
}

const EMPTY: StreamState = { phase: 'idle', trace: [] };

export function Desk() {
  const [mode, setMode] = useState<'pick' | 'prompt'>('pick');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [state, setState] = useState<StreamState>(EMPTY);
  const [caseInfo, setCaseInfo] = useState<{ caseId: string; source: string } | null>(null);
  const abort = useRef<AbortController | null>(null);

  const selected = CASES.find((c) => c.id === selectedId);

  const onPick = (caseId: string) => {
    const c = CASES.find((x) => x.id === caseId);
    if (!c) return;
    setSelectedId(caseId);
    setQuestion(c.question);
  };

  const onRun = useCallback(async () => {
    if (mode === 'pick' && (!selectedId || !question.trim())) return;
    if (mode === 'prompt' && !question.trim()) return;

    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setState({ ...EMPTY, phase: 'running' });
    setCaseInfo(null);

    try {
      // In pick mode, use selectedId; in prompt mode, let the API extract it
      const caseIdToSend = mode === 'pick' ? (selected?.caseId ?? undefined) : undefined;

      for await (const event of askStream(caseIdToSend, question, controller.signal)) {
        if (event.type === 'case') {
          setCaseInfo({ caseId: event.caseId, source: event.source });
        } else if (event.type === 'tool') {
          setState((s) => ({
            ...s,
            trace: [
              ...s.trace,
              {
                name: event.name,
                ms: event.ms,
                ok: event.ok,
                cause: event.cause,
                args: event.args,
                preview: event.preview,
              },
            ],
          }));
        } else if (event.type === 'answer') {
          setState((s) => ({
            ...s,
            phase: 'answered',
            answer: { text: event.text, turns: event.turns },
          }));
        } else if (event.type === 'error') {
          setState((s) => ({
            ...s,
            phase: 'error',
            error: event.message,
          }));
        }
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setState((s) => ({
        ...s,
        phase: 'error',
        error: e?.message ?? String(e),
      }));
    } finally {
      abort.current = null;
    }
  }, [selectedId, question, mode, selected]);

  const onCancel = useCallback(() => {
    abort.current?.abort();
    abort.current = null;
    setState((s) => ({ ...s, phase: 'idle' }));
    setCaseInfo(null);
  }, []);

  const busy = state.phase === 'running';

  return (
    <div className="relative min-h-screen">
      <Aurora tones={AURORA} muted />

      <header className="sticky top-0 z-20 border-b border-ui-line bg-ui-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 sm:px-6 sm:py-4">
          <h1 className="text-[1.0625rem] font-semibold tracking-tight">Resolve a claim</h1>
          {VERESK ? (
            <a
              href={VERESK}
              className="rounded-lg border border-ui-line bg-ui-raised/60 px-4 py-2 text-sm text-ui-dim transition-colors hover:border-ui-accent/50 hover:text-ui-fg sm:ml-auto"
            >
              Back to Veresk
            </a>
          ) : (
            <span className="text-sm text-ui-dim sm:ml-auto">Veresk</span>
          )}
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-24 sm:px-6">
        <div className="lift-in pt-10 pb-8 md:pt-12">
          <h2 className="max-w-[24ch] font-mono text-[1.75rem] leading-[1.12] font-semibold tracking-tighter sm:text-4xl">
            What is the customer owed?
          </h2>
          <p className="mt-5 max-w-[62ch] leading-relaxed text-ui-dim">
            Pick a case from the left, enter a question, and the assistant will search the policy and
            order records over the MCP tools to build an answer. The model never touches the database
            — everything is a tool call.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-[320px_1fr]">
          {/* LEFT: Case list */}
          <aside className="min-w-0">
            <div className="space-y-1 overflow-y-auto rounded-lg border border-ui-line bg-ui-surface">
              {CASES.map((c) => {
                const isSelected = c.id === selectedId;
                return (
                  <button
                    key={c.id}
                    onClick={() => onPick(c.id)}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                      isSelected
                        ? 'bg-thb-1/20 text-ui-fg'
                        : 'bg-transparent text-ui-dim hover:bg-ui-line/50 hover:text-ui-fg'
                    }`}
                  >
                    <div className="font-mono text-[0.8125rem]">{c.caseId}</div>
                    <div className="text-[0.8125rem]">{c.trap ?? 'control'}</div>
                    {c.tags[0] && <div className="mt-1 text-[0.75rem] text-ui-faint">{c.tags[0]}</div>}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* RIGHT: Question, trace, answer */}
          <section className="min-w-0">
            <div className="space-y-6">
              {/* Mode toggle */}
              <div>
                <div className="flex gap-2 rounded-lg border border-ui-line bg-ui-surface p-1">
                  <button
                    onClick={() => {
                      setMode('pick');
                      setQuestion('');
                    }}
                    className={`flex-1 rounded px-3 py-2 text-sm font-semibold transition-colors ${
                      mode === 'pick'
                        ? 'bg-thb-1/20 text-ui-fg'
                        : 'bg-transparent text-ui-dim hover:text-ui-fg'
                    }`}
                  >
                    Pick a case
                  </button>
                  <button
                    onClick={() => {
                      setMode('prompt');
                      setSelectedId(null);
                    }}
                    className={`flex-1 rounded px-3 py-2 text-sm font-semibold transition-colors ${
                      mode === 'prompt'
                        ? 'bg-thb-1/20 text-ui-fg'
                        : 'bg-transparent text-ui-dim hover:text-ui-fg'
                    }`}
                  >
                    Type a prompt
                  </button>
                </div>
              </div>

              {/* Question input */}
              <div>
                <label htmlFor="question" className="block text-sm font-semibold text-ui-fg">
                  {mode === 'pick' ? 'Your question' : 'Your prompt'}
                </label>
                <textarea
                  id="question"
                  className="mt-2 w-full rounded-lg border border-ui-line bg-ui-raised px-3 py-2 text-sm text-ui-fg placeholder-ui-faint focus:border-thb-1 focus:outline-none disabled:opacity-50"
                  rows={4}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={busy}
                  placeholder={mode === 'pick' ? 'Ask what the customer is entitled to...' : 'Describe the case and question (include CAS-##### or ORD-######)...'}
                />
              </div>

              {/* Example chips for prompt mode */}
              {mode === 'prompt' && !busy && (
                <div className="space-y-2">
                  <p className="text-sm text-ui-dim">Example prompts:</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setQuestion('CAS-90001 — the customer wants their money back. What are they entitled to, and on what policy?')}
                      className="rounded-lg border border-ui-line bg-ui-surface px-3 py-2 text-xs text-ui-fg transition-colors hover:border-thb-1/50 hover:bg-ui-line/30"
                    >
                      CAS-90001 — the customer wants their money back. What are they entitled to, and on what policy?
                    </button>
                    <button
                      onClick={() => setQuestion('ORD-101414: customer says it arrived broken. Full refund, replacement, or nothing? Cite the rule.')}
                      className="rounded-lg border border-ui-line bg-ui-surface px-3 py-2 text-xs text-ui-fg transition-colors hover:border-thb-1/50 hover:bg-ui-line/30"
                    >
                      ORD-101414: customer says it arrived broken. Full refund, replacement, or nothing? Cite the rule.
                    </button>
                    <button
                      onClick={() => setQuestion('CAS-90003 — is this order eligible for a refund, and does it need human approval?')}
                      className="rounded-lg border border-ui-line bg-ui-surface px-3 py-2 text-xs text-ui-fg transition-colors hover:border-thb-1/50 hover:bg-ui-line/30"
                    >
                      CAS-90003 — is this order eligible for a refund, and does it need human approval?
                    </button>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onRun}
                  disabled={
                    mode === 'pick'
                      ? !selectedId || !question.trim() || busy
                      : !question.trim() || busy
                  }
                  className="rounded-lg bg-thb-1 px-4 py-2 text-sm font-semibold text-[#0b1a1a] transition-colors hover:bg-[#5fd6ca] disabled:opacity-50"
                >
                  {busy ? 'Working…' : 'Ask'}
                </button>
                {busy && (
                  <button
                    onClick={onCancel}
                    className="rounded-lg border border-ui-line bg-ui-raised px-4 py-2 text-sm text-ui-fg transition-colors hover:border-ui-accent/50"
                  >
                    Stop
                  </button>
                )}
              </div>

              {/* Case info line */}
              {caseInfo && (
                <div className="text-sm text-ui-dim">
                  Case {caseInfo.caseId} (from: {caseInfo.source})
                </div>
              )}

              {/* Trace */}
              {state.trace.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-ui-fg">Tool calls ({state.trace.length})</h3>
                  <div className="mt-3 space-y-2">
                    {state.trace.map((event, i) => (
                      <TraceRow key={i} event={event} index={i + 1} />
                    ))}
                  </div>
                </section>
              )}

              {/* Answer */}
              {state.answer && <AnswerCard text={state.answer.text} turns={state.answer.turns} />}

              {/* Error */}
              {state.error && (
                <section className="rounded-lg border border-red-400/30 bg-red-400/5 p-4">
                  <h3 className="text-sm font-semibold text-red-300">Error</h3>
                  <p className="mt-2 text-sm text-red-200">{state.error}</p>
                </section>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function TraceRow({ event, index }: { event: TraceEvent; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-ui-line bg-ui-surface p-3">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 text-[0.8125rem] font-mono text-ui-faint">{index}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-ui-fg">{event.name}</span>
            <span
              className={`rounded px-2 py-1 text-[0.75rem] font-semibold ${
                event.ok
                  ? 'bg-green-400/15 text-green-300'
                  : 'bg-red-400/15 text-red-300'
              }`}
            >
              {event.ok ? 'ok' : event.cause ?? 'error'}
            </span>
            <span className="text-[0.8125rem] text-ui-faint">{event.ms}ms</span>
          </div>

          {/* Args and preview */}
          {event.preview && (
            <div className="mt-2">
              <details>
                <summary className="cursor-pointer text-[0.8125rem] text-ui-dim hover:text-ui-fg">
                  {expanded ? 'Hide' : 'Show'} preview
                </summary>
                {expanded && (
                  <pre className="mt-2 max-h-40 overflow-auto rounded bg-ui-line/20 p-2 font-mono text-[0.75rem] text-ui-faint">
                    {event.preview}
                  </pre>
                )}
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
