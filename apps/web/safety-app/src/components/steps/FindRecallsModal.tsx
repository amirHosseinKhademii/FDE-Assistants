/**
 * Inside `find_recalls` — stage 4.2, the tool whose answer is usually nothing.
 *
 * ── THE ANCHOR IS THE ZERO, AND WHAT SITS BESIDE IT ───────────────────────
 *
 * A bare empty list is indistinguishable from a tool that did not look. So the
 * anchor is both halves at once: zero forward-collision campaigns on the
 * Odyssey, and 22 campaigns across 16 other components on the same vehicle.
 * The second number is what turns "I found nothing" into "I checked, and it is
 * not there".
 *
 * ── THE PUNCTUATION SECTION IS THE ONE WORTH READING TWICE ────────────────
 *
 * NHTSA punctuates its component hierarchy two ways WITHIN A SINGLE VEHICLE'S
 * OWN RECALLS. Matching one spelling returns four of five and nothing reports a
 * problem — and where the expected answer is already "none", that produces a
 * false negative which AGREES WITH THE ANSWER KEY. Two things agreeing is not
 * two things being right, and no check would ever have caught it.
 *
 * ── THE NUMBERS HERE WERE WRONG ONCE AND ARE NOT NOW ──────────────────────
 *
 * An earlier draft of this panel was going to say 14 other components and four
 * back-over campaigns. Both came from a query with a `limit 8` on it. They are
 * 16 and 5. The panel was held until the checks ran, which is the only reason
 * the wrong pair never shipped.
 *
 * ── CORRECTED 2026-09-27, AGAINST THE CODE AS IT NOW STANDS ───────────────
 *
 * - The component rule was quoted from `find-recalls.tool.ts:100–101`. It moved
 *   to `tools/matching.ts` as `COMPONENT_MATCH` when it was found written twice
 *   (STAGE4.md §7); `find-recalls` now only aliases it. The quote and path
 *   follow it, marked as an excerpt with no line numbers, since the file moved
 *   once already.
 * - "What the tool returns when it finds nothing" was a paraphrase inside a
 *   `Data` block, which promises never to paraphrase. It is now the tool's own
 *   note, from `pnpm safety:recalls-for HONDA ODYSSEY "FORWARD COLLISION
 *   AVOIDANCE"` run on 2026-09-27 — which also confirmed the 16 components.
 * - The self-test is described as what it asserts — that the prefix finds the
 *   back-over campaigns — rather than "finds all five", which it prints but
 *   does not assert.
 * - What happened when a model used it (stage 6) and how its answers scored
 *   (stage 7) are added, from `INGESTION.md` and `STAGE7.md`.
 *
 * Restyled the same day for the `/steps` redesign: the shared trigger,
 * sentence-case labels, 1rem body text, the kit's `Numbers` and `Table`.
 */
import { useCallback, useState } from 'react';
import { OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import { Code, Data } from '@veresk/surface';
import type { ReactNode } from 'react';
import { HoodButton, HoodSection, HoodText } from '@veresk/learn/steps';
import { Numbers, Table } from '@veresk/learn/steps';

/** Honda Odyssey campaigns whose component begins "BACK OVER PREVENTION". */
const BACK_OVER = [
  { id: '20V438000', component: 'BACK OVER PREVENTION: SENSING SYSTEM: CAMERA', spaced: true },
  { id: '20V439000', component: 'BACK OVER PREVENTION: SENSING SYSTEM: CAMERA', spaced: true },
  { id: '20V440000', component: 'BACK OVER PREVENTION: SENSING SYSTEM: CAMERA', spaced: true },
  { id: '23V431000', component: 'BACK OVER PREVENTION:DISPLAY FUNCTION', spaced: false },
  { id: '26V423000', component: 'BACK OVER PREVENTION: SENSING SYSTEM: CAMERA', spaced: true },
] as const;

/**
 * THE SAME TRAP, FIVE TIMES — every one a list unnested or a join counted
 * without collapsing it back. The fifth is the list `count-complaints.tool.ts`
 * keeps in its own comment.
 */
const TALLY: readonly ReactNode[][] = [
  ['ODI recalls, counted as rows rather than campaigns', '1,407', '107'],
  ['Complaints involving a death, counted as rows', '12', '5'],
  ['Odyssey forward-collision complaints, counted as rows', '675', '400'],
  [<>Rows for <code>20V197000</code>, which is one campaign</>, '3', '1'],
  ['The Odyssey again, on the first run of the component filter', '675', '400'],
];

export function FindRecallsModal() {
  const [from, setFrom] = useState<Origin | null>(null);
  const open = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => setFrom(originOf(e.currentTarget)),
    [],
  );

  return (
    <>
      <HoodButton
        blurb="How a tool can say “there is no recall for that” in a way you can trust."
        onClick={open}
      />

      {from && <FindRecallsPanel from={from} onClose={() => setFrom(null)} />}
    </>
  );
}

