/**
 * Stage 4 — the tools, and the number they were built to move.
 *
 * ── THE LAYOUT, SINCE THE REDESIGN OF 2026-09-27 ──────────────────────────
 *
 * One `PhaseHead`, then six `Step`s in the fixed five-part shape `kit.tsx`
 * describes: in plain words, why it matters, the code, what we learned, words
 * to know. Each tool's own "under the hood" dialog is that step's `hood`. The
 * bespoke tool cards, the result banner and the four numbered chapters are
 * gone, and nothing they said went with them. It moved to the step a reader
 * is on when it becomes relevant:
 *
 *   the four ways of answering, and where each tool came from    4.5's table
 *   why there is a counting tool at all                          4.4
 *   the order it was built in, and each step's "done when"       each step's figures
 *   the component filter that was blocking two tools             4.2
 *
 * ── THE STAGE IS COMPLETE, AND 4.5 IS WHY IT EXISTED ──────────────────────
 *
 * All five tools are built, and stage 4.5 re-ran the answer key through them:
 * recall@6 over the three retrieval cases went 0.40 to 1.00.
 *
 * THAT NUMBER IS A CEILING AND THE PAGE MUST NEVER SHOW IT ALONE. There is no
 * model yet, so which tool to call with which arguments is written by hand. It
 * answers "are the right documents reachable at all", not "will a model ask
 * correctly" — that second number is stage 6's, and it is lower. A ceiling
 * quoted as a score is how a demo becomes a promise, so "hand-routed" and the
 * denominator travel with 1.00 everywhere it appears: the PhaseHead result,
 * the figure caption, the big-number labels and every lesson that repeats it.
 *
 * Two of the three cases moved. REC-005 was already 1.00, and what makes it
 * right is an EMPTY result, so "0.40 to 1.00" overstates what changed unless it
 * says so.
 *
 * ── THE NARRATIVE BEAT IS THAT THE PLAN WAS WRONG ─────────────────────────
 *
 * The plan said two tools, reasoned from what the questions looked like. Stage
 * 3.7 measured recall@6 at 0.40 and diagnosed why, and half that design did not
 * survive it. Five tools now, and each new one exists because of a specific
 * thing the measurement showed. So every step's "what we learned" opens with
 * where its tool came from: in the plan and unchanged, in the plan but rebuilt,
 * or not in the plan at all.
 *
 * That is not a defect story. It is the plan being corrected by evidence, which
 * is the thing this whole site argues for.
 *
 * ── THREE PAIRS OF NUMBERS THAT LOOK LIKE CONTRADICTIONS AND ARE NOT ──────
 *
 * RANK 8 AND POSITION 1 are two different runs. Stage 3.7's diagnosis
 * filtered by hand, with no date, and ranked on keywords alone, which moved
 * ODI 11353867 from 3,026 to 8. The built tool adds the date and runs both
 * search arms inside the filter. Its check asserts only "in the top 6", and the
 * recorded run has the complaint at 1. Both are on the page, each labelled.
 *
 * 1,057 AND 1,060. STAGE4.md §2 still says REC-001's answer is "103, and not
 * 1,060". WALKTHROUGH.md corrected that total to 1,057 by de-duplicating
 * complaints, and every tool check agrees with 1,057. So this page uses 1,057.
 *
 * 103 AND 957 are the key's own figures, and the key marks them unverified.
 * They add up to the stale 1,060, so they are never shown as a split of 1,057.
 * The split the tool can actually reproduce is 89 and 968, and 4.4 says so.
 *
 * Source: `docs/safety/STAGE4.md`, `docs/safety/WALKTHROUGH.md`, and the code
 * under `apps/ai/safety/src/tools/` and `src/cli/measure-tools.ts`.
 */
import { Code } from '@veresk/surface';
import { Figure, Note, Numbers, Table, Step } from '@veresk/learn/steps';
import { PhaseHead } from '@veresk/learn/steps';
import { Hood, HoodSection, HoodText } from '@veresk/learn/steps';
import { TITLES, WHEN } from '../../lib/steps';
import { CitingModal } from './CitingModal';
import { CountModal } from './CountModal';
import { FindRecallsModal } from './FindRecallsModal';
import { GetRecallModal } from './GetRecallModal';
import { SearchComplaintsModal } from './SearchComplaintsModal';

export function Stage4() {
  return (
    <>
      <PhaseHead
        stage="4"
        title="Ways to ask that aren’t a search"
        what={
          <>
            <p>
              Stage 3 can ask the data one question: <em>what text looks like
              this?</em> By the end of this stage the machine has five more
              precise ways to ask. It can look a recall up by its number, list
              the recalls for a vehicle (and say for certain when there are
              none), read complaints inside an exact filter, count them, and
              follow a recall number that owners typed into their own
              complaints.
            </p>
            <p>
              Each one is a <strong>tool</strong>: a plain function that a model
              will later be allowed to ask for. There is still no model call, no
              prompt, no answer format and no page, so each tool can be run and
              checked from a command line on its own. The plan said two tools.
              The measurement at the end of stage 3 said five, and each step
              below names the result that added its tool.
            </p>
          </>
        }
        result={
          <p>
            Called by hand, the tools lift recall@6 over the answer key’s{' '}
            <strong>3 retrieval cases</strong> from 0.40 to{' '}
            <strong>1.00, hand-routed</strong>. That makes it a ceiling, not a
            score. A person chose every tool call because there is no model yet,
            so it shows the right documents are <em>reachable</em>, not that a
            model will ask for them. Stage 6 measures that, and it is lower. Only
            two of the three cases moved: the third was already 1.00, and the
            right result there is that no recall exists at all.
          </p>
        }
      />

      <div className="mt-10 grid gap-8">
        <GetRecall />
        <FindRecalls />
        <SearchComplaints />
        <CountComplaints />
        <ComplaintsCiting />
        <MeasureAgain />
      </div>
    </>
  );
}

