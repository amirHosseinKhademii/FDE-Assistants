/**
 * The desk — a question in, an answer with its working shown.
 *
 * ── THE TRACE IS THE PRODUCT HERE, NOT DEBUG OUTPUT ───────────────────────
 *
 * On the other engagements the answer is the thing being sold. On this one the
 * answer is half of it, because the whole argument of these seven stages is
 * that a plausible answer and a correct one look identical.
 *
 * "It looked the recall up rather than searching for it" and "that number came
 * from this tool with this filter" are what make an answer trustworthy, and
 * neither is visible in the prose. Searching for a campaign number returns it at
 * position 4, so a model that searched would still produce text that reads fine.
 * A page showing only the paragraph would be a demo of the thing this site spent
 * six stages arguing against.
 *
 * So the tool calls are rendered first, as they arrive, at full weight.
 *
 * ── FOUR STATES THAT ARE NOT ERRORS ───────────────────────────────────────
 *
 * `answer: null`      the corpus cannot answer it. A legitimate outcome.
 * `escalate`          handing to a person is a SUCCESS state, not a failure.
 * found nothing       an absence, and its evidence is a query that came back
 *                     empty. There is no document to cite for it.
 * rejected            the contract refused the answer. The reasons are the most
 *                     honest output this system produces, so they are shown
 *                     rather than replaced with "something went wrong".
 *
 * Drawing any of those as a failure would teach the reader the opposite of what
 * the rest of the site says.
 *
 * ── AND IT SAYS "THIS TIME" ───────────────────────────────────────────────
 *
 * Every number here came from one run of a system that is not deterministic.
 * The same question has been measured at 3.9s and at 85.8s, and one question
 * escalated once and then did not, four times running. The page says so, because
 * this is the one surface on the site where a reader would otherwise assume
 * they were looking at a fixed fact.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Mono } from '@fde/uikit';
import { Link } from '@tanstack/react-router';
import { Aurora } from '@veresk/surface';
import { AURORA } from '../lib/aurora';
import { VERESK } from '../lib/links';

/**
 * Four questions, each measured against this corpus today.
 *
 * They are suggestions rather than the only way in — the box takes anything.
 * Each shows a different shape of answer, which is why these four and not any
 * other four: a clean lookup, a proven absence, an escalation, and the chain
 * where one tool's result becomes the next one's filter.
 *
 * THE THIRD ONE EARNS ITS PLACE by being the only question on the site where
 * ESCALATING IS THE CORRECT ANSWER. Whether a particular vehicle actually had
 * its repair done is recorded nowhere in this corpus, so a system that answered
 * it confidently would be wrong. Without this button the escalation panel is a
 * state nobody can reach.
 *
 * THE RANGES ARE REAL AND ARE RANGES ON PURPOSE. Measured across runs today,
 * and the spread is the point — the same question has come back in 4 seconds
 * and in 131. Printing one number would be the page claiming a determinism this
 * stage does not have.
 */
const TRY: readonly { q: string; shows: string; cost: string }[] = [
  {
    q: 'What does recall 20V197000 cover?',
    shows: 'a lookup, not a search',
    cost: '1 call · 4–71s',
  },
  {
    q: 'Is there a recall for the forward-collision braking on our 2020 Odysseys?',
    shows: 'the answer is no, and it proves it',
    cost: '2–3 calls · 5–113s',
  },
  {
    q: "What's the remedy for recall 19V864000, and has it been done on our vehicles?",
    shows: 'hands it to a person, correctly',
    cost: '1 call · 4–12s',
  },
  {
    q: 'We run 2020 F-150s — is the transmission park problem a known defect, and is the fix holding?',
    shows: 'five calls, and one feeds the next',
    cost: '5–7 calls · 15–131s',
  },
];

interface HistoryRow {
  id: number;
  asked_at: string;
  question: string;
  engine: string;
  model: string;
  ms: number;
  tools: string[];
  answer: string | null;
  rejected: string[] | null;
  escalated: boolean;
}

