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
import { CitingModal } from './CitingModal';
import { CountModal } from './CountModal';
import { FindRecallsModal } from './FindRecallsModal';
import { GetRecallModal } from './GetRecallModal';
import { SearchComplaintsModal } from './SearchComplaintsModal';

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
  /** planned and unchanged · planned but rebuilt · did not exist in the plan */
  origin: 'planned' | 'rebuilt' | 'added';
  /** Only on the rebuilt one: what the plan said it would be. */
  was?: string;
  built?: boolean;
  what: string;
  why: string;
}[] = [
  {
    n: '4.1',
    sig: 'get_recall(campaign_number)',
    rule: 'exact, and must not search',
    origin: 'planned',
    built: true,
    what: 'The campaign: vehicles, units, component, defect, consequence, remedy, who initiated it, the date owners were notified.',
    why: 'A question with one exact answer is a lookup, not a search. Written into the plan before any data was loaded, and it survived exactly as specified — reasoning got this one right.',
  },
  {
    n: '4.2',
    sig: 'find_recalls({ make, model, year, component? })',
    rule: 'may return nothing, and says so with evidence',
    origin: 'added',
    built: true,
    what: 'Every campaign covering that vehicle and component — often an empty list, and when it is empty it also returns the components on that vehicle that DO have campaigns.',
    why: 'It came from a question whose right answer is “no recall exists”. Nothing in the plan could say that, because search always returns something.',
  },
  {
    n: '4.3',
    sig: 'search_complaints({ ...filters, query })',
    rule: 'filter first, then search inside',
    origin: 'rebuilt',
    was: 'The plan called for a hybrid search over everything. This searches inside a filter instead — same name, different tool.',
    built: true,
    what: 'The same hybrid search from 3.5 and 3.6, run inside a filtered set: make, model, year, component, filed before or after, crash, fire, minimum deaths, minimum injuries.',
    why: 'Same name, different tool. The complaint that answers the F-150 question sat at rank 3,026 because “2020 F-150” was being matched as prose instead of used as a filter. Filtered, it comes back first.',
  },
  {
    n: '4.4',
    sig: 'count_complaints({ ...filters })',
    rule: 'a number, never passages',
    origin: 'added',
    built: true,
    what: 'Returns the count AND the filter that produced it — and, when a phrase narrows a set to nothing, says which kind of zero that is.',
    why: 'It came from re-reading the answer key. Three of the eight questions want a number, and no six passages contain a count: retrieval returns examples, and counting is an aggregate.',
  },
  {
    n: '4.4b',
    sig: 'complaints_citing(campaign_number)',
    rule: 'one hop, not a graph',
    origin: 'added',
    built: true,
    what: 'The complaints whose narrative names that campaign. Seven, for the F-150 case — and one of them is filed under a model the recall does not cover.',
    why: 'It came from measuring the corpus for a graph. The documented link between an investigation and its recall resolves 14 times out of 114; the link that works is owners typing a campaign number into their own complaint, which reaches 563 campaigns.',
  },
];

const STEPS: readonly (readonly [string, string, string] | readonly [string, string, string, 'done'])[] = [
  ['4.1', 'get_recall', 'returns 20V197000 exactly; a bad number returns nothing, not a near miss', 'done'],
  ['4.2', 'find_recalls', 'zero for the Odyssey case, with 16 other components named; 20V197000 for the F-150', 'done'],
  ['4.3', 'search_complaints', 'the complaint at position 1, where unfiltered it was outside the top 50', 'done'],
  ['4.4', 'count_complaints', 'three numbers, each agreeing with a shell pipeline over the raw file and with the key', 'done'],
  ['4.4b', 'complaints_citing', 'seven for 20V197000, verified against the raw file — one of them invisible to the vehicle filter', 'done'],
  ['4.5', 're-run 3.7 through the tools', 'recall@6 rises from 0.40 — and we can say by how much, and why'],
] as const;

