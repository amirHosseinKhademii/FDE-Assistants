/**
 * Stage 5 — the shape an answer has to arrive in.
 *
 * ── THREE STEPS, EACH THE SAME FIVE PARTS ─────────────────────────────────
 *
 * Since the redesign of 2026-09-27 this tab is the kit's fixed shape
 * (`kit.tsx`): a `PhaseHead` saying what exists at the end that did not at the
 * start, then 5.1 the schema, 5.2 the six rules, 5.3 the hand-written answers —
 * each as plain words, why it matters, the code, what we learned, words to
 * know. The seven chapters it replaces told one argument in the order it was
 * discovered, so a reader who came for "what are the rules" had to read about
 * absences first.
 *
 * WHERE THE OLD CHAPTERS WENT. The parse / shape / cohere split is 5.1's,
 * because two of the three are the schema's. The control case is 5.2's lesson,
 * and `ContractModal` is 5.2's dialog because it is anchored on that same run.
 * Everything a model's real answers taught the contract in stage 6 — the date
 * that became a count, the citation that was a sentence, the escalation without
 * looking, the caption sixty times too big, the rule nothing called — is 5.3's
 * dialog, because it is precisely what hand-written answers could not find.
 *
 * ── SIX RULES, THEN NINE, AND THE PAGE SAYS WHICH ─────────────────────────
 *
 * Stage 5 closed with six rules and 13 checks (commit 8d92e28). Stage 6 added
 * seven — rules 7–9 with a control each, and an accepting case for REC-005's
 * absence — so `pnpm safety:schema` now prints 20. Both numbers appear, each
 * with its moment: "nine rules" under a stage-5 heading would credit this stage
 * with what real answers found later, and "six" alone would be a page behind
 * the code. The "when" is written in words in a column, never as a colour —
 * the old list told "new" from "newer" by cal-1 against cal-2, which is ΔE 11.
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
 * very well-checked wrong answer. It is said in the PhaseHead, not only here.
 *
 * ── THE CONTROL CASE IS THE STORY ─────────────────────────────────────────
 *
 * 13 checks passed when the stage closed. On the first run every rule-specific
 * test passed and the CONTROL failed: a word boundary treats a hyphen as a
 * break, so the 150 inside "F-150" read as an undeclared count and rule 4
 * rejected a correct answer.
 *
 * A rule that rejects correct answers gets switched off rather than debugged,
 * and then it is no longer catching what it was built for. That is the argument
 * for controls, and here it is a run rather than an anecdote.
 *
 * ── AND NO MODEL HAD WRITTEN AN ANSWER HERE ───────────────────────────────
 *
 * The fixtures are hand-written, so this proves the CONTRACT works rather than
 * that the system does. Same shape of caveat as 4.5's ceiling. It sits beside
 * every check count on this tab — the PhaseHead's and 5.3's — because a count
 * without it reads as a score.
 *
 * Sources: `docs/safety/STAGE5.md`, `STAGE6.md` §5, and the code itself —
 * `apps/ai/safety/src/schema/safety-answer.ts`, `schema-selftest.ts`.
 */
import { Code, Data } from '@veresk/surface';
import { TITLES, WHEN } from '../../lib/steps';
import { ContractModal } from './ContractModal';
import { Hood, HoodSection, HoodText } from '@veresk/learn/steps';
import { Figure, Note, Numbers, Raw, Step, Table } from '@veresk/learn/steps';
import { PhaseHead } from '@veresk/learn/steps';

const SCHEMA_FILE = 'apps/ai/safety/src/schema/safety-answer.ts';
const SELFTEST_FILE = 'apps/ai/safety/src/schema/schema-selftest.ts';

