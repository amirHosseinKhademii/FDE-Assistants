/**
 * Stage 6 — the loop, and the first stage whose answer is not the same twice.
 *
 * ── TWO OF SIX STEPS HAVE RUN, AND THE TAB HAS TO SAY WHICH ───────────────
 *
 * 6.1 and 6.2 are built: the tools are reachable by name, and one question has
 * been answered end to end by a model. 6.3 to 6.6 are not. Everything still
 * unbuilt stays dashed, and the walkthrough of how the loop works is solid
 * because that part describes something which has actually run.
 *
 * ── AND ONE GREEN RUN IS A SMOKE TEST, NOT A SCORE ────────────────────────
 *
 * The same question can now give two answers and neither is a bug, so the empty
 * slot beside 1.00 STAYS EMPTY until every question runs with repeats. One
 * question answered well is the least this stage could have shown and still
 * been worth continuing.
 *
 * ── THE GAP IS THE WHOLE STAGE, AND THE NUMBER HAS ARRIVED ────────────────
 *
 * 4.5 measured a CEILING of 1.00 with the tools called by hand. A model doing
 * the routing reaches 0.17 to 0.50 — A RANGE RATHER THAN A POINT, because the
 * runs disagree and a mean would be 0.28, which nothing measured.
 *
 * THE SLOT EARNED ITS KEEP TWICE BEFORE IT WAS FILLED. It refused a number
 * nobody had, and then refused stage 7's 26-of-28, which is an answer score
 * rather than a retrieval one. Both are large and good and about different
 * things, which is exactly the confusion it was drawn to prevent.
 *
 * AND THE RANGE IS THE LEAST INTERESTING PART. Two of the three cases never
 * move; all the spread is one of them. One of the stable ones scores zero while
 * answering perfectly, because it proves an absence with an empty search and a
 * measure of retrieved documents has nothing to count.
 *
 * ── AND THE DETERMINISM ENDS HERE ─────────────────────────────────────────
 *
 * Stages 1 to 5 give the same output for the same input and were each checked
 * against something sharing no code. From here the same question asked twice can
 * give two different answers and neither is a bug. The value of the five stages
 * underneath is that when something looks wrong, retrieval, counting and the
 * contract are each already known to be sound.
 */
import { Mono } from '@fde/uikit';
import { Data, Journey } from '@veresk/surface';
import { LOOP_TURNS } from '../../pages/loop-turns';
import { LoopModal } from './LoopModal';

/**
 * The loop, as a person would describe it.
 *
 * THE FIRST LINE IS THE ONE THAT MATTERS: the model has no database access. Most
 * people assume it queries something. It produces text, and one shape of text is
 * a request that our code then honours.
 */
const LOOP: readonly { n: string; what: string; detail?: string }[] = [
  {
    n: '1',
    what: 'We send it the question, the rules, and a menu of tools',
    detail: 'Five names, what each one is for, and exactly what arguments each takes.',
  },
  {
    n: '2',
    what: 'It replies with an answer — or with a request',
    detail: '“call count_complaints with make TESLA, model MODEL 3, at least one death”.',
  },
  {
    n: '3',
    what: 'If it asked for a tool, our code runs it',
    detail: 'The model waits. It never sees the database, only what comes back.',
  },
  { n: '4', what: 'We hand the result back as another message' },
  { n: '5', what: 'Repeat until it answers instead of asking' },
  {
    n: '6',
    what: 'The answer has to satisfy the contract',
    detail: 'If it does not, the errors go back and it tries again. We never repair it ourselves.',
  },
];

/**
 * The same two questions, same model, same wording, four runs in one afternoon.
 *
 * ALL FOUR ANSWERED CORRECTLY. This is the honest argument for why one green run
 * is not a number, and it is better than saying so in prose: everything through
 * stage 5 was the same every time and checkable against a shell command.
 */
const RUNS: readonly string[] = ['85.8s', '13.7s', '6.5s', '63.5s'];

