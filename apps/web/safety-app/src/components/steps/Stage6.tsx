/**
 * Stage 6 — the loop, and the first stage whose answer is not the same twice.
 *
 * ── NOTHING HERE HAS RUN, AND THE TAB HAS TO SAY SO LOUDLY ────────────────
 *
 * The plan is written and committed; no part of it is built. That is a real
 * distinction on this site and it is the one most easily lost — stage 5 carried
 * "specified · not built" for a fortnight before it was true that it was built.
 * So every panel on this tab is dashed, and the frame says planned.
 *
 * ── THE GAP IS THE WHOLE STAGE, AND IT IS THE PAYOFF OF TWO STAGES ────────
 *
 * 4.5 measured a CEILING of 1.00 with the tools called by hand. This stage finds
 * out how close a model gets to it, and it will be lower. The gap between them
 * is the only thing stage 6 actually measures.
 *
 * WHICH IS WHY THE PAGE MUST NEVER SHOW STAGE 6'S NUMBER ALONE. Alone it says
 * "the system scores X". Beside 1.00 it says "X of what was reachable" — and
 * that is the sentence that says whether to fix the prompt or the tools. The
 * empty slot is drawn now so the number has nowhere to arrive except beside it.
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
import { Data } from '@veresk/surface';

/** The six steps, none of them done. */
const STEPS: readonly { n: string; what: string; check: string }[] = [
  {
    n: '6.1',
    what: 'the tools, registered',
    check: 'each of the five callable, with its arguments validated — and still no model',
  },
  {
    n: '6.2',
    what: 'ONE question, end to end',
    check: 'the campaign comes back, and the record shows the lookup ran and the search did not',
  },
  {
    n: '6.3',
    what: 'the answer, through the contract',
    check: 'it parses, it is the right shape, and it trips none of the six rules',
  },
  {
    n: '6.4',
    what: 'the hard question',
    check: 'two calls in order, the second filtered by a date taken from the first',
  },
  {
    n: '6.5',
    what: 'the negative question',
    check: 'nothing found, and the answer says so without reaching for a different campaign',
  },
  {
    n: '6.6',
    what: 'pacing',
    check: 'all eight finish, and none of them is silently dropped',
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

/** Measured on 2026-09-16, and paid for on an earlier engagement. */
const ENGINES: readonly { name: string; state: string; why: string; ok: boolean }[] = [
  {
    name: 'the default engine',
    state: 'refuses',
    why: 'it drives an API only two clouds implement, and it refuses by name rather than failing oddly',
    ok: false,
  },
  { name: 'the second engine', state: 'works', why: 'the only one of the three that reaches this model', ok: true },
  {
    name: 'the third engine',
    state: '400',
    why: 'it drops a provider-specific field between turns',
    ok: false,
  },
];

/** Left open on purpose rather than guessed. */
const OPEN: readonly { q: string; why: string }[] = [
  {
    q: 'Which model',
    why: 'Product names get retired, and two runs on different models are not comparable. Whichever one produces a number has to be recorded beside it.',
  },
  {
    q: 'What happens to a rejected answer',
    why: 'The contract rejects rather than repairs. Whether the loop tries again with the errors attached — and how many times — is a cost decision, and an unbudgeted one is how a quota disappears in an afternoon.',
  },
  {
    q: 'Who fills in where a number came from',
    why: 'Every number has to carry the tool call behind it. The cleanest version has the loop attach that from its own record, because a model asked to restate its own arguments will paraphrase them.',
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
          planned · nothing here has run
        </span>
      </div>

      <p className="mt-4 max-w-[64ch] leading-relaxed text-ui-dim">
        Everything up to here runs <em>without</em> a model. This is where one is
        finally asked a question — and it is the first stage whose answer is not
        the same twice.
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

      {/* THE GAP. Drawn empty on purpose: the number has nowhere to arrive
          except beside the ceiling it will be compared against. */}
      <div className="cal-gap">
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
            <p className="cal-gap-pending">not yet</p>
          </div>
          <p className="cal-result-ceiling">
            <span>and it will be lower</span>
            One number alone says “the system scores this much”. The two together
            say “this much <em>of what was reachable</em>” — which is the sentence
            that tells you whether to fix the asking or the tools.
          </p>
        </div>
      </div>

      <Chapter
        n="01"
        title="Everything before this was the same twice. This will not be."
        sub="Which is not a flaw in the stage — it is what the five underneath it exist to make survivable."
      >
        <Data
          path="what changes at this line"
          mark={[1]}
          lines={[
            'stages 1 to 5   same input, same output — each checked against something',
            '                that shares no code with it',
            'stage 6         the model picks the tools, the arguments and the words.',
            '                The same question twice can give two answers, and',
            '                neither one is a bug.',
          ]}
        />
        <Key>
          So the value of everything underneath is that when an answer looks
          wrong, the retrieval, the counting and the contract are each{' '}
          <em>already known to be sound</em>. Without that, a bad answer has five
          possible causes and no way to tell them apart.
        </Key>
      </Chapter>

      <Chapter
        n="02"
        title="The order it gets built in"
        sub="One question before eight, on purpose — the first model call fails in a way nobody predicted, and one case is where that is cheapest to read."
      >
        <ul className="cal-panel cal-dashed grid gap-2.5">
          {STEPS.map((s) => (
            <li key={s.n} className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="w-10 shrink-0 font-mono text-[0.75rem] text-ui-faint">{s.n}</span>
              <span className="w-44 shrink-0 font-mono text-[0.8125rem] text-ui-dim">
                {s.what}
              </span>
              <span className="max-w-[46ch] text-[0.8125rem] leading-relaxed text-ui-dim">
                {s.check}
              </span>
            </li>
          ))}
        </ul>
        <Key>
          The second step's check is a <em>negative</em>, and that is the
          interesting part: the question names a campaign number, so the lookup
          should run and the search should not run at all.
        </Key>
        <Why>
          A model that searches for a campaign number it was handed has
          misunderstood the whole tool layer — and that is worth catching on
          question one rather than question eight.
        </Why>
      </Chapter>

      <Chapter
        n="03"
        title="The real risk is not the prompt"
        sub="Five tools, and the two that return numbers are the ones easiest to mix up."
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
          A model that reaches for the search when it wanted the count produces a
          confident wrong number — the same trap as before, arriving from a new
          direction.
        </Key>
        <Why>
          And it is prevented in the <em>descriptions of the tools' own
          arguments</em> rather than in the prompt. A parameter's description is
          the only thing telling a model what to put there, so a vague one
          produces a tool called with the wrong arguments — which looks like a
          model problem and is a writing problem.
        </Why>
      </Chapter>

      <Chapter
        n="04"
        title="Two things already known, and both were paid for"
        sub="Measured on an earlier engagement, which is the only reason they are not going to be discovered again here."
      >
        <ul className="cal-panel cal-dashed grid gap-2.5">
          {ENGINES.map((e) => (
            <li key={e.name} className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5">
              <span className="w-36 shrink-0 text-[0.8125rem] text-ui-dim">{e.name}</span>
              <span
                className="w-20 shrink-0 font-mono text-[0.75rem]"
                style={{ color: e.ok ? 'var(--color-cal-1)' : 'var(--color-ui-faint)' }}
              >
                {e.state}
              </span>
              <span className="max-w-[44ch] text-[0.8125rem] leading-relaxed text-ui-faint">
                {e.why}
              </span>
            </li>
          ))}
        </ul>
        <Why>
          Which engine drives the loop and which cloud it talks to are{' '}
          <span className="text-ui-dim">one decision, not two</span>. Changing
          the cloud alone leaves the refusing engine in place.
        </Why>
        <Key>
          And the free tier rate-limits without saying so. An unpaced run once
          reported <em>zero wrong answers</em> because three of the questions
          never ran at all — so pacing is not a tidy-up here. It is the
          difference between a number and a fiction.
        </Key>
      </Chapter>

      <Chapter
        n="05"
        title="Three things left open rather than guessed"
        sub="Written down as undecided, because a decision recorded as a guess is indistinguishable later from one that was made."
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
        n="06"
        title="What the stages underneath have and have not proved"
        sub="Worth stating plainly before a model is allowed anywhere near this."
      >
        <Data
          path="the honest position"
          mark={[2]}
          lines={[
            'stage 4   proved the right documents are REACHABLE',
            'stage 5   proved a right answer can be CHECKED',
            'neither   has been tested against a model',
          ]}
        />
        <Key>
          Which is the whole reason this stage is last rather than first. It is
          also the first one that costs money, and the first that can be wrong in
          a way no check catches. <Mono>1.00</Mono> was the ceiling. What a model
          reaches is the number that matters, and it is not in yet.
        </Key>
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