/**
 * The three loops, and where each one stands against the configured provider.
 *
 * THE UNUSABLE ONE IS SHOWN, NOT FILTERED OUT. Having built three engines is
 * what revealed the differences between them, and a picker offering two options
 * tells that story less well than one offering three with a reason on the third.
 */
interface EngineOption {
  id: string;
  label: string;
  usable: boolean;
  /** A few words for the row. "default", "needs Azure or OpenAI". */
  note: string;
  /**
   * The longer why. NOT RENDERED — it is documentation, and three registers
   * stacked on one select is what made this control unreadable the first time.
   * Kept in the type because the endpoint sends it and a reader of this file
   * should know it exists rather than wonder what was dropped.
   */
  detail?: string;
}

interface ToolCall {
  name: string;
  args: unknown;
}

interface Answer {
  answer: string | null;
  campaigns: string[];
  counts: { value: number; label: string; from?: string; filter?: unknown }[];
  citations: { source: string; claim: string }[];
  searches_that_found_nothing: { tool: string; arguments: unknown; what_it_means: string }[];
  unverified_claims: string[];
  conflicts: { topic: string; positions: { source: string; says: string }[]; resolved_by: string | null }[];
  escalate: { reason: string; suggested_owner: string } | null;
}

type Phase = 'idle' | 'running' | 'done';

