/**
 * Stage 4 — the tools, and the shape an answer has to arrive in.
 *
 * ── SPECIFIED IS NOT BUILT, AND THE PAGE HAS TO SAY WHICH ─────────────────
 *
 * Every number in here comes from a measurement or from the raw files; none of
 * it comes from a running stage 4, because there is not one. The tab says
 * "specified, not built" rather than "not written", which was true until the
 * spec landed and is not now — and the distinction is the whole difference
 * between a plan somebody could disagree with and a wish.
 *
 * ── THE NARRATIVE BEAT IS THAT THE PLAN WAS WRONG ─────────────────────────
 *
 * `PLAN.md` §8 said two tools, reasoned from what the questions looked like.
 * Stage 3.7 measured recall@6 at 0.40 and diagnosed why, and half that design
 * did not survive it. Five tools now, and the reason for each of the three new
 * ones is a specific thing the measurement showed.
 *
 * That is not a defect story. It is the plan being corrected by evidence, which
 * is the thing this whole site argues for — and it is the reason this stage is
 * worth a page before it is worth any code.
 *
 * Source: `docs/safety/STAGE4.md`.
 */
import { Mono } from '@fde/uikit';
import { Data } from '@veresk/surface';
import { GetRecallModal } from './GetRecallModal';

/**
 * THE FIVE, AND WHAT EACH ONE IS FOR.
 *
 * `from` is what put it in the list: two were in the original plan, three came
 * out of stage 3.7. Naming that on each card is what makes the count — two
 * becoming five — something a reader can check rather than take.
 */
const TOOLS: readonly {
  n: string;
  sig: string;
  rule: string;
  from: 'planned' | 'measured';
  built?: boolean;
  what: string;
  why: string;
}[] = [
  {
    n: '4.1',
    sig: 'get_recall(campaign_number)',
    rule: 'exact, and must not search',
    from: 'planned',
    built: true,
    what: 'The campaign: vehicles, units, component, defect, consequence, remedy, who initiated it, the date owners were notified.',
    why: 'A question with one exact answer is a lookup, not a search. Searching for a campaign number returns passages that look like they contain campaign numbers — which is what stage 3.5 showed. The check is that it is called first AND that no complaint search runs at all.',
  },
  {
    n: '4.2',
    sig: 'find_recalls({ make, model, year, component? })',
    rule: 'may return nothing',
    from: 'planned',
    what: 'Every campaign covering that vehicle and component. Often an empty list.',
    why: 'THE EMPTY LIST IS THE POINT. Search always returns something — there is no score cutoff, by design — so today “no recall exists” is a judgement made by reading six loosely-related results and deciding none of them count.',
  },
  {
    n: '4.3',
    sig: 'search_complaints({ ...filters, query })',
    rule: 'filter first, then search',
    from: 'measured',
    what: 'The same hybrid search from 3.5 and 3.6, run inside a filtered set: make, model, year, component, filed before or after, crash, fire, minimum deaths, minimum injuries.',
    why: '681 documents instead of 73,442, and the target moves from rank 3,026 to rank 8. This is stage 3.7’s diagnosis turned into an argument list.',
  },
  {
    n: '4.4',
    sig: 'count_complaints({ ...filters })',
    rule: 'a number, never passages',
    from: 'measured',
    what: 'Returns the count AND the filter that produced it.',
    why: 'Returning the filter is not decoration: it is what lets the contract check that a number in the prose came from a tool rather than from the model’s sense of a plausible number.',
  },
  {
    n: '4.4b',
    sig: 'complaints_citing(campaign_number)',
    rule: 'one hop, not a graph',
    from: 'measured',
    what: 'The complaints whose narrative names that campaign. Seven, for the F-150 case.',
    why: 'Somebody who types a campaign number into their own complaint had it in front of them. That is a different claim from “a complaint about the same component”, and it is the strongest evidence available on whether a fix is holding.',
  },
] as const;

const RULES = [
  { n: 1, rule: 'answer is null and escalate is null', when: 'carried over' },
  { n: 2, rule: 'an answer with no citations and no unverified claims', when: 'carried over' },
  {
    n: 3,
    rule: 'an unresolved conflict with no escalation',
    when: 'carried over',
    note: 'The most important of the six: it means the model silently picked a side between two records that disagree.',
  },
  {
    n: 4,
    rule: 'a number in the answer with no matching entry in counts',
    when: 'new',
    note: 'The only defence against a confident wrong number.',
  },
  {
    n: 5,
    rule: 'any claim that a remedy failed',
    when: 'new',
    note: 'A legal distinction rather than a stylistic one — see below.',
  },
  {
    n: 6,
    rule: 'find_recalls returned nothing but the answer cites a campaign',
    when: 'new',
  },
] as const;

