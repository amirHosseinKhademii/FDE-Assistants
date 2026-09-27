/**
 * Stage 7 — the same eight questions, three times each, scored twice.
 *
 * ── THE LAYOUT, SINCE THE REDESIGN OF 2026-09-27 ──────────────────────────
 *
 * A `PhaseHead`, then the four steps of `docs/safety/STAGE7.md` §6 in the fixed
 * five-part shape `kit.tsx` describes: 7.1 the mechanical checks, 7.2 repeats
 * and flakiness, 7.3 the baseline on disk, 7.4 the number with its denominator.
 * Everything that would crowd a card — the four fixes one at a time, the judge
 * and the control that caught it, the disagreement the files cannot settle —
 * is in ONE "under the hood" panel on 7.4, because 7.4 is where both numbers
 * are stated and the panel is how each of them got there.
 *
 * ── TWO NUMBERS, AND THEY SHARE ONE `Numbers` ─────────────────────────────
 *
 *     decided   28 of 28    a mechanism behind every check
 *     judged     0 of 3     has to be read, every control passing
 *
 * 28 of 28 is the most quotable figure this engagement has produced and the
 * least honest one on its own. They are NEVER ADDED and never separated: one is
 * decided by a contract rule or a tool result, the other by reading. So they
 * are one `Numbers` call, not two, and the PhaseHead states them in one
 * sentence. A page showing the first without the second is advertising.
 *
 * THEY DO NOT EVEN SHARE A DENOMINATOR. 28 of 28 is 8 questions × 3 runs; 0 of
 * 3 is three properties judged ONCE each, and it has no file on disk — only
 * STAGE7.md §7c records it. So every figure carrying the 0 of 3, the pair
 * included, is badged "From the docs" (§7a states both together); the 28 of 28
 * earns "Real output" on its own in 7.3's table, read out of the baselines.
 *
 * THE JUDGED ZERO IS NOT A BROKEN JUDGE. Each rubric required it to ACCEPT a
 * known-good answer and all three did, so it discriminates — it does not think
 * these answers qualify.
 *
 * ── AND THAT IS THE FINDING ───────────────────────────────────────────────
 *
 * Every mechanical check has a MECHANISM behind it. Nothing in this system makes
 * an answer explain itself; that was left to the prompt, and a prompt is read
 * once at the start. What a tool result says at the moment of use, the system
 * does. What a prompt asks for in general, it does when it happens to.
 *
 * A perfect mechanical score sharpens that rather than erasing it.
 *
 * ── NOT ONE OF THE FOUR FIXES WAS A PROMPT EDIT ───────────────────────────
 *
 * A fact moved into a tool result. A filter taught the name a person says. A
 * count that reports when its own narrowing did nothing. A count that says it is
 * not yet a quotation. `agent/prompt.ts` is byte-for-byte what it was when the
 * first baseline was taken (`git diff 143bcce HEAD`). The fixes are still
 * instructions — "ESCALATE", "call search_complaints" — the finding is WHERE
 * they sit. The one PROMPT edited in this stage is the judge's, and the panel
 * says so: it moved the judged score, which is exactly why the controls matter.
 *
 * ── AND IT IS STILL NOT STAGE 6'S NUMBER ──────────────────────────────────
 *
 * That one is recall@6 — did the right DOCUMENTS come back. A system can
 * retrieve the wrong documents and still satisfy every check about what it said,
 * because most of these checks are about honesty rather than coverage. REC-005
 * is the proof on this corpus: 0.00 recall on every run, every answer check 3 of
 * 3 in all four baselines.
 *
 * ── WHAT THE REDESIGN CORRECTED, CHECKED AGAINST THE FILES ────────────────
 *
 *   - The "after" narrowing phrase the old page quoted appears in no file. It is
 *     replaced by phrases the fourth baseline actually recorded.
 *   - Third-baseline times were ~60s and "—"; the file says 53s and 43s. Times
 *     are now shown run by run, because a mean can be a figure no run produced.
 *   - The one "broken" in baseline 2 is a RUN, not a check: REC-008's three
 *     checks were scored over two runs and counted clean.
 *   - REC-003's fix moved three checks, not "the campaign and three more".
 *   - The old judged list named REC-007's property twice and REC-001's not at
 *     all; `eval/editorial.ts` is the list.
 *   - Baseline 4 is "after fixes three AND four", plus two more changes to the
 *     same tool — so it cannot say which change moved REC-007.
 */
import { Code, Data } from '@veresk/surface';
import { BeforeAfter, Figure, Note, Numbers, Step, Table } from './kit';
import { PhaseHead } from './Tabs';
import { Hood, HoodSection, HoodText } from './Hood';
import { TITLES, WHEN } from '../../lib/steps';

export function Stage7() {
  return (
    <>
      <PhaseHead
        stage="7"
        title="Asking the same eight questions, over and over"
        what={
          <>
            <p>
              Up to here, every result on this page came from <strong>one run</strong>. One
              run of a language model is a smoke test, not a score: in stage 6 the same
              question escalated once and not the next time, and was answered in 3.9 seconds
              once and 131.3 seconds another time. A check that passed once has not
              passed — it passed once.
            </p>
            <p>
              At the end of this stage there is a scorecard. Each of the eight questions from
              the answer key is asked three times. Every answer is checked by code. A run
              that the quota broke is kept apart from a wrong answer. And every full run is
              saved to disk with the model and settings that produced it, so the next
              change can be measured instead of believed.
            </p>
          </>
        }
        result={
          <p>
            <strong>28 of 28</strong> checks that code can decide pass on every run — 8
            questions, 3 runs each, on <code>gemini-3.5-flash-lite</code>. Beside it, and
            never added to it: <strong>0 of 3</strong> checks that have to be read. Every
            control passed, so that is not a broken judge; it accepts a known-good answer,
            and it does not think these answers qualify. The zero is one run per check, by a
            judge that is the same model, so it is provisional until repeated. Neither
            number is stage 6’s recall@6: these grade what the answer says, not which
            documents came back.
          </p>
        }
      />

      <div className="mt-10 grid gap-8">
        <Step71 />
        <Step72 />
        <Step73 />
        <Step74 />
      </div>
    </>
  );
}