/* ── 4.1 · get_recall ─────────────────────────────────────────────────────── */

function GetRecall() {
  return (
    <Step
      n="4.1"
      title={TITLES['4.1']}
      when={WHEN['4.1']}
      plain={
        <p>
          Give it a recall number, such as <code>20V197000</code>, and it hands
          back that one recall: the vehicles, how many, which part, what goes
          wrong, what the fix is, who started the recall and when owners were
          told. It doesn’t search. Either it has that exact recall or it says it
          doesn’t, and it never offers a “close” one instead.
        </p>
      }
      why={
        <>
          <p>
            Search is the wrong tool for a question with one exact answer.
            Asked for exactly <code>20V197000</code>, stage 3’s search put it{' '}
            <strong>fourth</strong>, behind two complaints and a school-bus
            recall. The word “recall” is in thousands of documents, and the
            meaning arm returns things that merely <em>look</em> like campaign
            numbers.
          </p>
          <p>
            A near miss is worse than nothing, because a model given a
            neighbouring campaign will cite it. That’s why the answer key’s
            question about this recall (REC-002) passes only if{' '}
            <code>get_recall</code> is called first and the complaint search is
            not called at all.
          </p>
        </>
      }
      code={
        <>
          <Figure caption="The lookup, and its two ways of finding nothing" from="excerpt" source="apps/ai/safety/src/tools/get-recall.tool.ts">
            <Code
              path="apps/ai/safety/src/tools/get-recall.tool.ts (shortened)"
              mark={[5, 11, 21]}
              lines={[
                'export const CAMPAIGN_PATTERN = /^\\d{2}[VETS]\\d{6}$/;',
                '',
                '  // CHECKED BEFORE THE QUERY, so a typo is reported as a typo. A model that',
                '  // wrote `20V19700` can fix it; a model told only "not found" may conclude the',
                '  // recall does not exist and say so in an answer.',
                '  if (!CAMPAIGN_PATTERN.test(id)) {',
                "    return { found: false, campaign_number: id, reason: 'malformed', note: … };",
                '  }',
                '  // …',
                '    const { rows } = await client.query(',
                '      `select content, metadata from ${TABLE}',
                "        where metadata->>'kind' = 'recall' and metadata->>'id' = $1",
                '        limit 1`,',
                '      [id],',
                '    );',
                '',
                '    // NOT A NEAR MISS, AND THIS IS THE DELIBERATE PART. There is no fuzzy',
                '    // fallback here, no "did you mean 20V197001". The corpus is a slice —',
                '    // model years 2019 and 2020 — so a well-formed campaign number that is',
                '    // absent is far more likely to be real and out of scope than mistyped, and',
                '    // offering a neighbouring campaign would invite citing the wrong recall.',
                '    if (!rows.length) {',
                "      return { found: false, campaign_number: id, reason: 'absent', note: … };",
                '    }',
              ]}
            />
            <Note>
              An equality test on an id: no ranking and no similarity. A
              campaign number is two digits, a letter (<code>V</code> vehicle,{' '}
              <code>E</code> equipment, <code>T</code> tyre, <code>S</code>{' '}
              child seat) and six digits, and the pattern is checked{' '}
              <strong>before</strong> the database is asked anything.
            </Note>
          </Figure>

          <Figure caption="Three numbers in, three different answers out" source="pnpm safety:recall — 8 of 8 checks">
            <Table
              head={['Asked for', 'What came back']}
              rows={[
                [
                  <code>20V197000</code>,
                  'Ford Motor Company. 2020 Ford Expedition, F-150 and Ranger; 55,158 vehicles; the automatic transmission’s gear-position (PRNDL) branch; owners notified 2020-04-27; started by the manufacturer, voluntarily. Units, date, vehicles and remedy text are each checked against the answer key.',
                ],
                [<code>20V19700</code>, 'Reported as malformed: seven digits, so a typo, with a note on how campaign numbers are written'],
                [<code>99V999999</code>, 'Reported as absent: well formed but not in this slice, with a warning not to substitute a different campaign'],
              ]}
              lit={[0]}
            />
          </Figure>
        </>
      }
      learned={
        <>
          <p>
            <strong>In the plan, and unchanged.</strong> Its rule, “exact, and
            it must not search”, was written before any data was loaded, and it
            survived exactly as written. It is the one tool reasoning got right.
            The insurance engagement learned the same rule with{' '}
            <code>get_policyholder</code> on documents that have nothing to do
            with vehicles: <strong>a question with one exact answer is a
            lookup, not a search.</strong>
          </p>
          <p>
            What running it added was about the misses. “Not a campaign number”
            and “not in this slice” have to sound different. A model told only
            “not found” after a typo may decide the recall doesn’t exist and
            write that into an answer about vehicle safety.
          </p>
          <p>
            It also returns separate fields rather than a paragraph. Another
            question asks whether Ford volunteered a recall or was pushed into
            it, and that isn’t a judgement to read into the defect text. NHTSA
            records it in a field, <code>INFLUENCED_BY</code>, with three
            possible codes.
          </p>
        </>
      }
      terms={['campaign', 'tool', 'keyword', 'answerKey']}
      hood={<GetRecallModal />}
    />
  );
}

