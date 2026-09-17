/**
 * Inside the answer contract — stage 5, and the test that failed was the right one.
 *
 * ── THE ANCHOR IS A PASSING SUITE WITH ONE FAILURE IN IT ──────────────────
 *
 * Every rule-specific test passed. The one that failed was the control: "a
 * correct answer must be accepted". A regex word boundary treats a hyphen as a
 * break, so `\b\d{1,3}\b` matched the 150 inside F-150 and the rule demanding
 * every number carry its tool call fired on a correct answer.
 *
 * ── WHICH IS THE ENTIRE ARGUMENT FOR CONTROLS, WITH EVIDENCE ──────────────
 *
 * A rule that rejects correct answers does not get debugged, it gets switched
 * off — and then it is no longer catching the thing it was built for. Without
 * the control, all six rules would have looked healthy while the contract
 * rejected every real answer the system could ever produce.
 *
 * The rule's own comment said "a rule that fires on every digit would be turned
 * off within a week" BEFORE it happened. Every other engagement defends its
 * control case with an anecdote; this one has the run.
 *
 * ── AND THE CAVEAT IS THE SAME SHAPE AS 4.5'S CEILING ─────────────────────
 *
 * No model has produced an answer here yet. The fixtures are written by hand, so
 * this proves the CONTRACT works, not that the system does.
 */
import { useCallback, useState } from 'react';
import { Mono, OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import { Code, Data } from '@veresk/surface';

/** The first run: the rules were fine and the control was not. */
const FIRST_RUN: readonly { what: string; ok: boolean }[] = [
  { what: 'rule 1 · no answer and no escalation', ok: true },
  { what: 'rule 2 · an answer with nothing behind it', ok: true },
  { what: 'rule 3 · an unresolved conflict, silently decided', ok: true },
  { what: 'rule 4 · a number that came from nowhere', ok: true },
  { what: 'rule 5 · concluding that the remedy failed', ok: true },
  { what: 'rule 6 · a campaign cited after the search found none', ok: true },
  { what: 'control · a correct answer must be accepted', ok: false },
];

export function ContractModal() {
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
        className="group flex w-full items-center gap-4 rounded-lg border border-ui-line bg-ui-surface px-4 py-3.5 text-left transition-colors hover:border-cal-2/50"
      >
        <span className="font-mono text-[0.6875rem] tracking-[0.08em] text-cal-2 uppercase">
          under the hood
        </span>
        <span className="min-w-0 flex-1 text-[0.875rem] text-ui-dim">
          Inside the contract — the schema, the six rules, and the test that
          failed was the one that should have passed
        </span>
        <span className="font-mono text-sm text-ui-faint transition-colors group-hover:text-ui-fg">
          open →
        </span>
      </button>

      {from && <ContractPanel from={from} onClose={() => setFrom(null)} />}
    </>
  );
}

