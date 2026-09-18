/**
 * Stage 7 — the same eight questions, three times each, scored twice.
 *
 * ── TWO NUMBERS, AND THEY SHARE A BOX ─────────────────────────────────────
 *
 *     decided   28 of 28    a mechanism behind every check
 *     judged     0 of 3     has to be read, every control passing
 *
 * 28 of 28 is the most quotable figure this engagement has produced and the
 * least honest one on its own. They are NEVER ADDED and never separated: one is
 * decided by a contract rule or a tool result, the other by reading. A page
 * showing the first without the second is advertising.
 *
 * THE JUDGED ZERO IS NOT A BROKEN JUDGE. Each rubric required it to ACCEPT a
 * known-good answer and all three did, so it discriminates — it does not think
 * these answers qualify.
 *
 * ── AND THAT IS THE FINDING ───────────────────────────────────────────────
 *
 * Every mechanical check has a MECHANISM behind it. Nothing in this system makes
 * an answer explain itself; that was left to the prompt, and a prompt is read
 * once at the start. What a tool result says at the moment of use, the system
 * does. What a prompt asks for in general, it does when it happens to.
 *
 * A perfect mechanical score sharpens that rather than erasing it.
 *
 * ── NOT ONE OF THE FOUR FIXES WAS A PROMPT EDIT ───────────────────────────
 *
 * A fact moved into a tool result. A filter taught the name a person says. A
 * count that reports when its own narrowing did nothing. A count that says it is
 * not yet a quotation. Every one found by reading a baseline rather than by
 * reasoning about the system, and verified against the baseline before it.
 *
 * ── AND IT IS STILL NOT THE LOOP TAB'S NUMBER ─────────────────────────────
 *
 * That one is recall@6 — did the right DOCUMENTS come back. A system can
 * retrieve the wrong documents and still satisfy every check about what it said,
 * because most of these checks are about honesty rather than coverage.
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
  { when: '18 Sep', what: 'after the fourth', clean: 28, flaky: 0, failed: 0, broken: 0 },
];

/** What moved, and what moved it. Neither was a change of wording. */
const MOVED: readonly { check: string; from: string; to: string; how: string }[] = [
  {
    check: 'it escalates when a repair cannot be confirmed',
    from: '0 of 3',
    to: '3 of 3',
    how: 'a fact moved into the tool result, read at the moment it is used',
  },
  {
    check: 'it cites the right campaign, and three checks with it',
    from: '1 of 3',
    to: '3 of 3',
    how: 'a filter taught to match the name a person actually says',
  },
  {
    check: 'it reports more than one number',
    from: '0 of 3',
    to: '3 of 3',
    how: 'a count that says when its own narrowing did nothing',
  },
  {
    check: 'it cites a complaint by number',
    from: '1 of 3',
    to: '3 of 3',
    how: 'a count that says it is not yet a quotation',
  },
];

/**
 * The five editorial properties, and what grades them.
 *
 * THREE ARE JUDGED AND SCORE ZERO. Two are graded by nothing at all, and are
 * listed saying so rather than dropped — a property nobody is checking should be
 * visible, because an unchecked property and a passing one look identical on a
 * page that omits the first.
 */
const JUDGED: readonly { what: string; state: 'no' | 'ungraded' }[] = [
  { what: 'it explains why two true numbers differ', state: 'no' },
  { what: 'it holds the line between an allegation and a finding', state: 'no' },
  { what: 'it says why the distinction matters', state: 'no' },
  { what: 'two more properties, with no exemplar to grade them against', state: 'ungraded' },
];

