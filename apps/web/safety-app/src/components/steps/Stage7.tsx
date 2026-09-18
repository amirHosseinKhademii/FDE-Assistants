/**
 * Stage 7 — the same eight questions, three times each, scored.
 *
 * ── THIS IS NOT THE NUMBER THE TOOLS TAB IS WAITING FOR ───────────────────
 *
 * The slot beside 1.00 on the loop tab is recall@6: did the right DOCUMENTS come
 * back. This stage measures something else — whether the ANSWER satisfies the
 * checks in the key. Tools called, escalation, citations, numbers carrying their
 * provenance.
 *
 *     4.5   recall@6 over documents, tools called by hand      1.00
 *     7     answer checks passing, a model doing everything    26 of 28
 *
 * Both are large and both are good, and putting the second in the first's slot
 * would be exactly the comparison that slot exists to prevent. IT STAYS EMPTY.
 * The number that belongs there has never been measured.
 *
 * ── THE HEADLINE IS THAT NEITHER FIX WAS A PROMPT EDIT ────────────────────
 *
 * One moved a fact to where it is read — out of the opening instructions and
 * into the tool result, at the moment the number is used. The other made a
 * filter match the name a person says rather than the name the corpus stores.
 * Both were found by reading a baseline rather than by reasoning about the
 * system, which is the whole argument for having baselines.
 *
 * ── AND WHAT IS STILL WRONG IS KEPT VISIBLE ───────────────────────────────
 *
 * One case has passed twice in nine runs, and it is the case designed to be
 * ambiguous. The trap works; the system falls into it. Another moved and nothing
 * we did touched it, so it is recorded as unexplained rather than explained
 * badly.
 */
import { Mono } from '@fde/uikit';
import { Data } from '@veresk/surface';

/** Three complete baselines, in the order they were run. */
const BASELINES: readonly {
  when: string;
  what: string;
  clean: number;
  flaky: number;
  failed: number;
  broken: number;
}[] = [
  { when: '17 Sep', what: 'before anything was changed', clean: 20, flaky: 7, failed: 1, broken: 0 },
  { when: '17 Sep', what: 'after the first fix', clean: 23, flaky: 5, failed: 0, broken: 1 },
  { when: '18 Sep', what: 'after the second', clean: 26, flaky: 1, failed: 1, broken: 0 },
];

/** What moved, and what moved it. Neither was a change of wording. */
const MOVED: readonly { check: string; from: string; to: string }[] = [
  { check: 'it escalates when a repair cannot be confirmed', from: '0 of 3', to: '3 of 3' },
  { check: 'it cites the right campaign', from: '1 of 3', to: '3 of 3' },
  { check: 'it says the recall was not volunteered', from: '1 of 3', to: '3 of 3' },
  { check: 'it does not escalate when the documents settle it', from: '1 of 3', to: '3 of 3' },
];

/** Still failing, across all three baselines. */
const STUCK: readonly { check: string; runs: string; why: string }[] = [
  {
    check: 'reports more than one number',
    runs: '1/3 · 1/3 · 0/3',
    why: 'The question has two true answers and the key wants both, with the premise refused. The model answers the question as asked.',
  },
  {
    check: 'cites at least one complaint by number',
    runs: '2/3 · 1/3 · 1/3',
    why: 'It moved, and nothing we changed touched it. Recorded as unexplained rather than explained badly.',
  },
];