export function Stage5() {
  return (
    <>
      <PhaseHead
        stage="5"
        title="What an answer is allowed to say"
        what={
          <>
            <p>
              Up to now the machine could <em>find</em> things. It could not yet{' '}
              <em>say</em> anything. At the end of this stage there is a
              written-down shape every answer must arrive in, six rules that catch
              an answer which fits the shape and is still wrong, and a right
              answer, written by hand, that every rule has to let through.
            </p>
            <p>
              Nothing here began until stage 4 showed the tools moved recall@6. A
              contract around answers built from passages nobody could retrieve
              would be a very well-checked wrong answer. It is a separate stage
              from the tools because neither needs the other to be tested: the
              tools are checked against the answer key, the contract against
              answers written by hand. There is no model in this stage at all —
              no prompt, no call.
            </p>
          </>
        }
        result={
          <p>
            <strong>13 checks passed when this stage closed, and 20 of 20 pass
            now</strong> — stage 6 added seven: rules 7, 8 and 9 with a control
            each, and an accepting case for REC-005’s absence.
            Every answer they check was written by a person, so this proves the{' '}
            <em>contract</em> works — not that the system does. No model had
            written an answer yet.
          </p>
        }
      />

      <div className="mt-10 grid gap-8">
        <Step51 />
        <Step52 />
        <Step53 />
      </div>
    </>
  );
}

/* ── 5.1 · THE SCHEMA ───────────────────────────────────────────────────── */

function Step51() {
  return (
    <Step
      n="5.1"
      title={TITLES['5.1']}
      when={WHEN['5.1']}
      plain={
        <>
          <p>
            Ask a model a question and it writes a paragraph. You cannot check a
            paragraph: nothing tells you which sentence came from a document and
            which one the model added because it sounded right.
          </p>
          <p>
            So the answer has to arrive as a filled-in form instead — the answer
            itself, the recalls it rests on, a source for every claim, the tool
            call behind every number, anything said with nothing behind it,
            records that disagree, and whether a person needs to look. A written
            description of a form like that is a <em>schema</em>, and a program
            can check an answer against it before anybody reads it.
          </p>
          <p>
            It is written with Zod, a library for describing the shape data must
            have, as a <code>strictObject</code> — so a box nobody asked for is
            rejected too. The same pattern as the insurance engagement’s.
          </p>
        </>
      }
      why={
        <>
          <p>
            Without separate boxes, three different failures look the same: the
            reply is not JSON at all, or it is JSON with a box missing, or every
            box is filled and the answer contradicts itself. They have different
            causes and different fixes. Lumping them together as “invalid”
            throws away the only information that says what to do next.
          </p>
          <p>
            And nothing is ever quietly repaired. Patching a broken reply hides
            how often replies break, and that rate is what tells you whether the
            schema is too hard, the prompt unclear, or the model wrong for the
            job. A repaired answer is a failure you stopped counting.
          </p>
        </>
      }
      code={
        <>
          <Figure caption="the form every answer fills in" from="excerpt" source={SCHEMA_FILE}>
            <Table
              head={['Box', 'What goes in it']}
              lit={[3]}
              rows={[
                [<code>answer</code>, 'The answer in plain prose — or null, if these records cannot answer it.'],
                [
                  <code>campaigns</code>,
                  'Every recall campaign the answer rests on. Empty when none is relevant — never a loosely related one, to avoid an empty list.',
                ],
                [<code>citations</code>, 'Every factual statement, each tied to the document behind it.'],
                [
                  <code>counts</code>,
                  <>
                    Every number, with the tool call that produced it: a label, the
                    value, which tool, and the exact arguments it was given.
                  </>,
                ],
                [
                  <code>searches_that_found_nothing</code>,
                  'Searches whose empty result the answer rests on. Added in stage 6 — see 5.3.',
                ],
                [<code>unverified_claims</code>, 'Anything stated with no document behind it. Better here than dressed as a citation.'],
                [<code>conflicts</code>, 'Records that disagree, each position named, and what settles it — if anything does.'],
                [<code>escalate</code>, 'Why a person is needed and who should look — or null, when the documents settle it.'],
              ]}
            />
            <Note>
              The insurance engagement has no equivalent for the marked box. A
              number in the answer that does not appear in{' '}
              <code>counts</code> is a number the model made up — and that is
              something a program can check (5.2, rule 4).
            </Note>
          </Figure>

          <Figure caption="four of the eight boxes, as written" from="excerpt" source={SCHEMA_FILE}>
            <Code
              path={SCHEMA_FILE}
              note="four of the eight fields"
              mark={[18, 19]}
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
                '  …',
                '});',
              ]}
            />
            <Note>
              Every box carries a <code>.describe()</code> sentence, and those
              sentences are sent to the model as part of the schema — the only
              instruction it gets about what a box means. They are prompt, not
              documentation, which is why a check fails when one goes missing.
            </Note>
          </Figure>

          <Figure caption="three ways to be wrong, reported apart" from="excerpt" source="packages/schema/src/index.ts">
            <Table
              head={['What went wrong', 'The rejection begins', 'Usually means']}
              rows={[
                ['It is not JSON at all', <code>not valid JSON</code>, 'A refusal written in prose, or a reply cut off'],
                [
                  'It is JSON, and a box is missing or the wrong type',
                  <code>does not match schema</code>,
                  'A schema the model cannot satisfy',
                ],
                [
                  'Every box is right, and the answer contradicts itself',
                  <code>internally inconsistent</code>,
                  'A careless answer from a schema that is working — the six rules in 5.2',
                ],
              ]}
            />
          </Figure>

          <Figure caption="the check on those sentences, and its control" source="pnpm safety:schema">
            <Data
              path="pnpm safety:schema"
              note="the two description checks, of 20"
              mark={[2]}
              lines={[
                'ok    every field carries a description',
                '      all fields described — the prompt survived intact',
                'ok    control: a stripped description IS detected',
                '      removing the description on "answer" made the walk report it — the check can fail',
              ]}
            />
          </Figure>
        </>
      }
      learned={
        <>
          <p>
            On the first run the check found two sentences missing.{' '}
            <code>conflicts[].positions[].source</code> and <code>.says</code> sat
            one level deeper than the prose written for them, so they would have
            reached the model with no description at all — two boxes it would
            have filled in by guessing.
          </p>
          <p>
            The check has its own control: it strips one description on purpose
            and requires the walk to report it. A check nobody has watched fail is
            a check taken on faith.
          </p>
        </>
      }
      terms={['contract', 'schema', 'tool']}
    />
  );
}