function FindRecallsPanel({ from, onClose }: { from: Origin; onClose: () => void }) {
  return (
    <OriginDialog
      from={from}
      label="Inside find_recalls"
      tone="var(--color-cal-sky)"
      onClose={onClose}
      header={
        <>
          <p className="text-[1rem] font-semibold text-ui-fg">
            Inside <span className="font-mono">find_recalls</span>
          </p>
          <p className="mt-0.5 text-[0.875rem] text-ui-faint">
            Step 4.2 · built, and checked against the answer key
          </p>
        </>
      }
    >
      {/* THE ANCHOR IS BOTH HALVES OF THE ANSWER. A zero on its own is
          indistinguishable from a tool that did not look. */}
      <div className="sticky -top-3.5 z-20 -mx-5 -mt-3.5 mb-7 border-b border-ui-line bg-ui-bg px-5 pt-3.5 pb-4">
        <p className="cal-label pb-2.5" data-tone="quiet">
          Is there a recall for the Odyssey's forward-collision braking?
        </p>
        <Numbers
          items={[
            { value: '0', label: 'Campaigns for that part' },
            { value: '22', label: 'Campaigns on this vehicle, across 16 other components' },
          ]}
        />
      </div>

      <div className="pb-2 [&_.snip-frame]:my-1">
        <HoodSection title="What it does">
          <HoodText>
            It asks one question: is there a recall for <em>this car</em>, for{' '}
            <em>this part</em>? Every recall lists the vehicles and the part it
            covers, so the answer can honestly be “no”.
          </HoodText>
          <Key>
            Search can never say no. It always hands back something that looks
            close enough, and you are left guessing whether it counts. This can
            say no, because a recall literally lists the car and the part it
            covers — so “no match” is a fact rather than a hunch.
          </Key>
        </HoodSection>

        <HoodSection title="And “no” comes with proof">
          <Data
            path="pnpm safety:recalls-for HONDA ODYSSEY &quot;FORWARD COLLISION AVOIDANCE&quot;"
            note="The note it returns when nothing matches · run 2026-09-27"
            mark={[1]}
            lines={[
              'No campaign covers HONDA ODYSSEY for FORWARD COLLISION AVOIDANCE.',
              'The vehicle DOES have 16 other recalled component(s) in this slice,',
              'so the absence is specific to what was asked, not a gap in coverage.',
              'Do not cite one of those as though it answered the question.',
            ]}
          />
          <Why>
            That is the difference between “I found nothing” and “I checked, and
            it is not there”. The second number is not decoration: a bare empty
            list is indistinguishable from a tool that failed to run, and the
            model has no way to tell them apart. The result also carries the
            names of those 16 components, so the claim can be checked.
          </Why>
          <Why>
            The last line matters too. A vehicle with 22 campaigns on it gives a
            model 22 chances to cite the wrong one, and the most likely wrong
            answer to this question is a real recall for a different part.
          </Why>
        </HoodSection>

        <HoodSection title="Three different kinds of nothing">
          <Data
            path="And they must not be rendered alike"
            lines={[
              'Odyssey + FORWARD COLLISION   the car is here, 16 other components',
              '                              are recalled, this one is not',
              'DeLorean DMC-12               the car is not in this slice at all',
              '99V999999                     a well-formed campaign id, not here',
            ]}
          />
          <Why>
            The third is the one step 4.1 already tells apart from a typo — which
            makes four silences in all, and each means something different to
            whoever is answering. A tool that returns the same empty result for
            every one of them has thrown that away before the model ever sees it.
          </Why>
        </HoodSection>

        <HoodSection title="The spacing, and why there is a check about punctuation">
          <HoodText>
            NHTSA punctuates its component hierarchy two ways —{' '}
            <strong className="font-semibold text-ui-fg">
              within a single vehicle's own recalls.
            </strong>
          </HoodText>
          <Data
            path="Every Odyssey campaign beginning “BACK OVER PREVENTION”"
            note="5 campaigns, 4 spaced and 1 not"
            mark={[3]}
            lines={BACK_OVER.map(
              (r) => `${r.component.padEnd(46)}${r.id}   ${r.spaced ? 'spaced' : 'UNSPACED'}`,
            )}
          />
          <HoodText>
            Match one spelling only and you return{' '}
            <strong className="font-semibold text-ui-fg">four of five</strong>, with
            nothing anywhere reporting a problem.
          </HoodText>
          <Key>
            That matters most where the answer is <em>already</em> “none”. If the
            Odyssey's forward-collision result came back empty because of a space
            rather than because of the data, it would agree with the answer key
            for the wrong reason — a false negative no check would ever catch,
            because the key says zero and the tool says zero.
          </Key>
          <Why>
            Two things agreeing is not two things being right. The check on
            “BACK OVER PREVENTION” exists to prove the zero above it is real: it
            asks the prefix for a part NHTSA spells both ways on this same
            vehicle, and prints how many came back.
          </Why>
          <Code
            path="apps/ai/safety/src/tools/matching.ts"
            note="Excerpt · the rule find_recalls imports"
            lang="typescript"
            mark={[1]}
            lines={[
              'export const COMPONENT_MATCH = (col: string, param: string) =>',
              "  `(${col} = ${param} or ${col} like ${param} || ':%' or ${col} like ${param} || ': %')`;",
            ]}
          />
          <HoodText>
            Three forms: the exact value, the colon, and the colon with a space.
            It is NHTSA's own hierarchy rather than a shape invented for the
            filter.
          </HoodText>
          <Why>
            It lives in its own file because it was first written twice — once
            here, and once in the builder <code>count_complaints</code> uses. Two
            definitions of what a component means can drift apart with nothing
            failing, and then two tools quietly disagree about the same filter.
            Model names got the same “exact, or a child of it” rule later, after
            a real question failed: “F-250” found nothing, because NHTSA files
            that truck as “F-250 SD”.
          </Why>
        </HoodSection>

        <HoodSection title="And the prefix does not over-reach">
          <Data
            path="find_recalls(FORD, F-150, POWER TRAIN:AUTOMATIC TRANSMISSION)"
            lines={[
              '20V197000 | POWER TRAIN:AUTOMATIC TRANSMISSION:GEAR POSITION INDICATION (PRNDL)',
            ]}
          />
          <Why>
            One campaign. The prefix reaches the PRNDL branch and does not drag
            in the rest of <code>POWER TRAIN</code> — which matters because one
            question needs that branch specifically while another needs a whole
            subtree. Same rule, both behaviours, and the caller chooses by how
            much of the path they give it.
          </Why>
        </HoodSection>

        <HoodSection title="The same trap, for the fifth time">
          <HoodText>
            Matching on vehicles means unnesting a list, and campaign{' '}
            <code>20V197000</code> covers three: Expedition, F-150, Ranger.
            Unnested, that is{' '}
            <strong className="font-semibold text-ui-fg">three rows</strong> for
            one campaign — so the query counts distinct campaigns for that reason
            alone.
          </HoodText>
          <Table
            head={['What was counted', 'Rows', 'Really']}
            numeric={[1, 2]}
            lit={[3]}
            rows={TALLY.map((r) => [...r])}
          />
          <Why>
            Every one of those is a list unnested, or a join counted without
            collapsing it back, and every one produced a number that was larger
            and wrong.
          </Why>
        </HoodSection>

        <HoodSection title="The checks">
          <Data
            path="pnpm safety:recalls-for"
            note="7 of 7"
            mark={[1, 2]}
            lines={[
              'ok  REC-005 · no campaign covers the Odyssey forward-collision braking',
              'ok  REC-005 · the empty result carries evidence that it was looked for',
              'ok  the component prefix matches across NHTSA’s inconsistent spacing',
              'ok  REC-001 · the F-150 transmission recall is found by vehicle + component',
              'ok  the prefix does not drag in the rest of POWER TRAIN',
              'ok  a campaign covering several vehicles is returned ONCE, not once per vehicle',
              'ok  an unknown vehicle is distinguished from a vehicle with no matching recall',
            ]}
          />
          <Why>
            The two marked ones are the pair that make the zero trustworthy: one
            says the absence carries its evidence, the other that the absence is
            not an artefact of punctuation.
          </Why>
        </HoodSection>

        <HoodSection title="And once a model was choosing the tools">
          <HoodText>
            In stage 6 the model was asked the Odyssey question itself. It called{' '}
            <code>find_recalls</code>, got the empty result, and said plainly
            that no recall covers that part. Two rules in the answer contract now
            lean on this tool: an answer may not cite a campaign after it came
            back empty, and an answer that rests on the empty result must record
            the search it came from.
          </HoodText>
          <Why>
            In stage 7 that question's answer checks passed 3 of 3 in all four
            baselines. The document-retrieval score gives the same case{' '}
            <strong className="font-semibold text-ui-fg">0.00</strong> on every
            model run — because it proved the absence here and never fetched a
            complaint to corroborate it. The metric charges it for taking the
            shorter, stronger route. (Across all three cases the model-routed
            runs span 0.17 to 0.50 — a range, not an average.)
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