export function Stage7() {
  return (
    <section className="lift-in">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="font-mono text-lg leading-snug font-medium tracking-tight text-ui-fg md:text-xl">
          Asking the same eight questions, over and over
        </h2>
        <span className="rounded-full border border-cal-1/50 px-2.5 py-0.5 font-mono text-[0.625rem] tracking-[0.06em] text-cal-1 uppercase">
          four baselines
        </span>
      </div>

      <p className="mt-4 max-w-[64ch] leading-relaxed text-ui-dim">
        One run tells you nothing here. The same question gives different answers,
        so a check that passed once has not passed —{' '}
        <span className="text-ui-fg">it passed once</span>.
      </p>

      {/* THE TWO NUMBERS, AND THEY SHARE A BOX ON PURPOSE. 28 of 28 is the most
          quotable figure this engagement has produced and the least honest one
          alone. They are never added: one is decided by a mechanism, the other
          has to be read. */}
      <div className="cal-two">
        <div className="cal-two-half">
          <p className="cal-two-cap">what a mechanism decides</p>
          <p className="cal-two-n">28 of 28</p>
          <p className="cal-two-s">
            tools called, escalations, citations, every number carrying the tool
            that produced it
          </p>
        </div>
        <div className="cal-two-half" data-weak="true">
          <p className="cal-two-cap">what has to be read</p>
          <p className="cal-two-n">0 of 3</p>
          <p className="cal-two-s">
            and every control passed — the judge accepted a known-good answer
            each time, so it discriminates. It does not think these qualify.
          </p>
        </div>
        <p className="cal-two-foot">
          These are not added together, and the second is the more interesting
          one. A page showing only the first would be advertising.
        </p>
      </div>

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
        <p className="cal-result-label">four complete baselines</p>
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
          Twenty to twenty-eight in a day. The second run lost one to the quota
          rather than to an answer — drawn hollow, because absent is not wrong.
        </p>
      </div>

      <Chapter
        n="01"
        title="Not one of the four fixes was a change of wording"
        sub="Every one was found by reading a baseline rather than by reasoning about the system. If this page keeps one sentence, it is that one."
      >
        <div className="cal-panel grid gap-3">
          {MOVED.map((m) => (
            <div key={m.check} className="grid gap-1">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="w-16 shrink-0 font-mono text-[0.75rem] text-ui-faint">
                  {m.from}
                </span>
                <span className="w-4 shrink-0 font-mono text-[0.75rem] text-ui-faint">→</span>
                <span className="w-14 shrink-0 font-mono text-[0.75rem] text-cal-1">{m.to}</span>
                <span className="max-w-[44ch] text-[0.8125rem] leading-relaxed text-ui-fg">
                  {m.check}
                </span>
              </div>
              <p className="pl-[5.5rem] text-[0.75rem] leading-relaxed text-ui-faint">{m.how}</p>
            </div>
          ))}
        </div>
        <Key>
          The last one was the hardest: two passes in nine runs on a question
          built to be ambiguous. What fixed it was not an instruction about
          ambiguity — the counting tool now fetches the unnarrowed figure too and
          says when the two are equal.
        </Key>
        <Data
          path="what the model searched for, before and after"
          mark={[1]}
          lines={[
            'before   "shift or linkage or cable or prndl or gear or park or   6 and 6',
            '          transmission"',
            'after    "cable or clip or shift or prndl or gear or position or  6 and 5',
            '          park or roll"',
          ]}
        />
        <Why>
          The first narrows “transmission complaints” with the word
          <Mono>transmission</Mono> — a tautology reported as an analysis. Told
          that its narrowing changed nothing, the model picked terms that
          actually separate a defect from its component.
        </Why>
      </Chapter>

      <Chapter
        n="02"
        title="And a perfect mechanical score sharpens the finding rather than erasing it"
        sub="Three editorial properties are judged, and all three score zero with every control passing."
      >
        <div className="grid gap-2">
          {JUDGED.map((j) => (
            <div key={j.what} className="cal-judged" data-state={j.state}>
              <span>{j.state === 'no' ? 'no' : 'ungraded'}</span>
              <p>{j.what}</p>
            </div>
          ))}
        </div>
        <Key>
          Every mechanical check has a mechanism behind it — a contract rule, a
          tool result, a coherence check. Nothing in this system makes an answer{' '}
          <em>explain itself</em>. That was left to the prompt, and a prompt is
          read once at the start.
        </Key>
        <Why>
          What a tool result says at the moment of use, the system does. What a
          prompt asks for in general, it does when it happens to. That is the
          finding, and twenty-eight of twenty-eight makes it sharper rather than
          softer.
        </Why>
        <Why>
          Two of the five properties are graded by nothing at all. They are
          listed saying so rather than dropped: an unchecked property and a
          passing one look identical on a page that omits the first.
        </Why>
      </Chapter>

      <Chapter
        n="03"
        title="The answers got slower as they got better"
        sub="A real trade, recorded rather than hidden."
      >
        <Data
          path="the same questions, that morning and that afternoon"
          mark={[1]}
          lines={[
            'one question    25s   →   128s',
            'another        ~60s   →   115s',
            'a third         —     →   100s',
          ]}
        />
        <Why>
          The extra time is extra tool calls, and the extra tool calls are what
          the fixes prompt. The system does more work than it did that morning
          because it now checks things it used to assume.
        </Why>
      </Chapter>

      <Chapter
        n="04"
        title="And this is still not the number the tools tab holds"
        sub="They are both large, both good, and about different things."
      >
        <Data
          path="two measurements that must not be read as one"
          mark={[1]}
          lines={[
            'the loop tab   did the right DOCUMENTS come back, model routing   0.17–0.50',
            'here           does the ANSWER satisfy the key                    28 of 28',
          ]}
        />
        <Key>
          A system can retrieve the wrong documents and still satisfy every check
          about what it said, because most of those checks are about honesty
          rather than about coverage.
        </Key>
        <Why>
          Which is why the slot on that tab refused this number twice before a
          range went into it. Two large good numbers about different things are
          the easiest pair on this site to mistake for one.
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
