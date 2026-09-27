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
 * At stage 5 no model had produced an answer. The fixtures are written by hand,
 * so this proves the CONTRACT works, not that the system does. That stays true
 * of stage 5 and is framed as history: stage 6 has since put real answers from
 * gemini-3.5-flash-lite through the contract, and stage 7 scored them.
 *
 * ── CORRECTED 2026-09-27, AGAINST THE CODE AND GIT ────────────────────────
 *
 * - SEVEN FIELDS AND SIX RULES were stage 5's. Stage 6 added an eighth field,
 *   `searches_that_found_nothing`, and rules 7–9, each after reading a real
 *   answer (`safety-answer.ts`, STAGE6.md). The panel shows both, with six
 *   framed as where stage 5 closed.
 * - 13 CHECKS was the count at commit 8d92e28, when stage 5 closed.
 *   `pnpm safety:schema` prints 20 today — rules 7–9 each with a control, and a
 *   REC-005 accepting case. The listing is that output, run on 2026-09-27.
 * - "Its own control fired first" was wrong: in `packages/schema/src/verify.ts`
 *   the description walk reports first and the stripped-description control
 *   runs after it. Reworded to what the control does.
 * - The three code blocks carried line numbers (`:89`, `:216–223`,
 *   `:147–149`) that had drifted to 134, 298 and 220. They are marked as
 *   excerpts without line numbers now, because the file keeps moving.
 * - The second time rule 4 misfired — on "April 27, 2020", in stage 6 — is
 *   added beside the first.
 *
 * Restyled the same day for the `/steps` redesign: the shared trigger,
 * sentence-case labels, 1rem body text, mono only for code and output.
 */
import { useCallback, useState } from 'react';
import { OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import { Code, Data } from '@veresk/surface';
import type { ReactNode } from 'react';
import { HoodButton, HoodSection, HoodText } from './Hood';

/** The first run: the rules were fine and the control was not. */
const FIRST_RUN: readonly { what: string; ok: boolean }[] = [
  { what: 'Rule 1 · no answer and no escalation', ok: true },
  { what: 'Rule 2 · an answer with nothing behind it', ok: true },
  { what: 'Rule 3 · an unresolved conflict, silently decided', ok: true },
  { what: 'Rule 4 · a number that came from nowhere', ok: true },
  { what: 'Rule 5 · concluding that the remedy failed', ok: true },
  { what: 'Rule 6 · a campaign cited after the search found none', ok: true },
  { what: 'Control · a correct answer must be accepted', ok: false },
];

export function ContractModal() {
  const [from, setFrom] = useState<Origin | null>(null);
  const open = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => setFrom(originOf(e.currentTarget)),
    [],
  );

  return (
    <>
      <HoodButton
        blurb="The shape every answer must arrive in, the rules that check it, and the test that failed because it should have passed."
        onClick={open}
      />

      {from && <ContractPanel from={from} onClose={() => setFrom(null)} />}
    </>
  );
}

