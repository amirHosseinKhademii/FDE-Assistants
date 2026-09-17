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
 * Nothing here began until stage 4 showed the tools moved recall@6. A contract
 * around an answer built from passages that could not be retrieved would be a
 * very well-checked wrong answer.
 *
 * ── IT IS BUILT NOW, AND THE CONTROL CASE IS THE STORY ────────────────────
 *
 * 13 checks pass. On the first run every rule-specific test passed and the
 * CONTROL failed: a word boundary treats a hyphen as a break, so the 150 inside
 * "F-150" read as an undeclared count and rule 4 rejected a correct answer.
 *
 * A rule that rejects correct answers gets switched off rather than debugged,
 * and then it is no longer catching what it was built for. That is the argument
 * for controls, and here it is a run rather than an anecdote.
 *
 * ── AND NO MODEL HAS WRITTEN AN ANSWER HERE YET ───────────────────────────
 *
 * The fixtures are hand-written, so this proves the CONTRACT works rather than
 * that the system does. Same shape of caveat as 4.5's ceiling, and it stays on
 * the page until a loop exists to retire it.
 */
import { Mono } from '@fde/uikit';
import { Code, Data } from '@veresk/surface';
import { ContractModal } from './ContractModal';

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
    rule: 'the search found no recall, and the answer cites one anyway',
    when: 'new',
  },
  {
    n: 7,
    rule: 'the answer rests on nothing being found, and does not say what it searched',
    when: 'newer',
    note: 'Added once a model had to answer “there is no recall for this” and had no field to put the proof in.',
  },
] as const;


