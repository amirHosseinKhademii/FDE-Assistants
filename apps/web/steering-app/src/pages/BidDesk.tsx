/**
 * `/desk` — one customer requirement in, one assessed answer out.
 *
 * THE FIRST PAGE HERE THAT SPENDS MONEY. Everything else in this app renders a
 * generated file; this one runs a multi-turn loop that searches the corpus and
 * prices against past jobs. So the page says so before the button is pressed,
 * and shows what it did afterwards — turns, tool calls, the engine that ran.
 *
 * ── IT IS DRAWN IN THIS APP'S OWN LANGUAGE, NOT PHARMA'S ─────────────────
 *
 * Two pieces of `/data-flow`'s vocabulary carry straight over, and both because
 * they mean the same thing here:
 *
 *   · `.x-file` — the sheet with a filename header bar and ruled lines. It was
 *     built for "this is quoted material from the customer's own file", which
 *     is exactly what a citation is.
 *   · the trunk-and-branch pipeline — a trunk down the left with each step
 *     branching off it. On `/data-flow` the numbers are a bit of a stretch
 *     because the three pipelines are not a sequence. Here the loop genuinely
 *     IS one, so the numbering is honest.
 *
 * What does NOT carry over is the `--color-src-*` scale: on `/data-flow` those
 * hues mean "which step produced this", and reusing them for turn numbers would
 * break the one-scale-one-claim rule the pattern doc states. The trace is toned
 * by the accent, and the finding carries the only other colour on the page.
 *
 * ── THE FINDING IS NOT A VERDICT ─────────────────────────────────────────
 *
 * `have_it` does not mean "quote it as carryover". The schema forbids a
 * commitment in every prose field for that reason, and the page keeps the same
 * posture: the decisions put to a person are rendered as prominently as the
 * finding, because they are the output this exercise exists to produce.
 */
import { useCallback, useMemo, useState } from 'react';
import { BoxIcon, Mono } from '@fde/uikit';
import { Aurora, type AuroraTone } from '@veresk/surface';
import { useAssess, type Requirement, type TraceStep } from '../hooks/use-assess';
import { useHistory, type HistoryRow } from '../hooks/use-history';
import { useRequirements } from '../hooks/use-requirements';
import { VERESK } from '../lib/links';
import { load, save } from '../lib/storage';
import { WORKED } from '../lib/worked-example.generated';
import { Explain } from '../components/Explain';
import { FINDING } from '../lib/findings';
import { BidState } from '../components/BidState';

const AURORA: AuroraTone[] = [
  { className: 'bg-vst-1/14', size: 'h-[34rem] w-[34rem]', at: { top: '-12rem', left: '-8rem' } },
  { className: 'bg-vst-3/12', size: 'h-[30rem] w-[30rem]', at: { top: '-4rem', right: '-10rem' }, delay: '-8s' },
];

/** The two tools, named as a person would name them. */
const TOOL: Record<string, string> = {
  search_documents: 'searched the documents',
  find_comparable_work: 'looked for comparable past jobs',
};

/**
 * WHY A KEY BOX AT ALL, AND WHY IT IS USUALLY NOT THERE.
 *
 * Every route here is guarded fail-closed. On the dev server that guard passes
 * on loopback and the box would be a question nobody has an answer to — so it
 * appears only once the server has actually refused, and only for the refusal a
 * key can fix.
 *
 *   401 · a key is required and this reader has not supplied a right one.
 *         The box appears. Typing one is the fix.
 *   503 · the DEPLOYMENT has no API_KEY configured, so it refuses everybody.
 *         No key anybody types will work, and offering a box would send
 *         somebody hunting for a credential that would be ignored. The page
 *         says what is actually wrong instead.
 *
 * The key is kept in local storage so it is not retyped every visit, and
 * nothing else is: a requirement and an answer are the customer's, they are
 * filed server-side where they can be governed, and a copy in a browser nobody
 * can reach is a copy nobody can delete either.
 */