/* ── 7.1 ─────────────────────────────────────────────────────────────────── */

function Step71() {
  return (
    <Step
      n="7.1"
      title={TITLES['7.1']}
      when={WHEN['7.1']}
      plain={
        <>
          <p>
            An eval is an automated test for answers. We take the eight questions from the
            answer key — whose right answers a person worked out by hand, before any code
            existed — and ask the system each one.
          </p>
          <p>
            Then code checks each answer against 28 things it can decide without reading
            the prose: which tools were called, whether it escalated to a person, which
            recall campaigns it cited, whether every number came from a tool. A run that
            never produced an answer — the quota ran out, the network failed, or the answer
            contract rejected every attempt — goes in its own bucket, <em>broken</em>. It is
            never counted as wrong.
          </p>
        </>
      }
      why={
        <>
          <p>
            Without it, “the system works” means “it worked the one time somebody watched”.
          </p>
          <p>
            And without the broken bucket, a failure of the plumbing is scored as a failure
            of judgement — or worse, as a success. An unpaced run elsewhere in this repo once
            reported <strong>zero wrong answers</strong> because three of its questions never
            ran.
            Stage 6’s own quota detector shipped blind and printed PASS over a real one. A
            hole in a run is not a result, and this step’s first job is to notice holes.
          </p>
        </>
      }
      code={
        <>
          <Figure
            caption="Four of the 28 checks — the ones for the first question"
            from="excerpt"
            source="apps/ai/safety/src/eval/cases.ts"
          >
            <Code
              path="apps/ai/safety/src/eval/cases.ts"
              mark={[7, 12, 18]}
              lines={[
                '  {',
                "    id: 'REC-001',",
                '    question:',
                "      'We run 2020 F-150s. Is the transmission park problem a known defect, and is the fix holding?',",
                '    checks: [',
                '      {',
                "        name: 'cites campaign 20V197000',",
                "        holds: (r) => !!r.answer?.campaigns.includes('20V197000'),",
                "        why: 'the recall that covers the defect; an answer resting on another campaign is wrong',",
                '      },',
                '      {',
                "        name: 'every number carries the tool that produced it',",
                '        holds: (r) => !!r.answer && r.answer.counts.every((c) => !!c.from),',
                "        why: 'REC-001 is the case where a confident wrong number reads exactly like a right one',",
                '      },',
                "      // … 'does not claim the remedy failed'",
                '      {',
                "        name: 'escalates',",
                '        holds: (r) => !!r.answer?.escalate,',
                "        why: 'whether a repair was actually carried out is recorded nowhere in this corpus',",
                '      },',
                '    ],',
                '  },',
              ]}
            />
            <Note>
              Each <code>holds</code> reads a field of the answer or the record of tool calls
              — never the prose. The <code>why</code> is the answer key’s reason, printed
              beside every failure so the person reading the report knows what it cost.
            </Note>
          </Figure>

          <Figure
            caption="Two kinds of check, and only the first is scored here"
            from="cited"
            source="docs/safety/STAGE7.md §3"
          >
            <Table
              head={['Kind', 'Decided by', 'From the answer key']}
              rows={[
                [
                  'Mechanical',
                  'the run itself — no reading',
                  <>
                    REC-002 must not call <code>search_complaints</code>; REC-006 must
                    escalate and REC-003 must not; REC-005 must cite no campaign
                  </>,
                ],
                [
                  'Editorial',
                  'reading the prose',
                  'REC-007: does it say why the two numbers differ; REC-004: does it decline to name a cause',
                ],
              ]}
            />
            <Note>
              A regular expression for “did it explain the distinction” measures the regular
              expression. So the editorial kind is graded separately, by a judge, and scored
              separately — step 7.4.
            </Note>
          </Figure>

          <Figure
            caption="A broken run is its own bucket — and the runner proves it can see one first"
            from="excerpt"
            source="apps/ai/safety/src/cli/eval.ts"
          >
            <Code
              path="apps/ai/safety/src/cli/eval.ts · once()"
              mark={[4]}
              lines={[
                '    if (!result.structured) {',
                '      // A REJECTED ANSWER IS BROKEN, NOT WRONG. The contract never accepted it,',
                '      // so there is no judgement to score — only a system that could not',
                '      // produce a valid answer, which is a different problem with a different fix.',
                "      return { run: null, broken: `rejected: ${result.schemaErrors.at(-1) ?? 'unknown'}`, ms: Date.now() - started };",
                '    }',
              ]}
            />
            <Code
              path="apps/ai/safety/src/cli/eval.ts · main()"
              mark={[0]}
              lines={[
                "  if (!isRateLimit(RECORDED_429) || isRateLimit(new Error('an ordinary failure'))) {",
                '    console.log(`\\n  ${RED}refusing to run${OFF}: the quota detector is not working in both directions.\\n`);',
                '    return 1;',
                '  }',
              ]}
            />
            <Note>
              Before a single question is asked, the detector is shown a recorded quota
              error and an ordinary one. If it cannot tell them apart in both directions, the
              run refuses to start.
            </Note>
          </Figure>
        </>
      }
      learned={
        <>
          <p>
            The plan said a package in this repo, <code>@fde/evals</code>, already had a way
            to grade the editorial checks. <strong>It does not.</strong> Its{' '}
            <code>verifyClassifier</code> checks that every check name maps to a severity
            bucket, and its agreement score is word overlap. Neither reads prose for
            meaning, and there was no model-based judge anywhere in the repo.
          </p>
          <p>
            The claim survived two handoffs before anybody opened the file. So the three
            checks that need reading got new code, <code>pnpm safety:judge</code>, and a
            score of their own that is never added to this one.
          </p>
        </>
      }
      terms={['eval', 'answerKey', 'contract', 'tool']}
    />
  );
}

