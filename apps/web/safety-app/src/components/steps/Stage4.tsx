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

/**
 * THE FIVE, AND WHAT EACH ONE IS FOR.
 *
 * `from` is what put it in the list: two were in the original plan, three came
 * out of stage 3.7. Naming that on each card is what makes the count — two
 * becoming five — something a reader can check rather than take.
 */
const TOOLS = [
  {
    sig: 'get_recall(campaign_number)',
    rule: 'exact, and must not search',
    from: 'planned',
    what: 'The campaign: vehicles, units, component, defect, consequence, remedy, who initiated it, the date owners were notified.',
    why: 'A question with one exact answer is a lookup, not a search. Searching for a campaign number returns passages that look like they contain campaign numbers — which is what stage 3.5 showed. The check is that it is called first AND that no complaint search runs at all.',
  },
  {
    sig: 'find_recalls({ make, model, year, component? })',
    rule: 'may return nothing',
    from: 'planned',
    what: 'Every campaign covering that vehicle and component. Often an empty list.',
    why: 'THE EMPTY LIST IS THE POINT. Search always returns something — there is no score cutoff, by design — so today “no recall exists” is a judgement made by reading six loosely-related results and deciding none of them count.',
  },
  {
    sig: 'search_complaints({ ...filters, query })',
    rule: 'filter first, then search',
    from: 'measured',
    what: 'The same hybrid search from 3.5 and 3.6, run inside a filtered set: make, model, year, component, filed before or after, crash, fire, minimum deaths, minimum injuries.',
    why: '681 documents instead of 73,442, and the target moves from rank 3,026 to rank 8. This is stage 3.7’s diagnosis turned into an argument list.',
  },
  {
    sig: 'count_complaints({ ...filters })',
    rule: 'a number, never passages',
    from: 'measured',
    what: 'Returns the count AND the filter that produced it.',
    why: 'Returning the filter is not decoration: it is what lets the contract check that a number in the prose came from a tool rather than from the model’s sense of a plausible number.',
  },
  {
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

const STEPS = [
  ['4.1', 'get_recall', 'returns 20V197000 exactly; a bad number returns nothing, not a near miss'],
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
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="font-mono text-lg leading-snug font-medium tracking-tight text-ui-fg md:text-xl">
          Where the machine is allowed to answer
        </h2>
        <span className="rounded-full border border-dashed border-cal-2/50 px-2.5 py-0.5 font-mono text-[0.625rem] tracking-[0.06em] text-cal-2 uppercase">
          specified · not built
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
          <div key={b.k} className="rounded-lg border border-ui-line bg-ui-surface p-4">
            <p className="font-mono text-[0.6875rem] tracking-[0.06em] text-cal-1 uppercase">
              {b.k}
            </p>
            <p className="mt-2.5 text-[0.875rem] leading-relaxed text-ui-dim">{b.v}</p>
          </div>
        ))}
      </div>

      <p className="mt-6 max-w-[64ch] text-[0.875rem] leading-relaxed text-ui-faint">
        And nothing else. No interface, no deployment, no evals, no prompt, and{' '}
        <span className="text-ui-dim">no model call</span> — the tools are plain
        functions, testable from a command line with no network. Those are stages
        5, 6 and 7.
      </p>

      {/* ── THE BEAT ───────────────────────────────────────────────────── */}
      <H>The plan said two tools. The measurement said five.</H>
      <P>
        <Mono>PLAN.md</Mono> §8 specified two: an exact recall lookup and a
        hybrid complaint search. Then stage 3.7 measured recall@6 at 0.40 and
        diagnosed why, and half that design did not survive it.
      </P>
      <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3">
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
      <Aside>
        That is not a correction anybody should be embarrassed about. It is the
        plan being changed by evidence, which is the only reason to measure
        before building — and it is why this stage is worth a page before it is
        worth any code.
      </Aside>

      {/* ── THE FIVE ───────────────────────────────────────────────────── */}
      <H>The five</H>
      <ul className="grid gap-4">
        {TOOLS.map((t) => (
          <li
            key={t.sig}
            className="rounded-lg border border-ui-line bg-ui-surface p-4"
            style={
              t.from === 'measured'
                ? { borderColor: 'color-mix(in oklab, var(--color-cal-1) 32%, var(--color-ui-line))' }
                : undefined
            }
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-[0.875rem] text-ui-fg">{t.sig}</span>
              <span className="font-mono text-[0.625rem] tracking-[0.06em] text-cal-2 uppercase">
                {t.rule}
              </span>
              <span
                className="ml-auto font-mono text-[0.625rem] tracking-[0.06em] uppercase"
                style={{
                  color:
                    t.from === 'measured' ? 'var(--color-cal-1)' : 'var(--color-ui-faint)',
                }}
              >
                {t.from === 'measured' ? 'from 3.7' : 'in the plan'}
              </span>
            </div>
            <p className="mt-3 max-w-[66ch] text-[0.875rem] leading-relaxed text-ui-dim">
              {t.what}
            </p>
            <p className="mt-2.5 max-w-[66ch] border-l-2 border-cal-2/40 py-0.5 pl-3.5 text-[0.8125rem] leading-relaxed text-ui-dim">
              {t.why}
            </p>
          </li>
        ))}
      </ul>

      <Aside>
        <span className="text-ui-fg">
          The empty list is the thing the insurance engagement could not have.
        </span>{' '}
        “Is rideshare covered” is not a field in a policy document, so absence
        there could never be proved. Here it can: a campaign names the make,
        model, year and component it covers, so no match is a{' '}
        <em>fact about the corpus</em> rather than an impression of it.
      </Aside>

      {/* ── COUNTING ───────────────────────────────────────────────────── */}
      <H>Why there is a counting tool at all</H>
      <P>Look at what the answer key asks for.</P>
      <Data
        path="three of the eight questions want a count"
        mark={[0, 1, 2]}
        lines={[
          'REC-001   the answer is 103, and not 1,060     can 6 passages contain it?   NO',
          'REC-004   the answer is 5                                                   NO',
          'REC-007   the answer is 103 and 957                                         NO',
        ]}
      />
      <Aside>
        A count is not in the documents. You cannot read six passages and know
        there are 103 of something — and a model that tries will produce a number
        that <em>sounds right</em>, which is the most dangerous failure available
        here.{' '}
        <span className="text-ui-fg">
          No amount of better retrieval ever answers “how many”.
        </span>{' '}
        Retrieval returns examples; counting is an aggregate.
      </Aside>
      <Aside>
        And the trap REC-001 is built around:{' '}
        <span className="text-ui-fg">1,057 and 103 are both true</span>, and only
        one answers the question. 1,057 matched on component; 103 matched on
        defect. A system that says 1,057 confidently has done the arithmetic
        correctly and answered a different question.
      </Aside>

      {/* ── THE CONTRACT ───────────────────────────────────────────────── */}
      <H>The shape an answer has to arrive in</H>
      <Data
        path="a Zod strictObject, the same pattern as the insurance engagement's"
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
        Every field carries a <Mono>.describe()</Mono> string, and those strings
        are sent to the model as part of the schema — prompt engineering rather
        than documentation, which is why the schema check fails when a field
        loses one.
      </P>
      <Aside>
        <Mono>counts</Mono> is the field with no equivalent on the other three
        engagements, and it exists to make one rule checkable:{' '}
        <span className="text-ui-fg">
          a number in the answer that does not appear in counts is a number the
          model made up.
        </span>
      </Aside>

      {/* ── THE RULES ──────────────────────────────────────────────────── */}
      <H>Six rules for when the shape is right and the answer is wrong</H>
      <P>
        Zod checks <em>shape</em>. These check <em>sense</em> — three carried
        over from the engagements before this one, three that only this corpus
        needs.
      </P>
      <ul className="mt-5 grid gap-3">
        {RULES.map((r) => (
          <li key={r.n} className="border-t border-ui-line pt-3">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="w-4 shrink-0 font-mono text-[0.75rem] text-ui-faint">{r.n}</span>
              <span className="max-w-[52ch] font-mono text-[0.8125rem] text-ui-fg">{r.rule}</span>
              <span
                className="ml-auto font-mono text-[0.625rem] tracking-[0.06em] uppercase"
                style={{
                  color: r.when === 'new' ? 'var(--color-cal-1)' : 'var(--color-ui-faint)',
                }}
              >
                {r.when}
              </span>
            </div>
            {'note' in r && r.note && (
              <p className="mt-1.5 max-w-[60ch] pl-8 text-[0.8125rem] leading-relaxed text-ui-dim">
                {r.note}
              </p>
            )}
          </li>
        ))}
      </ul>

      <Aside>
        <span className="text-ui-fg">Rule 5 is a legal distinction.</span>{' '}
        Complaints filed after a recall are allegations by members of the public.
        They are not evidence the remedy failed: the vehicle may never have had
        the repair done, and the complaint may describe a different fault. Saying
        “the fix is not holding” states as fact something no document here
        supports. REC-001 checks both halves — the answer must not claim the
        remedy failed, <em>and</em> must surface the 103.
      </Aside>

      {/* ── THE STEPS ──────────────────────────────────────────────────── */}
      <H>The order it gets built in</H>
      <ul className="grid gap-2.5">
        {STEPS.map(([n, what, check]) => {
          const pivot = n === '4.5';
          return (
            <li
              key={n}
              className={pivot ? 'rounded-lg border border-cal-1/40 bg-ui-surface p-3.5' : undefined}
            >
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span
                  className="w-10 shrink-0 font-mono text-[0.75rem]"
                  style={{ color: pivot ? 'var(--color-cal-1)' : 'var(--color-ui-faint)' }}
                >
                  {n}
                </span>
                <span className="w-56 shrink-0 font-mono text-[0.8125rem] text-ui-fg">{what}</span>
                <span className="max-w-[48ch] text-[0.8125rem] leading-relaxed text-ui-dim">
                  {check}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <Aside>
        <span className="text-ui-fg">4.5 is the one that matters</span>, and it is
        deliberately before the schema. It re-uses stage 3.7's harness with the
        tools in front of retrieval — so if recall does not move, the diagnosis
        was wrong and nothing below 4.5 should be built at all.
      </Aside>

      {/* ── THE OPEN QUESTION ──────────────────────────────────────────── */}
      <H>One thing that is still open, and is shown open on purpose</H>
      <P>
        How should a component filter match?{' '}
        <Mono>FORWARD COLLISION AVOIDANCE: ADAPTIVE CRUISE CONTROL</Mono> and{' '}
        <Mono>FORWARD COLLISION AVOIDANCE: WARNINGS</Mono> are different
        components on the same vehicle, and REC-005 needs both. Exact match is
        too narrow; a substring risks matching things nobody meant.
      </P>
      <Aside>
        The measurement used <Mono>like '%FORWARD COLLISION%'</Mono> and produced
        the right 400 —{' '}
        <span className="text-ui-fg">which is evidence, not a decision</span>. It
        has to be written down before the filter is built, or the eval gets
        quietly tuned to whatever the filter happens to do.
      </Aside>
    </section>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-12 mb-3 font-mono text-[0.9375rem] text-ui-fg">{children}</h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="max-w-[66ch] text-[0.875rem] leading-relaxed text-ui-dim">{children}</p>;
}

function Aside({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-5 max-w-[64ch] border-l-2 border-cal-2/50 py-0.5 pl-4 text-[0.875rem] leading-relaxed text-ui-dim">
      {children}
    </p>
  );
}