/* ── 4.2 · find_recalls ───────────────────────────────────────────────────── */

function FindRecalls() {
  return (
    <Step
      n="4.2"
      title={TITLES['4.2']}
      when={WHEN['4.2']}
      plain={
        <p>
          Give it a vehicle, meaning a make, a model and optionally a year and a
          part, and it lists every recall that covers it. Often the list is
          empty. When it is, the tool also names the other parts of that
          vehicle that <em>do</em> have recalls, so “nothing” comes with proof
          that it looked.
        </p>
      }
      why={
        <>
          <p>
            Search always returns <em>something</em>. That is deliberate: there
            is no score below which it gives up. So without this tool, “no recall
            exists” is a judgement a model makes by reading six loosely related
            results and deciding none of them count. It is the hardest thing to
            get right, and it is the insurance engagement’s rideshare case all
            over again.
          </p>
          <p>
            Insurance could never <em>prove</em> an absence, because “is
            rideshare covered” isn’t a field in a policy document.{' '}
            <strong>Here it is.</strong> A recall names the make, model, year and
            part it covers, so no match is a <em>fact about the corpus</em>{' '}
            rather than an impression of it.
          </p>
        </>
      }
      code={
        <>
          <Figure caption="Two questions, and the empty answer is the one that matters" source="pnpm safety:recalls-for — 7 of 7 checks">
            <Table
              head={['Asked', 'What came back']}
              rows={[
                [
                  <>Honda Odyssey, <code>FORWARD COLLISION AVOIDANCE</code></>,
                  'No recalls. Also: 16 other parts on this vehicle do have recalls (22 campaigns between them), so the absence is specific to this part. Plus a warning not to cite one of those instead.',
                ],
                [
                  <>Ford F-150, <code>POWER TRAIN:AUTOMATIC TRANSMISSION</code></>,
                  <><code>20V197000</code>, and only that one</>,
                ],
              ]}
              lit={[0]}
            />
          </Figure>

          <Figure caption="How a part or a model name matches: exactly, or anything underneath it" from="excerpt" source="apps/ai/safety/src/tools/matching.ts">
            <Code
              path="apps/ai/safety/src/tools/matching.ts (shortened)"
              lines={[
                'export const COMPONENT_MATCH = (col: string, param: string) =>',
                "  `(${col} = ${param} or ${col} like ${param} || ':%' or ${col} like ${param} || ': %')`;",
                '',
                'export const MODEL_MATCH = (col: string, param: string) =>',
                "  `(${col} = ${param} or ${col} like ${param} || ' %')`;",
              ]}
            />
            <Note>
              NHTSA writes its parts as a tree, with colons:{' '}
              <code>POWER TRAIN</code>, then{' '}
              <code>POWER TRAIN:AUTOMATIC TRANSMISSION</code>, then the PRNDL
              branch under that. A filter matches its own level and everything
              beneath it, so the caller chooses how specific to be. There are two
              colon forms because NHTSA uses both spacings, sometimes within one
              vehicle’s own recalls. Model names follow the same rule with a
              space instead of a colon.
            </Note>
          </Figure>

          <Figure caption="The rule, checked before it was adopted" source="docs/safety/STAGE4.md §7">
            <Table
              head={['Filter', 'What it matches', 'Checked against']}
              rows={[
                [<>Odyssey + <code>FORWARD COLLISION AVOIDANCE</code></>, 'Both of its children — warnings and adaptive cruise — 400 complaints', 'The key says 400'],
                [<>Recalls + <code>POWER TRAIN:AUTOMATIC TRANSMISSION</code></>, 'The PRNDL branch, and not the bare POWER TRAIN rows', <>One campaign, <code>20V197000</code></>],
                [<>Model <code>F-250</code></>, <><code>F-250 SD</code>, so recall <code>19V864000</code> is found</>, 'An exact match found nothing'],
                [<>Model <code>F-150</code>, <code>MODEL 3</code>, <code>ODYSSEY</code></>, 'Complaint counts exact vs prefix: 2,043 / 2,043 · 1,062 / 1,062 · 1,416 / 1,416', 'No published number moves'],
              ]}
            />
          </Figure>
        </>
      }
      learned={
        <>
          <p>
            <strong>Not in the plan, and added after measuring.</strong> It came
            from the one question whose right answer is “no recall exists”, and
            nothing in the plan could say that, because search always returns
            something. Its rule is that it may return nothing, and when it does,
            it says why.
          </p>
          <p>
            How a part filter should match was the question blocking two
            tools: this one, and the complaint search, whose filter the count
            reuses. So it was decided first. Exact matching was too narrow: the
            Odyssey question needs both kinds of forward-collision part, and a
            model would have to know every sub-part’s name in advance. Matching
            anywhere in the text was too loose, because <code>BRAKE</code> would
            catch <code>PARKING BRAKE</code> whether anyone meant it or not. The
            answer was to match from the start, on NHTSA’s own tree. It was
            checked against the key (400) <strong>before</strong> it was
            adopted, and that order matters: decide, then verify, then build, or
            the test quietly gets tuned to whatever the filter happens to do.
          </p>
          <p>
            Model names needed the same rule, and it cost a case to find out.{' '}
            <code>find_recalls(FORD, &quot;F-250&quot;)</code> returned nothing,
            because the recall is filed under <code>F-250 SD</code>. The
            question asking whether Ford volunteered that recall (REC-003) scored
            1 of 3 in the first baseline, not because of three separate faults
            but because of one empty lookup. The rule also keeps out NHTSA’s own
            junk rows, such as <code>redundant F-250</code>, because they don’t{' '}
            <em>start</em> with the name. Both rules now live in one file, so
            the tools can’t drift apart on what a part means.
          </p>
        </>
      }
      terms={['filter', 'campaign', 'nhtsa', 'corpus']}
      hood={<FindRecallsModal />}
    />
  );
}