/* ── 5.2 · THE SIX RULES ────────────────────────────────────────────────── */

function Step52() {
  return (
    <Step
      n="5.2"
      title={TITLES['5.2']}
      when={WHEN['5.2']}
      plain={
        <>
          <p>
            An answer can fill in every box correctly and still be wrong. It can
            state a number no tool produced. It can find two records that
            disagree and quietly pick one. The schema cannot see either, because
            both are about what the boxes <em>say</em>, not whether they are
            there.
          </p>
          <p>
            So six small rules read the filled-in form and look for
            contradictions. Each is a plain function, and when one fires it says
            in a sentence exactly what is wrong.
          </p>
        </>
      }
      why={
        <>
          <p>
            Three of the six came from the insurance engagement, where they were
            already proven. Three are new, because this data has its own ways to
            be wrong.
          </p>
          <p>
            <strong>Rule 3 is the most important.</strong> An unresolved conflict
            with no escalation means the model silently picked a side between two
            records that disagree — and the reader never learns there was a
            choice.
          </p>
          <p>
            <strong>Rule 5 is a legal distinction, not a stylistic one.</strong>{' '}
            Complaints filed after a recall are allegations by members of the
            public. The vehicle may never have had the repair done; the complaint
            may describe a different fault. “The fix is not holding” states as
            fact something no document here supports. REC-001 checks both halves
            at once: the answer must not say the remedy failed, <em>and</em> it
            must still surface the 103.
          </p>
        </>
      }
      code={
        <>
          <Figure caption="the six rules, and what each one rejects" from="cited" source="docs/safety/STAGE5.md §3 and §6">
            <Table
              head={['Rule', 'Rejects an answer that…', 'Learned from', 'Without it']}
              numeric={[0]}
              lit={[2]}
              rows={[
                ['1', 'gives no answer and does not escalate', 'insurance', 'Silence with nobody named to follow it up'],
                [
                  '2',
                  'has nothing behind it — no citation, nothing declared unverified, no recorded empty search',
                  'insurance',
                  'No way to tell a document from a guess',
                ],
                [
                  '3',
                  'leaves a conflict unresolved and does not escalate',
                  'insurance',
                  'The model silently picks a side between two records that disagree',
                ],
                [
                  '4',
                  <>
                    states a number that is not in <code>counts</code>
                  </>,
                  'this data',
                  'A confident 1,057 answering the wrong question',
                ],
                [
                  '5',
                  'says a remedy failed',
                  'this data — guardrail 5',
                  'Stating as fact something no document supports, about vehicle safety',
                ],
                [
                  '6',
                  <>
                    cites a recall after <code>find_recalls</code> found none
                  </>,
                  'this data — step 4.2',
                  'Reaching for a loosely related recall rather than saying “none”',
                ],
              ]}
            />
            <Note>
              Rule 2 had two ways to be satisfied when this stage closed; a
              recorded empty search became the third in stage 6, when a real
              answer rested on one (5.3).
            </Note>
          </Figure>

          <Figure caption="rule 4, as it runs" from="excerpt" source={SCHEMA_FILE}>
            <Code
              path={SCHEMA_FILE}
              note="coherenceErrors"
              mark={[5, 8]}
              lines={[
                '  // 4 — A NUMBER NOT IN `counts` IS A NUMBER THE MODEL INVENTED.',
                '  //',
                "  //     REC-001's trap is that 1,057 and 103 are both true of the same corpus",
                '  //     and only one answers the question. A confident wrong number is',
                '  //     indistinguishable from a right one, so the defence cannot be judgement;',
                '  //     it has to be provenance.',
                '  if (v.answer) {',
                '    const declared = new Set(v.counts.map((c) => c.value));',
                '    const orphans = countLikeNumbers(v.answer).filter((nn) => !declared.has(nn));',
                '    if (orphans.length) {',
                '      errs.push(',
                "        `number(s) [${orphans.join(', ')}] appear in the answer but not in counts — every number ` +",
                "          'must carry the tool call that produced it',",
                '      );',
                '    }',
                '  }',
              ]}
            />
            <Note>
              Rule 4 cannot tell a true number from a false one. It can tell a
              number that arrived with a tool call behind it from one that did not
              — and since 1,057 and 103 are both true of these records, that is
              the only test that works.
            </Note>
          </Figure>

          <Figure
            caption="the six rule tests and the control, on the first run"
            from="cited"
            source="commit 8d92e28 — the first run, 17 Sep 2026"
          >
            <Table
              head={['Test', 'Result']}
              lit={[6]}
              rows={[
                ['rule 1 · no answer and no escalation', 'passed'],
                ['rule 2 · an answer with nothing behind it', 'passed'],
                ['rule 3 · an unresolved conflict, silently decided', 'passed'],
                ['rule 4 · a number that came from nowhere', 'passed'],
                ['rule 5 · concluding that the remedy failed', 'passed'],
                ['rule 6 · a campaign cited after find_recalls returned nothing', 'passed'],
                [
                  'a correct REC-001 answer — the control',
                  <>
                    <strong>failed</strong> —{' '}
                    <code>number(s) [150] appear in the answer but not in counts</code>
                  </>,
                ],
              ]}
            />
            <Note>
              Two other checks failed in the same run: the not-JSON test expected
              the wrong wording, and two descriptions were missing (5.1). No
              rule-specific test failed.
            </Note>
          </Figure>

          <Figure caption="the fix, and the warning written before it was needed" from="excerpt" source={SCHEMA_FILE}>
            <div className="grid gap-3">
              <Code
                path={`${SCHEMA_FILE} (two excerpts)`}
                note="above countLikeNumbers"
                mark={[3, 4]}
                lines={[
                  '/**',
                  ' * Numbers in the prose that look like COUNTS.',
                  ' *',
                  ' * Deliberately narrow, because a rule that fires on every digit would be turned',
                  ' * off within a week. Excluded, and each exclusion is a real thing that appears',
                  ' * in these answers:',
                ]}
              />
              <Code
                path={SCHEMA_FILE}
                note="inside countLikeNumbers"
                mark={[1]}
                lines={[
                  '    // VEHICLE AND PART DESIGNATORS, which are names that happen to contain digits',
                  "    .replace(/\\b[A-Za-z]+-\\d+\\b/g, ' ') // F-150, F-250, DMC-12",
                  "    .replace(/\\b\\d+-[A-Za-z]+\\b/g, ' ') // 10-speed",
                  "    .replace(/\\bmodel\\s+\\d+\\b/gi, ' ') // Model 3, Model Y is safe already",
                ]}
              />
            </div>
            <Note>
              The warning was in the comment before the rule ever fired on a
              correct answer. The accepting test now carries{' '}
              <code>10-speed</code>, so the same mistake cannot come back
              unnoticed.
            </Note>
          </Figure>

          <Figure caption="and three more, each forced by a real answer in stage 6" from="cited" source={`${SCHEMA_FILE} · evidenceErrors`}>
            <Table
              head={['Rule', 'Rejects an answer that…', 'Forced by']}
              numeric={[0]}
              rows={[
                [
                  '7',
                  'rests on a search finding nothing, and does not record the search',
                  'A “citation” to a recall-database lookup — a sentence, not a document',
                ],
                [
                  '8',
                  'escalates or declines without calling a single tool',
                  'A run that met REC-001 with no tool calls, calling the question underspecified',
                ],
                [
                  '9',
                  'captions a number in its own words rather than the tool’s',
                  'A correct 6, captioned as if it were the 351',
                ],
              ]}
            />
            <Note>
              The stories behind all three are under the hood of{' '}
              <a className="cal-a" href="#step-5.3">
                step 5.3
              </a>
              : they are exactly what hand-written answers could not find.
            </Note>
          </Figure>
        </>
      }
      learned={
        <>
          <p>
            On the first run every rule-specific test passed. The one that failed
            was the control — the test that feeds in a <strong>correct</strong>{' '}
            answer and requires it to get through. Rule 4 had rejected it for an
            undeclared number: 150.
          </p>
          <p>
            From “F-150”. A word boundary treats a hyphen as a break, so the
            number scanner found the 150 inside the truck’s name and demanded to
            know which tool call produced it. <code>10-speed</code> does it too.
            So does <code>Model 3</code>.
          </p>
          <p>
            That matters more than it looks.{' '}
            <strong>
              A rule that rejects correct answers does not get debugged — it gets
              switched off
            </strong>
            , and then it has stopped catching the thing it was built for. The
            rule’s own comment had said so before it happened. Without the
            control, all six rules would have looked healthy while the contract
            turned away correct answers about the very truck the flagship question
            is about.
          </p>
          <p>
            And when this stage closed, five of the six rules could run and one
            was on paper. Rule 6 cannot be decided from the answer alone — citing
            a recall is only wrong if the search came back empty — so it needs
            what the tools returned. Stage 5 tested it; nothing called it until
            the loop was wired in at step 6.3.
          </p>
        </>
      }
      terms={['coherence', 'control', 'campaign', 'tool']}
      hood={<ContractModal />}
    />
  );
}