/* ── 7.2 ─────────────────────────────────────────────────────────────────── */

function Step72() {
  return (
    <Step
      n="7.2"
      title={TITLES['7.2']}
      when={WHEN['7.2']}
      plain={
        <>
          <p>
            A language model does not give the same answer twice, even to the same question
            with the same instructions. So each question is asked <strong>three times</strong>,
            and each check gets one of three names. <strong>Clean</strong>: it passed every
            run. <strong>Failed</strong>: it passed none. <strong>Flaky</strong>: it passed
            some.
          </p>
          <p>
            Flaky is not a softer kind of pass. It is the honest name for a check whose
            result depends on the run — and on a system that is not deterministic, it is the
            most common thing you find.
          </p>
        </>
      }
      why={
        <>
          <p>
            One run cannot tell “never” from “sometimes”, and the two need different fixes.
            Across stage 6 the same question escalated without calling a single tool once,
            and called six tools without escalating four times. Every one of those runs
            looked correct. None of them is a number.
          </p>
          <p>
            The rule for what to do was written down before the number existed. If
            REC-001’s escalation fails <strong>3 of 3</strong>, the instruction does not
            work: change the mechanism, not the wording. If it fails <strong>1 of 3</strong>,
            that is variance, and the prompt is roughly right.
          </p>
          <p>
            Three runs is a floor, not a standard. The insurance engagement uses five. The
            reason here is a free tier — 15 requests a minute, 500 a day — not a method, and
            the runner prints that on every run.
          </p>
        </>
      }
      code={
        <>
          <Figure
            caption="Per check, not per run — and three names, not two"
            from="excerpt"
            source="apps/ai/safety/src/cli/eval.ts"
          >
            <Code
              path="apps/ai/safety/src/cli/eval.ts"
              mark={[2, 8]}
              lines={[
                '    // PER CHECK, not per run: a case is only as good as its weakest check, and',
                '    // "which check" is the actionable part.',
                '    const usable = perRun.filter((r) => !r.broken);',
                '    const rate = (name: string) => usable.filter((r) => r.passed.includes(name)).length;',
                '',
                '    const lines = c.checks.map((ck) => {',
                '      const n = rate(ck.name);',
                '      const all = usable.length;',
                '      const mark = all === 0 ? `${DIM}—   ${OFF}` : n === all ? `${GREEN}ok  ${OFF}` : n === 0 ? `${RED}FAIL${OFF}` : `${YEL}FLAKY${OFF}`;',
              ]}
            />
            <Note>
              A broken run is dropped from <code>usable</code> before anything is counted, so
              the quota can shrink a denominator but never lower a rate.
            </Note>
          </Figure>

          <Figure
            caption="The first baseline: every check that did not pass all three times"
            source="docs/safety/evals/baseline-2026-09-17-before-tool-note.json"
          >
            <Table
              head={['Question', 'Check', 'Passed', 'Called']}
              numeric={[2]}
              lit={[0]}
              rows={[
                ['REC-001', 'escalates', '0 of 3', 'failed'],
                ['REC-003', 'cites campaign 19V864000', '1 of 3', 'flaky'],
                ['REC-003', 'says it was NOT volunteered', '1 of 3', 'flaky'],
                ['REC-003', 'does not escalate', '1 of 3', 'flaky'],
                ['REC-004', 'reports 5', '2 of 3', 'flaky'],
                ['REC-004', 'the 5 came from a tool', '2 of 3', 'flaky'],
                ['REC-004', 'cites at least one complaint by ODI number', '2 of 3', 'flaky'],
                ['REC-007', 'reports more than one number', '1 of 3', 'flaky'],
                ['the other 20', '', '3 of 3', 'clean'],
              ]}
            />
            <Note>
              8 questions, 3 runs each, on <code>gemini-3.5-flash-lite</code>: 20 clean, 7
              flaky, 1 failed. The one failure was the question stage 6 could not settle.
            </Note>
          </Figure>

          <Figure
            caption="The same fact in two places, and only one of them worked"
            from="excerpt"
            source="apps/ai/safety/src/agent/prompt.ts · apps/ai/safety/src/tools/count-complaints.tool.ts"
          >
            <BeforeAfter
              beforeLabel="Only in the prompt, read once at the start — escalated 0 of 3"
              afterLabel="Also in the tool result, read when the count is used — 3 of 3"
              before={
                <Code
                  path="apps/ai/safety/src/agent/prompt.ts"
                  lines={[
                    '- Escalates when the question needs something this corpus does not hold — whether a repair was actually carried out on a given vehicle, for instance, is not recorded anywhere in it.',
                  ]}
                />
              }
              after={
                <Code
                  path="apps/ai/safety/src/tools/count-complaints.tool.ts"
                  lines={[
                    '    const afterRecall = filter.filed_after',
                    "      ? ' NOTE: this corpus records complaints and campaigns, NOT repair completions. ' +",
                    "        'A complaint filed after a recall does not establish that the vehicle had the remedy ' +",
                    "        'applied, so this count cannot show whether a fix is working. If the question asks ' +",
                    "        'whether a fix is holding, say what was filed and ESCALATE the effectiveness question.'",
                    "      : '';",
                  ]}
                />
              }
            />
          </Figure>
        </>
      }
      learned={
        <>
          <p>
            The first thing three runs settled was REC-001: <strong>0 of 3</strong> — a
            failure, not a wobble. The prompt already said, almost word for word, that
            whether a repair was carried out is recorded nowhere. Across seven runs, four in
            stage 6 and three here, the model escalated zero times.
          </p>
          <p>
            So by the rule written in advance, the wording was left alone and the fact was
            moved: into what <code>count_complaints</code> and{' '}
            <code>complaints_citing</code> return, which the model reads at the moment it is
            using the number. The next baseline: <strong>3 of 3</strong>. A prompt is read
            once, at the start. A tool result is read when the inference is being made.
          </p>
        </>
      }
      terms={['flaky', 'eval', 'hostedModel', 'tool']}
    />
  );
}