/**
 * recall@6 with the model doing the routing, three runs.
 *
 * ── A RANGE, AND IT MUST NOT BECOME A POINT ───────────────────────────────
 *
 * The mean of 0.50, 0.17 and 0.17 is 0.28, which is a figure no run produced.
 * The gap between the runs IS the result: a model that retrieves everything or
 * nothing depending on the day.
 *
 * ── AND THE PER-CASE RECORD IS THE ACTUAL FINDING ─────────────────────────
 *
 * Two of the three cases never move. All the spread is one case, and there it is
 * binary — it either calls the complaint search and gets all five, or answers
 * from the count alone and retrieves nothing. Stage 7 measured that same
 * behaviour from the opposite side at the same frequency, which is worth more
 * than either measurement alone.
 *
 * ── TWO OF THE THREE SHORTFALLS ARE THE METRIC, NOT THE MODEL ─────────────
 *
 * The case scoring a stable 0.00 answers perfectly: it proves the absence with a
 * search that returns nothing and never needs a complaint. It took the shorter,
 * stronger route and a fixed-k metric charged it for that.
 */
const ROUTED: readonly { id: string; runs: readonly number[]; note: string }[] = [
  { id: 'REC-001', runs: [0.5, 0.5, 0.5], note: 'stable — finds the campaign, then cites different evidence than the key names' },
  { id: 'REC-004', runs: [1, 0, 0], note: 'all of the variance is here, and it is all or nothing' },
  { id: 'REC-005', runs: [0, 0, 0], note: 'stable at zero — and its answer is right every time' },
];

/** The six steps, all of them done. */
const STEPS: readonly { n: string; what: string; check: string; done?: boolean }[] = [
  {
    n: '6.1',
    what: 'the tools, registered',
    check: 'each of the five callable, with its arguments validated — and still no model',
    done: true,
  },
  {
    n: '6.2',
    what: 'ONE question, end to end',
    check: 'the campaign comes back, and the record shows the lookup ran and the search did not',
    done: true,
  },
  {
    n: '6.3',
    what: 'the answer, through the contract',
    check: 'every rule runs at answer time — including the one that needs to see what the tools returned',
    done: true,
  },
  {
    n: '6.4',
    what: 'the hard question',
    check: 'two calls in order, the second filtered by a date the first one returned',
    done: true,
  },
  {
    n: '6.5',
    what: 'the negative question',
    check: 'nothing found, and the answer says so without reaching for a different campaign',
    done: true,
  },
  {
    n: '6.6',
    what: 'pacing',
    check: 'all eight finish, and none of them is silently dropped',
    done: true,
  },
];

/** The five tools are easy to confuse, and confusing them is the real risk. */
const CONFUSABLE: readonly { tool: string; want: string }[] = [
  { tool: 'get_recall', want: 'I know the campaign number' },
  { tool: 'find_recalls', want: 'I know the vehicle — is there a campaign?' },
  { tool: 'search_complaints', want: 'I want to read complaints' },
  { tool: 'count_complaints', want: 'I want how many, and must not count them myself' },
  { tool: 'complaints_citing', want: 'I want the complaints that name this campaign' },
];

/**
 * Measured 2026-09-16, and the third row CHANGED on 2026-09-17.
 *
 * It used to fail. It was fixed, and the fix is the argument for having built
 * three of these: a single-engine stack would have called both faults "the model
 * does not support tools properly" and been wrong twice.
 */
const ENGINES: readonly { name: string; state: string; why: string; ok: boolean }[] = [
  {
    name: 'the default one',
    state: 'refuses',
    why: 'it only talks to two clouds, and ours is not one of them. It says so instead of failing oddly.',
    ok: false,
  },
  { name: 'the second one', state: 'works', why: 'has worked with our model from the start', ok: true },
  {
    name: 'the third one',
    state: 'works now',
    why: 'it used to fail. Two faults, and the second was hidden behind the first.',
    ok: true,
  },
];