export function Desk() {
  const [question, setQuestion] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [asked, setAsked] = useState('');
  const [engine, setEngine] = useState<{ engine: string; model: string | null } | null>(null);
  const [tools, setTools] = useState<ToolCall[]>([]);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [rejected, setRejected] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ms, setMs] = useState<number | null>(null);
  const [engines, setEngines] = useState<EngineOption[]>([]);
  const [picked, setPicked] = useState('');
  const abort = useRef<AbortController | null>(null);

  // Read per page load rather than baked in: which engines can serve depends on
  // how the server is configured, and a picker built at compile time would keep
  // offering an option that stopped working.
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/engines');
        const data = (await res.json()) as { engines: EngineOption[] };
        setEngines(data.engines ?? []);
        setPicked((cur) => cur || (data.engines ?? []).find((e) => e.usable)?.id || '');
      } catch {
        /* the dropdown simply does not appear */
      }
    })();
  }, []);

  // The engine is read through a ref so `ask` does not need to be rebuilt every
  // time the dropdown moves — and so a question already in flight keeps the
  // engine it started with.
  const pickedRef = useRef('');
  pickedRef.current = picked;

  const ask = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;

    abort.current?.abort();
    const ctl = new AbortController();
    abort.current = ctl;

    setPhase('running');
    setAsked(trimmed);
    setTools([]);
    setAnswer(null);
    setRejected(null);
    setError(null);
    setMs(null);
    setEngine(null);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: trimmed, engine: pickedRef.current }),
        signal: ctl.signal,
      });
      if (!res.body) throw new Error('no response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by a blank line. Anything after the last
        // blank line is a partial frame and stays in the buffer.
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';

        for (const frame of frames) {
          const ev = /^event: (.+)$/m.exec(frame)?.[1];
          const raw = /^data: (.+)$/m.exec(frame)?.[1];
          if (!ev || !raw) continue;
          let data: any;
          try {
            data = JSON.parse(raw);
          } catch {
            continue;
          }

          if (ev === 'started') setEngine({ engine: data.engine, model: data.model ?? null });
          else if (ev === 'engine') setEngine({ engine: data.engine, model: data.model });
          else if (ev === 'tool') setTools((t) => [...t, { name: data.name, args: data.args }]);
          else if (ev === 'answer') {
            setAnswer(data.answer);
            setMs(data.ms);
          } else if (ev === 'rejected') {
            setRejected(data.errors ?? []);
            setMs(data.ms);
          } else if (ev === 'error') {
            setError(data.message);
            setMs(data.ms ?? null);
          } else if (ev === 'done') setPhase('done');
        }
      }
      setPhase('done');
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'The question could not be sent.');
      setPhase('done');
    }
  }, []);

  const running = phase === 'running';

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Aurora tones={AURORA} muted />

      <nav className="relative z-10 mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-3 px-5 py-5 sm:px-6 sm:py-6">
        <Link to="/" className="font-medium tracking-tight">
          Calder Safety
        </Link>
        <span className="text-sm text-ui-faint sm:ml-auto">Ask it</span>
        <Link to="/steps" className="text-sm text-ui-dim transition-colors hover:text-ui-fg">
          How it would work
        </Link>
        <Link to="/data-flow" className="text-sm text-ui-dim transition-colors hover:text-ui-fg">
          Where the data goes
        </Link>
        {VERESK ? (
          <a href={VERESK} className="text-sm text-ui-dim transition-colors hover:text-ui-fg">
            Veresk
          </a>
        ) : (
          <span className="text-sm text-ui-faint">Veresk</span>
        )}
      </nav>

      <main className="relative z-10 mx-auto max-w-4xl px-5 pb-24 sm:px-6">
        <section className="pt-8 pb-8 md:pt-12">
          <p className="lift-in font-mono text-[0.6875rem] tracking-[0.08em] text-cal-1 uppercase">
            ask the public safety record
          </p>
          <h1 className="lift-in title-spectrum mt-3.5 max-w-3xl font-mono text-[1.75rem] leading-[1.1] font-semibold tracking-tighter break-words sm:text-[2.25rem]">
            A question, and everything it did to answer
          </h1>
          <p
            className="lift-in mt-4 max-w-[60ch] leading-relaxed text-ui-dim"
            style={{ animationDelay: '90ms' }}
          >
            The tools it chose are shown before the answer is. A plausible answer
            and a correct one read the same —{' '}
            <span className="text-ui-fg">what it did is the part you can check</span>.
          </p>
        </section>

        <form
          className="lift-in cal-ask"
          style={{ animationDelay: '140ms' }}
          onSubmit={(e) => {
            e.preventDefault();
            void ask(question);
          }}
        >
          <label className="cal-ask-label" htmlFor="q">
            your question
          </label>
          <div className="cal-ask-row">
            <input
              id="q"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about any 2019–2020 vehicle…"
              className="cal-ask-input"
              autoComplete="off"
              disabled={running}
            />
            <button type="submit" className="cal-ask-go" disabled={running || !question.trim()}>
              {running ? 'asking…' : 'ask →'}
            </button>
          </div>

          {/* COMPACT AND INLINE. A stacked label over a full-width select made
              this the loudest thing in the box, and it is a qualifier on the
              asking rather than part of it. The hint rides in the option text —
              one register, not three. */}
          {engines.length > 1 && (
            <div className="cal-engine">
              <label htmlFor="engine" className="cal-engine-l">
                answered by
              </label>
              <select
                id="engine"
                className="cal-engine-s"
                value={picked}
                onChange={(e) => setPicked(e.target.value)}
                disabled={running}
              >
                {engines.map((e) => (
                  <option key={e.id} value={e.id} disabled={!e.usable}>
                    {e.label} — {e.note}
                  </option>
                ))}
              </select>
            </div>
          )}

          <p className="cal-ask-rate">
            The model runs on a free allowance of fifteen requests a minute, and
            a question costs roughly one per tool call. It stops answering when
            that is spent, and it does so quietly.
          </p>
          <p className="cal-ask-try">or try one of these</p>
          <div className="cal-ask-chips">
            {TRY.map((t) => (
              <button
                key={t.q}
                type="button"
                className="cal-chip"
                disabled={running}
                onClick={() => {
                  setQuestion(t.q);
                  void ask(t.q);
                }}
              >
                <span className="cal-chip-q">{t.q}</span>
                <span className="cal-chip-s">
                  {t.shows}
                  <span className="cal-chip-c">{t.cost}</span>
                </span>
              </button>
            ))}
          </div>
        </form>

        {phase !== 'idle' && (
          <section className="mt-10">
            <Asked question={asked} engine={engine} ms={ms} running={running} />
            <Trace tools={tools} running={running} />
            {answer && <Rendered a={answer} />}
            {rejected && <Rejected errors={rejected} />}
            {error && <Failed message={error} />}
          </section>
        )}

        <History reloadKey={phase === 'done' ? asked + String(ms) : ''} />
      </main>

      <footer className="relative z-10 mx-auto max-w-4xl border-t border-ui-line px-5 py-10 text-sm text-ui-faint sm:px-6">
        Every answer here is one run of a system that is not deterministic. The
        same question has come back in 3.9 seconds and in 85.8. This is what it
        did this time.
      </footer>
    </div>
  );
}