/* ── 7.3 ─────────────────────────────────────────────────────────────────── */

function Step73() {
  return (
    <Step
      n="7.3"
      title={TITLES['7.3']}
      when={WHEN['7.3']}
      plain={
        <>
          <p>
            Every full run is saved as a file — a <em>baseline</em> — together with what
            produced it: the model, the engine, the number of repeats, the pacing, the time,
            and whether it finished. The next run is read against the last one.
          </p>
          <p>
            The fourth baseline is also the first to record what the model <em>did</em>:
            every tool it called, with its arguments, and every number it filed. So a
            question about a run can be answered from the file instead of by spending the
            quota to ask again.
          </p>
        </>
      }
      why={
        <>
          <p>
            Two runs made on different models, or with a different number of repeats,
            measure the change of setup, not the change of code. The model name has to be in
            the file, too: Google retires product names, and “the model” means nothing a
            month later.
          </p>
          <p>
            A run that stopped at the daily quota has rates over whatever happened to finish
            — a denominator nobody chose — so it has to be marked, and not compared.
            (This engagement has no diff command yet. The insurance one refuses such a
            comparison automatically; here the file carries the fields a refusal would be
            made on, and a person reads them.)
          </p>
        </>
      }
      code={
        <>
          <Figure
            caption="The top of the fourth baseline, as written"
            source="pnpm safety:eval · 18 Sep 2026"
          >
            <Data
              path="docs/safety/evals/baseline-2026-09-18-10-06.json"
              note="the first 15 lines"
              lang="json"
              mark={[1, 3, 6]}
              lines={[
                '{',
                '  "model": "gemini-3.5-flash-lite",',
                '  "engine": "mastra",',
                '  "repeat": 3,',
                '  "turnPaceMs": 4500,',
                '  "recordedAt": "2026-09-18T10:06:23.070Z",',
                '  "complete": true,',
                '  "stoppedAtDailyCap": false,',
                '  "summary": {',
                '    "clean": 28,',
                '    "flaky": 0,',
                '    "failed": 0,',
                '    "broken": 0,',
                '    "totalChecks": 28',
                '  },',
              ]}
            />
          </Figure>

          <Figure
            caption="Four baselines, 28 checks each — 8 questions, 3 runs, gemini-3.5-flash-lite"
            source="docs/safety/evals/ · the summary of each file"
          >
            <Table
              head={['Baseline', 'Taken', 'What had changed', 'Clean', 'Flaky', 'Failed', 'Runs lost']}
              numeric={[3, 4, 5, 6]}
              lit={[3]}
              rows={[
                ['1', '17 Sep', 'nothing yet', '20', '7', '1', '0 of 24'],
                ['2', '17 Sep', 'fix 1 — the completions note, in the tool results', '23', '5', '0', '1 of 24'],
                ['3', '18 Sep', 'fix 2 — model names matched the way people say them', '26', '1', '1', '0 of 24'],
                ['4', '18 Sep', 'fixes 3 and 4 — plus two more changes to the same tool', '28', '0', '0', '0 of 24'],
              ]}
            />
            <Note>
              Twenty to twenty-eight in under fifteen hours. Clean, flaky and failed count
              checks, out of 28. The last column counts <em>runs</em>, out of 24: a run lost
              to the quota is left out of every rate rather than scored. In baseline 2 that
              was REC-008’s third run, so its three checks were scored over the two runs that
              finished — 2 of 2 — and count as clean. Absent is not wrong, and it is not
              right either.
            </Note>
            <Note>
              Two more baseline files sit in the same folder and are not rows here.{' '}
              <code>baseline-2026-09-18-07-06.json</code> lost 23 of its 24 runs to the daily
              quota; its summary still reads 3 clean and 0 failed, and it predates the{' '}
              <code>complete</code> flag every later file carries.{' '}
              <code>baseline-2026-09-18-10-20.json</code> is a single run taken after the
              fourth: 27 of 28, with REC-007 escalating when it should not. One run cannot say
              whether that is flaky or failed, and a different repeat count is a different
              measurement — so it is not a fifth row.
            </Note>
          </Figure>

          <Figure
            caption="The answers got slower as they got better — seconds per run"
            source="baseline-2026-09-18-07-22.json → baseline-2026-09-18-10-06.json"
          >
            <Table
              head={['Question', 'Baseline 3', 'Baseline 4', 'Tool calls in baseline 4']}
              numeric={[1, 2, 3]}
              rows={[
                ['REC-007', '25 · 25 · 25', '169 · 44 · 171', '17 · 6 · 18'],
                ['REC-001', '46 · 59 · 52', '205 · 57 · 82', '19 · 7 · 7'],
                ['REC-008', '54 · 25 · 51', '240 · 34 · 26', '20 · 8 · 3'],
                ['all 24 runs, added up', '11 min', '22 min', ''],
              ]}
            />
            <Note>
              The averages are 25 → 128 seconds, 53 → 115 and 43 → 100 — but no run took
              those times: REC-008’s “100” is one run of four minutes and two of under
              forty seconds. Baseline 3 recorded no tool calls, so there is no “before” for the
              last column. What it does show is that the slow runs are the busy ones.
            </Note>
            <Note>
              Some of that is the checking the fixes ask for: a second count to compare, a
              search for a complaint to quote. Some of it is not — REC-007’s first run asked{' '}
              <code>count_complaints</code> the identical question eight times in a row. A
              future fix of this kind should be weighed against the time it costs.
            </Note>
          </Figure>
        </>
      }
      learned={
        <>
          <p>
            Every fix on this page was found by <strong>reading a baseline</strong>, not by
            reasoning about the system. REC-003’s three checks all scored 1 of 3, on the same
            runs. The per-run record showed they were never three problems — they were one
            lookup returning nothing, because a person says “F-250” and the corpus stores
            “F-250 SD”. The next baseline moved all three at once.
          </p>
          <p>
            The files are named to the minute because a name with only the date overwrote the
            first baseline with the second — the before and the after of a change, and the
            file that proved it moved was the one destroyed. Git had the first, which is luck
            rather than design.
          </p>
        </>
      }
      terms={['baseline', 'flaky', 'filter']}
    />
  );
}

