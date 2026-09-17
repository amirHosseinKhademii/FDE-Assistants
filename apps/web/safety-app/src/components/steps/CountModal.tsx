/**
 * Inside `count_complaints` — stage 4.4, the tool that returns a number.
 *
 * ── THE ANCHOR IS THREE ROUTES TO THE SAME NUMBER ─────────────────────────
 *
 * The tool, a shell pipeline over the raw file, and a person reading by hand,
 * all agreeing three times. That is the strongest form this engagement's
 * check-it-against-something-else rule has taken, and it is the reason a number
 * from this tool can be put in front of somebody.
 *
 * ── THE ZERO GUARD IS A FEATURE, NOT AN ANECDOTE ──────────────────────────
 *
 * Spaces in a search phrase mean AND, so a phrase of five words can be
 * impossible to satisfy — and the zero it returns is identical to the zero that
 * means "nothing here describes this". Same number, opposite meanings, and on a
 * corpus about vehicles that roll away the wrong reading is a false all-clear.
 * So the tool checks its own zero and says which kind it is. That is described
 * here as what it does, because that is what it is.
 *
 * ── AND THE HONEST GAP IS THE BEST THING ON THE PANEL ─────────────────────
 *
 * Three predicates for "describes the recalled defect" exist and none of them
 * agree — 103, 93, 89. The number depends entirely on a predicate nobody wrote
 * down. So the check asserts the ARITHMETIC and asserts no total at all, and
 * the panel says why rather than quietly printing one of the three.
 */
import { useCallback, useState } from 'react';
import { Mono, OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import { Data } from '@veresk/surface';

/** Each figure, by three routes that share no code with each other. */
const AGREEMENTS = [
  { q: 'REC-004', what: 'Tesla Model 3, involving a death', n: 5 },
  { q: 'REC-005', what: 'Odyssey, forward-collision', n: 400 },
  { q: 'REC-001', what: 'F-150 power train, after the recall', n: 1057 },
] as const;

/** The three predicates for "describes the recalled defect", and they disagree. */
const PREDICATES = [
  { whose: "the answer key's", n: 103 },
  { whose: 'an earlier attempt', n: 93 },
  { whose: 'this phrase', n: 89 },
] as const;

export function CountModal() {
  const [from, setFrom] = useState<Origin | null>(null);
  const open = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => setFrom(originOf(e.currentTarget)),
    [],
  );

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="group flex w-full items-center gap-4 rounded-lg border border-ui-line bg-ui-surface px-4 py-3.5 text-left transition-colors hover:border-cal-1/50"
      >
        <span className="font-mono text-[0.6875rem] tracking-[0.08em] text-cal-1 uppercase">
          under the hood
        </span>
        <span className="min-w-0 flex-1 text-[0.875rem] text-ui-dim">
          Inside <Mono>count_complaints</Mono> — three routes to one number, and
          why a zero has to say which kind it is
        </span>
        <span className="font-mono text-sm text-ui-faint transition-colors group-hover:text-ui-fg">
          open →
        </span>
      </button>

      {from && <CountPanel from={from} onClose={() => setFrom(null)} />}
    </>
  );
}