/* ── 4.3 · search_complaints ──────────────────────────────────────────────── */

function SearchComplaints() {
  return (
    <Step
      n="4.3"
      title={TITLES['4.3']}
      when={WHEN['4.3']}
      plain={
        <p>
          It’s the same two-way search as stage 3, with one difference: it
          narrows first. You give it the facts that are already fields, such as
          the make, model, year, part, filing dates, crash, fire, deaths and
          injuries. You also describe the problem in the owner’s words. It
          searches only inside the complaints that fit the facts and returns up
          to six to quote.
        </p>
      }
      why={
        <p>
          Stage 3 treated “2020 F-150” as words to match. The F-150 question
          (REC-001) matches 54,541 documents on everyday words like “run”,
          “2020” and “problem”. The complaint that answers it,{' '}
          <code>11353867</code>, sat at keyword rank <strong>3,026</strong>: not
          in the top 6, and not in the top 50. “2020 F-150” isn’t a phrase. It’s
          a filter dressed up as a question, and no better ranking fixes that.
        </p>
      }
      code={
        <>
          <Figure caption="One filter, applied to both halves of the search" from="excerpt" source="apps/ai/safety/src/tools/search-complaints.tool.ts">
            <Code
              path="apps/ai/safety/src/tools/search-complaints.tool.ts (shortened)"
              mark={[4, 8]}
              lines={[
                '  const { sql: where, params } = buildWhere(filter);',
                '  // …',
                '    // 2 — THE MEANING ARM, restricted to the filtered set.',
                '    // …',
                '        where ${where}',
                '        order by vector <=> $${params.length + 1}',
                '    // …',
                '    // 3 — THE KEYWORD ARM, restricted to the SAME set. …',
                '        where ${where}',
                "          and content_ts @@ websearch_to_tsquery('english', $${params.length + 1})",
                '    // …',
                '    // 4 — fused by the SAME arithmetic stage 3.6 uses, imported not copied.',
                '    const fused = fuseByRank(asDocs(denseRows), asDocs(sparseRows), k);',
              ]}
            />
            <Note>
              The two highlighted lines are the whole design. Both halves of the
              search look inside <strong>the same</strong> filtered set, built
              once by <code>buildWhere</code>, and the results are merged with
              the same arithmetic as stage 3.6.
            </Note>
          </Figure>

          <Figure caption="The same two questions, before and after filtering" source="pnpm safety:complaints · the “before” column is stage 3.7">
            <Table
              head={['What', 'Stage 3, no filter', 'search_complaints']}
              rows={[
                ['Complaints searched (REC-001)', '70,194', '1,057 — F-150, power train, filed on or after 2020-04-27'],
                [<>Where <code>11353867</code> came back</>, 'Keyword rank 3,026 — outside the top 50', 'Position 1'],
                ['Tesla Model 3 death complaints in the top 6 (REC-004)', '1 of 5', '5 of 5 — the filter alone leaves exactly those 5'],
              ]}
              lit={[1]}
            />
            <Note>
              The check asks only for the top 6, and this run put the complaint
              first. Stage 3.7’s diagnosis was a different run: it filtered by
              hand with no date and ranked on keywords alone, and got the
              complaint from 3,026 to <strong>rank 8</strong>. That was enough
              to show the cause before the tool existed.
            </Note>
          </Figure>
        </>
      }
      learned={
        <>
          <p>
            <strong>In the plan, but rebuilt after measuring.</strong> The plan
            said “<code>search_complaints</code>, hybrid”, meaning one search
            over everything. What got built has the same name but is a
            different tool, with a different rule: filter first, then search
            inside.
          </p>
          <p>
            The obvious build, handing the filter to stage 3’s search, would
            have failed without an error. The meaning half could filter on
            ranges; the keyword half only on exact matches. So a filter like “at
            least one death” would have been applied by one half and ignored by
            the other. They would have searched two different sets and merged
            the results, and the answer would just have been worse. Now both
            halves use one set, and a check fails if any result falls outside
            the filter.
          </p>
          <p>
            For the Tesla question, the filter didn’t just help the search. It
            isolated the answer on its own: exactly five complaints match. Some
            of these questions were never search questions.
          </p>
        </>
      }
      terms={['filter', 'hybrid', 'keyword', 'rrf', 'odi']}
      hood={<SearchComplaintsModal />}
    />
  );
}