function ContractPanel({ from, onClose }: { from: Origin; onClose: () => void }) {
  return (
    <OriginDialog
      from={from}
      label="Inside the answer contract"
      tone="var(--color-cal-sky)"
      onClose={onClose}
      header={
        <>
          <p className="text-[1rem] font-semibold text-ui-fg">Inside the answer contract</p>
          <p className="mt-0.5 text-[0.875rem] text-ui-faint">
            Stage 5 · built · 13 checks when it closed, 20 now
          </p>
        </>
      }
    >
      <div className="sticky -top-3.5 z-20 -mx-5 -mt-3.5 mb-7 border-b border-ui-line bg-ui-bg px-5 pt-3.5 pb-4">
        <p className="cal-label pb-2.5" data-tone="quiet">
          The first run: every rule passed, and the control did not
        </p>
        <div className="grid gap-1">
          {FIRST_RUN.map((r) => (
            <div key={r.what} className="flex items-baseline gap-3 text-[0.9375rem]">
              <span
                className={`w-12 shrink-0 font-mono text-[0.875rem] ${
                  r.ok ? 'text-ui-faint' : 'font-semibold text-ui-fg'
                }`}
              >
                {r.ok ? 'ok' : 'FAIL'}
              </span>
              <span className={r.ok ? 'text-ui-dim' : 'font-semibold text-ui-fg'}>{r.what}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pb-2 [&_.snip-frame]:my-1">
        <HoodSection title="What it is, plainly">
          <HoodText>
            Up to this stage the machine could <em>find</em> things. It still
            could not <em>say</em> anything. This is the rules for saying it.
          </HoodText>
          <Key>
            Ask a model a question and you get prose. Prose cannot be checked.
            You cannot tell which sentence came from a document and which one the
            model supplied because it sounded right.
          </Key>
          <HoodText>So the answer comes back as separate boxes instead.</HoodText>
          <Data
            path="What an answer has to arrive as"
            note="Eight boxes"
            mark={[3]}
            lines={[
              'the answer          in plain words',
              'which recalls       it rests on',
              'citations           every claim, tied to the document behind it',
              'counts              every NUMBER, tied to the tool call that produced it',
              'found nothing       every search whose EMPTY result the answer rests on',
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
          <Why>
            Stage 5 closed with seven boxes. The fifth was added in stage 6, when
            a correct answer — no recall covers this vehicle — had no document to
            cite for an absence, and invented a citation that was a sentence
            rather than a document. An absence is evidence too; it just has a
            query behind it instead of a page.
          </Why>
        </HoodSection>

        <HoodSection title="The schema itself">
          <Code
            path="apps/ai/safety/src/schema/safety-answer.ts"
            note="Excerpt · four of the eight fields"
            lang="typescript"
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
            ]}
          />
          <Key>
            Every <code>.describe()</code> string is sent to the model as part of
            the schema. They are the only instruction it gets about what a field
            means — prompt text, not documentation.
          </Key>
          <Why>
            Which is why a check fails when one goes missing. Two had already
            gone missing on the first run, nested a level deeper than the prose
            written for them, and the check found them. It carries its own
            control as well: it strips a description from a copy of the schema
            and must notice the gap — so a check that has quietly gone blind
            cannot report a pass.
          </Why>
        </HoodSection>

        <HoodSection title="The rules, in plain words">
          <Data
            path="What gets rejected when the shape is right and the answer is wrong"
            mark={[3]}
            lines={[
              '1   you cannot say nothing AND not ask for help',
              '2   every fact is either cited, or admitted as unbacked — no third option',
              '3   if two documents disagree and nothing settles it, escalate; never pick',
              '4   every number must come from a tool',
              '5   never say the fix failed',
              '6   if we searched for a recall and found none, do not cite a different one',
              '',
              'added in stage 6, each after reading a real answer:',
              '7   if the answer rests on "none", record the search that found none',
              '8   do not escalate or decline before calling a single tool',
              "9   a number's caption is the tool's own words, not a paraphrase",
            ]}
          />
          <Why>
            Stage 5 closed with six. The first three came from the engagement
            before this one; the next three came from this data. Rule 5 is a
            legal distinction rather than a stylistic one: complaints filed after
            a recall are allegations by members of the public, and the vehicle
            may never have had the repair done.
          </Why>
          <Why>
            The last three were each written after a real answer showed the gap:
            a correct “no recall” that cited a sentence instead of a document
            (7); a run that met the hardest question with no tool calls at all
            and an escalation — safe, and useless (8); and a caption that made 6
            transmission complaints read like the 351 power-train ones (9).
          </Why>
          <Key>
            Rule 4 exists because 1,057 and 103 are both true of this corpus and
            only one of them answers the question. A confident wrong number reads
            exactly like a right one, so the defence cannot be judgement. It has
            to be provenance.
          </Key>
          <Code
            path="apps/ai/safety/src/schema/safety-answer.ts"
            note="Excerpt · rule 4"
            lang="typescript"
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
        </HoodSection>

        <HoodSection title="And then the control case failed">
          <HoodText>
            Every rule-specific test passed. The one that failed was the one
            asserting a{' '}
            <strong className="font-semibold text-ui-fg">correct</strong> answer is
            accepted.
          </HoodText>
          <Data
            path="The failure"
            mark={[1]}
            lines={[
              'FAIL  a correct REC-001 answer',
              '      number(s) [150] appear in the answer but not in counts',
            ]}
          />
          <Key>
            150. From “F-150”. A word boundary treats a hyphen as a break, so the
            scanner found the 150 inside the truck's name and rule 4 demanded to
            know which tool call produced it. <code>10-speed</code> does it too.
            So does <code>Model 3</code>.
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
            path="What the run actually told us"
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
            path="apps/ai/safety/src/schema/safety-answer.ts"
            note="Excerpt · inside countLikeNumbers"
            lang="typescript"
            mark={[1]}
            lines={[
              '    // VEHICLE AND PART DESIGNATORS, which are names that happen to contain digits',
              "    .replace(/\\b[A-Za-z]+-\\d+\\b/g, ' ') // F-150, F-250, DMC-12",
              "    .replace(/\\b\\d+-[A-Za-z]+\\b/g, ' ') // 10-speed",
            ]}
          />
          <Why>
            The accepting fixture now carries <code>10-speed</code> so the same
            thing cannot come back unnoticed.
          </Why>
          <Why>
            It bit a second time in stage 6, on a real answer rather than a
            fixture: “April 27, 2020” yielded 27, and the model{' '}
            <em>obeyed</em> — it filed a count captioned “27 — day of the month
            owners were notified”. That rule did not reject a good answer; it
            pushed one into carrying a nonsense field, which is harder to notice.
            Dates written out in words are stripped now as well.
          </Why>
        </HoodSection>

        <HoodSection title="Why rule 6 is checked apart from the rest">
          <HoodText>
            An answer citing a campaign is perfectly coherent on its own. It is
            only wrong if the tool that looked for covering recalls came back
            empty — which is one of the questions in the answer key exactly.
          </HoodText>
          <Key>
            So it is not a property of the answer. It needs the tool result
            beside it, and folding it in with the others would have meant
            inventing a field for the model to tick.
          </Key>
          <Why>
            And a model that will reach for an unrelated campaign will also tick
            a box saying it did not.
          </Why>
          <Why>
            Rules 7, 8 and 9 joined it for the same reason. Each needs to know
            what the tools actually did — whether a search came back empty, how
            many tools ran, what each count said it had counted — so all four
            are checked against the record of the calls, not against the answer
            alone.
          </Why>
        </HoodSection>

        <HoodSection title="Three ways of being wrong, reported apart">
          <Data
            path="What a rejection says"
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
        </HoodSection>

        <HoodSection title="The checks">
          <Data
            path="pnpm safety:schema"
            note="20 of 20, run 2026-09-27 · 13 of 13 when stage 5 closed (8d92e28)"
            mark={[10, 12, 14, 16, 18]}
            lines={[
              'ok  a correct REC-001 answer',
              'ok  not JSON at all',
              'ok  rule 1 · no answer and no escalation',
              'ok  rule 2 · an answer with nothing behind it',
              'ok  rule 3 · an unresolved conflict, silently decided',
              'ok  rule 4 · a number that came from nowhere',
              'ok  rule 5 · concluding that the remedy failed',
              'ok  rule 2 · an answer resting only on an absence is ACCEPTED',
              'ok  a year is not a count',
              'ok  rule 6 · a campaign cited after find_recalls returned nothing',
              'ok  control: rule 6 stays quiet when the search found something, and when nothing is cited',
              'ok  rule 7 · an absence asserted with no record of the search that established it',
              'ok  control: rule 7 stays quiet when the search IS recorded, and when nothing was empty',
              'ok  rule 8 · escalating or declining without calling a single tool',
              'ok  control: rule 8 stays quiet when tools ran, and when nothing was escalated',
              "ok  rule 9 · a number captioned in the model's words rather than the tool's",
              "ok  control: rule 9 accepts the tool's own wording, and is inert when there is none",
              'ok  every field carries a description',
              'ok  control: a stripped description IS detected',
              'ok  the correct answer trips no coherence rule',
            ]}
          />
          <Why>
            The five marked are the controls by name. Four more do the same job
            without the label — the correct answer, the answer resting on an
            absence, the year that is not a count, and the clean pass at the end.
            Each asserts that a check can stay quiet when it should, or can fail
            when it should. A check nobody has watched fail is a check taken on
            faith.
          </Why>
        </HoodSection>

        <HoodSection title="At this stage, no model had written an answer">
          <Key>
            The fixtures are written by hand. They prove the contract works, not
            that the system does.
          </Key>
          <Why>
            The same shape of caveat as the tools' ceiling one stage earlier. What
            came next: stage 6 put real answers through the contract — from
            Google's gemini-3.5-flash-lite, reached over a hosted
            OpenAI-compatible endpoint — and reading them found most of the
            faults in the checking rather than in the model: rule 4 on written
            dates, a box the schema lacked, and three rules it had not thought
            of.
          </Why>
          <Why>
            Stage 7 then ran all eight questions three times each. 28 of 28
            decided checks — the kind a rule like these can settle — are
            reported beside 0 of 3 judged ones, which have to be read, and the
            two are never added. The judged zero is not a broken judge: every
            control passed.
          </Why>
        </HoodSection>
      </div>
    </OriginDialog>
  );
}

/** The point — restyled on `/steps` by the `cal-key` rule in app.css. */
function Key({ children }: { children: ReactNode }) {
  return <p className="cal-key">{children}</p>;
}

/** A reason, set in the margin — the `cal-why` rule. */
function Why({ children }: { children: ReactNode }) {
  return <p className="cal-why">{children}</p>;
}