function CountPanel({ from, onClose }: { from: Origin; onClose: () => void }) {
  return (
    <OriginDialog
      from={from}
      label="Inside count_complaints"
      tone="var(--color-cal-1)"
      onClose={onClose}
      header={
        <>
          <p className="font-mono text-sm text-ui-fg">Inside count_complaints</p>
          <p className="mt-0.5 text-[0.75rem] text-ui-faint">
            stage 4.4 · built, and checked three ways
          </p>
        </>
      }
    >
      <div className="sticky -top-3.5 z-20 -mx-5 -mt-3.5 mb-7 border-b border-ui-line bg-ui-bg px-5 pt-3.5 pb-4">
        <p className="pb-2.5 font-mono text-[0.625rem] tracking-[0.08em] text-ui-faint uppercase">
          every number, by three routes that share no code
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] border-collapse font-mono text-[0.75rem]">
            <thead>
              <tr className="text-[0.5625rem] tracking-[0.08em] text-ui-faint uppercase">
                <th className="pb-1.5 text-left font-normal">question</th>
                <th className="pb-1.5 text-right font-normal">the tool</th>
                <th className="pb-1.5 text-right font-normal">a shell pipeline</th>
                <th className="pb-1.5 text-right font-normal">read by hand</th>
              </tr>
            </thead>
            <tbody>
              {AGREEMENTS.map((a) => (
                <tr key={a.q} className="border-t border-ui-line/60">
                  <td className="py-1.5 text-ui-dim">{a.what}</td>
                  {[0, 1, 2].map((i) => (
                    <td
                      key={i}
                      className="py-1.5 text-right"
                      style={{ color: i === 0 ? 'var(--color-cal-1)' : 'var(--color-ui-dim)' }}
                    >
                      {a.n.toLocaleString('en-GB')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-9 pb-2">
        <section>
          <H>What it does</H>
          <P>It returns a number. Never a passage.</P>
          <Data
            path="one filter in, one number out"
            lines={[
              'count_complaints({ make: "FORD", model: "F-150",',
              '                   component: "POWER TRAIN",',
              '                   filed_after: "2020-04-27" })',
              '',
              '  →  { count: 1057, filter: { ...the question it answered } }',
            ]}
            mark={[4]}
          />
          <Why>
            Three of the eight questions in the answer key want a number. No six
            passages contain a count — retrieval returns <em>examples</em>, and
            counting is an aggregate. They are different operations, and a model
            asked to count from examples produces a number that sounds right.
          </Why>
          <Key>
            Two numbers can both be true and only one answer what was asked.
            1,057 complaints name the component; far fewer describe the defect.
            A system reporting 1,057 has done the arithmetic correctly and
            answered a different question.
          </Key>
        </section>

        <section>
          <H>Why the number comes back carrying its filter</H>
          <Data
            path="a number is not a fact until it says what it counted"
            mark={[1]}
            lines={[
              '"1,057"                                                        not a fact',
              '"1,057 F-150 power-train complaints filed after 2020-04-27"     a fact',
            ]}
          />
          <Why>
            The contract in the next stage has a rule that any number appearing
            in the prose must also appear in the list of counts — which is only
            checkable if a count carries the question it answered.
          </Why>
        </section>

        <section>
          <H>And a zero has to say which kind of zero it is</H>
          <P>
            Search phrases treat spaces as <span className="text-ui-fg">and</span>
            , so a phrase of several words can be impossible to satisfy at once.
          </P>
          <Data
            path="the same five words, two ways"
            mark={[1, 4]}
            lines={[
              '"park prndl rollaway shift cable"',
              "   →  'park' & 'prndl' & 'rollaway' & 'shift' & 'cabl'       0 complaints",
              '',
              '"park or prndl or rollaway or \\"shift cable\\""',
              "   →  'park' | 'prndl' | 'rollaway' | 'shift' <-> 'cabl'    89 complaints",
            ]}
          />
          <Key>
            An over-constrained query returns exactly the same number as a
            genuinely empty answer. Same zero, opposite meanings — and on a
            corpus about vehicles that roll away, reading the first as the second
            is a false all-clear.
          </Key>
          <P>
            So when a phrase narrows a non-empty set to nothing, the tool says
            so in the result rather than returning a bare number.
          </P>
          <Data
            path="what it returns instead of 0"
            lines={[
              'NO complaints matched "park prndl rollaway shift cable", but 1,057 match',
              'the filter alone. Spaces in a phrase mean AND, so several terms together',
              'may be impossible to satisfy at once — join them with `or`. DO NOT report',
              'this zero as evidence that no complaint describes the defect.',
            ]}
          />
          <Why>
            The impossible phrase is kept as a permanent check rather than
            replaced with a working one, so the guard is exercised on every run.
            A guard nobody has watched fail is a guard taken on faith.
          </Why>
        </section>

        <section>
          <H>The partition, and the gap in it</H>
          <Data
            path="F-150 power-train complaints filed after the recall"
            mark={[2]}
            lines={[
              '1,057   name the component',
              '   89   describe the defect',
              '  968   share a component but not a defect',
            ]}
          />
          <Why>
            The 968 is not a leftover. Nothing covers those complaints, which is
            itself a finding — and it is the shape of the real answer to the
            F-150 question.
          </Why>
          <P>
            But the middle number is not settled.{' '}
            <span className="text-ui-fg">
              Three predicates for “describes the recalled defect” exist and none
              of them agree
            </span>
            .
          </P>
          <div className="cal-panel grid gap-2">
            {PREDICATES.map((p) => (
              <div key={p.whose} className="flex items-baseline gap-4 font-mono text-[0.75rem]">
                <span className="w-44 shrink-0 text-ui-dim">{p.whose}</span>
                <span className="text-ui-fg">{p.n}</span>
              </div>
            ))}
          </div>
          <Key>
            An answer key must record the predicate, not only the answer. A
            number without the question that produced it cannot be reproduced,
            and three careful people will get three numbers.
          </Key>
          <Why>
            Which is why the check asserts the <em>arithmetic</em> — that
            narrowing by defect gives a strictly smaller number, and that the
            component total equals the defect count plus the remainder — and
            asserts no total at all. Asserting a number nobody can reproduce
            would make the check a fiction.
          </Why>
        </section>

        <section>
          <H>One builder, one meaning of “the complaints matching this filter”</H>
          <P>
            The predicate is not written twice. This tool imports the same
            builder the search uses, so the count and the examples are guaranteed
            to describe the same set because they are the same query.
          </P>
          <Why>
            Two tools building the same predicate separately could drift, and the
            drift would be invisible in the worst way: an answer stating a total
            and then quoting examples drawn from a different set.
          </Why>
          <Why>
            It also matters that the component test asks whether a matching
            component <em>exists</em> rather than joining against the list. A
            join multiplies rows — 21,747 of the 70,194 complaints name more than
            one component — and this is the tool whose entire output is a number.
          </Why>
        </section>

        <section>
          <H>The checks</H>
          <Data
            path="pnpm safety:count"
            note="7 of 7 · every number also checked by a shell pipeline over the raw file"
            mark={[4]}
            lines={[
              'ok  Tesla Model 3 complaints involving a death        5 · 5 · 5',
              'ok  Odyssey forward-collision complaints           400 · 400 · 400',
              'ok  F-150 power train, after the recall         1,057 · 1,057 · 1,057',
              'ok  narrowing by defect gives a strictly smaller number',
              'ok  a zero from an impossible phrase says so, instead of reading as',
              '    an all-clear',
              'ok  the count is returned WITH the filter that produced it',
              'ok  a filter matching nothing counts zero',
            ]}
          />
          <Why>
            The shell pipeline shares no code, no parser, no database and no
            schema with the tool, and its column numbers are written out by hand
            rather than imported — importing them would make the check agree by
            construction, which is the thing it exists to test.
          </Why>
        </section>

        <section>
          <H>And the measurement has since happened</H>
          <Key>
            recall@6 went 0.40 to 1.00 over the three retrieval cases. Five
            tools looking good in isolation was not the claim; running them
            together was, and it is now run.
          </Key>
          <Why>
            With the tools called by hand, because there is no model yet — so it
            is a ceiling on what is reachable rather than a score. This tool is
            not in that number at all: none of the three retrieval cases wants a
            count. It is checked by its own arithmetic, three ways.
          </Why>
        </section>
      </div>
    </OriginDialog>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 font-mono text-[0.9375rem] text-ui-fg">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="max-w-[66ch] text-[0.875rem] leading-relaxed text-ui-dim">{children}</p>;
}

function Key({ children }: { children: React.ReactNode }) {
  return <p className="cal-key mt-3.5">{children}</p>;
}

function Why({ children }: { children: React.ReactNode }) {
  return <p className="cal-why mt-3.5">{children}</p>;
}