type KeyState = 'none' | 'needed' | 'unconfigured';

export function BidDesk() {
  const [apiKey, setApiKey] = useState(() => load('apiKey', ''));
  const [keyState, setKeyState] = useState<KeyState>('none');

  const onRefused = useCallback((status: number) => {
    setKeyState(status === 503 ? 'unconfigured' : 'needed');
  }, []);

  const onApiKey = (v: string) => {
    setApiKey(v);
    save('apiKey', v);
  };

  const { items, error: listError, loading } = useRequirements(apiKey, onRefused);
  const [text, setText] = useState('');
  /**
   * Set when the text came from the specification, cleared the moment it is
   * edited. Once a character changes it is no longer that requirement, and
   * keeping the reference would put a revision number under a sentence the
   * customer never wrote.
   */
  const [ref, setRef] = useState<string | null>(null);
  const run = useAssess();
  const busyNow = run.phase === 'running';
  const history = useHistory(busyNow, apiKey, onRefused);
  /** An earlier assessment opened in place of the current one. */
  const [shown, setShown] = useState<HistoryRow | null>(null);

  const chosen = useMemo(() => items?.find((r) => r.ref === ref), [items, ref]);
  const busy = run.phase === 'running';

  /** Opening an old one clears the live one, so only ever one answer is on screen. */
  const open = (row: HistoryRow | null) => {
    setShown(row);
    if (row) run.reset();
  };

  const pick = (id: string) => {
    const r = items?.find((x) => x.ref === id);
    if (!r) return;
    setRef(r.ref);
    setText(r.text);
  };

  const edit = (value: string) => {
    setText(value);
    setRef((current) => (current && value !== chosen?.text ? null : current));
  };

  return (
    <div className="relative min-h-screen">
      <Aurora tones={AURORA} muted />

      <header className="sticky top-0 z-20 border-b border-ui-line bg-ui-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 sm:px-6 sm:py-4">
          {VERESK ? (
            <a
              href={VERESK}
              aria-label="Back to the front page"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-ui-accent/15 text-ui-accent ring-1 ring-ui-accent/30 transition-all hover:scale-105"
            >
              <BoxIcon />
            </a>
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ui-accent/15 text-ui-accent ring-1 ring-ui-accent/30">
              <BoxIcon />
            </span>
          )}
          <h1 className="text-[1.0625rem] font-semibold tracking-tight">Assess a requirement</h1>
          <a
            href="/"
            className="rounded-lg border border-ui-line bg-ui-raised/60 px-4 py-2 text-sm text-ui-dim transition-colors hover:border-ui-accent/50 hover:text-ui-fg sm:ml-auto"
          >
            Back to Vantis Steering
          </a>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-5 pb-24 sm:px-6">
        <section className="lift-in pt-10 pb-8 md:pt-12">
          <h2 className="max-w-[24ch] font-mono text-[1.75rem] leading-[1.12] font-semibold tracking-tighter sm:text-4xl">
            Do we already have this?
          </h2>
          <p className="mt-5 max-w-[62ch] leading-relaxed text-ui-dim">
            Write the requirement as the customer sent it, or take one from the specification we
            already hold. The assessment reads the files, looks for past jobs of the same kind, and
            comes back with a finding, the sentences it rests on, and what it will not answer.{' '}
            <span className="text-ui-fg">It is allowed to refuse</span>, and a refusal is a result.
          </p>

          <Ask
            text={text}
            onText={edit}
            pickedRef={ref}
            items={items}
            loading={loading}
            error={listError}
            onPick={pick}
            apiKey={apiKey}
            onApiKey={onApiKey}
            keyState={keyState}
            onRun={() => {
              setShown(null);
              run.start(ref ? { ref } : { text }, { apiKey: apiKey || undefined });
            }}
            busy={busy}
            onCancel={run.cancel}
          />

          {chosen && run.phase === 'idle' && <RequirementCard requirement={chosen} />}
        </section>

        {/* SHOWN ONLY WHEN NOTHING ELSE IS. It is here to answer "does this
            actually work" for somebody who has not pressed the button, and the
            moment they have, it is in the way of their own answer. */}
        {!shown && run.phase === 'idle' && <Worked />}

        <History
          rows={history.rows}
          error={history.error}
          loading={history.loading}
          openId={shown?.id ?? null}
          onOpen={open}
        />

        {/* WHERE THE WHOLE BID STANDS, under the one requirement being worked
            on. Free to load and computed from filed answers — see the panel. */}
        <BidState busy={busy} apiKey={apiKey} onRefused={onRefused} />

        {shown && <Earlier row={shown} onClose={() => setShown(null)} apiKey={apiKey} />}

        {!shown && run.requirement && <RequirementCard requirement={run.requirement} />}

        {!shown && (busy || run.trace.length > 0) && <Trace steps={run.trace} busy={busy} />}

        {!shown && run.phase === 'failed' && run.error && (
          <section className="x-fail mt-8">
            <p className="x-fail-head">No answer</p>
            <p className="x-fail-body">{run.error.message}</p>
            {run.error.stoppedBecause && (
              <p className="x-fail-why">
                stopped because <Mono>{run.error.stoppedBecause}</Mono>
              </p>
            )}
            <p className="x-fail-why">
              A run that failed its contract still cost money and still took a minute. It is shown
              rather than retried quietly, because how often this happens is a number worth having.
            </p>
          </section>
        )}

        {!shown && run.phase === 'answered' && run.assessment && (
          <Assessment a={run.assessment} citations={run.citations} apiKey={apiKey} />
        )}

        {!shown && run.run && <RunLine run={run.run} retries={run.retries.length} />}
      </main>
    </div>
  );
}