/**
 * Everything asked here before, behind a button.
 *
 * ── COLLAPSED, AND FETCHED ONLY WHEN OPENED ───────────────────────────────
 *
 * Most readers ask a question and leave. Fetching on page load would spend a
 * cold Neon connection — 2.8 seconds today — on a panel nobody opened.
 *
 * ── AND IT EXISTS TO SHOW THE VARIABILITY ─────────────────────────────────
 *
 * The tool names are listed in the order they were called, so two runs of one
 * question that reached the same words by different routes are told apart. That
 * distinction is the one this whole engagement is about, and this is the only
 * place on the site where a reader can see it happen twice.
 */
function History({ reloadKey }: { reloadKey: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const seen = useRef('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/history');
      const data = (await res.json()) as { rows: HistoryRow[] };
      setRows(data.rows ?? []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // A new answer landed while the panel was open — refresh it rather than
  // leaving the reader looking at a list their own question is missing from.
  // IN AN EFFECT, not in the render body: setting state during render is how
  // you get a loop that only shows up under load.
  useEffect(() => {
    if (!open || !reloadKey || reloadKey === seen.current) return;
    seen.current = reloadKey;
    void load();
  }, [open, reloadKey, load]);

  return (
    <section className="mt-12">
      <button
        type="button"
        className="cal-hist-toggle"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && rows === null) void load();
        }}
        aria-expanded={open}
      >
        <span className="cal-hist-caret" aria-hidden>
          {open ? '\u2212' : '+'}
        </span>
        <span>everything asked here before</span>
        <span className="cal-hist-hint">
          {open ? 'hide' : rows ? `${rows.length} shown` : 'show'}
        </span>
      </button>

      {open && (
        <div className="cal-hist">
          {loading && <p className="cal-hist-empty">reading…</p>}
          {!loading && rows && rows.length === 0 && (
            <p className="cal-hist-empty">
              Nothing filed yet. Either nobody has asked anything, or the
              database this writes to is not configured — a missing row is never
              allowed to take down the answer that produced it.
            </p>
          )}
          {!loading &&
            rows?.map((r) => (
              <div key={r.id} className="cal-hist-row">
                <p className="cal-hist-q">{r.question}</p>
                <p className="cal-hist-tools">
                  {r.tools.length ? r.tools.join(' → ') : 'no tools called'}
                </p>
                <p className="cal-hist-a">
                  {r.rejected
                    ? 'the contract refused this answer'
                    : (r.answer ?? 'it did not answer')}
                </p>
                <p className="cal-hist-meta">
                  {new Date(r.asked_at).toLocaleString('en-GB')} · {r.engine} ·{' '}
                  {(r.ms / 1000).toFixed(1)}s
                  {r.escalated && ' · handed to a person'}
                </p>
              </div>
            ))}
          <p className="cal-note">
            The tools are listed in the order they were called. Two runs of the
            same question can reach the same words by different routes, and this
            is the only place that difference shows.
          </p>
        </div>
      )}
    </section>
  );
}