export function Stage4() {
  return (
    <section className="lift-in">
      {/* ── THE FRAME, deliberately outside the chapters: it is what the stage
          IS, not a step in the argument about it. ─────────────────────────── */}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="font-mono text-lg leading-snug font-medium tracking-tight text-ui-fg md:text-xl">
          Ways to ask that are not a search
        </h2>
        <span className="rounded-full border border-cal-1/40 px-2.5 py-0.5 font-mono text-[0.625rem] tracking-[0.06em] text-cal-1 uppercase">
          all five built · not yet measured
        </span>
      </div>

      <p className="mt-4 max-w-[64ch] leading-relaxed text-ui-dim">
        Stage 3 can <em>find</em> things. Stage 4 is where the machine is allowed
        to <em>answer</em> — and the answer has to be a shape that can be
        checked, not a paragraph anybody hopes is true.
      </p>

      <p className="mt-5 max-w-[64ch] text-[0.8125rem] leading-relaxed text-ui-faint">
        Five of them, and nothing else. No interface, no deployment, no evals, no
        prompt, and <span className="text-ui-dim">no model call</span> — a tool
        is a plain function, testable from a command line with no network. The
        shape an answer has to arrive in is the next tab, and it is a separate
        stage for a reason: a tool is a question you can ask the data, a contract
        is a shape an answer must arrive in, and neither needs the other to be
        testable.
      </p>

      <Chapter
        n="01"
        title="The five"
        sub="Each card says where it came from — written into the plan before any data was loaded, or added once the measurement showed what search could not do."
      >
        <P>
          They answer in four different ways, and stage 3 could only ever do one
          of them.
        </P>
        <div className="cal-panel grid gap-2.5">
          {[
            ['from structure', 'get_recall · find_recalls', 'a field says so'],
            ['from meaning', 'search_complaints', 'the words are close'],
            ['from arithmetic', 'count_complaints', 'how many, not which'],
            ['from reference', 'complaints_citing', 'somebody named it'],
          ].map(([kind, which, gloss], i) => (
            <div key={kind} className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span
                className="w-36 shrink-0 font-mono text-[0.75rem]"
                style={{ color: i === 1 ? 'var(--color-cal-2)' : 'var(--color-cal-1)' }}
              >
                {kind}
              </span>
              <span className="w-56 shrink-0 font-mono text-[0.75rem] text-ui-dim">{which}</span>
              <span className="text-[0.8125rem] text-ui-faint">{gloss}</span>
            </div>
          ))}
        </div>
        <Why>
          The middle one is stage 3 in its entirety. Everything above and below
          it is a question the old pipeline had no way to ask.
        </Why>
        <ul className="grid gap-4">
          {TOOLS.map((t) => {
            /* The badge is the ONLY place origin is said, now that the
               background means built. So it says it in full rather than in a
               word a reader has to decode. */
            const badge =
              t.origin === 'added'
                ? 'not in the plan · added after measuring'
                : t.origin === 'rebuilt'
                  ? 'in the plan · rebuilt after measuring'
                  : 'in the plan · unchanged';
            return (
              <li key={t.sig} className="cal-tool" data-built={t.built ?? false}>
                <span className="cal-tool-n" aria-hidden>
                  {t.n}
                </span>
                <div className="cal-tool-head">
                  <span className="cal-tool-sig">{t.sig}</span>
                  <span className="cal-tool-badge" data-kind={t.origin}>
                    {badge}
                  </span>
                </div>
                <p className="cal-tool-rule">{t.rule}</p>
                {t.was && <p className="cal-tool-was">{t.was}</p>}
                <div className="cal-tool-body">
                  <p className="max-w-[62ch] text-[0.875rem] leading-relaxed text-ui-dim">
                    {t.what}
                  </p>
                  <Why>{t.why}</Why>
                  {t.n === '4.1' && <GetRecallModal />}
                  {t.n === '4.2' && <FindRecallsModal />}
                  {t.n === '4.3' && <SearchComplaintsModal />}
                  {t.n === '4.4' && <CountModal />}
                  {t.n === '4.4b' && <CitingModal />}
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
        n="02"
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
          The trap the F-150 question is built around:{' '}
          <span className="text-ui-fg">two numbers are both true</span>, and only
          one answers what was asked. 1,057 complaints name the component; a
          much smaller number describe the defect. A system reporting 1,057
          confidently has done the arithmetic correctly and answered a different
          question.
        </Why>
        <Why>
          How much smaller is not settled, and the page says so rather than
          picking one: three predicates for “describes the recalled defect”
          exist and give 103, 93 and 89.{' '}
          <span className="text-ui-fg">
            An answer key must record the predicate, not only the answer
          </span>{' '}
          — a number without the question that produced it cannot be reproduced,
          and three careful people will get three numbers.
        </Why>
      </Chapter>

      <Chapter
        n="03"
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
          4.5 is the one that matters, and{' '}
          <span style={{ color: 'var(--color-cal-2)' }}>
            recall@6 is still 0.40 until it runs.
          </span>{' '}
          Two of the cases look dramatically better in isolation — one moved from
          rank 3,026 to first — but the question that scores worst needs a recall
          AND a complaint, and no single tool returns both. Promising in
          isolation and measured end to end are different claims, and only the
          second one counts.
        </Key>
      </Chapter>

      <Chapter
        n="04"
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