/** Left open on purpose rather than guessed. */
const OPEN: readonly { q: string; why: string }[] = [
  {
    q: 'Which model to use',
    why: 'Two runs on different models cannot be compared. So whichever one produces a number gets written down next to it.',
  },
  {
    q: 'What to do with a rejected answer',
    why: 'Try again with the errors attached? How many times? Every retry costs money, and an unlimited budget is how a free allowance disappears in an afternoon.',
  },
  {
    q: 'Who records where a number came from',
    why: 'Better for our code to attach it from what it just ran than to ask the model. A model asked to repeat its own arguments will reword them.',
  },
];

export function Stage6() {
  return (
    <section className="lift-in">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="font-mono text-lg leading-snug font-medium tracking-tight text-ui-fg md:text-xl">
          Where a model is finally asked
        </h2>
        <span className="rounded-full border border-dashed border-cal-2/50 px-2.5 py-0.5 font-mono text-[0.625rem] tracking-[0.06em] text-cal-2 uppercase">
          all six run · still not a score
        </span>
      </div>

      <p className="mt-4 max-w-[64ch] leading-relaxed text-ui-dim">
        Everything up to here runs <em>without</em> a model. This is where one is
        finally asked a question — and it is the first stage whose answer is not
        the same twice. All eight have now been asked and all eight were
        answered. That is still not a score.
      </p>

      <div className="cal-plain">
        <p>
          A question goes in. The model chooses which tools to call, the tools
          run, the model writes an answer, and the contract checks it before
          anybody sees it. What comes out is an answer, or a rejection.
        </p>
        <p className="mt-3">
          Everything it uses already exists and is already checked. What has
          never been tested is whether a model{' '}
          <span className="text-ui-fg">asks for the right things</span>.
        </p>
      </div>

      <div className="cal-loop">
        <p className="cal-result-label">how it actually works</p>
        <p className="cal-loop-lead">
          The model never touches the database. It{' '}
          <span className="text-ui-fg">cannot</span> — no connection, no
          credentials, no way to run anything. All it can do is produce text.
        </p>
        <p className="cal-loop-lead mt-2.5">
          So it is allowed to produce one very specific kind of text:{' '}
          <span className="text-ui-fg">a request</span>.
        </p>

        <ol className="cal-loop-steps">
          {LOOP.map((l) => (
            <li key={l.n}>
              <span className="cal-loop-n" aria-hidden>
                {l.n}
              </span>
              <div>
                <p className="cal-loop-what">{l.what}</p>
                {l.detail && <p className="cal-loop-detail">{l.detail}</p>}
              </div>
            </li>
          ))}
        </ol>

        <p className="cal-loop-punch">
          The model is not doing the work. It is deciding what work to ask for.
        </p>
      </div>

      <Chapter
        n="01"
        title="One question, step by step, and what was sent"
        sub="Three turns. A turn is one message to the model, so three turns means three messages. Everything shown here is from a real run."
      >
        <Journey turns={LOOP_TURNS} />

        {/* CLOSES THE WALK, so it is full width rather than two narrow boxes
            floating at a third left edge. The walk's own text is indented by
            its rail; a conclusion that shared neither that indent nor the
            button's width left four different left edges in one section. */}
        <div className="cal-after">
          <p className="cal-after-a">
            Turn 2 sends out one number. Turn 3 sends out five people's accounts
            of fatal crashes. Those are very different things to hand to
            somebody else, so they are not drawn the same.
          </p>
          <p className="cal-after-b">
            We will not tell you the complaints never reach the model. They do —
            that is how the question gets answered, and anyone reviewing this
            would find out in their first question. So instead we say which five
            went, and what was in them.
          </p>
        </div>

        {/* INSIDE the chapter, so it shares the body's indent. Outside it, the
            panel started 38px to the left of everything above it. */}
        <div className="mt-4">
          <LoopModal />
        </div>
      </Chapter>

      <div className="cal-spread">
        <p className="cal-result-label">the same two questions, four times this afternoon</p>
        <div className="cal-spread-row">
          {RUNS.map((t, i) => (
            <span key={i} className="cal-spread-t">
              {t}
            </span>
          ))}
        </div>
        <p className="cal-spread-note">
          Same model, same wording, and{' '}
          <span className="text-ui-fg">all four answered correctly</span>. One
          took thirteen times longer than another. Nothing before this stage
          behaved like that.
        </p>
      </div>

      <Chapter
        n="02"
        title="The hardest question needs one answer to build the next question"
        sub="“After the recall” means nothing until you know when the recall was."
      >
        <Data
          path="one run, five calls, and the date is not in the question"
          mark={[2]}
          lines={[
            'find_recalls    F-150, 2020, power train automatic transmission',
            'get_recall      20V197000        → owners notified 2020-04-27',
            'count / search  filed_after: 2020-04-27',
          ]}
        />
        <Key>
          Nobody typed that date. It came out of the first call and became the
          filter on the later ones.
        </Key>
        <Why>
          This is the one thing stage 4 had to hand-write to measure the ceiling.
          Here a model worked it out for itself, which is the whole difference
          between the two numbers this stage is eventually going to show.
        </Why>
      </Chapter>

      {/* THE GAP, FILLED — with a range rather than a number, because the runs
          disagree and the disagreement is the result. A mean would be 0.28,
          which nothing measured. */}
      <div className="cal-gap" data-filled="true">
        <p className="cal-result-label">the only thing this stage measures</p>
        <div className="cal-result-arc">
          <div>
            <p className="cal-result-cap">tools called by hand</p>
            <p className="cal-result-now">1.00</p>
          </div>
          <span className="cal-result-arrow" aria-hidden>
            →
          </span>
          <div>
            <p className="cal-result-cap">a model choosing them</p>
            <p className="cal-gap-range">0.17–0.50</p>
            <p className="cal-gap-runs">three runs · 0.50 · 0.17 · 0.17</p>
          </div>
          <p className="cal-result-ceiling">
            <span>the spread is the result</span>
            It is lower, and not for the reason it looks. Two of the three
            questions never move — all of the gap is one of them, and there it
            retrieves everything or nothing depending on the run.
          </p>
        </div>

        <ul className="cal-routed">
          {ROUTED.map((r) => (
            <li key={r.id} data-stable={new Set(r.runs).size === 1}>
              <span className="cal-routed-id">{r.id}</span>
              <span className="cal-routed-runs">
                {r.runs.map((v, i) => (
                  <i key={i} data-hit={v > 0}>
                    {v.toFixed(2)}
                  </i>
                ))}
              </span>
              <span className="cal-routed-note">{r.note}</span>
            </li>
          ))}
        </ul>

        <p className="cal-result-foot">
          The last row is the metric rather than the model. That question's right
          answer is “no recall covers this”, which it proves with a search that
          comes back empty — it never needs a complaint, so a measure of
          retrieved documents has nothing to count. It took the shorter,
          stronger route and scored zero for it.
        </p>
      </div>

      <Chapter
        n="03"
        title="The same question can now give two answers"
        sub="And neither of them is a bug. That is new."
      >
        <Data
          path="what changes here"
          mark={[1]}
          lines={[
            'everything so far   ask twice, get the same thing. Each part was checked',
            '                    against something built separately.',
            'from here           the model picks the tools, the arguments and the',
            '                    words. Twice is not the same twice.',
          ]}
        />
        <Key>
          Which is why the five parts underneath had to be checked first. When an
          answer looks wrong, we already know the searching, the counting and the
          rules are sound — so the model is the only thing left to look at.
        </Key>
        <Why>
          Without that, a bad answer has five possible causes and no way to tell
          them apart.
        </Why>
      </Chapter>

      <Chapter
        n="04"
        title="The order it gets built in"
        sub="One question first, not all eight."
      >
        <ul className="cal-panel cal-dashed grid gap-2.5">
          {STEPS.map((s) => (
            <li key={s.n} className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span
                className="w-10 shrink-0 font-mono text-[0.75rem]"
                style={{ color: s.done ? 'var(--color-cal-1)' : 'var(--color-ui-faint)' }}
              >
                {s.n}
              </span>
              <span
                className="w-44 shrink-0 font-mono text-[0.8125rem]"
                style={{ color: s.done ? 'var(--color-ui-fg)' : 'var(--color-ui-dim)' }}
              >
                {s.what}
                {s.done && (
                  <span className="ml-2 text-[0.5625rem] tracking-[0.06em] text-cal-1 uppercase">
                    done
                  </span>
                )}
              </span>
              <span className="max-w-[46ch] text-[0.8125rem] leading-relaxed text-ui-dim">
                {s.check}
              </span>
            </li>
          ))}
        </ul>
        <Why>
          One question before eight, because the first model call always fails in
          a way nobody predicted, and one question is the cheapest place to read
          it.
        </Why>
        <Key>
          The second step checks something did <em>not</em> happen. The question
          gives a campaign number, so the lookup should run and the search should
          not run at all.
        </Key>
        <Why>
          A model that searches for a number it was just handed has
          misunderstood what the tools are for. Better to find that out on
          question one.
        </Why>
      </Chapter>

      <Chapter
        n="05"
        title="The check for running out of quota printed PASS while running out of quota"
        sub="In the step written to prevent exactly that, in a file whose own comments describe the failure."
      >
        <Data
          path="the first run of the last step"
          mark={[1]}
          lines={[
            'quota 0 · error 1',
            '6.6: PASS — the whole key was asked without hitting the quota.',
          ]}
        />
        <Key>
          One question had died of the quota. The detector looked for the words
          “rate limit” in the error, and the message said{' '}
          <em>Too Many Requests</em> — so it filed a quota failure as an ordinary
          error, and the one thing that step asserts came back green.
        </Key>
        <Why>
          A detector for a failure is part of that failure until something has
          been seen to trip it. The real error is now kept and checked before the
          run spends anything — it has to recognise the recorded one, and it has
          to not call an ordinary error a quota failure. If either check fails
          the run refuses to start, because every result would be trustworthy
          except the one that matters.
        </Why>
        <P className="mt-8">
          The pacing was also aimed at the wrong thing. The limit is fifteen
          requests a minute, and a question is not one request.
        </P>
        <Data
          path="why an average is not a rate limit"
          mark={[1]}
          lines={[
            'one question             made ten tool calls',
            '                         over half the minute’s budget, all at once',
            'the whole run averaged   under the limit, and still died',
          ]}
        />
        <Why>
          A limit applies to any window, not to the mean. Pacing moved to after
          every turn — which uncovered a third fault underneath: the callback it
          waits on was typed as returning nothing, so all three engines called it
          without waiting. The sleep finished after the next request had already
          gone out. The run would have looked paced and hit the quota anyway.
        </Why>
        <Key>
          Eleven faults were fixed across this stage. Four were in fixes made
          earlier the same day, and three were in the checking apparatus rather
          than in the thing being checked.
        </Key>
      </Chapter>

      <Chapter
        n="06"
        title="The risk is picking the wrong tool"
        sub="Not the wording of the prompt."
      >
        <ul className="cal-panel cal-dashed grid gap-2">
          {CONFUSABLE.map((c) => (
            <li key={c.tool} className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5">
              <span className="w-44 shrink-0 font-mono text-[0.75rem] text-ui-dim">{c.tool}</span>
              <span className="max-w-[48ch] text-[0.8125rem] text-ui-dim">{c.want}</span>
            </li>
          ))}
        </ul>
        <Key>
          Ask the search when you meant the count and you get a number that is
          confidently wrong. The search hands back six examples. Count those and
          the answer is always six, whatever the real total is.
        </Key>
        <Why>
          The fix is in how each tool describes its own arguments, not in the
          prompt. That description is the only thing telling the model what to
          put there — so a vague one produces a tool called wrongly, which looks
          like a model problem and is a writing problem.
        </Why>
      </Chapter>

      <Chapter
        n="07"
        title="Which engine talks to the model"
        sub="Three to choose from. Two of them work — and the second one only started working today."
      >
        <ul className="cal-panel cal-dashed grid gap-2.5">
          {ENGINES.map((e) => (
            <li key={e.name} className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5">
              <span className="w-32 shrink-0 text-[0.8125rem] text-ui-dim">{e.name}</span>
              <span
                className="w-20 shrink-0 font-mono text-[0.75rem]"
                style={{ color: e.ok ? 'var(--color-cal-1)' : 'var(--color-ui-faint)' }}
              >
                {e.state}
              </span>
              <span className="max-w-[46ch] text-[0.8125rem] leading-relaxed text-ui-faint">
                {e.why}
              </span>
            </li>
          ))}
        </ul>
        <Why>
          There are three of these to choose from and two of them now work with
          our model. Picking the cloud without also picking the engine leaves
          the refusing one in place — they are one decision, not two.
        </Why>
        <Key>
          The third one was fixed on the day this page was written, and it took
          two repairs. The second fault was invisible until the first was
          mended, because nobody had ever got past the first.
        </Key>
        <Why>
          Which is the argument for having built three of these rather than one.
          A single-engine stack would have called both faults “the model does
          not support tools properly” and been wrong twice. The difference
          between the engines was invisible until something was swapped.
        </Why>
        <Key>
          And the free allowance cuts you off without saying so. A run that was
          not paced once reported <em>no wrong answers</em> — because three of
          the questions never ran at all.
        </Key>
        <Why>
          So pacing is not tidying up. It is the difference between a number and
          a fiction.
        </Why>
      </Chapter>

      <Chapter
        n="08"
        title="Three things not decided yet"
        sub="Written down as open, so nobody later mistakes a guess for a decision."
      >
        <div className="grid gap-3">
          {OPEN.map((o) => (
            <div key={o.q} className="cal-open">
              <p className="font-mono text-[0.8125rem] text-ui-fg">{o.q}</p>
              <p className="mt-1.5 max-w-[62ch] text-[0.8125rem] leading-relaxed">{o.why}</p>
            </div>
          ))}
        </div>
      </Chapter>

      <Chapter
        n="09"
        title="What is proved so far, and what is not"
        sub="Worth saying plainly before anybody quotes a number from this stage."
      >
        <Data
          path="where this actually stands"
          mark={[2]}
          lines={[
            'proved       the right documents can be found',
            'proved       a right answer can be checked',
            'not proved   that a model asks for the right things',
          ]}
        />
        <Key>
          One question has been answered well. That is the least this stage could
          have shown and still been worth carrying on with — it is not a score.
        </Key>
        <Why>
          This is also the first part that costs money, and the first that can be
          wrong in a way no check catches. Which is why it is last.
        </Why>
      </Chapter>
    </section>
  );
}

function Chapter({
  n,
  title,
  sub,
  children,
}: {
  n: string;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <section className="cal-chapter">
      <div className="cal-chapter-head">
        <span className="cal-chapter-n" aria-hidden>
          {n}
        </span>
        <h3 className="cal-chapter-title">{title}</h3>
      </div>
      <p className="cal-chapter-sub">{sub}</p>
      <div className="cal-chapter-body">{children}</div>
    </section>
  );
}

function P({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`max-w-[64ch] text-[0.875rem] leading-relaxed text-ui-dim ${className}`}>
      {children}
    </p>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return <p className="cal-key">{children}</p>;
}

function Why({ children }: { children: React.ReactNode }) {
  return <p className="cal-why">{children}</p>;
}
