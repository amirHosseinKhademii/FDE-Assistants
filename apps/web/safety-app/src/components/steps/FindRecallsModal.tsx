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
 */
import { useCallback, useState } from 'react';
import { Mono, OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import { Code, Data } from '@veresk/surface';

/** Honda Odyssey campaigns whose component begins "BACK OVER PREVENTION". */
const BACK_OVER = [
  { id: '20V438000', component: 'BACK OVER PREVENTION: SENSING SYSTEM: CAMERA', spaced: true },
  { id: '20V439000', component: 'BACK OVER PREVENTION: SENSING SYSTEM: CAMERA', spaced: true },
  { id: '20V440000', component: 'BACK OVER PREVENTION: SENSING SYSTEM: CAMERA', spaced: true },
  { id: '23V431000', component: 'BACK OVER PREVENTION:DISPLAY FUNCTION', spaced: false },
  { id: '26V423000', component: 'BACK OVER PREVENTION: SENSING SYSTEM: CAMERA', spaced: true },
] as const;

/**
 * THE SAME TRAP, FIVE TIMES, on five different questions — every one a list
 * unnested or a join counted without collapsing it back.
 */
const TALLY = [
  { rows: '1,407', real: '107', what: 'ODI recalls were campaigns' },
  { rows: '12', real: '5', what: 'death complaints were complaints' },
  { rows: '675', real: '400', what: 'Odyssey complaints were complaints' },
  { rows: '3', real: '1', what: 'rows for 20V197000 are one campaign' },
] as const;

export function FindRecallsModal() {
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
          Inside <Mono>find_recalls</Mono> — how a tool says “no” in a way you can
          trust
        </span>
        <span className="font-mono text-sm text-ui-faint transition-colors group-hover:text-ui-fg">
          open →
        </span>
      </button>

      {from && <FindRecallsPanel from={from} onClose={() => setFrom(null)} />}
    </>
  );
}