/**
 * WRITE IT, OR TAKE ONE FROM THE SPECIFICATION.
 *
 * THE BOX IS FIRST AND THAT IS THE PRODUCT. The job is not browsing a database
 * — an OEM sends a requirement that is in nobody's system yet and wants a price
 * in two weeks, and the first thing a bid engineer has is a sentence in an
 * email. So the box takes that sentence, and the specification is offered
 * underneath as a shortcut rather than as the only way in.
 *
 * THE PLACEHOLDER IS A REAL REQUIREMENT, not "enter text here". Nobody knows
 * what this box wants until they have seen one, and the shape of the answer —
 * a figure, a unit, the condition it holds under — is the whole difference
 * between a question this can answer and one it cannot.
 *
 * PICKING FILLS THE BOX RATHER THAN REPLACING IT, so the two ways in are one
 * field. The reference is remembered and shown, and dropped the moment the text
 * is edited: at that point it is a new requirement that started life as an old
 * one, and the revision no longer describes it.
 */
const SUGGESTION =
  'The steering system shall deliver a peak rack force of at least 8000 N at 20 °C and 13.5 V supply.';

function Ask({
  text, onText, pickedRef, items, loading, error, onPick, onRun, busy, onCancel,
  apiKey, onApiKey, keyState,
}: {
  text: string;
  onText: (v: string) => void;
  pickedRef: string | null;
  items: Requirement[] | null;
  loading: boolean;
  error: string | null;
  onPick: (ref: string) => void;
  onRun: () => void;
  busy: boolean;
  onCancel: () => void;
  apiKey: string;
  onApiKey: (v: string) => void;
  keyState: KeyState;
}) {
  return (
    <div className="x-ask mt-8">
      <label className="x-ask-label" htmlFor="requirement">
        The requirement, in the customer's words
      </label>

      <textarea
        id="requirement"
        className="x-ask-box"
        rows={3}
        value={text}
        disabled={busy}
        placeholder={SUGGESTION}
        onChange={(e) => onText(e.target.value)}
      />

      <div className="x-ask-from">
        {pickedRef ? (
          <p className="x-ask-picked">
            from <Mono>{pickedRef}</Mono> — assessed at the revision in force
          </p>
        ) : (
          text.trim().length > 0 && (
            <p className="x-ask-picked x-ask-picked--new">
              assessed as typed — not a line of any specification we hold
            </p>
          )
        )}

        {error ? (
          // NOT AN EMPTY DROPDOWN. "Could not reach the customer's ALM system"
          // and "this programme has no requirements" are different facts and the
          // page must not turn the first into the second.
          //
          // AND A REFUSAL IS NEITHER. When the guard turned the request away,
          // repeating its sentence under the word "specification" points at the
          // wrong thing entirely — the database was never asked.
          keyState === 'none' ? (
            <p className="x-ask-error">
              The specification could not be read from <Mono>vst_alm</Mono>: {error}
            </p>
          ) : null
        ) : (
          <label className="x-ask-or">
            <span>or take one from the K2 specification</span>
            <select
              className="x-ask-select"
              value={pickedRef ?? ''}
              disabled={loading || busy}
              onChange={(e) => e.target.value && onPick(e.target.value)}
            >
              <option value="">{loading ? 'reading it…' : `${items?.length ?? 0} requirements`}</option>
              {items?.map((r) => (
                <option key={r.ref} value={r.ref}>
                  {r.ref} — {r.title}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* Only for the refusal a key can fix — see `KeyState`. */}
      {keyState === 'needed' && (
        <label className="x-key">
          <span className="x-key-label">API key</span>
          <input
            type="password"
            className="x-key-input"
            value={apiKey}
            autoComplete="off"
            onChange={(e) => onApiKey(e.target.value)}
          />
          <span className="x-key-hint">
            This deployment requires one. It is kept in this browser and sent as{' '}
            <Mono>x-api-key</Mono>.
          </span>
        </label>
      )}

      {keyState === 'unconfigured' && (
        <p className="x-key-blocked">
          <span className="x-key-blocked-head">This deployment has no key configured.</span> Every
          request is refused, and no key typed here would be accepted — the server has none to
          compare it against. Set <Mono>API_KEY</Mono> on the container app, or run the dev server,
          which binds loopback.
        </p>
      )}

      <div className="x-ask-go">
        <button type="button" className="x-btn" disabled={!text.trim() || busy} onClick={onRun}>
          {busy ? 'assessing…' : 'Assess it'}
        </button>
        {busy && (
          <button type="button" className="x-btn x-btn--quiet" onClick={onCancel}>
            Stop
          </button>
        )}
        <p className="x-ask-cost">
          Runs a model over the corpus. Tens of seconds, and a few cents — which is why it runs when
          you ask and not as you type.
        </p>
      </div>
    </div>
  );
}

/**
 * What is being assessed, as the in-force revision states it.
 *
 * SHOWN BEFORE THE ANSWER AND KEPT AFTERWARDS. A reader has to be able to check
 * that the right question was answered, and the revision is part of that — the
 * estate holds superseded revisions on purpose.
 */
function RequirementCard({ requirement: r }: { requirement: Requirement }) {
  return (
    <div className="x-req mt-8">
      <div className="x-req-head">
        <Mono className="x-req-ref">{r.ref}</Mono>
        <p className="x-req-title">{r.title}</p>
        <p className="x-req-rev">
          {r.specTitle} · {r.revision}
          {r.revision === 'as typed' ? '' : ', in force'}
        </p>
      </div>

      <div className="x-file">
        <p className="x-file-name">
          {r.section ? `${r.specTitle} § ${r.section}` : 'as it arrived'}
        </p>
        <pre className="x-ba-doc">{r.text}</pre>
      </div>

      <dl className="x-req-facts">
        <Fact label="safety level" value={r.asil} />
        <Fact label="priority" value={r.priority} />
        <Fact label="verified by" value={r.verificationMethod} />
        <Fact label="comparable on" value={r.attribute} empty="nothing — prose only" />
      </dl>
    </div>
  );
}

/**
 * ABSENT IS NOT BLANK. A typed requirement has no agreed safety level and no
 * priority, because nobody has decided them — and an empty cell reads as a
 * rendering bug rather than as a fact about the requirement.
 */
function Fact({ label, value, empty = 'not stated' }: { label: string; value: string | null; empty?: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value ? <Mono>{value}</Mono> : <span className="x-req-none">{empty}</span>}</dd>
    </div>
  );
}

/**
 * What the loop did, as it does it.
 *
 * THE TRUNK-AND-BRANCH DRAWING FROM `/data-flow`, and here it is literally a
 * sequence, so the numbers are honest. Each step appears when the call STARTS —
 * a retrieval takes a second or two, and a trace that only reports afterwards
 * leaves a reader watching nothing happen.
 */
function Trace({ steps, busy }: { steps: TraceStep[]; busy: boolean }) {
  return (
    <section className="x-phase x-trace mt-10">
      <div className="x-phase-head">
        <span className="x-phase-range">{steps.length || '·'}</span>
        <h3 className="x-phase-label">{busy ? 'Working' : 'What it did'}</h3>
      </div>
      <p className="x-phase-why">
        Every call it made, in order. The model never touches the database or the index — it asks
        for a search and is handed the result.
      </p>

      <ol className="x-cards">
        {steps.map((s, i) => (
          <li key={`${s.turn}-${s.name}-${i}`}>
            <div className={`x-card x-card--static${s.done ? '' : ' x-card--live'}`}>
              <span className="x-card-n">{i + 1}</span>
              <span className="x-card-text">
                <span className="x-card-title">{TOOL[s.name] ?? s.name}</span>
                <span className="x-card-face">
                  {s.done
                    ? (s.done.ok ? s.done.summary : 'the call failed') ?? 'done'
                    : 'running…'}
                </span>
              </span>
              <span className="x-card-ms">{s.done ? `${s.done.ms}ms` : ''}</span>
            </div>
          </li>
        ))}
        {busy && steps.every((s) => s.done) && (
          <li>
            <div className="x-card x-card--static x-card--live">
              <span className="x-card-n">·</span>
              <span className="x-card-text">
                <span className="x-card-title">Writing it down</span>
                <span className="x-card-face">The answer is checked against the contract before it is shown.</span>
              </span>
            </div>
          </li>
        )}
      </ol>
    </section>
  );
}

/** The answer. */
function Assessment({
  a,
  citations,
  apiKey,
}: {
  a: any;
  citations?: { exact: number; corrected: number; unresolved: Array<{ file: string; quote: string }> };
  /** Absent on the worked example — it is already captured, never re-summarised. */
  apiKey?: string;
}) {
  const f = FINDING[a.finding] ?? { label: a.finding, tone: 'var(--color-ui-line-lit)', means: '' };

  return (
    <section className="mt-10">
      {/* ── THE SHORTCUT LIVES ON THE ANSWER, TOP RIGHT ────────────────
          Under the card it read as the next item in a list — one more thing to
          scroll past, which is the opposite of a shortcut past the scrolling.
          Top right of the finding is where a reader's eye already is once they
          have read the label, and it is the corner nothing else occupies. */}
      <div className="x-finding-wrap" style={{ '--ui-tone': f.tone } as React.CSSProperties}>
        <div className="x-finding">
          <p className="x-finding-label">{f.label}</p>
          <p className="x-finding-means">{f.means}</p>
          <p className="x-finding-why">{a.reasoning}</p>
        </div>

        {apiKey !== undefined && <Explain assessment={a} apiKey={apiKey} />}
      </div>

      <Cost cost={a.cost} />

      {a.citations?.length > 0 && (
        <div className="mt-8">
          <h3 className="x-sec">The sentences it rests on</h3>
          <p className="x-sec-why">
            Each one names a file and a line. The line is found by us in the file, not supplied by
            the model, so a challenged figure traces to a place rather than to a row nobody can
            account for.
          </p>
          <div className="x-cites">
            {a.citations.map((c: any, i: number) => (
              <div key={i} className="x-file">
                <p className="x-file-name">
                  {c.file}:{c.line}
                </p>
                <pre className="x-ba-doc">{c.quote}</pre>
              </div>
            ))}
          </div>
          {citations && (
            <p className="x-cites-check">
              {citations.exact} found word for word
              {citations.corrected > 0 && `, ${citations.corrected} with the line corrected`}
              {citations.unresolved.length > 0 &&
                `, ${citations.unresolved.length} NOT found in the file cited`}
              .
            </p>
          )}
        </div>
      )}

      {a.conflicts?.length > 0 && (
        <div className="mt-8">
          <h3 className="x-sec">The documents disagree</h3>
          <p className="x-sec-why">
            Two files state different things about the same point. Which one is true changes the
            answer, so it is put to a person rather than settled here.
          </p>
          {a.conflicts.map((c: any, i: number) => (
            <div key={i} className="x-conflict">
              <p className="x-conflict-about">{c.about}</p>
              {c.positions.map((p: any, j: number) => (
                <div key={j} className="x-conflict-pos">
                  <p className="x-conflict-says">{p.says}</p>
                  <Mono className="x-conflict-where">
                    {p.citation.file}:{p.citation.line}
                  </Mono>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {a.decisions_for_human?.length > 0 && (
        <div className="mt-8">
          <h3 className="x-sec">For a person to decide</h3>
          <p className="x-sec-why">
            The one place this is allowed to ask for a decision rather than take one. Everything
            above is evidence for these questions.
          </p>
          {a.decisions_for_human.map((d: any, i: number) => (
            <div key={i} className="x-decide">
              <p className="x-decide-q">{d.question}</p>
              <p className="x-decide-why">{d.why_it_matters}</p>
              <p className="x-decide-who">{d.suggested_owner}</p>
            </div>
          ))}
        </div>
      )}

      {a.unverified_claims?.length > 0 && (
        <div className="mt-8">
          <h3 className="x-sec">Stated without a citation</h3>
          <p className="x-sec-why">
            Things the answer asserts that no document backs. Listed rather than removed — an
            unsupported sentence you can see is worth more than one quietly deleted.
          </p>
          <ul className="x-unver">
            {a.unverified_claims.map((u: string, i: number) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/**
 * What history says it cost, or why it will not say.
 *
 * A REFUSAL IS RENDERED AS AN ANSWER, not as a missing number. Below three
 * comparable jobs there is no figure — not a figure with a caveat — and the
 * reason is shown in the place the number would have been.
 */
function Cost({ cost }: { cost: any }) {
  const refusing = cost?.median_hours === null;

  return (
    <div className={`x-cost${refusing ? ' x-cost--refused' : ''}`}>
      {refusing ? (
        <>
          <p className="x-cost-figure">No price</p>
          <p className="x-cost-why">{cost.refused_because}</p>
        </>
      ) : (
        <>
          <p className="x-cost-figure">
            <Mono>{cost.median_hours}</Mono> h
            {cost.eur != null && (
              <>
                {' · '}
                <Mono>EUR {Number(cost.eur).toLocaleString('en-GB')}</Mono>
              </>
            )}
          </p>
          <p className="x-cost-why">at approved rates, from past jobs of the same kind</p>
        </>
      )}
      <p className="x-cost-basis">
        {cost?.comparable_jobs ?? 0} comparable job{cost?.comparable_jobs === 1 ? '' : 's'} · a
        figure without its evidence count cannot be judged, so it is never shown alone
      </p>
    </div>
  );
}

/** The run, in small type. It cost money and took time; both are facts. */
function RunLine({ run, retries }: { run: any; retries: number }) {
  return (
    <p className="x-runline">
      <Mono>{run.engine}</Mono> · {run.turns} turn{run.turns === 1 ? '' : 's'} · {run.toolCalls} tool
      call{run.toolCalls === 1 ? '' : 's'} · {(run.ms / 1000).toFixed(1)}s · stopped because{' '}
      <Mono>{run.stoppedBecause}</Mono>
      {retries > 0 && ` · ${retries} answer${retries === 1 ? '' : 's'} rejected by the contract and rewritten`}
    </p>
  );
}

/**
 * What has been assessed here before.
 *
 * IT EXISTS BECAUSE EACH ROW COST MONEY. An assessment is a minute and a few
 * cents, and a page that forgets them is a page that invites somebody to pay
 * for the same answer twice. The list is server-side — filed by the route when
 * the answer is sent — so closing the tab mid-run still leaves a row.
 *
 * THE LABEL IS COUNTED, NEVER QUOTED. A row shows the finding from the
 * structured field and the number of decisions it raised; echoing the model's
 * own summary prose would let a row describe a requirement as settled while the
 * answer below it puts three questions to a person.
 *
 * NO ROW IS EVER JUST GREEN, and `have_it` least of all. "We have it" is a
 * finding about the documents, not a commitment to quote it as carryover, and a
 * column of reassuring ticks is the one claim this product is built never to
 * make by accident.
 *
 * THERE IS NO CLEAR BUTTON. These rows are the record of what was asked about a
 * car maker's requirements; a one-click delete of that is not a thing to add
 * before anybody has asked for it, and there is no DELETE route behind it.
 */
const SHOW_FIRST = 4;

function History({
  rows, error, loading, openId, onOpen,
}: {
  rows: HistoryRow[] | null;
  error: string | null;
  loading: boolean;
  openId: string | null;
  onOpen: (row: HistoryRow | null) => void;
}) {
  /**
   * SHUT UNTIL ASKED FOR. A person arrives here to assess something, not to
   * read what was assessed last week — and a column of earlier runs between
   * the box and the answer is other people's work in the way of theirs. The
   * count is on the button, so the list never hides how much it is holding.
   */
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);

  if (loading) return null;

  if (error) {
    return (
      <section className="x-hist mt-10">
        <h3 className="x-sec">Earlier assessments</h3>
        <p className="x-hist-error">
          The history could not be read from <Mono>vst_derived</Mono>: {error}
        </p>
      </section>
    );
  }

  if (!rows || rows.length === 0) return null;

  const shown = all ? rows : rows.slice(0, SHOW_FIRST);

  return (
    <section className="x-hist mt-10">
      <button
        type="button"
        className="x-hist-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden className={`x-hist-caret${open ? ' x-hist-caret--open' : ''}`}>
          ›
        </span>
        <span className="x-sec">Earlier assessments</span>
        <span className="x-hist-count">{rows.length} filed</span>
      </button>

      {open && (
        <>
          <p className="x-sec-why mt-2">
            Every run is kept, including the ones that produced nothing — a history of successes
            only would make this look cheaper and steadier than it is.
          </p>

          <ul className="x-hist-list">
            {shown.map((r) => {
              const a = r.answer?.assessment;
              const f = a ? FINDING[a.finding] : undefined;
              const isOpen = r.id === openId;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    className={`x-hist-row${isOpen ? ' x-hist-row--open' : ''}`}
                    style={{ '--ui-tone': f?.tone ?? 'var(--color-ui-warn)' } as React.CSSProperties}
                    onClick={() => onOpen(isOpen ? null : r)}
                  >
                    <span className="x-hist-when">{ago(r.ts)}</span>
                    <span className="x-hist-what">
                      <span className="x-hist-ref">{r.ref ?? 'typed'}</span>
                      <span className="x-hist-text">{r.text}</span>
                    </span>
                    <span className="x-hist-verdict">
                      {a ? f?.label ?? a.finding : 'no answer'}
                      {a?.decisions_for_human?.length > 0 && (
                        <span className="x-hist-decisions">
                          {a.decisions_for_human.length} to decide
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {rows.length > SHOW_FIRST && (
            <button type="button" className="x-hist-more" onClick={() => setAll((v) => !v)}>
              {all ? 'Show fewer' : `Show ${rows.length - SHOW_FIRST} more`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

/**
 * An earlier assessment, reopened.
 *
 * SAME RENDERER AS A LIVE ANSWER, deliberately. Two renderers for one contract
 * is how the stored copy and the fresh one drift into disagreeing about the
 * same row — and the whole point of filing it is that it is the same answer.
 */
function Earlier({ row, onClose, apiKey }: { row: HistoryRow; onClose: () => void; apiKey: string }) {
  const a = row.answer?.assessment;

  return (
    <section className="mt-8">
      <div className="x-earlier">
        <p className="x-earlier-when">
          assessed {ago(row.ts)} · {row.ref ? <Mono>{row.ref}</Mono> : 'typed, not from the specification'}
        </p>
        <button type="button" className="x-btn x-btn--quiet" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="x-file mt-4">
        <p className="x-file-name">what was assessed</p>
        <pre className="x-ba-doc">{row.text}</pre>
      </div>

      {a ? (
        <Assessment a={a} citations={row.answer?.citations} apiKey={apiKey} />
      ) : (
        <section className="x-fail mt-8">
          <p className="x-fail-head">No answer</p>
          <p className="x-fail-body">{row.failure?.message ?? 'the run produced nothing'}</p>
          {row.failure?.stoppedBecause && (
            <p className="x-fail-why">
              stopped because <Mono>{row.failure.stoppedBecause}</Mono>
            </p>
          )}
        </section>
      )}

      {row.run && <RunLine run={row.run} retries={row.run.schemaRetries ?? 0} />}
    </section>
  );
}

/**
 * "4 minutes ago". A timestamp is a fact nobody converts in their head, and the
 * question a reader has is how recent this is, not when it was.
 */
function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

/**
 * One assessment we ran earlier, shown in full.
 *
 * IT IS THE REAL OUTPUT, NOT A DESCRIPTION OF IT. A visitor who has not pressed
 * the button has no way to know the desk can answer, and a screenshot proves
 * nothing. This is what came back on one occasion — captured by
 * `pnpm steering:worked-example`, committed, and rendered through the SAME
 * components a live answer uses, so it cannot drift into looking better than
 * the thing it stands for.
 *
 * ONE RUN, AND IT SAYS SO. The loop is not deterministic. This is a specimen,
 * not a guarantee, and "does it do this reliably" is the eval suite's question
 * rather than this section's.
 *
 * IT RENDERS NOTHING UNTIL SOMEBODY SPENDS THE MONEY. `WORKED` ships as null,
 * and a made-up specimen on a page arguing "here is the real output" would be
 * the worst thing on this site.
 */
function Worked() {
  if (!WORKED) return null;
  const { requirement, assessment, citations, run, trace, measuredBy, measuredAt } = WORKED;

  return (
    <section className="x-worked mt-10">
      <div className="x-worked-head">
        <h3 className="x-sec">One we ran earlier</h3>
        <p className="x-worked-when">
          <Mono>{measuredBy}</Mono> · {measuredAt}
        </p>
      </div>
      <p className="x-sec-why">
        The actual output, not a description of it — the finding, the sentences it rests on and what
        it refused to price. This is what the loop said on <span className="text-ui-fg">one</span>{' '}
        occasion; whether it says it reliably is what the eval suite is for.
      </p>

      <RequirementCard requirement={requirement} />

      <Trace
        steps={trace.map((t, i) => ({
          turn: i + 1,
          name: t.name,
          done: { ok: t.ok ?? true, ms: t.ms ?? 0, summary: t.summary },
        }))}
        busy={false}
      />

      <Assessment a={assessment} citations={citations} />

      <RunLine run={run} retries={run.schemaRetries} />
    </section>
  );
}