/* ── 5.3 · THE HAND-WRITTEN ANSWERS ─────────────────────────────────────── */

function Step53() {
  return (
    <Step
      n="5.3"
      title={TITLES['5.3']}
      when={WHEN['5.3']}
      plain={
        <>
          <p>
            To test a checker you need answers to feed it, and no model had
            written one yet. So they were written by hand, from the answer key:
            one right answer to REC-001, the flagship question, and wrong versions
            of it, each broken in exactly one place.
          </p>
          <p>
            Each rule must reject the wrong answer made for it. Every rule must
            let the right one through.
          </p>
        </>
      }
      why={
        <>
          <p>
            A rule that rejects everything passes every test that only feeds it
            bad answers. The right answer — the <em>control</em> — is the test
            that catches that, and it is not padding: the insurance engagement
            has a control case because a fix that made its system escalate on
            everything turned one question green and another red.
          </p>
          <p>
            And because each wrong answer is the right one with a single thing
            changed, a rejection can only be about that one change.
          </p>
        </>
      }
      code={
        <>
          <Figure caption="one right answer, and wrong ones made from it" from="excerpt" source={SELFTEST_FILE}>
            <Code
              path={SELFTEST_FILE}
              note="the first three of nine cases"
              mark={[0, 7, 18]}
              lines={[
                'const clone = (patch: Partial<SafetyAnswer>): SafetyAnswer => ({ ...structuredClone(GOOD), ...patch });',
                '',
                'const CASES: ValidatorCase[] = [',
                '  {',
                "    name: 'a correct REC-001 answer',",
                "    expect: 'accept',",
                '    body: GOOD,',
                "    why: 'THE CONTROL. Without it, every rule below could be satisfied by rejecting everything.',",
                '  },',
                '  {',
                "    name: 'not JSON at all',",
                "    expect: 'not valid JSON',",
                "    body: 'I am unable to answer that question.',",
                "    why: 'a model refusing in prose must be caught and retried, not crash the caller',",
                '  },',
                '  {',
                "    name: 'rule 1 · no answer and no escalation',",
                "    expect: 'escalate is null',",
                '    body: clone({ answer: null, escalate: null }),',
                "    why: 'silence with no owner is the one outcome that helps nobody',",
                '  },',
              ]}
            />
            <Note>
              <code>clone</code> copies the right answer and changes what it is
              given. Rule 1’s wrong answer is the right answer with{' '}
              <code>answer</code> and <code>escalate</code> both emptied, and
              nothing else different.
            </Note>
          </Figure>

          <Figure caption="every check, as it runs now" source="pnpm safety:schema · 27 Sep 2026">
            <Data
              path="pnpm safety:schema"
              note="20 of 20 · the reason under each line left out"
              mark={[0, 7, 8, 11, 13, 15, 17, 19, 20]}
              lines={[
                'ok    a correct REC-001 answer',
                'ok    not JSON at all',
                'ok    rule 1 · no answer and no escalation',
                'ok    rule 2 · an answer with nothing behind it',
                'ok    rule 3 · an unresolved conflict, silently decided',
                'ok    rule 4 · a number that came from nowhere',
                'ok    rule 5 · concluding that the remedy failed',
                'ok    rule 2 · an answer resting only on an absence is ACCEPTED',
                'ok    a year is not a count',
                'schema contract: 9/9 passed',
                'ok    rule 6 · a campaign cited after find_recalls returned nothing',
                'ok    control: rule 6 stays quiet when the search found something, and when nothing is cited',
                'ok    rule 7 · an absence asserted with no record of the search that established it',
                'ok    control: rule 7 stays quiet when the search IS recorded, and when nothing was empty',
                'ok    rule 8 · escalating or declining without calling a single tool',
                'ok    control: rule 8 stays quiet when tools ran, and when nothing was escalated',
                "ok    rule 9 · a number captioned in the model's words rather than the tool's",
                "ok    control: rule 9 accepts the tool's own wording, and is inert when there is none",
                'ok    every field carries a description',
                'ok    control: a stripped description IS detected',
                'ok    the correct answer trips no coherence rule',
              ]}
            />
            <Note>
              The nine marked lines go the other way: a right answer that must get
              through, or — second from last — proof that a check can fail. Ten
              lines reject a wrong answer, and one confirms every box is
              described.
            </Note>
          </Figure>

          <Figure
            caption="what those checks rest on"
            source="the 13 is quoted from commit 8d92e28; the 20 from pnpm safety:schema, 27 Sep 2026; the rest read from schema-selftest.ts"
          >
            <Numbers
              items={[
                { value: '13', label: 'checks when stage 5 closed, in both directions' },
                {
                  value: '20',
                  label: 'checks now — stage 6 added rules 7, 8 and 9 with a control each, and an accepting case for REC-005',
                },
                {
                  value: '1 of 8',
                  label: 'questions with a right answer written for them at stage 5: REC-001. REC-005’s came in stage 6',
                },
                { value: '0', label: 'answers written by a model, anywhere in this stage' },
              ]}
            />
          </Figure>
        </>
      }
      learned={
        <>
          <p>
            The plan said one hand-written answer per question, good and bad.
            What was checked in is one right answer, to REC-001, and wrong
            versions of it — 1 of the 8 questions when this stage closed.
            REC-005’s answer, which rests on a search finding nothing, was added
            in stage 6, when a real answer showed the contract had nowhere to put
            it.
          </p>
          <p>
            And “right” means right by the contract, not by the answer key. The
            hand-written REC-001 answer gives 89 where the key has 103 (still
            marked unverified there), and it raises no conflict, which the key
            asks for. The contract checks that an answer hangs together; grading
            what it says against the key is stage 7’s job.
          </p>
          <p>
            <strong>No model had written an answer yet.</strong> This proves the{' '}
            <em>contract</em> works, not that the system does — the same shape of
            caveat as step 4.5’s ceiling. Stage 6 is where a model first writes
            one, and what that taught the contract is under the hood.
          </p>
        </>
      }
      terms={['answerKey', 'control', 'ceiling', 'contract']}
      hood={
        <Hood
          blurb="What a model’s real answers taught the contract in stage 6 — three more rules, one more box, and a rule nothing had been calling"
          title="When a model wrote real answers"
          sub="Step 5.3 · everything here was found by reading a real answer, not by a test"
        >
          <RealAnswersHood />
        </Hood>
      }
    />
  );
}