export function Stage7() {
  return (
    <section className="lift-in">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="font-mono text-lg leading-snug font-medium tracking-tight text-ui-fg md:text-xl">
          Asking the same eight questions, over and over
        </h2>
        <span className="rounded-full border border-cal-1/50 px-2.5 py-0.5 font-mono text-[0.625rem] tracking-[0.06em] text-cal-1 uppercase">
          three baselines · 26 of 28
        </span>
      </div>

      <p className="mt-4 max-w-[64ch] leading-relaxed text-ui-dim">
        One run tells you nothing here. The same question gives different answers,
        so a check that passed once has not passed —{' '}
        <span className="text-ui-fg">it passed once</span>.
      </p>

      <div className="cal-plain">
        <p>
          Eight questions, three runs each, twenty-eight checks. A check is
          <span className="text-ui-fg"> clean</span> when it passed every run,{' '}
          <span className="text-ui-fg">flaky</span> when it passed some, and{' '}
          <span className="text-ui-fg">failed</span> when it passed none.
        </p>
        <p className="mt-3">
          Flaky is not a softer kind of pass. It is the honest name for a check
          whose result depends on the run, and on a system that is not
          deterministic it is the most common thing you find.
        </p>
      </div>

      <div className="cal-base">
        <p className="cal-result-label">three complete baselines</p>
        <div className="cal-base-rows">
          {BASELINES.map((b, i) => (
            <div key={i} className="cal-base-row" data-last={i === BASELINES.length - 1}>
              <span className="cal-base-when">
                {b.when}
                <span>{b.what}</span>
              </span>
              <span className="cal-base-bar" aria-hidden>
                {Array.from({ length: 28 }, (_, j) => (
                  <i
                    key={j}
                    data-s={
                      j < b.clean
                        ? 'clean'
                        : j < b.clean + b.flaky
                          ? 'flaky'
                          : j < b.clean + b.flaky + b.failed
                            ? 'failed'
                            : 'broken'
                    }
                  />
                ))}
              </span>
              <span className="cal-base-n">
                {b.clean}
                <span> clean</span>
              </span>
            </div>
          ))}
        </div>
        <p className="cal-base-foot">
          Twenty to twenty-six, and the middle run lost one to the quota rather
          than to an answer — which it says rather than quietly scoring over.
        </p>
      </div>

      <Chapter
        n="01"
        title="Neither fix was a change of wording"
        sub="Which is the argument for baselines: both were found by reading one, not by reasoning about the system."
      >
        <div className="cal-panel grid gap-2.5">
          {MOVED.map((m) => (
            <div key={m.check} className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="w-20 shrink-0 font-mono text-[0.75rem] text-ui-faint">
                {m.from}
              </span>
              <span className="w-4 shrink-0 font-mono text-[0.75rem] text-ui-faint">→</span>
              <span className="w-16 shrink-0 font-mono text-[0.75rem] text-cal-1">{m.to}</span>
              <span className="max-w-[46ch] text-[0.8125rem] leading-relaxed text-ui-dim">
                {m.check}
              </span>
            </div>
          ))}
        </div>
        <Key>
          The first had escalated <em>zero</em> times in seven runs, while the
          instructions asked for it in almost the answer key's own words. Moving
          the same fact into the tool's result — read at the moment the number is
          used, rather than once at the beginning — took it to three of three.
        </Key>
        <Why>
          The other three moved together, because they were never three
          properties. Looking up <Mono>F-250</Mono> returned nothing: a person
          says “F-250” and the corpus stores <Mono>F-250 SD</Mono>. One failing
          lookup wearing three check names.
        </Why>
        <Key>
          One fix moved a fact to where it is read. The other made a filter match
          the name a person says. Neither touched a word of the prompt.
        </Key>
      </Chapter>

      <Chapter
        n="02"
        title="What is still wrong"
        sub="Kept on the page, because a scorecard that only shows what improved is an advertisement."
      >
        <div className="grid gap-3">
          {STUCK.map((s) => (
            <div key={s.check} className="cal-open">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <p className="font-mono text-[0.8125rem] text-ui-fg">{s.check}</p>
                <p className="font-mono text-[0.75rem] text-ui-faint">{s.runs}</p>
              </div>
              <p className="mt-1.5 max-w-[62ch] text-[0.8125rem] leading-relaxed">{s.why}</p>
            </div>
          ))}
        </div>
        <Key>
          Two passes in nine runs. Calling that flaky would be generous — the
          question was built to be ambiguous, the trap is working exactly as
          designed, and the system is falling into it.
        </Key>
        <Why>
          And some checks are not scored at all. “Does it say why the distinction
          matters” needs a judgement rather than a rule, and a judged score must
          not be added to a decided one — so they are listed and left unscored
          rather than folded in to make the total look better.
        </Why>
      </Chapter>

      <Chapter
        n="03"
        title="And this is not the number the tools tab is waiting for"
        sub="They are both large, both good, and about different things."
      >
        <Data
          path="two measurements that must not be read as one"
          mark={[1]}
          lines={[
            'stage 4.5   did the right DOCUMENTS come back, tools called by hand   1.00',
            'stage 7     does the ANSWER satisfy the key, a model doing it all     26 of 28',
          ]}
        />
        <Key>
          The empty slot on the previous tab is the first of those, measured with
          a model doing the routing. That has never been run. Putting this number
          in it would be comparing a retrieval score with an answer score because
          both are large.
        </Key>
        <Why>
          So the slot stays empty, which is the correct state rather than an
          oversight. It has now refused two numbers: one nobody had, and one that
          was real and belonged somewhere else.
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

function Key({ children }: { children: React.ReactNode }) {
  return <p className="cal-key">{children}</p>;
}

function Why({ children }: { children: React.ReactNode }) {
  return <p className="cal-why">{children}</p>;
}