/* ── 4.4 · count_complaints ───────────────────────────────────────────────── */

function CountComplaints() {
  return (
    <Step
      n="4.4"
      title={TITLES['4.4']}
      when={WHEN['4.4']}
      plain={
        <p>
          It takes the same kind of filter and returns a number: how many
          complaints match. It also returns the filter that produced the number,
          and never any complaint text. An optional phrase narrows the count
          from “complaints about this part” to “complaints describing this
          fault”.
        </p>
      }
      why={
        <p>
          Three of the eight questions in the answer key want a number, and no
          six passages contain one. You can’t read six complaints and know there
          are 103 of something. A model that tries will produce a number that{' '}
          <em>sounds</em> right, which is the most dangerous failure available
          here. <strong>No amount of better retrieval ever answers “how
          many”.</strong> Retrieval returns examples; counting is an aggregate.
        </p>
      }
      code={
        <>
          <Figure caption="What the answer key asks for" from="worked" source="docs/safety/WALKTHROUGH.md · docs/safety/STAGE4.md §2">
            <Table
              head={['Question', 'The answer is', 'Can six passages contain it?']}
              rows={[
                ['REC-001', '103 describing the recalled fault — not the 1,057 that name the part', 'No'],
                ['REC-004', '5', 'No'],
                ['REC-007', '103 and 957', 'No'],
              ]}
            />
            <Note>
              The key marks 103 and 957 as <strong>unverified</strong>. They
              were counted before the key’s total was corrected from 1,060 to
              1,057, and they add up to the old figure.
            </Note>
          </Figure>

          <Figure caption="A zero has to say which kind of zero it is" from="excerpt" source="apps/ai/safety/src/tools/count-complaints.tool.ts">
            <Code
              path="apps/ai/safety/src/tools/count-complaints.tool.ts (shortened)"
              mark={[3, 13]}
              lines={[
                '    // A ZERO HERE IS CHECKED, NOT REPORTED. See the header: an over-constrained',
                '    // phrase and a genuinely empty answer are the same number and must not be',
                '    // the same sentence.',
                '    if (count === 0) {',
                '      if (base > 0) {',
                '        return {',
                '          count: 0,',
                '          filter,',
                '          matching,',
                '          describes,',
                '          note:',
                '            `NO complaints matched "${matching}", but ${base.toLocaleString(\'en-GB\')} match the ` +',
                "            'filter alone. Spaces in a phrase mean AND, so several terms together may be ' +",
                "            'impossible to satisfy at once — join them with `or`. DO NOT report this zero as ' +",
                "            'evidence that no complaint describes the defect.',",
                '        };',
                '      }',
                '    }',
              ]}
            />
            <Note>
              This guard exists because the tool’s own check failed this way
              once. <code>park prndl rollaway shift cable</code> means all five
              words at once, and it matched <strong>0</strong> of the 1,057 F-150
              power-train complaints filed after the recall.{' '}
              <code>park or prndl or &quot;shift cable&quot;</code> matched{' '}
              <strong>89</strong>. On a corpus about vehicles that roll away, a
              bare zero reads as an all-clear.
            </Note>
          </Figure>

          <Figure caption="Every number, three ways that share no code" source="pnpm safety:count — tool · awk over the raw file · answer key">
            <Table
              head={['Count', 'Tool', 'awk', 'Key']}
              numeric={[1, 2, 3]}
              rows={[
                ['Tesla Model 3 complaints involving a death (REC-004)', '5', '5', '5'],
                ['Odyssey forward-collision complaints (REC-005)', '400', '400', '400'],
                ['F-150 power-train complaints filed after the recall (REC-001)', '1,057', '1,057', '1,057'],
              ]}
            />
          </Figure>
        </>
      }
      learned={
        <>
          <p>
            <strong>Not in the plan, and added after measuring.</strong> It came
            from re-reading the answer key after stage 3.7. Its rule is a number,
            never passages, and the number always carries the question it
            answered: “1,057” on its own isn’t a fact, but “1,057 F-150
            power-train complaints filed after 2020-04-27” is.
          </p>
          <p>
            That matters because of the trap the F-150 question is built around:{' '}
            <strong>two numbers are both true, and only one answers what was
            asked.</strong> 1,057 complaints name the part, and far fewer
            describe the fault. A system that confidently reports 1,057 has done
            the arithmetic correctly and answered a different question.
          </p>
          <p>
            How many fewer isn’t settled, and this page won’t pick one. Three
            ways of deciding which complaints “describe the recalled fault” give
            103, 93 and 89. Only the 89 has its rule written down (the phrase
            above), and it splits the 1,057 into 89 and 968. The lesson is that{' '}
            <strong>an answer key must record the rule behind a number, not only
            the number.</strong> Without it, three careful people will get three
            numbers.
          </p>
          <p>
            One more trap: a complaint can name several parts (21,747 of the
            70,194 do). The first run of the Odyssey check counted rows after
            splitting those lists and got 675 instead of 400. It was the third
            time this engagement met that mistake, after 1,407 recall rows that
            were 107 campaigns and 12 death complaints that were 5. So the part
            test asks whether a matching part <em>exists</em>, which can never
            count one complaint twice.
          </p>
        </>
      }
      terms={['answerKey', 'filter', 'tool', 'corpus']}
      hood={<CountModal />}
    />
  );
}