const STEPS: readonly (readonly [string, string, string] | readonly [string, string, string, 'done'])[] = [
  ['4.1', 'get_recall', 'returns 20V197000 exactly; a bad number returns nothing, not a near miss', 'done'],
  ['4.2', 'find_recalls', '[] for the Odyssey case; 20V197000 for the F-150 PRNDL one'],
  ['4.3', 'search_complaints', '11353867 in the top 6, where it was outside the top 50 unfiltered'],
  ['4.4', 'count_complaints', 'the numbers match awk over the raw file'],
  ['4.4b', 'complaints_citing', 'returns 7 for 20V197000, verified by grep'],
  ['4.5', 're-run 3.7 through the tools', 'recall@6 rises from 0.40 — and we can say by how much, and why'],
  ['4.6', 'the schema', 'every field has a describe() string'],
  ['4.7', 'the coherence rules', 'each of the six rejects a hand-written bad answer and accepts a good one'],
] as const;

export function Stage4() {
  return (
    <section className="lift-in">
      {/* ── THE FRAME, deliberately outside the chapters: it is what the stage
          IS, not a step in the argument about it. ─────────────────────────── */}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="font-mono text-lg leading-snug font-medium tracking-tight text-ui-fg md:text-xl">
          Where the machine is allowed to answer
        </h2>
        <span className="rounded-full border border-cal-1/40 px-2.5 py-0.5 font-mono text-[0.625rem] tracking-[0.06em] text-cal-1 uppercase">
          building · 1 of 5 tools
        </span>
      </div>

      <p className="mt-4 max-w-[64ch] leading-relaxed text-ui-dim">
        Stage 3 can <em>find</em> things. Stage 4 is where the machine is allowed
        to <em>answer</em> — and the answer has to be a shape that can be
        checked, not a paragraph anybody hopes is true.
      </p>

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        {[
          {
            k: 'tools',
            v: 'Ways the model can ask the database a question that is not “find me text like this”.',
          },
          {
            k: 'the contract',
            v: 'The shape an answer must arrive in, and the rules that reject it when the shape is right and the answer is wrong.',
          },
        ].map((b) => (
          <div key={b.k} className="cal-panel">
            <p className="font-mono text-[0.6875rem] tracking-[0.06em] text-cal-1 uppercase">
              {b.k}
            </p>
            <p className="mt-2.5 text-[0.875rem] leading-relaxed text-ui-dim">{b.v}</p>
          </div>
        ))}
      </div>

      <p className="mt-5 max-w-[64ch] text-[0.8125rem] leading-relaxed text-ui-faint">
        And nothing else. No interface, no deployment, no evals, no prompt, and{' '}
        <span className="text-ui-dim">no model call</span> — the tools are plain
        functions, testable from a command line with no network. Those are stages
        5, 6 and 7.
      </p>

      <Chapter
        n="01"
        title="The plan said two tools. The measurement said five."
        sub="Stage 3.7 measured recall@6 at 0.40, diagnosed why, and half the original design did not survive it."
      >
        <P>
          <Mono>PLAN.md</Mono> §8 specified two: an exact recall lookup and a
          hybrid complaint search. Both were reasoned from what the questions
          looked like, before anything had been measured.
        </P>
        <div className="cal-panel flex flex-wrap items-center gap-x-10 gap-y-4">
          {[
            { n: '2', l: 'tools, from reasoning', tone: 'var(--color-ui-faint)' },
            { n: '5', l: 'tools, from measurement', tone: 'var(--color-cal-1)' },
          ].map((x) => (
            <div key={x.l}>
              <p className="font-mono text-3xl" style={{ color: x.tone }}>
                {x.n}
              </p>
              <p className="mt-0.5 font-mono text-[0.625rem] tracking-[0.06em] text-ui-faint uppercase">
                {x.l}
              </p>
            </div>
          ))}
        </div>
        <Key>
          That is not a correction to be embarrassed about. It is the plan being
          changed by evidence, which is the only reason to measure before
          building — and it is why this stage is worth a page before it is worth
          any code.
        </Key>
      </Chapter>

      <Chapter
        n="02"
        title="The five"
        sub="Two came from the plan and three out of the measurement — each card says which, so the count is checkable rather than assertable."
      >
        <ul className="grid gap-4">
          {TOOLS.map((t) => {
            const kind = t.built ? 'built' : t.from === 'measured' ? 'measured' : 'planned';
            const badge = t.built ? 'built' : t.from === 'measured' ? 'from 3.7' : 'in the plan';
            return (
              <li key={t.sig} className="cal-tool" data-built={t.built ?? false}>
                <span className="cal-tool-n" aria-hidden>
                  {t.n}
                </span>
                <div className="cal-tool-head">
                  <span className="cal-tool-sig">{t.sig}</span>
                  <span className="cal-tool-badge" data-kind={kind}>
                    {badge}
                  </span>
                </div>
                <p className="cal-tool-rule">{t.rule}</p>
                <div className="cal-tool-body">
                  <p className="max-w-[62ch] text-[0.875rem] leading-relaxed text-ui-dim">
                    {t.what}
                  </p>
                  <Why>{t.why}</Why>
                  {t.built && <GetRecallModal />}
                </div>
              </li>
            );
          })}
        </ul>
        <Key>
          The empty list is the thing the insurance engagement could not have.
          “Is rideshare covered” is not a field in a policy document, so absence
          there could never be proved. Here it can: a campaign names the make,
          model, year and component it covers, so no match is a{' '}
          <em>fact about the corpus</em> rather than an impression of it.
        </Key>
      </Chapter>

      <Chapter
        n="03"
        title="Why there is a counting tool at all"
        sub="Three of the eight questions want a number, and a number is not in the documents."
      >
        <Data
          path="what the answer key asks for"
          mark={[0, 1, 2]}
          lines={[
            'REC-001   the answer is 103, and not 1,060     can 6 passages contain it?   NO',
            'REC-004   the answer is 5                                                   NO',
            'REC-007   the answer is 103 and 957                                         NO',
          ]}
        />
        <Key>
          No amount of better retrieval ever answers “how many”. Retrieval
          returns examples; counting is an aggregate.
        </Key>
        <P>
          You cannot read six passages and know there are 103 of something — and
          a model that tries will produce a number that <em>sounds right</em>,
          which is the most dangerous failure available here.
        </P>
        <Why>
          The trap REC-001 is built around: <span className="text-ui-fg">1,057
          and 103 are both true</span>, and only one answers the question. 1,057
          matched on component; 103 matched on defect. A system that says 1,057
          confidently has done the arithmetic correctly and answered a different
          question.
        </Why>
      </Chapter>

      <Chapter
        n="04"
        title="The shape an answer has to arrive in"
        sub="A Zod strictObject, the same pattern as the insurance engagement's — with one field the others have no equivalent for."
      >
        <Data
          path="the contract"
          mark={[3]}
          lines={[
            'answer              the prose, or null if it cannot be answered',
            'campaigns           campaign numbers this answer rests on',
            'citations           { source, claim } — every factual statement',
            'counts              { label, value, filter } — every NUMBER, tied to the tool call',
            'unverified_claims   things stated with no document behind them',
            'conflicts           { topic, positions[], resolved_by }',
            'escalate            { reason, suggested_owner } or null',
          ]}
        />
        <P>
          Every field carries a <Mono>.describe()</Mono> string, and those
          strings are sent to the model as part of the schema — prompt
          engineering rather than documentation, which is why the schema check
          fails when a field loses one.
        </P>
        <Key>
          A number in the answer that does not appear in <Mono>counts</Mono> is a
          number the model made up. That is the rule the marked field exists to
          make checkable.
        </Key>
      </Chapter>

      <Chapter
        n="05"
        title="Six rules for when the shape is right and the answer is wrong"
        sub="Zod checks shape. These check sense — three carried over from the engagements before this one, three that only this corpus needs."
      >
        <ul className="cal-panel grid gap-3.5">
          {RULES.map((r) => (
            <li key={r.n} className="grid gap-1">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="w-4 shrink-0 font-mono text-[0.75rem] text-ui-faint">{r.n}</span>
                <span className="max-w-[50ch] font-mono text-[0.8125rem] text-ui-fg">
                  {r.rule}
                </span>
                <span
                  className="ml-auto font-mono text-[0.5625rem] tracking-[0.06em] uppercase"
                  style={{
                    color: r.when === 'new' ? 'var(--color-cal-1)' : 'var(--color-ui-faint)',
                  }}
                >
                  {r.when}
                </span>
              </div>
              {'note' in r && r.note && (
                <p className="max-w-[58ch] pl-8 text-[0.75rem] leading-relaxed text-ui-dim">
                  {r.note}
                </p>
              )}
            </li>
          ))}
        </ul>
        <Key>
          Rule 5 is a legal distinction, not a stylistic one. Complaints filed
          after a recall are allegations by members of the public — the vehicle
          may never have had the repair, and the complaint may describe a
          different fault. “The fix is not holding” states as fact something no
          document here supports.
        </Key>
        <Why>
          REC-001 checks both halves: the answer must not claim the remedy
          failed, <em>and</em> must surface the 103.
        </Why>
      </Chapter>

      <Chapter
        n="06"
        title="The order it gets built in"
        sub="Eight steps, one done — and one of them is the step that decides whether any of the rest is worth building."
      >
        <ul className="cal-panel grid gap-2.5">
          {STEPS.map((row) => {
            const [n, what, check] = row;
            const done = row.length > 3 && row[3] === 'done';
            const pivot = n === '4.5';
            return (
              <li
                key={n}
                className={
                  pivot
                    ? '-mx-2 rounded-md border border-cal-1/40 bg-ui-surface px-2 py-2'
                    : undefined
                }
              >
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span
                    className="w-10 shrink-0 font-mono text-[0.75rem]"
                    style={{
                      color: done || pivot ? 'var(--color-cal-1)' : 'var(--color-ui-faint)',
                    }}
                  >
                    {n}
                  </span>
                  <span
                    className="w-52 shrink-0 font-mono text-[0.8125rem]"
                    style={{ color: done ? 'var(--color-ui-fg)' : undefined }}
                  >
                    {what}
                    {done && (
                      <span className="ml-2 text-[0.5625rem] tracking-[0.06em] text-cal-1 uppercase">
                        done
                      </span>
                    )}
                  </span>
                  <span className="max-w-[46ch] text-[0.8125rem] leading-relaxed text-ui-dim">
                    {check}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        <Key>
          4.5 is deliberately before the schema. It re-uses stage 3.7's harness
          with the tools in front of retrieval — so if recall does not move, the
          diagnosis was wrong and nothing below it should be built at all.
        </Key>
      </Chapter>

      <Chapter
        n="07"
        title="The question that was blocking two tools"
        sub="How a component filter should match — decided, verified, and written down before the filter exists."
      >
        <P>
          <Mono>FORWARD COLLISION AVOIDANCE: ADAPTIVE CRUISE CONTROL</Mono> and{' '}
          <Mono>FORWARD COLLISION AVOIDANCE: WARNINGS</Mono> are different
          components on the same vehicle, and REC-005 needs both. Exact match was
          too narrow; an arbitrary substring risked matching things nobody meant.
        </P>
        <Open>
          It is a{' '}
          <span className="text-ui-fg">
            prefix match on NHTSA's own colon hierarchy
          </span>{' '}
          — their structure rather than one invented for the filter — verified at
          400 for REC-005 <em>before</em> being adopted. The order matters:
          decide, then verify, then build, or the eval gets quietly tuned to
          whatever the filter happens to do.
        </Open>
      </Chapter>
    </section>
  );
}

/**
 * A numbered chapter.
 *
 * The summary under the heading is the part that makes the numeral worth
 * having: it lets a reader decide whether to read the chapter without reading
 * it, which on a panel this long is the difference between a reference and a
 * wall.
 */
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

function P({ children }: { children: React.ReactNode }) {
  return <p className="max-w-[64ch] text-[0.875rem] leading-relaxed text-ui-dim">{children}</p>;
}

/** The point of a chapter. At most one, and the only thing allowed to shout. */
function Key({ children }: { children: React.ReactNode }) {
  return <p className="cal-key">{children}</p>;
}

/** A reason attached to the thing above it. */
function Why({ children }: { children: React.ReactNode }) {
  return <p className="cal-why">{children}</p>;
}

/** Unresolved, or resolved and worth flagging as having been. */
function Open({ children }: { children: React.ReactNode }) {
  return <p className="cal-open">{children}</p>;
}
