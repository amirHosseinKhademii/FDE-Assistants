/**
 * Stage 5 — the shape an answer has to arrive in.
 *
 * ── IT IS ITS OWN STAGE, AND THE SPLIT IS THE POINT ───────────────────────
 *
 * A tool is a question you can ask the data. A contract is a shape an answer
 * must arrive in. Neither needs the other to be testable — the contract is
 * checked against answers written by hand, the tools against the answer key —
 * and bundling them made one stage twice the size of any other while the
 * contract read as an afterthought to five tools.
 *
 * ── THE SPLIT ALSO MAKES AN ORDERING RULE VISIBLE ─────────────────────────
 *
 * Nothing here begins until stage 4 shows the tools moved recall@6. A contract
 * around an answer built from passages that could not be retrieved would be a
 * very well-checked wrong answer.
 */
import { Mono } from '@fde/uikit';
import { Data } from '@veresk/surface';

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


export function Stage5() {
  return (
    <section className="lift-in">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="font-mono text-lg leading-snug font-medium tracking-tight text-ui-fg md:text-xl">
          What an answer is allowed to be
        </h2>
        <span className="rounded-full border border-dashed border-cal-2/50 px-2.5 py-0.5 font-mono text-[0.625rem] tracking-[0.06em] text-cal-2 uppercase">
          specified · not built
        </span>
      </div>

      <p className="mt-4 max-w-[64ch] leading-relaxed text-ui-dim">
        The tools are ways of asking. This is the shape the answer has to come
        back in — and the rules that reject it when the shape is right and the
        answer is wrong.
      </p>

      <p className="mt-5 max-w-[64ch] text-[0.8125rem] leading-relaxed text-ui-faint">
        It is a separate stage from the tools because neither needs the other to
        be testable: the tools are checked against the answer key, and the
        contract is checked against answers written by hand.{' '}
        <span className="text-ui-dim">
          Nothing here begins until the tools have moved recall@6
        </span>{' '}
        — a contract around an answer built from passages nobody could retrieve
        would be a very well-checked wrong answer.
      </p>

      <Chapter
        n="01"
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
        n="02"
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
        n="03"
        title="Three ways of being wrong, reported separately"
        sub="Did it parse, is it the right shape, and does it make sense — different causes, different fixes."
      >
        <Data
          path="what a rejection says"
          lines={[
            'did not parse      the model returned something that is not JSON',
            'wrong shape        it is JSON, and a required field is missing',
            'does not cohere    it is the right shape, and it contradicts itself',
          ]}
        />
        <Why>
          Collapsing those into “invalid” throws away the only information that
          says what to do next. The first is usually a prompt or a decoding
          problem; the second is a schema the model cannot satisfy; the third is
          the model answering carelessly with a schema that is working.
        </Why>
        <Key>
          And nothing is ever silently repaired. A repaired answer is an
          unmeasured failure — the failure rate is what tells you whether the
          schema is too hard, the prompt unclear, or the model wrong for the job,
          and quietly patching the output destroys the only signal that would
          have said which.
        </Key>
      </Chapter>

      <Chapter
        n="04"
        title="The order it gets built in"
        sub="Three steps, and the second one has a done-condition that is easy to get wrong."
      >
        <ul className="cal-panel grid gap-2.5">
          {[
            ['5.1', 'the schema', 'every field has a describe() string, because those strings are sent to the model'],
            ['5.2', 'the six rules', 'each one rejects a hand-written bad answer AND accepts a good one'],
            ['5.3', 'the fixtures', 'the bad answers and the good ones, written by hand'],
          ].map(([n, what, check]) => (
            <li key={n} className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="w-10 shrink-0 font-mono text-[0.75rem] text-ui-faint">{n}</span>
              <span className="w-40 shrink-0 font-mono text-[0.8125rem] text-ui-fg">{what}</span>
              <span className="max-w-[46ch] text-[0.8125rem] leading-relaxed text-ui-dim">
                {check}
              </span>
            </li>
          ))}
        </ul>
        <Key>
          5.2 says “and accepts a good one” for a reason. A rule that rejects
          everything passes a test fed only bad input — which is how the
          insurance engagement came to need a control case, and it is cheaper to
          write the good fixture now than to find out later.
        </Key>
      </Chapter>
    </section>
  );
}


/**
 * A numbered chapter. Same shape as stage 4's, deliberately: the two tabs are
 * halves of one argument and should not read as two different documents.
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

function Key({ children }: { children: React.ReactNode }) {
  return <p className="cal-key">{children}</p>;
}

function Why({ children }: { children: React.ReactNode }) {
  return <p className="cal-why">{children}</p>;
}