/* ── 4.4b · complaints_citing ─────────────────────────────────────────────── */

function ComplaintsCiting() {
  return (
    <Step
      n="4.4b"
      title={TITLES['4.4b']}
      when={WHEN['4.4b']}
      plain={
        <p>
          Give it a recall number and it finds the complaints where the owner
          typed that number into their own account of what happened. For{' '}
          <code>20V197000</code> there are seven.
        </p>
      }
      why={
        <p>
          The F-150 question asks whether the fix is holding. Complaints about
          the same <em>part</em> are evidence by similarity, and that is exactly
          the trap: 1,057 share the part, and far fewer describe the fault. An
          owner who quotes the recall number had it in front of them. That is{' '}
          <strong>evidence by reference</strong>, the strongest the corpus
          offers. It still isn’t proof that the fix failed, because a complaint
          is an allegation and not a finding.
        </p>
      }
      code={
        <>
          <Figure caption="Check the recall exists, then look for its number in the text" from="excerpt" source="apps/ai/safety/src/tools/complaints-citing.tool.ts">
            <Code
              path="apps/ai/safety/src/tools/complaints-citing.tool.ts (shortened)"
              mark={[12]}
              lines={[
                '    // THE CAMPAIGN IS CHECKED FIRST, so "no complaints cite it" and "that',
                '    // campaign is not here" cannot collapse into the same empty list. Same',
                '    // three-silences rule as 4.1 and 4.2: an empty result means nothing until',
                '    // you know which emptiness it is.',
                '    const { rows: exists } = await client.query(',
                "      `select 1 from ${TABLE} where metadata->>'kind'='recall' and metadata->>'id'=$1 limit 1`,",
                '      [id],',
                '    );',
                '    const campaignExists = exists.length > 0;',
                '',
                '    const { rows } = await client.query(',
                '      `select metadata, content from ${TABLE}',
                "        where metadata->>'kind' = 'complaint' and content like '%' || $1 || '%'",
                "        order by metadata->>'filed'`,",
                '      [id],',
                '    );',
              ]}
            />
          </Figure>

          <Figure caption="Two links to a recall — the one that was designed, and the one that works" source="measured over the corpus · complaints-citing.tool.ts">
            <Table
              head={['Link', 'How often it resolves to a recall we hold']}
              rows={[
                ['Investigation → recall, the documented field', '114 investigations; 42 carry a campaign number; 14 resolve (12%)'],
                ['Complaint → recall, typed by owners', '5,361 complaints name a campaign; 689 distinct campaigns; 563 resolve'],
              ]}
              lit={[1]}
            />
          </Figure>

          <Figure caption="What it found for 20V197000" source="pnpm safety:citing — checked with grep over the raw file">
            <Table
              head={['Looked for', 'Found']}
              rows={[
                [<>Complaints naming <code>20V197000</code></>, '7 — the tool and grep agree'],
                [<>One of them, <code>11618838</code></>, <>Filed under model <code>F-250 SD</code>; its text opens “The contact owns a 2020 Ford F-150.”</>],
                [<>Complaints naming <code>20S18</code>, Ford’s own number for the recall</>, '0'],
              ]}
              lit={[1]}
            />
          </Figure>
        </>
      }
      learned={
        <>
          <p>
            <strong>Not in the plan, and added after measuring.</strong> It came
            from measuring the corpus for a graph. The link everyone expects,
            from an investigation to the recall it led to, resolves only 14
            times out of 114. The link that works is one nobody designed: owners
            typing a campaign number into their own complaint. Its rule is one
            hop, not a graph. A graph database, node embeddings and community
            detection would all be ceremony around a string match.
          </p>
          <p>
            It also found the honest limit of this whole stage. Complaint{' '}
            <code>11618838</code> is filed as an <code>F-250 SD</code>, but the
            owner says it’s an F-150. The vehicle filter trusts the field, so{' '}
            <code>search_complaints</code> <em>cannot</em> return it. Filtering on
            fields beats matching prose, and it inherits whatever the fields get
            wrong: 1 of the 177 complaints saying “owns a 2020 Ford F-150” is
            filed as something else. That’s also why this tool isn’t a duplicate
            of 4.3. Reference reaches what the filter misses.
          </p>
          <p>
            One idea was measured and deliberately not built. Owners might quote
            Ford’s own recall number, <code>20S18</code>, instead of NHTSA’s. None
            do, so there is no second lookup. An idea that measures to nothing is
            still worth writing down, or somebody builds it later.
          </p>
        </>
      }
      terms={['campaign', 'odi', 'filter', 'nhtsa']}
      hood={<CitingModal />}
    />
  );
}