export function Stage5() {
  return (
    <section className="lift-in">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="font-mono text-lg leading-snug font-medium tracking-tight text-ui-fg md:text-xl">
          What an answer is allowed to be
        </h2>
        <span className="rounded-full border border-cal-2/50 px-2.5 py-0.5 font-mono text-[0.625rem] tracking-[0.06em] text-cal-2 uppercase">
          built · 16 checks · wired into the loop
        </span>
      </div>

      <p className="mt-4 max-w-[64ch] leading-relaxed text-ui-dim">
        Up to now the machine could <em>find</em> things. It still could not{' '}
        <em>say</em> anything. This is the rules for saying it.
      </p>

      <div className="cal-plain">
        <p>
          Ask a model a question and you get prose.{' '}
          <span className="text-ui-fg">Prose cannot be checked.</span> You cannot
          tell which sentence came from a document and which one the model
          supplied because it sounded right.
        </p>
        <p className="mt-3">
          So the answer comes back as separate boxes instead — the answer, which
          recalls it rests on, a citation for every claim, the tool call behind
          every number, anything said with nothing behind it, documents that
          disagree, and whether a person needs to look. Now a machine can check
          it.
        </p>
        <p className="mt-3">
          And nothing is ever quietly repaired. A repaired answer is a failure
          you stopped counting.
        </p>
      </div>

      <div className="mt-6">
        <ContractModal />
      </div>

      <p className="mt-6 max-w-[64ch] text-[0.8125rem] leading-relaxed text-ui-faint">
        It is a separate stage from the tools because neither needs the other to
        be testable: the tools are checked against the answer key, and the
        contract against answers written by hand.{' '}
        <span className="text-ui-dim">
          Nothing here began until the tools had moved recall@6
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
        <Code
          path="apps/ai/safety/src/schema/safety-answer.ts:89"
          note="four of the seven fields"
          lang="typescript"
          startLine={89}
          mark={[5, 16]}
          lines={[
            'export const SafetyAnswerSchema = z.strictObject({',
            '  answer: z',
            '    .string()',
            '    .nullable()',
            '    .describe(',
            "      'The answer in plain prose, or null if this corpus cannot answer it. Null is a legitimate ' +",
            "        'answer and is always better than a plausible guess about a vehicle defect.',",
            '    ),',
            '  campaigns: z',
            '    .array(z.string())',
            '    .describe(',
            '      \'Every recall campaign this answer rests on, e.g. ["20V197000"]. Empty when no recall is \' +',
            "        'relevant — do NOT list a loosely related campaign to avoid an empty array.',",
            '    ),',
            '  counts: z',
            '    .array(Count)',
            '    .describe(',
            "      'Every number that appears in your answer, with the tool call that produced it. ' +",
            "        'A number not listed here is a number you invented.',",
            '    ),',
            '});',
          ]}
        />
        <P>
          Every field carries a <Mono>.describe()</Mono> string, and those
          strings are sent to the model as part of the schema — prompt text
          rather than documentation, which is why a check fails when a field
          loses one. Two had gone missing on the first run, nested a level
          deeper than the prose written for them, and the check caught them.
        </P>
        <Key>
          A number in the answer that does not appear in <Mono>counts</Mono> is a
          number the model made up. That is the rule the marked field exists to
          make checkable.
        </Key>
      </Chapter>

      <Chapter
        n="02"
        title="Seven rules for when the shape is right and the answer is wrong"
        sub="Shape is one check. These are the other one — three carried over from the engagement before this, and four this data needed."
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
                    color:
                      r.when === 'newer'
                        ? 'var(--color-cal-2)'
                        : r.when === 'new'
                          ? 'var(--color-cal-1)'
                          : 'var(--color-ui-faint)',
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
        title="Every rule passed. The control failed."
        sub="Which is the whole argument for having one — and here it is a run rather than a story about a run."
      >
        <P>
          On the first run every rule-specific test passed. The one that failed
          was the one asserting a <span className="text-ui-fg">correct</span>{' '}
          answer is accepted.
        </P>
        <Data
          path="the failure"
          mark={[1]}
          lines={[
            'FAIL  a correct REC-001 answer',
            '      number(s) [150] appear in the answer but not in counts',
          ]}
        />
        <Key>
          150. From “F-150”. A word boundary treats a hyphen as a break, so the
          scanner found the 150 inside the truck's name and rule 4 demanded to
          know which tool call produced it. <Mono>10-speed</Mono> does it too. So
          does <Mono>Model 3</Mono>.
        </Key>
        <Why>
          The reason that matters is written in the rule's own comment, before it
          ever happened: <em>a rule that fires on every digit would be turned off
          within a week</em>. A rule that rejects correct answers does not get
          debugged — it gets disabled, and then it has stopped catching the thing
          it was built for. Without the control, all six would have looked
          healthy while the contract rejected every real answer the system could
          produce.
        </Why>
        <Code
          path="apps/ai/safety/src/schema/safety-answer.ts:147–149"
          lang="typescript"
          startLine={147}
          mark={[1]}
          lines={[
            '    // VEHICLE AND PART DESIGNATORS, which are names that happen to contain digits',
            "    .replace(/\\b[A-Za-z]+-\\d+\\b/g, ' ') // F-150, F-250, DMC-12",
            "    .replace(/\\b\\d+-[A-Za-z]+\\b/g, ' ') // 10-speed",
          ]}
        />
        <Why>
          The accepting fixture now carries <Mono>10-speed</Mono>, so the same
          thing cannot come back unnoticed.
        </Why>

        <P className="mt-8">
          It happened a second time, to the same rule, and the second one was
          worse.
        </P>
        <Data
          path="what a model filed when the rule leaned on it"
          mark={[2]}
          lines={[
            'the answer said   "owners were notified on April 27, 2020"',
            'the rule saw      27',
            'so the model      filed a count reading "27 — Day of the month',
            '                  owners were notified"',
          ]}
        />
        <Key>
          The first time, the rule rejected a correct answer. Loudly, and
          somebody looked. This time it <em>accepted</em> one and quietly
          deformed it — the model obeyed a rule that was wrong and wrote
          nonsense to satisfy it.
        </Key>
        <Why>
          Written dates were not being stripped and ISO ones were. A rule that
          rejects a good answer gets found in an afternoon. A rule that bends a
          good answer into a worse one can sit there indefinitely, because
          everything still passes.
        </Why>
      </Chapter>

      <Chapter
        n="05"
        title="It could prove an absence and had nowhere to write it down"
        sub="The best thing this stage found, and it came from reading a real answer rather than from a test."
      >
        <P>
          One question's right answer is “there is no recall for this”. A tool
          was built to prove that. The contract had no field to put the proof in.
        </P>
        <Data
          path="so the model wrote this as a citation"
          mark={[0]}
          lines={['"NHTSA recall database lookup for make HONDA, model ODYSSEY…"']}
        />
        <Key>
          That is a sentence, not a document. Every claim has to cite something,
          nothing existed to cite, so it composed a thing shaped like a citation.
        </Key>
        <Why>
          The fault was ours. We could establish an absence and could not express
          one, so the answer had to be bent to fit. There is now a field for what
          was searched and what its emptiness settles — and a seventh rule that
          insists on it when the answer leans on it.
        </Why>
        <Data
          path="two rules, opposite directions"
          lines={[
            'rule 6   stops the model citing a recall it should not',
            'rule 7   stops it claiming nothing exists without saying how it looked',
          ]}
        />
        <Key>
          An absence proved by a search can be checked by running the search
          again. An absence inferred from reading a list is a judgement wearing a
          fact's clothes. Both produce the same sentence.
        </Key>
      </Chapter>

      <Chapter
        n="06"
        title="Five of the seven were running. Two were on paper."
        sub="Written, tested, and never called — which is not the same as working."
      >
        <P>
          Two of the rules cannot be checked by reading an answer. Citing a
          recall is perfectly sensible on its own; it is only wrong given what
          the search came back with. So they need to see what the tools returned.
        </P>
        <Key>
          Until that was wired in, they were tested against answers typed by hand
          and nothing called them on a real one. A rule that has never run is a
          rule you hope works.
        </Key>
        <Why>
          They run now, on every answer. Sixteen checks pass. What that proves is
          that the rules work — a model still has to be asked all eight questions
          before any of this is a score.
        </Why>
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