function FindRecallsPanel({ from, onClose }: { from: Origin; onClose: () => void }) {
  return (
    <OriginDialog
      from={from}
      label="Inside find_recalls"
      tone="var(--color-cal-1)"
      onClose={onClose}
      header={
        <>
          <p className="font-mono text-sm text-ui-fg">Inside find_recalls</p>
          <p className="mt-0.5 text-[0.75rem] text-ui-faint">
            stage 4.2 · built, and checked against the answer key
          </p>
        </>
      }
    >
      {/* THE ANCHOR IS BOTH HALVES OF THE ANSWER. A zero on its own is
          indistinguishable from a tool that did not look. */}
      <div className="sticky -top-3.5 z-20 -mx-5 -mt-3.5 mb-7 border-b border-ui-line bg-ui-bg px-5 pt-3.5 pb-4">
        <p className="pb-2.5 font-mono text-[0.625rem] tracking-[0.08em] text-ui-faint uppercase">
          is there a recall for the Odyssey's forward-collision braking?
        </p>
        <div className="flex flex-wrap items-baseline gap-x-10 gap-y-3">
          <div>
            <p className="font-mono text-3xl text-ui-fg">0</p>
            <p className="mt-0.5 font-mono text-[0.625rem] tracking-[0.06em] text-ui-faint uppercase">
              campaigns for that part
            </p>
          </div>
          <div>
            <p className="font-mono text-3xl" style={{ color: 'var(--color-cal-1)' }}>
              22
            </p>
            <p className="mt-0.5 font-mono text-[0.625rem] tracking-[0.06em] text-ui-faint uppercase">
              campaigns on this vehicle, across 16 other components
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-9 pb-2">
        <section>
          <H>What it does</H>
          <P>
            It asks: is there a recall for <em>this car</em>, for{' '}
            <em>this part</em>?
          </P>
          <Key>
            Search can never say no. It always hands back something that looks
            close enough, and you are left guessing whether it counts. This can
            say no, because a recall literally lists the car and the part it
            covers — so “no match” is a fact rather than a hunch.
          </Key>
        </section>

        <section>
          <H>And “no” comes with proof</H>
          <Data
            path="what the tool returns when it finds nothing"
            mark={[1]}
            lines={[
              'No recall for forward-collision braking.',
              'This vehicle has 16 other recalled components, so I looked properly —',
              "this part isn't among them. Don't cite one of the others instead.",
            ]}
          />
          <Why>
            That is the difference between “I found nothing” and “I checked, and
            it is not there”. The second number is not decoration: a bare empty
            list is indistinguishable from a tool that failed to run, and the
            model has no way to tell them apart.
          </Why>
          <Why>
            The last line matters too. A vehicle with 22 campaigns on it gives a
            model 22 chances to cite the wrong one, and the most likely wrong
            answer to this question is a real recall for a different part.
          </Why>
        </section>

        <section>
          <H>Three different kinds of nothing</H>
          <Data
            path="and they must not be rendered alike"
            lines={[
              'Odyssey + FORWARD COLLISION   the car is here, 16 other components',
              '                              are recalled, this one is not',
              'DeLorean DMC-12               the car is not in this slice at all',
              '99V999999                     a well-formed campaign id, not here',
            ]}
          />
          <Why>
            The third is the one stage 4.1 already distinguishes from a typo. All
            four of those silences mean something different to whoever is
            answering, and a tool that returns the same empty result for each has
            thrown that away before the model ever sees it.
          </Why>
        </section>

        <section>
          <H>The spacing, and why there is a check about punctuation</H>
          <P>
            NHTSA punctuates its component hierarchy two ways —{' '}
            <span className="text-ui-fg">
              within a single vehicle's own recalls.
            </span>
          </P>
          <Data
            path="every Odyssey campaign beginning “BACK OVER PREVENTION”"
            note="5 campaigns, 4 spaced and 1 not"
            mark={[3]}
            lines={BACK_OVER.map(
              (r) => `${r.component.padEnd(46)}${r.id}   ${r.spaced ? 'spaced' : 'UNSPACED'}`,
            )}
          />
          <P>
            Match one spelling only and you return{' '}
            <span className="text-ui-fg">four of five</span>, with nothing
            anywhere reporting a problem.
          </P>
          <Key>
            That matters most where the answer is <em>already</em> “none”. If the
            Odyssey's forward-collision result came back empty because of a space
            rather than because of the data, it would agree with the answer key
            for the wrong reason — a false negative no check would ever catch,
            because the key says zero and the tool says zero.
          </Key>
          <Why>
            Two things agreeing is not two things being right. The check that
            “BACK OVER PREVENTION” finds all five exists for no other purpose
            than to prove the zero above it is real.
          </Why>
          <Code
            path="apps/ai/safety/src/tools/find-recalls.tool.ts:100–101"
            lang="typescript"
            startLine={100}
            mark={[1]}
            lines={[
              'const COMPONENT_PREFIX = (col: string, param: string) =>',
              "  `(${col} = ${param} or ${col} like ${param} || ':%' or ${col} like ${param} || ': %')`;",
            ]}
          />
          <P>
            Three forms: the exact value, the colon, and the colon with a space.
            It is NHTSA's own hierarchy rather than a shape invented for the
            filter.
          </P>
        </section>

        <section>
          <H>And the prefix does not over-reach</H>
          <Data
            path="find_recalls(FORD, F-150, “POWER TRAIN:AUTOMATIC TRANSMISSION”)"
            lines={[
              '20V197000 | POWER TRAIN:AUTOMATIC TRANSMISSION:GEAR POSITION INDICATION (PRNDL)',
            ]}
          />
          <Why>
            One campaign. The prefix reaches the PRNDL branch and does not drag
            in the rest of <Mono>POWER TRAIN</Mono> — which matters because one
            question needs that branch specifically while another needs a whole
            subtree. Same rule, both behaviours, and the caller chooses by how
            much of the path they give it.
          </Why>
        </section>

        <section>
          <H>The same trap, for the fifth time</H>
          <P>
            Matching on vehicles means unnesting a list, and campaign{' '}
            <Mono>20V197000</Mono> covers three: Expedition, F-150, Ranger.
            Unnested, that is <span className="text-ui-fg">three rows</span> for
            one campaign — so the query counts distinct campaigns for that reason
            alone.
          </P>
          <div className="cal-panel grid gap-2">
            {TALLY.map((t) => (
              <div
                key={t.what}
                className="flex flex-wrap items-baseline gap-x-3 font-mono text-[0.75rem]"
              >
                <span className="w-14 shrink-0 text-right text-ui-faint">{t.rows}</span>
                <span className="text-ui-faint">→</span>
                <span className="w-12 shrink-0 text-ui-fg">{t.real}</span>
                <span className="text-ui-dim">{t.what}</span>
              </div>
            ))}
          </div>
          <Why>
            Every one of those is a list unnested or a join counted without
            collapsing it back, on a different question, and every one of them
            produced a number that was larger and wrong.
          </Why>
        </section>

        <section>
          <H>The checks</H>
          <Data
            path="pnpm safety:recalls-for"
            note="7 of 7"
            mark={[1, 2]}
            lines={[
              'ok  no campaign covers the Odyssey forward-collision braking',
              'ok  the empty result carries evidence that it was looked for',
              'ok  the component prefix matches across the inconsistent spacing',
              'ok  the F-150 transmission recall is found by vehicle + component',
              'ok  the prefix does not drag in the rest of POWER TRAIN',
              'ok  a campaign covering several vehicles is returned ONCE',
              'ok  an unknown vehicle is distinguished from one with no match',
            ]}
          />
          <Why>
            The two marked ones are the pair that make the zero trustworthy: one
            says the absence carries its evidence, the other says the absence is
            not an artefact of punctuation.
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