/* ── 4.5 · measure again ──────────────────────────────────────────────────── */

/**
 * Stage 4.5, per case.
 *
 * REC-005 IS LISTED BECAUSE IT DID NOT MOVE. Two of the three cases improved;
 * the third was already right, and what makes it right is an empty result.
 * Showing only the two that moved would make 0.40 → 1.00 read as though
 * everything did.
 */
const PER_CASE: string[][] = [
  ['REC-001', '0.00', '1.00', 'The recall first, then the complaint the key names'],
  ['REC-004', '0.20', '1.00', 'All five death complaints, at positions 1 to 5'],
  ['REC-005', '1.00', '1.00', 'Already 1.00 in stage 3.7 against an easy bar (any 1 of 400 complaints). The right answer is that no recall exists, and the recall lookup still correctly comes back empty.'],
];

function MeasureAgain() {
  return (
    <Step
      n="4.5"
      title={TITLES['4.5']}
      when={WHEN['4.5']}
      plain={
        <p>
          Re-run stage 3.7’s test (do the documents we already know are right
          come back in the top six?), but this time through the tools instead of
          plain search. There is no model yet, so a person decides which tool to
          call with which arguments. Each routing uses only what its question
          says. None names an answer the key is looking for.
        </p>
      }
      why={
        <>
          <p>
            This is the step that decided whether the others were worth
            building. No step starts before the one above it can be checked. If
            the number hadn’t moved, stage 3.7’s diagnosis would have been
            wrong, and the tools wouldn’t be the answer. Stage 5 would not have
            begun, because there would be nothing worth writing an answer format
            around.
          </p>
          <p>
            Five tools that each look good on their own is a different claim
            from a measurement. Until this ran, two cases looking better in
            isolation was only a hope.
          </p>
        </>
      }
      code={
        <>
          <Figure caption="recall@6 over the answer key’s 3 retrieval cases — hand-routed, so a ceiling, not a score" source="pnpm safety:measure-tools · n = 3">
            <Numbers
              items={[
                { value: '0.40', label: 'Plain search, stage 3.7 — 3 retrieval cases' },
                { value: '1.00', label: 'Through the tools, hand-routed — a ceiling over the same 3 cases, not a model’s score' },
              ]}
            />
            <Table
              head={['Case', 'Plain search', 'Tools, hand-routed', 'What happened']}
              numeric={[1, 2]}
              rows={PER_CASE}
              lit={[0, 1]}
            />
            <Note>
              <strong>Two of the three moved.</strong> The third is listed rather
              than quietly dropped, because without it “0.40 to 1.00” reads as
              though every case improved.
            </Note>
          </Figure>

          <Figure caption="The hardest case needed two calls, and the second depends on the first" from="excerpt" source="apps/ai/safety/src/cli/measure-tools.ts">
            <Code
              path="apps/ai/safety/src/cli/measure-tools.ts — the REC-001 routing (shortened)"
              mark={[12, 18]}
              lines={[
                "  'REC-001': {",
                '    // …',
                '    run: async () => {',
                '      const recalls = await findRecalls({',
                "        make: 'FORD',",
                "        model: 'F-150',",
                "        component: 'POWER TRAIN:AUTOMATIC TRANSMISSION',",
                '      });',
                '      // …',
                '      // THE DATE COMES FROM THE FIRST CALL, not from the key. "After the',
                '      // recall" is only meaningful once you know when owners were notified,',
                '      // and that is what makes this two calls rather than two lookups.',
                '      const notified = recalls.matches[0]?.owners_notified ?? undefined;',
                '      const complaints = await searchComplaints(',
                '        {',
                "          make: 'FORD',",
                "          model: 'F-150',",
                "          component: 'POWER TRAIN',",
                '          filed_after: notified,',
                '        },',
                "        'will not go into park, rolls away, gear shift indicator wrong',",
                '        DEFAULT_K - out.length,',
                '      );',
              ]}
            />
            <Note>
              This is what “hand-routed” means in practice. A person wrote which
              tool to call, in what order, and that the recall’s notification
              date becomes the complaint search’s filter. In stage 6 a model has
              to work that out for itself.
            </Note>
          </Figure>

          <Figure caption="The five tools: how each one answers, where it came from, and whether 4.5 used it" from="cited" source="docs/safety/STAGE4.md §2–3 · apps/ai/safety/src/cli/measure-tools.ts">
            <Table
              head={['Tool', 'Answers from', 'In the plan?', 'Used in 4.5?']}
              rows={[
                [<code>get_recall</code>, 'Structure — a field says so', 'Yes, unchanged', 'No: none of the three retrieval cases names a campaign'],
                [<code>find_recalls</code>, 'Structure — a field says so', 'No, added after measuring', 'Yes'],
                [<code>search_complaints</code>, 'Meaning — stage 3’s own way, now inside a filter', 'Yes, but rebuilt', 'Yes'],
                [<code>count_complaints</code>, 'Arithmetic — how many, not which', 'No, added after measuring', 'No: it returns a number, not a document'],
                [<code>complaints_citing</code>, 'Reference — somebody named it', 'No, added after measuring', 'No: calling it would have lowered the score'],
              ]}
              lit={[2]}
            />
            <Note>
              The highlighted row is stage 3 in its entirety. Every other row is
              a question the old pipeline had no way to ask.
            </Note>
          </Figure>
        </>
      }
      learned={
        <>
          <p>
            <strong>The hand-routed 1.00 is a ceiling over 3 cases, and it must
            never be shown alone.</strong> A person routed every call, so it answers “are
            the right documents reachable at all?” and not “will a model ask for
            them correctly?”. Stage 6 measures the second with a model doing the
            routing, and it is lower. Across three runs it came out between 0.17
            and 0.50, reported as a range rather than an average because the
            runs disagree. Much of that gap is the metric rather than the model:
            one case scores zero for proving an absence without fetching a
            complaint to quote. A ceiling quoted as a score is how a demo
            becomes a promise.
          </p>
          <p>
            Only two of the five tools were needed to reach it, and one of the
            three left out was left out because calling it would have{' '}
            <strong>lowered</strong> the score. The seven complaints that cite
            recall <code>20V197000</code> are the best evidence for “is the fix
            holding?”. But the one complaint the key names, <code>11353867</code>,
            isn’t among them, so adding them would push it out of the six slots.
            That is a limit of the measurement, not of the tool: recall@6 scores
            what the key <em>named</em>, not what a good answer would cite. It
            is why stage 7 scores the answer rather than the retrieval.
          </p>
        </>
      }
      terms={['recallAtK', 'ceiling', 'answerKey', 'agent']}
      hood={<MeasureHood />}
    />
  );
}