function ContractPanel({ from, onClose }: { from: Origin; onClose: () => void }) {
  return (
    <OriginDialog
      from={from}
      label="Inside the answer contract"
      tone="var(--color-cal-2)"
      onClose={onClose}
      header={
        <>
          <p className="font-mono text-sm text-ui-fg">Inside the answer contract</p>
          <p className="mt-0.5 text-[0.75rem] text-ui-faint">
            stage 5 · built · 13 checks, including both controls
          </p>
        </>
      }
    >
      <div className="sticky -top-3.5 z-20 -mx-5 -mt-3.5 mb-7 border-b border-ui-line bg-ui-bg px-5 pt-3.5 pb-4">
        <p className="pb-2.5 font-mono text-[0.625rem] tracking-[0.08em] text-ui-faint uppercase">
          the first run · every rule passed, the control did not
        </p>
        <div className="grid gap-1">
          {FIRST_RUN.map((r) => (
            <div key={r.what} className="flex items-baseline gap-3 font-mono text-[0.75rem]">
              <span
                className="w-12 shrink-0"
                style={{ color: r.ok ? 'var(--color-ui-faint)' : 'var(--color-cal-2)' }}
              >
                {r.ok ? 'ok' : 'FAIL'}
              </span>
              <span className={r.ok ? 'text-ui-dim' : 'text-ui-fg'}>{r.what}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-9 pb-2">
        <section>
          <H>What it is, plainly</H>
          <P>
            Up to now the machine could <em>find</em> things. It still could not{' '}
            <em>say</em> anything. This is the rules for saying it.
          </P>
          <Key>
            Ask a model a question and you get prose. Prose cannot be checked.
            You cannot tell which sentence came from a document and which one the
            model supplied because it sounded right.
          </Key>
          <P>So the answer comes back as separate boxes instead.</P>
          <Data
            path="what an answer has to arrive as"
            mark={[3]}
            lines={[
              'the answer          in plain words',
              'which recalls       it rests on',
              'citations           every claim, tied to the document behind it',
              'counts              every NUMBER, tied to the tool call that produced it',
              'unverified          things said with no document behind them',
              'conflicts           documents that disagree',
              'escalate            when a person needs to look',
            ]}
          />
          <Why>
            Now a machine can check it. The marked line is the one the other
            engagements have no equivalent for, and it is the only defence
            against a confident wrong number.
          </Why>
        </section>

        <section>
          <H>The schema itself</H>
          <Code
            path="apps/ai/safety/src/schema/safety-answer.ts:89"
            note="four of the seven fields"
            lang="typescript"
            startLine={89}
            mark={[15]}
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
              "  citations: z.array(Citation).describe('Every factual claim that a document supports.'),",
              '  counts: z',
              '    .array(Count)',
              '    .describe(',
              "      'Every number that appears in your answer, with the tool call that produced it. ' +",
              "        'A number not listed here is a number you invented.',",
              '    ),',
              '});',
            ]}
          />
          <Key>
            Every <Mono>.describe()</Mono> string is sent to the model as part of
            the schema. They are the only instruction it gets about what a field
            means — prompt text, not documentation.
          </Key>
          <Why>
            Which is why a check fails when one goes missing. Two had already
            gone missing on the first run, nested a level deeper than the prose
            written for them, and the check found them. Its own control fired
            first: it proved it could detect a stripped description before
            reporting that any were absent.
          </Why>
        </section>

        <section>
          <H>The six rules, in plain words</H>
          <Data
            path="what gets rejected when the shape is right and the answer is wrong"
            mark={[3]}
            lines={[
              '1   you cannot say nothing AND not ask for help',
              '2   every fact is either cited, or admitted as unbacked — no third option',
              '3   if two documents disagree and nothing settles it, escalate; never pick',
              '4   every number must come from a tool',
              '5   never say the fix failed',
              '6   if we searched for a recall and found none, do not cite a different one',
            ]}
          />
          <Why>
            The first three came from the engagement before this one. The last
            three came from this data. Rule 5 is a legal distinction rather than
            a stylistic one: complaints filed after a recall are allegations by
            members of the public, and the vehicle may never have had the repair
            done.
          </Why>
          <Key>
            Rule 4 exists because 1,057 and 103 are both true of this corpus and
            only one of them answers the question. A confident wrong number reads
            exactly like a right one, so the defence cannot be judgement. It has
            to be provenance.
          </Key>
          <Code
            path="apps/ai/safety/src/schema/safety-answer.ts:216–223"
            lang="typescript"
            startLine={216}
            mark={[1]}
            lines={[
              '    const declared = new Set(v.counts.map((c) => c.value));',
              '    const orphans = countLikeNumbers(v.answer).filter((nn) => !declared.has(nn));',
              '    if (orphans.length) {',
              '      errs.push(',
              "        `number(s) [${orphans.join(', ')}] appear in the answer but not in counts — every number ` +",
              "          'must carry the tool call that produced it',",
              '      );',
              '    }',
            ]}
          />
        </section>

        <section>
          <H>And then the control case failed</H>
          <P>
            Every rule-specific test passed. The one that failed was the one
            asserting a <span className="text-ui-fg">correct</span> answer is
            accepted.
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
            know which tool call produced it. <Mono>10-speed</Mono> does it too.
            So does <Mono>Model 3</Mono>.
          </Key>
          <Why>
            So rule 4 was rejecting correct answers — and the reason that matters
            is written in the rule's own comment, before it ever happened:{' '}
            <em>a rule that fires on every digit would be turned off within a
            week</em>. A rule that rejects correct answers does not get debugged.
            It gets disabled. And then it has stopped catching the thing it was
            built for.
          </Why>
          <Data
            path="what the run actually told us"
            mark={[2]}
            lines={[
              'the six rule tests      all passed',
              'the control test        failed',
              'what was broken         the rule, not the answers',
            ]}
          />
          <Why>
            Without the control, all six would have looked healthy while the
            contract rejected every real answer the system could ever produce.
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
            The accepting fixture now carries <Mono>10-speed</Mono> so the same
            thing cannot come back unnoticed.
          </Why>
        </section>

        <section>
          <H>Why rule 6 is checked apart from the other five</H>
          <P>
            An answer citing a campaign is perfectly coherent on its own. It is
            only wrong if the tool that looked for covering recalls came back
            empty — which is one of the questions in the answer key exactly.
          </P>
          <Key>
            So it is not a property of the answer. It needs the tool result
            beside it, and folding it in with the others would have meant
            inventing a field for the model to tick.
          </Key>
          <Why>
            And a model that will reach for an unrelated campaign will also tick
            a box saying it did not.
          </Why>
        </section>

        <section>
          <H>Three ways of being wrong, reported apart</H>
          <Data
            path="what a rejection says"
            lines={[
              'did not parse      what came back is not JSON',
              'wrong shape        it is JSON, and a required field is missing',
              'does not cohere    it is the right shape, and it contradicts itself',
            ]}
          />
          <Why>
            Collapsing those into “invalid” throws away the only information that
            says what to do next. And nothing is ever quietly repaired — a
            repaired answer is a failure you stopped counting.
          </Why>
        </section>

        <section>
          <H>The checks</H>
          <Data
            path="pnpm safety:schema"
            note="13 of 13 · both controls included"
            mark={[0, 9, 11]}
            lines={[
              'ok  a correct REC-001 answer',
              'ok  not JSON at all',
              'ok  rule 1 · no answer and no escalation',
              'ok  rule 2 · an answer with nothing behind it',
              'ok  rule 3 · an unresolved conflict, silently decided',
              'ok  rule 4 · a number that came from nowhere',
              'ok  rule 5 · concluding that the remedy failed',
              'ok  a year is not a count',
              'ok  rule 6 · a campaign cited after find_recalls returned nothing',
              'ok  control: rule 6 stays quiet when the search found something',
              'ok  every field carries a description',
              'ok  control: a stripped description IS detected',
              'ok  the correct answer trips no coherence rule',
            ]}
          />
          <Why>
            The three marked are the controls. Each one asserts that a check can
            stay quiet when it should, or can fail when it should — a check
            nobody has watched fail is a check taken on faith.
          </Why>
        </section>

        <section>
          <H>And no model has written an answer here yet</H>
          <Key>
            The fixtures are written by hand. This proves the contract works, not
            that the system does.
          </Key>
          <Why>
            Which is the same shape of caveat as the tools' ceiling one stage
            earlier. The part that chooses which tool to call comes next, and
            scoring real answers comes after that.
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