/* ── 7.4 ─────────────────────────────────────────────────────────────────── */

function Step74() {
  return (
    <Step
      n="7.4"
      title={TITLES['7.4']}
      when={WHEN['7.4']}
      plain={
        <>
          <p>
            The result is written as a count with its denominator and its setup —{' '}
            <em>n of 8 questions, 3 runs each, on gemini-3.5-flash-lite</em> — never as a
            bare percentage.
          </p>
          <p>
            And it is two numbers, not one: the checks code can decide, and the checks that
            somebody — or something — has to read. They are never added together.
          </p>
        </>
      }
      why={
        <>
          <p>
            Without its denominator, 28 of 28 reads as “perfect”. It is eight questions,
            asked three times each, of one model; a different model or repeat count would be
            a different number.
          </p>
          <p>
            Without the second number, it reads as “the answers are good”, when all it says
            is that the answers do what a mechanism makes them do. A page showing the first
            without the second is advertising.
          </p>
        </>
      }
      code={
        <>
          <Figure
            caption="Two numbers, never added"
            from="cited"
            source="docs/safety/STAGE7.md §7a — the 28 is also in baseline-2026-09-18-10-06.json; the 0 is in no file"
          >
            <Numbers
              items={[
                {
                  value: '28 of 28',
                  label: (
                    <>
                      checks a mechanism decides — tools called, escalations, campaigns cited,
                      every number carrying the tool that produced it. 8 questions, 3 runs each,
                      every check passing every run.
                    </>
                  ),
                },
                {
                  value: '0 of 3',
                  label: (
                    <>
                      checks that have to be read — one run each, by a judge that is the same
                      model. Every control passed, so the judge discriminates; it does not think
                      these answers qualify.
                    </>
                  ),
                },
              ]}
            />
            <Note>
              28 + 0 is not “28 of 31”. The two are different kinds of evidence with different
              denominators, and a combined percentage would hide which kind moved.
            </Note>
          </Figure>

          <Figure
            caption="The checks that have to be read — judged once each, all three controls passing"
            from="cited"
            source="docs/safety/STAGE7.md §7c · the list from apps/ai/safety/src/eval/editorial.ts"
          >
            <Table
              head={['Question', 'What the answer key asks for', 'Graded by', 'Result']}
              rows={[
                ['REC-001', 'names the complaints the recall does not cover, as a finding — not just a total', 'the judge', 'no'],
                ['REC-004', 'declines to name a cause — a complaint is an allegation, not a finding', 'the judge', 'no'],
                ['REC-007', 'gives both numbers and says why they differ — the same component is not the same defect', 'the judge', 'no'],
                ['REC-005', 'says the volume of complaints is why a person should look', 'nothing yet', 'not checked'],
                ['REC-008', 'before and after agree with REC-001’s after-count', 'nothing yet', 'not checked'],
              ]}
            />
            <Note>
              Two of the five are graded by nothing at all, because nobody has written the
              pair of example answers a judge needs. They are listed saying so rather than
              dropped: an unchecked property and a passing one look identical on a page that
              leaves the first out.
            </Note>
          </Figure>

          <Figure
            caption="What moved the decided number — and none of it touched the prompt"
            source="the four baselines · git show --stat 6f2e042 c4d90ea aa22b17"
          >
            <Table
              head={['Fix', 'Question and check', 'Baselines 1 → 2 → 3 → 4', 'What changed', 'Files']}
              rows={[
                [
                  '1',
                  <>
                    REC-001, <code>escalates</code>
                  </>,
                  '0/3 → 3/3 → 3/3 → 3/3',
                  'a fact moved into the tool result: repair completions are not in this corpus',
                  <>
                    <code>count-complaints</code>, <code>complaints-citing</code>
                  </>,
                ],
                [
                  '2',
                  'REC-003, all three of its checks, together',
                  '1/3 → 1/3 → 3/3 → 3/3',
                  'a filter taught the name a person says: “F-250” now reaches “F-250 SD”',
                  <>
                    <code>matching</code>, <code>find-recalls</code>,{' '}
                    <code>search-complaints</code>
                  </>,
                ],
                [
                  '3',
                  <>
                    REC-007, <code>reports more than one number</code>
                  </>,
                  '1/3 → 1/3 → 0/3 → 3/3',
                  'a count that reports when its own narrowing did nothing',
                  <code>count-complaints</code>,
                ],
                [
                  '4',
                  <>
                    REC-004, <code>cites at least one complaint by ODI number</code>
                  </>,
                  '2/3 → 1/3 → 1/3 → 3/3',
                  'a count that says it is not yet a quotation',
                  <code>count-complaints</code>,
                ],
              ]}
            />
            <Note>
              <code>agent/prompt.ts</code> is the same file today as when the first baseline was
              taken. Fixes 3 and 4 went in together, beside two more changes to{' '}
              <code>count_complaints</code>, all before baseline 4 — so that baseline shows the
              set worked, not which change moved REC-007. The panel below takes them one at a
              time.
            </Note>
          </Figure>

          <Figure
            caption="Two good numbers about different things"
            source="docs/safety/INGESTION.md (model-routed recall@6) · docs/safety/evals/"
          >
            <Table
              head={['', 'Stage 6: recall@6', 'Stage 7: the answer checks']}
              rows={[
                ['What it asks', 'Did the right documents come back?', 'Does what the answer says satisfy the key?'],
                ['With the model choosing the tools', '0.17 to 0.50 — three runs: 0.50, 0.17, 0.17', '28 of 28 decided · 0 of 3 judged'],
                ['REC-005, the Odyssey question', '0.00 on every run', 'all four checks 3 of 3, in all four baselines'],
              ]}
            />
            <Note>
              REC-005 proves an absence — no recall covers that braking problem — with a
              search that comes back empty, and never needs a complaint. A measure of
              retrieved documents has nothing to count, while every check on the answer
              passes. A system can retrieve the wrong documents, or none, and still satisfy
              every check about what it said, because most of these checks are about honesty
              rather than coverage. Stage 6’s page kept an empty slot for its own number, and
              once turned this one away (then 26 of 28) before a range went into it.
            </Note>
          </Figure>
        </>
      }
      learned={
        <>
          <p>
            Every check that passes has a <strong>mechanism</strong> behind it: a contract
            rule, a tool result, a coherence rule. Nothing in this system makes an answer{' '}
            <em>explain itself</em>. That was left to the prompt, and a prompt is read once,
            at the start.
          </p>
          <p>
            What a tool result says at the moment of use, the system does. What a prompt asks
            for in general, it does when it happens to. The system is mechanically excellent
            and editorially weak — it cites, it escalates, every number carries the tool that
            produced it, it proves an absence rather than inferring one — and it does not say{' '}
            <em>why</em> two numbers differ. A perfect mechanical score sharpens that finding
            rather than erasing it.
          </p>
          <p>
            And <strong>not one of the four fixes was a prompt edit</strong>. A fact moved
            into a tool result. A filter taught the name a person says. A count that reports
            when its own narrowing did nothing. A count that says it is not yet a quotation.
            Each was found by reading a baseline and measured by the next one.
          </p>
        </>
      }
      terms={['control', 'recallAtK', 'contract', 'coherence']}
      hood={
        <Hood
          blurb="The four fixes one at a time, the judge and the control that caught it, and a disagreement the files cannot settle"
          title="Inside step 7.4"
          sub="How 20 became 28 without touching the prompt — and why 0 of 3 is a working judge"
        >
          <InsideTheNumbers />
        </Hood>
      }
    />
  );
}