/**
 * The dialog on 5.3: the findings the hand-written answers could not produce.
 *
 * EACH ONE CAME FROM READING A REAL ANSWER IN STAGE 6, not from a test —
 * STAGE6.md §5 says so of all nine faults that stage found. They live on stage
 * 5's tab because they changed stage 5's contract, and in 5.3's dialog because
 * they are the limit of what hand-written fixtures could ever show.
 */
function RealAnswersHood() {
  return (
    <>
      <HoodSection title="Rule 6 was on paper until the loop called it">
        <HoodText>
          Five of stage 5’s six rules can be decided by reading the answer. Rule 6
          cannot: an answer citing a recall is perfectly sensible on its own, and
          only wrong if <code>find_recalls</code> came back empty. So it needs to
          see what the tools returned — and until step 6.3 nothing gave it that.
          It was tested against hand-written answers and never called on a real
          one. A rule that has never run is a rule you hope works.
        </HoodText>
        <HoodText>
          The alternative was a box for the model to tick, saying it had not
          reached for an unrelated recall — and a model that will reach for one
          will also tick the box. So each tool is wrapped to record what it
          returned, and the validator reads that record.
        </HoodText>
        <Figure caption="the validator the loop is given" from="excerpt" source="apps/ai/safety/src/agent/answer.ts">
          <Code
            path="apps/ai/safety/src/agent/answer.ts"
            note="validatorFor"
            mark={[5]}
            lines={[
              'export function validatorFor(calls: CallRecord[]) {',
              '  return (raw: string): ValidationResult<SafetyAnswer> => {',
              '    const base = validateSafetyAnswer(raw);',
              '    if (!base.ok || !base.value) return base;',
              '',
              '    const errs = evidenceErrors(base.value, evidenceFrom(calls));',
              "    if (errs.length) return { ok: false, errors: `internally inconsistent: ${errs.join('; ')}` };",
              '',
              '    return base;',
              '  };',
              '}',
            ]}
          />
        </Figure>
        <HoodText>
          Four of today’s nine rules — 6, 7, 8 and 9 — need that record. All
          nine run on every answer.
        </HoodText>
      </HoodSection>

      <HoodSection title="It could prove an absence and had nowhere to write it down">
        <HoodText>
          REC-005’s right answer is “there is no recall for this”. A tool was
          built to prove it. The contract had no box for the proof — and rule 2
          insisted every claim be cited or declared unverified.
        </HoodText>
        <Figure caption="so a real answer cited this" from="cited" source={`${SCHEMA_FILE}, the comment on EmptySearch`}>
          <Data
            path="citations[].source · a real REC-005 answer"
            mark={[0]}
            lines={['"NHTSA recall database lookup for make HONDA, model ODYSSEY…"']}
          />
        </Figure>
        <HoodText>
          That is a sentence, not a document. Nothing existed to cite, so the
          model composed something shaped like a citation. The fault was ours: we
          could establish an absence and could not express one. There is now a
          box for it, <code>searches_that_found_nothing</code> — the search, and
          what its emptiness settles. Rule 2 accepts it as support, and rule 7
          insists on it whenever the answer leans on an absence.
        </HoodText>
        <Figure caption="two rules, opposite directions" from="cited" source={`${SCHEMA_FILE} · evidenceErrors`}>
          <Table
            head={['Rule', 'Stops the model…']}
            numeric={[0]}
            rows={[
              ['6', 'citing a recall it should not'],
              ['7', 'claiming nothing exists without saying how it looked'],
            ]}
          />
        </Figure>
        <HoodText>
          An absence proved by a search can be checked by running the search
          again. An absence inferred from reading a list is a judgement wearing a
          fact’s clothes. Both produce the same sentence.
        </HoodText>
      </HoodSection>

      <HoodSection title="Rule 4 misfired a second time, and did worse than fail">
        <Figure caption="what a model filed when the rule leaned on it" from="cited" source={`${SCHEMA_FILE}, the comment on countLikeNumbers`}>
          <Raw>
            {`the answer said   "owners were notified on April 27, 2020"
the rule saw      27
so the model      filed a count reading "27 — Day of the month
                  owners were notified"`}
          </Raw>
        </Figure>
        <HoodText>
          ISO dates were being stripped and written ones were not. The first
          time, the rule rejected a correct answer — loudly, and somebody looked.
          This time it <em>accepted</em> one and quietly deformed it: the model
          obeyed a rule that was wrong and wrote nonsense to satisfy it.
        </HoodText>
        <HoodText>
          A rule that rejects a good answer gets found in an afternoon. A rule
          that bends a good answer into a worse one can sit there indefinitely,
          because everything still passes.
        </HoodText>
      </HoodSection>

      <HoodSection title="Safe, and useless">
        <HoodText>
          Asked the flagship question, one run called no tools at all and
          escalated, on the grounds that the question was underspecified. Every
          rule written until then pushes against saying too much: cite your
          sources, name the tool behind every number, never conclude a repair
          failed. A model that answers nothing satisfies all of them perfectly.
        </HoodText>
        <HoodText>
          On this data the person asking has vehicles that may or may not have an
          open recall, so “please be more specific” is not a neutral outcome.
          Rule 8: you cannot know the records do not answer a question until you
          have asked them something. Its control makes sure escalating{' '}
          <em>after</em> looking is still allowed.
        </HoodText>
      </HoodSection>

      <HoodSection title="The right number, with a caption that belonged to another">
        <HoodText>
          Another run reported a number that was right, from a tool, with its
          filter recorded — and described it as something nearly sixty times
          larger.
        </HoodText>
        <Figure caption="the number was 6; the caption belonged to 351" from="cited" source={`${SCHEMA_FILE}, rule 9’s comment`}>
          <Raw>
            {`counted     complaints in POWER TRAIN:AUTOMATIC TRANSMISSION, after the recall
reported    6
captioned   "F-150 power-train complaints after the recall"
but         the whole power-train figure is 351`}
          </Raw>
        </Figure>
        <HoodText>
          Rule 4 passed — the number did come from a tool. Rule 4 has no opinion
          about the sentence beside it. So the tools now write their own
          captions, built from the filter they ran, and the model must copy them
          word for word: rule 9. The stage 6 plan had left open whether to make
          the model restate its own arguments or have the code attach them. A
          model asked to restate them rewords them, and that is now measured
          rather than assumed.
        </HoodText>
        <Figure caption="four ways a number can be wrong" from="worked">
          <Table
            head={['The question', 'Guarded?']}
            lit={[2, 3]}
            rows={[
              ['Did it come from anywhere?', 'Yes — rule 4'],
              ['Does its caption say what it counted?', 'Yes — rule 9'],
              ['Is the filter the one you meant?', 'No'],
              ['Is that the question you asked?', 'No'],
            ]}
          />
        </Figure>
        <HoodText>
          Where a number came from is not one property. Every link between a tool
          running and a person reading a sentence is a place the chain can break.
        </HoodText>
      </HoodSection>

      <HoodSection title="Twenty checks, and still not a score">
        <HoodText>
          All nine rules run on every answer now, and 20 checks pass. What that
          proves is that the rules work. A model still has to be asked all eight
          questions, more than once each, before any of this is a score — that is
          stage 7.
        </HoodText>
      </HoodSection>
    </>
  );
}