/**
 * 4.5 has no dialog of its own among the tool panels, so its "under the hood"
 * is a content-only `Hood`: the other two routings, and the slot-budget finding
 * from STAGE4.md §4b, which is about the metric rather than any one tool.
 */
function MeasureHood() {
  return (
    <Hood
      blurb="The other two routings, and why a six-slot score misled us twice"
      title="Inside step 4.5"
      sub="Measuring through the tools, by hand, and what the metric can’t see"
    >
      <HoodSection title="The other two routings, exactly as written">
        <HoodText>
          Each routing uses only what its question says: “Tesla Model 3”, “a
          death”, “Honda Odyssey”, “forward-collision braking”. A routing that
          filtered on the answer would measure nothing at all.
        </HoodText>
        <Figure caption="The calls, as the harness prints them" from="excerpt" source="apps/ai/safety/src/cli/measure-tools.ts">
          <Code
            path="apps/ai/safety/src/cli/measure-tools.ts (shortened)"
            lines={[
              "  'REC-004': {",
              "    calls: ['search_complaints({ make: TESLA, model: MODEL 3, min_deaths: 1 }, \"fatal accident\")'],",
              '    // …',
              "  'REC-005': {",
              '    calls: [',
              "      'find_recalls({ make: HONDA, model: ODYSSEY, component: FORWARD COLLISION AVOIDANCE })  → []',",
              "      'search_complaints({ make: HONDA, model: ODYSSEY, component: FORWARD COLLISION AVOIDANCE }, \"automatic braking…\")',",
              '    ],',
            ]}
          />
        </Figure>
        <HoodText>
          For REC-004, <code>min_deaths: 1</code> <em>is</em> the question, and
          the search words barely matter. For REC-005, the empty recall list is
          the answer, and the complaints are the evidence that the absence was
          looked for. The recall call still runs and still counts: if it had
          returned something, that would have been the answer instead.
        </HoodText>
      </HoodSection>

      <HoodSection title="recall@6 has a slot budget, and it distorted twice">
        <HoodText>
          Both came out of building this stage, two cases apart, and neither is
          about retrieval.
        </HoodText>
        <Figure caption="Same artefact, two costumes" from="cited" source="docs/safety/STAGE4.md §4b">
          <Table
            head={['Case', 'What happened']}
            rows={[
              ['REC-004', 'The key named 12 targets for a 6-slot metric, so recall@6 could not exceed 0.5, by arithmetic. A healthy retriever would have scored as a failure. It surfaced only because the 12 turned out to be a row count, and the real figure is 5.'],
              ['REC-001', 'The 7 complaints citing the recall are the best evidence for “is the fix holding”, and none of them is the target the key named. Adding them pushes the named target out of 6 slots. The metric would punish calling the right tool.'],
            ]}
          />
        </Figure>
        <HoodText>
          A fixed-size recall score measures what the key <em>named</em>, not
          what a good answer would cite. With few targets it flatters; with many
          it caps; and it is actively hostile to a tool that returns more
          correct material than the key happened to list. It is still the right
          measure for stages 3 and 4, which ask only whether the machine can
          reach the document. It stops being the right measure once an answer
          is being judged, which is stage 7.
        </HoodText>
        <HoodText>
          Worth carrying to another engagement: when a retrieval number looks
          strange, check the slot budget before checking the retriever.
        </HoodText>
      </HoodSection>

      <HoodSection title="What this stage deliberately does not do">
        <HoodText>
          No model call: the loop that lets a model choose a tool is stage 6. No
          answer format: that is stage 5, split out because a tool is a question
          you can ask the data and a format is a shape an answer must arrive in,
          and neither needs the other to be testable. No prompt, no evals and
          no page. Each of those is a later stage.
        </HoodText>
      </HoodSection>
    </Hood>
  );
}