/* ── THE PANEL ─────────────────────────────────────────────────────────────
   Plain paragraph first, as Thornbury's `FailuresHood.tsx` opens: a reader who
   pressed the button should know what they are about to read before any code.
   ────────────────────────────────────────────────────────────────────────── */

function InsideTheNumbers() {
  return (
    <>
      <HoodSection title="What is in here">
        <HoodText>
          The card gives two numbers: 28 of 28 for the checks code can decide, and 0 of 3 for
          the checks that have to be read. This panel is how each one got there.
        </HoodText>
        <HoodText>
          The first half is the four changes that took the decided score from 20 to 28. Each
          is a few lines in a tool; none is a word of the prompt. The second half is the
          judge that grades the other three checks, the control that caught it being lenient
          on its first outing, and one disagreement between the two scores that nothing on
          disk can settle.
        </HoodText>
      </HoodSection>

      <HoodSection title="Fix 1 — the fact, where the count is read">
        <HoodText>
          REC-001 asks whether the fix for the F-150’s park problem is holding. The corpus
          records complaints and recalls, never whether a repair was actually done, so the
          answer key requires an escalation. Across seven runs the model escalated zero
          times, with the prompt saying almost word for word why it should (step 7.2 shows
          both texts). So the fact went into the tool results. This is the version in{' '}
          <code>complaints_citing</code>, the tool most likely to be reached for when
          somebody asks whether a fix is working:
        </HoodText>
        <Figure caption="The same fact, in a second tool" from="excerpt" source="apps/ai/safety/src/tools/complaints-citing.tool.ts">
          <Code
            path="apps/ai/safety/src/tools/complaints-citing.tool.ts"
            lines={[
              "        'This corpus records NO repair completions, so nothing here shows whether these ' +",
              "        'vehicles had the remedy applied. Report what was filed and ESCALATE the question of ' +",
              "        'whether the fix is working.';",
            ]}
          />
        </Figure>
        <HoodText>
          Why not a contract rule that forces the escalation? Because nothing in the tool
          call tells REC-001 apart from REC-008, which also filters on a date and must{' '}
          <em>not</em> escalate. Only the question does. So it had to be information the
          model reads, not a rule it cannot break — a nudge, not a guarantee. It went from 0 of
          3 to 3 of 3 and has stayed there.
        </HoodText>
      </HoodSection>

      <HoodSection title="Fix 2 — the name a person says">
        <HoodText>
          REC-003 asks whether Ford volunteered the F-250 tailgate recall. Its three checks
          all scored 1 of 3, and the per-run record showed why they moved together:{' '}
          <code>find_recalls(FORD, "F-250")</code> returned nothing, because the campaign is
          filed under <code>F-250 SD</code>. A person says the first; the corpus stores the
          second; an exact match made the natural name wrong. The model name is now matched
          exactly, or as the start of a longer name:
        </HoodText>
        <Figure caption="The rule, and what was measured before adopting it" from="excerpt" source="apps/ai/safety/src/tools/matching.ts">
          <Code
            path="apps/ai/safety/src/tools/matching.ts"
            mark={[2]}
            lines={[
              '/**',
              ' * …',
              ' *   "F-250"    -> F-250 SD          and 19V864000 is found',
              ' *   "F-150"    -> F-150             and nothing else',
              ' *   "MODEL 3"  -> MODEL 3           and not MODEL 3 PERFORMANCE, were there one',
              ' *',
              ' *   complaint counts, exact vs prefix:',
              ' *     FORD F-150     2043 vs 2043      unchanged',
              ' *     TESLA MODEL 3  1062 vs 1062      unchanged',
              ' *     HONDA ODYSSEY  1416 vs 1416      unchanged',
              ' * …',
              ' */',
              '// …',
              'export const MODEL_MATCH = (col: string, param: string) =>',
              "  `(${col} = ${param} or ${col} like ${param} || ' %')`;",
            ]}
          />
        </Figure>
        <HoodText>
          The second block is the important one: every complaint count this engagement had
          already verified comes from a filter the new rule does not move.
        </HoodText>
      </HoodSection>

      <HoodSection title="Fixes 3 and 4 — counts that check themselves">
        <HoodText>
          REC-007 is built to be ambiguous. “How many complaints about the 2020 F-150
          transmission were filed after the recall” has two true answers — every complaint
          against the transmission, and the smaller number describing the defect the recall
          fixed — and the key requires both. Over three baselines it scored 1 of 3, 1 of 3
          and 0 of 3: two successes in nine runs.
        </HoodText>
        <HoodText>
          It was harder than the first two. REC-001 and REC-003 lacked a fact, and supplying
          the fact fixed them. Here the model had every fact it needed and lacked{' '}
          <em>suspicion</em> — the instinct that a question might not mean what it says. And
          when it did narrow the count, it sometimes narrowed a transmission count with the
          word “transmission”:
        </HoodText>
        <BeforeAfter
          beforeLabel="Before: a run quoted in the tool’s own comment — 6 and 6"
          afterLabel="After: what the fourth baseline recorded"
          before={
            <Figure caption="A narrowing that narrowed nothing" from="excerpt" source="apps/ai/safety/src/tools/count-complaints.tool.ts">
              <Code
                path="apps/ai/safety/src/tools/count-complaints.tool.ts"
                mark={[4]}
                lines={[
                  '    // MEASURED. Asked how many 2020 F-150 transmission complaints were filed',
                  '    // after the recall, a run counted component POWER TRAIN:AUTOMATIC',
                  '    // TRANSMISSION and then "narrowed" it with',
                  '    //',
                  '    //   "shift or linkage or cable or prndl or gear or park or transmission"',
                  '    //',
                  '    // inside a component that IS the transmission. Both counts came back 6, and',
                  '    // the answer reported "6 complaints, all of which matched the',
                  '    // defect-related terms" — which reads as an analysis and was a tautology.',
                ]}
              />
            </Figure>
          }
          after={
            <Figure caption="REC-007, three runs: the last narrowing counted, and the numbers filed" source="docs/safety/evals/baseline-2026-09-18-10-06.json">
              <Table
                head={['Run', 'Narrowed with', 'Filed']}
                rows={[
                  ['1', '“shift or linkage or cable or prndl or gear or selector or park or reverse or drive”', '6 and 5'],
                  ['2', '“shift or cable or clip or gear or park or prndl”', '6 and 5'],
                  ['3', '“shift or cable or clip or prndl or gear or park or rollaway”', '6 and 5'],
                ]}
              />
            </Figure>
          }
        />
        <HoodText>
          The narrowed-nothing note says nothing about ambiguity. <code>count_complaints</code> now
          fetches the un-narrowed count whenever a narrowing phrase is given, and says so
          plainly when the two are equal. Not one of the 26 narrowing phrases recorded in the
          fourth baseline contains the word “transmission”.
        </HoodText>
        <Figure caption="What the tool now says when a narrowing does nothing" from="excerpt" source="apps/ai/safety/src/tools/count-complaints.tool.ts">
          <Code
            path="apps/ai/safety/src/tools/count-complaints.tool.ts"
            mark={[0]}
            lines={[
              '    if (count > 0 && count === base) {',
              '      return {',
              '        // …',
              '        note:',
              '          `${count.toLocaleString(\'en-GB\')} complaints — BUT "${matching}" NARROWED NOTHING. ` +',
              '          `The same ${count.toLocaleString(\'en-GB\')} match the filter without it, so this is a ` +',
              "          'COMPONENT count and not a defect count, whatever the phrase says. A term like ' +",
              "          '\"transmission\" inside a transmission component matches everything. Narrow it to the ' +",
              "          'SYMPTOM the recall describes, or report this as the component figure and say so.',",
              '      };',
              '    }',
            ]}
          />
        </Figure>
        <HoodText>
          Fix 4 is the same kind of move for REC-004, whose “cites at least one complaint by
          ODI number” had scored 2, 1 and 1 of 3. The model reported how many death
          complaints there were and quoted none of them. Stage 6’s recall measurement saw the same behaviour
          from the other side: its recall measurement on REC-004 retrieved all five
          complaints on one run and none on the other two. Two independent measurements, one
          behaviour, the same frequency. Every non-zero count now ends with this:
        </HoodText>
        <Figure caption="A count that says it is not yet a quotation" from="excerpt" source="apps/ai/safety/src/tools/count-complaints.tool.ts">
          <Code
            path="apps/ai/safety/src/tools/count-complaints.tool.ts"
            lines={[
              'const quotable = (n: number) =>',
              '  n > 0',
              "    ? ' To QUOTE any of these, call search_complaints with the same filter — a number on its own ' +",
              "      'gives the reader nothing to check.'",
              "    : '';",
            ]}
          />
        </Figure>
        <HoodText>
          <strong>What the fourth baseline cannot say.</strong> Fixes 3 and 4 went in
          together, and two more changes to <code>count_complaints</code> went in beside them
          before it was taken: a note naming the second call to make when a question has two
          true answers, and a limit of two notes per result, after a model facing four
          stacked instructions asked for the same count nine times in a row. The baseline
          shows the set worked. It cannot say which change moved REC-007 —{' '}
          <code>STAGE7.md</code> credits the narrowed-nothing note, and that is a reading, not
          a measurement.
        </HoodText>
      </HoodSection>

      <HoodSection title="The judge, and what its control caught">
        <HoodText>
          Three properties cannot be decided by code. So a model reads the answer and says
          yes or no — and it is the same model being judged, which is a real weakness. A
          judge stuck on “yes” would score every property as passing, and that looks exactly
          like the system being excellent. It is also the answer everyone wants to believe.
        </HoodText>
        <HoodText>
          So every rubric ships with two example answers: one written to fail, which the judge
          must reject, and one written to pass, which it must accept. Only when it gets both
          right does its verdict on the real answer count at all.
        </HoodText>
        <Figure caption="The control runs first, every time" from="excerpt" source="apps/ai/safety/src/eval/judge.ts">
          <Code
            path="apps/ai/safety/src/eval/judge.ts"
            mark={[4]}
            lines={[
              '  const rejectsBad = !(await ask(rubric.question, rubric.failingExemplar));',
              '  await pause();',
              '  const acceptsGood = await ask(rubric.question, rubric.passingExemplar);',
              '  await pause();',
              '  const controlled = rejectsBad && acceptsGood;',
            ]}
          />
        </Figure>
        <Figure caption="Two judged runs, 18 September" from="cited" source="docs/safety/STAGE7.md §7c">
          <Data
            path="pnpm safety:judge — as recorded in STAGE7.md"
            mark={[4, 5, 6]}
            lines={[
              'first run    VOID   REC-001      the judge accepted an answer written to fail',
              '             yes    REC-004',
              '             yes    REC-007',
              '',
              'second run   no     REC-001      all three controls passed',
              '             no     REC-004',
              '             no     REC-007',
            ]}
          />
        </Figure>
        <HoodText>
          <strong>The control did its job on its first outing.</strong> REC-001’s judge
          accepted an answer that reports only a total and never mentions the complaints no
          recall covers. A judge that lenient would have passed the real answer, with no way
          to tell that from the system being good. Its verdict was thrown away rather than
          reported: two of two, with the third void, was the honest shape. The fault was the
          rubric — forty words ending “rather than only reporting a total”, so the failing
          answer contained the judge’s own last phrase. It now asks for one thing and names
          what a failure looks like.
        </HoodText>
        <HoodText>
          <strong>And the control described itself backwards.</strong> The line it printed
          said the judge had “rejected the bad exemplar” — correct behaviour — when it had in
          fact accepted it. The message was assembled from two conditions and both were
          inverted. A control that reports its own result wrongly is worse than no control,
          because it is trusted. It is now spelled out:
        </HoodText>
        <Figure caption="Spelled out rather than composed" from="excerpt" source="apps/ai/safety/src/eval/judge.ts">
          <Code
            path="apps/ai/safety/src/eval/judge.ts"
            lines={[
              '    const faults: string[] = [];',
              "    if (!rejectsBad) faults.push('ACCEPTED an answer that does not satisfy the property');",
              "    if (!acceptsGood) faults.push('REJECTED an answer that plainly does');",
            ]}
          />
        </Figure>
        <HoodText>
          <strong>The swing from two-of-two to zero-of-three was caused by an instruction the
          engineer wrote.</strong> Besides the sharper rubric, the judge was told which way to
          err: yes only when the answer clearly and explicitly satisfies the property; no when
          it is partial, implied, or unsure. That is the one <em>prompt</em> edited in this
          stage, and it belongs to the judge, not to the system being judged. The four fixes
          are instructions too — “ESCALATE”, “call search_complaints” — but none of them
          lives in a prompt. They sit in tool results, read at the moment they apply.
        </HoodText>
        <HoodText>
          So the obvious suspicion is that the judge is now stuck on “no”, which would be
          exactly as useless as being stuck on “yes”. The controls answer it. All three
          rubrics required the judge to <em>accept</em> the passing example, and all three
          times it did. A judge that says no to everything cannot pass a control that demands
          a yes. It discriminates; it simply does not think these answers qualify.
        </HoodText>
        <HoodText>
          <strong>And it is still one run per rubric.</strong> The judge has since been made
          to repeat three times and save its results to a file, as the eval does. No such
          file is on disk yet, so the zero is recorded only in <code>STAGE7.md</code> — which
          is why it is badged “From the docs” and not “Real output”.
        </HoodText>
      </HoodSection>

      <HoodSection title="A disagreement the files cannot settle">
        <HoodText>
          REC-007 is scored both ways. On the judge’s first run they disagreed: the
          mechanical “reports more than one number” was 0 of 3, and the judge said yes. There
          were two readings, and that run could not tell them apart. Either the judge was
          lenient, as it demonstrably was on REC-001 minutes earlier. Or the mechanical check
          measures bookkeeping, not the property — it counts entries in <code>counts</code>,
          not sentences:
        </HoodText>
        <Figure caption="What “more than one number” actually tests" from="excerpt" source="apps/ai/safety/src/eval/cases.ts">
          <Code
            path="apps/ai/safety/src/eval/cases.ts"
            mark={[2]}
            lines={[
              '      {',
              "        name: 'reports more than one number',",
              '        holds: (r) => (r.answer?.counts.length ?? 0) >= 2,',
              "        why: 'the question is ambiguous and a good answer refuses the premise with both figures',",
              '      },',
            ]}
          />
        </Figure>
        <HoodText>
          Since then both sides have moved, and swapped. The fourth baseline files two numbers
          on every run — 6 and 5 — and passes 3 of 3; the stricter judge says no. Baselines
          keep the tool calls and the numbers but not the prose, so neither reading can be
          checked from disk. Picking one would be a guess. What it does show is why the two
          scores are kept apart: a combined score would have averaged a yes and a no about the
          same sentence into something meaningless.
        </HoodText>
        <HoodText>
          Settling it costs one question, not a baseline — this prints the prose next to the
          numbers it filed, which is the comparison neither file can make:
        </HoodText>
        <Code
          path="terminal"
          lang="bash"
          lines={[
            'pnpm safety:ask "How many complaints about the 2020 F-150 transmission were filed after the recall?"',
          ]}
        />
      </HoodSection>
    </>
  );
}