function Asked({
  question,
  engine,
  ms,
  running,
}: {
  question: string;
  engine: { engine: string; model: string | null } | null;
  ms: number | null;
  running: boolean;
}) {
  return (
    <div className="cal-asked">
      <p className="cal-asked-q">{question}</p>
      <p className="cal-asked-meta">
        {engine ? [engine.engine, engine.model].filter(Boolean).join(' · ') : 'connecting…'}
        {ms !== null && ` · ${(ms / 1000).toFixed(1)}s`}
        {running && ms === null && ' · running'}
      </p>
    </div>
  );
}

/** What it asked for, as it asks. The product, not the debug output. */
function Trace({ tools, running }: { tools: ToolCall[]; running: boolean }) {
  if (!tools.length && !running) return null;
  return (
    <div className="cal-trace">
      <p className="cal-sec-label">what it asked for</p>
      {tools.length === 0 ? (
        <p className="cal-trace-wait">deciding which tool to call…</p>
      ) : (
        <ol className="cal-trace-list">
          {tools.map((t, i) => (
            <li key={i}>
              <span className="cal-trace-n" aria-hidden>
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="cal-trace-name">{t.name}</p>
                <pre className="cal-trace-args">{JSON.stringify(t.args, null, 0)}</pre>
              </div>
            </li>
          ))}
        </ol>
      )}
      {running && tools.length > 0 && <p className="cal-trace-wait">still working…</p>}
    </div>
  );
}

/**
 * The answer, made readable.
 *
 * ── IT ARRIVES AS ONE UNBROKEN PARAGRAPH ──────────────────────────────────
 *
 * A model writing to a schema field writes prose, and a 90-word block of it at
 * one weight is a wall. Two things fix that without inventing structure the
 * model did not write:
 *
 *   paragraphs   split on the newlines it DID write, when it wrote any
 *   anchors      campaign numbers, ODI numbers and figures set in mono, so the
 *                eye has somewhere to land when scanning back for one
 *
 * NOTHING IS REWORDED AND NOTHING IS REFLOWED. Inserting breaks at guessed
 * sentence boundaries would be the page editing an answer it also claims to
 * reproduce faithfully, which is the one thing this engagement will not do.
 */
const ANCHOR = /(\b\d{2}[VETS]\d{6}\b|\b\d{7,9}\b|\b\d{1,3}(?:,\d{3})+\b)/g;

function Prose({ text }: { text: string }) {
  const paras = text.split(/\n+/).filter((p) => p.trim().length > 0);
  return (
    <>
      {paras.map((para, i) => (
        <p key={i} className="cal-answer-prose">
          {para.split(ANCHOR).map((part, j) =>
            ANCHOR.test(part) && j % 2 === 1 ? (
              <span key={j} className="cal-anchor">
                {part}
              </span>
            ) : (
              <span key={j}>{part}</span>
            ),
          )}
        </p>
      ))}
    </>
  );
}

function Rendered({ a }: { a: Answer }) {
  return (
    <div className="mt-8 grid gap-5">
      <div className="cal-answer">
        <p className="cal-sec-label">the answer</p>
        {a.answer ? (
          <Prose text={a.answer} />
        ) : (
          <p className="cal-answer-none">
            It did not answer. On this corpus that is a legitimate outcome rather
            than a failure — the documents do not settle the question.
          </p>
        )}
        {a.campaigns.length > 0 && (
          <p className="cal-answer-campaigns">
            resting on {a.campaigns.map((c) => <Mono key={c}>{c}</Mono>).reduce((p, c) => <>{p}, {c}</>)}
          </p>
        )}
      </div>

      {a.counts.length > 0 && (
        <div className="cal-block">
          <p className="cal-sec-label">every number, and what it counted</p>
          {a.counts.map((c, i) => (
            <div key={i} className="cal-count">
              <span className="cal-count-v">{c.value.toLocaleString('en-GB')}</span>
              <div className="min-w-0">
                <p className="cal-count-l">{c.label}</p>
                {c.from && <p className="cal-count-f">from {c.from}</p>}
              </div>
            </div>
          ))}
          <p className="cal-note">
            The wording is written by the tool, not by the model. A run once
            reported 6 and described it as a figure that was 351.
          </p>
        </div>
      )}

      {a.searches_that_found_nothing.length > 0 && (
        <div className="cal-block cal-block-absence">
          <p className="cal-sec-label">what it looked for and did not find</p>
          {a.searches_that_found_nothing.map((s, i) => (
            <div key={i} className="cal-absence">
              <p className="cal-absence-q">
                {s.tool}({JSON.stringify(s.arguments)})
              </p>
              <p className="cal-absence-m">{s.what_it_means}</p>
            </div>
          ))}
          <p className="cal-note">
            An absence has provenance too, and there is no document to cite for
            it. This is the evidence that nothing was found rather than that
            nothing was looked for.
          </p>
        </div>
      )}

      {a.citations.length > 0 && (
        <div className="cal-block">
          <p className="cal-sec-label">where each claim comes from</p>
          {a.citations.map((c, i) => (
            <div key={i} className="cal-cite">
              <p className="cal-cite-s">{c.source}</p>
              <p className="cal-cite-c">{c.claim}</p>
            </div>
          ))}
        </div>
      )}

      {a.unverified_claims.length > 0 && (
        <div className="cal-block cal-block-warn">
          <p className="cal-sec-label">said with nothing behind it</p>
          {a.unverified_claims.map((u, i) => (
            <p key={i} className="cal-warn-line">
              {u}
            </p>
          ))}
          <p className="cal-note">
            Declared rather than dressed up as a citation, which is the only
            honest place for it.
          </p>
        </div>
      )}

      {a.conflicts.length > 0 && (
        <div className="cal-block cal-block-warn">
          <p className="cal-sec-label">documents that disagree</p>
          {a.conflicts.map((c, i) => (
            <div key={i} className="cal-conflict">
              <p className="cal-conflict-t">{c.topic}</p>
              {c.positions.map((p, j) => (
                <p key={j} className="cal-conflict-p">
                  <span className="text-ui-dim">{p.source}</span> {p.says}
                </p>
              ))}
              <p className="cal-conflict-r">
                {c.resolved_by ?? 'nothing here settles it — which is why it escalates'}
              </p>
            </div>
          ))}
        </div>
      )}

      {a.escalate && (
        <div className="cal-block cal-block-esc">
          <p className="cal-sec-label">handed to a person</p>
          <p className="cal-esc-r">{a.escalate.reason}</p>
          <p className="cal-esc-w">→ {a.escalate.suggested_owner}</p>
          <p className="cal-note">
            A success state, not an error. A system that escalates on everything
            is as broken as one that never does.
          </p>
        </div>
      )}
    </div>
  );
}

function Rejected({ errors }: { errors: string[] }) {
  return (
    <div className="mt-8 cal-block cal-block-warn">
      <p className="cal-sec-label">the contract refused this answer</p>
      {errors.map((e, i) => (
        <p key={i} className="cal-warn-line">
          {e}
        </p>
      ))}
      <p className="cal-note">
        Nine rules check an answer that is the right shape but wrong anyway.
        Nothing is ever quietly repaired — a repaired answer is a failure you
        stopped counting.
      </p>
    </div>
  );
}

function Failed({ message }: { message: string }) {
  return (
    <div className="mt-8 cal-block cal-block-warn">
      <p className="cal-sec-label">it could not be asked</p>
      <p className="cal-warn-line">{message}</p>
      <p className="cal-note">
        The model runs on a free allowance that stops answering when it is spent,
        and it does so quietly. If this keeps happening, that is the likeliest
        reason.
      </p>
    </div>
  );
}
