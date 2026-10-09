/**
 * Inside `get_recall` — stage 4.1, the first tool.
 *
 * ── THE ANCHOR IS WHY SEARCH CANNOT DO THIS ────────────────────────────────
 *
 * The tool itself is one equality test, and explaining it takes a sentence. The
 * thing worth pinning is the result that made it necessary: asked for exactly
 * `20V197000`, search returned it fourth, behind a complaint about USB ports
 * and a recall about school bus cameras. That is the whole argument in four
 * rows, and it is measured rather than reasoned.
 *
 * ── AND THE TWO WAYS OF FINDING NOTHING ────────────────────────────────────
 *
 * A malformed id and an absent one look identical to a caller that only says
 * "not found", and they are completely different problems — one is "check your
 * spelling", the other is "this car may have an unaddressed defect". The tool
 * distinguishes them BEFORE any query runs, and the panel gives that its own
 * section because it is the part a reader is least likely to expect.
 *
 * ── NO LINE NUMBERS, BECAUSE THEY HAD MOVED ────────────────────────────────
 *
 * Every excerpt is verbatim from `apps/ai/safety/src/tools/get-recall.tool.ts`,
 * re-checked line for line against the file on 2026-09-27. The first version
 * carried the line numbers of the day it was written; later stages added a
 * `describes` field and longer comments above the query, and five of the seven
 * ranges had drifted by nine lines. So the blocks are marked as excerpts with
 * no gutter, the way `kit.tsx` argues for — a gutter promises the file says
 * this at that line, and the file keeps moving. The self-test listing uses the
 * check names `pnpm safety:recall` actually prints.
 *
 * ── RESTYLED 2026-09-27 ────────────────────────────────────────────────────
 *
 * For the `/steps` redesign: the shared `HoodButton` trigger, sentence-case
 * labels, body text at 1rem, and mono kept only for ids, code and output.
 */
import { useCallback, useState } from 'react';
import { OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import { Code, Data } from '@veresk/surface';
import type { ReactNode } from 'react';
import { HoodButton, HoodSection, HoodText } from '@veresk/learn/steps';

/** What search returned when asked for exactly that campaign. Stage 3.5's run. */
const SEARCH_SAID: { rank: number; what: string; wanted?: boolean }[] = [
  { rank: 1, what: 'A Lincoln Corsair complaint about USB ports' },
  { rank: 2, what: 'A Ford Ranger complaint' },
  { rank: 3, what: 'A recall about school bus cameras' },
  { rank: 4, what: '20V197000', wanted: true },
];

export function GetRecallModal() {
  const [from, setFrom] = useState<Origin | null>(null);
  const open = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => setFrom(originOf(e.currentTarget)),
    [],
  );

  return (
    <>
      <HoodButton
        blurb="Why looking a recall up by its number needed its own tool, when a search already existed."
        onClick={open}
      />

      {from && <GetRecallPanel from={from} onClose={() => setFrom(null)} />}
    </>
  );
}

function GetRecallPanel({ from, onClose }: { from: Origin; onClose: () => void }) {
  return (
    <OriginDialog
      from={from}
      label="Inside get_recall"
      tone="var(--color-cal-sky)"
      onClose={onClose}
      header={
        <>
          <p className="text-[1rem] font-semibold text-ui-fg">
            Inside <span className="font-mono">get_recall</span>
          </p>
          <p className="mt-0.5 text-[0.875rem] text-ui-faint">
            Step 4.1 · built, and checked against the answer key
          </p>
        </>
      }
    >
      {/* THE ANCHOR IS THE RESULT THAT MADE IT NECESSARY. */}
      <div className="sticky -top-3.5 z-20 -mx-5 -mt-3.5 mb-7 border-b border-ui-line bg-ui-bg px-5 pt-3.5 pb-4">
        <p className="cal-label pb-2.5" data-tone="quiet">
          What search returned when asked for exactly 20V197000
        </p>
        <ol className="grid gap-1.5">
          {SEARCH_SAID.map((r) => (
            <li key={r.rank} className="flex flex-wrap items-baseline gap-x-3 text-[0.9375rem]">
              <span className="w-5 shrink-0 font-mono text-ui-faint">{r.rank}.</span>
              <span className={r.wanted ? 'font-mono text-ui-fg' : 'text-ui-dim'}>{r.what}</span>
              {r.wanted && (
                <span className="text-[0.875rem] font-semibold text-cal-1">
                  ← the thing we asked for
                </span>
              )}
            </li>
          ))}
        </ol>
        <p className="pt-2.5 text-[0.875rem] text-ui-faint">Fourth — behind a bus.</p>
      </div>

      <div className="pb-2 [&_.snip-frame]:my-1">
        <HoodSection title="What it does">
          <HoodText>
            You give it a recall number and it gives you that recall. Ask for{' '}
            <code>20V197000</code> and you get Ford, 55,158 vehicles, a
            transmission shift cable clip, and the date owners were told: 27
            April 2020.
          </HoodText>
          <HoodText>
            That is the whole tool. No searching, no ranking, no “best match” —
            either that campaign is in the files or it is not.
          </HoodText>
          <Data
            path="pnpm safety:recall 20V197000"
            note="The record, as it comes back"
            mark={[5]}
            lines={[
              '20V197000  Ford Motor Company',
              '  component      POWER TRAIN:AUTOMATIC TRANSMISSION:GEAR POSITION INDICATION (PRNDL)',
              '  vehicles       2020 FORD EXPEDITION; 2020 FORD F-150; 2020 FORD RANGER',
              '  units          55,158',
              '  notified       2020-04-27',
              '  initiated by   the manufacturer, voluntarily  (MFR)',
              '',
              '  DEFECT       ... The transmission shift cable lock clip may not be fully',
              '               seated, allowing the transmission to actually be in a different',
              '               gear than the gear shift position selected by the driver.',
              '',
              '  CONSEQUENCE  If the transmission selection does not match the indicated gear',
              '               selection, and the parking brake is not applied, unintended',
              '               vehicle movement can occur ...',
              '',
              '  REMEDY       Ford will notify owners, and dealers will inspect and correct',
              '               the shift cable locking clip installation ... free of charge.',
            ]}
          />
          <Why>
            Same campaign, two ways of asking:{' '}
            <strong className="font-semibold text-ui-fg">position 4 through search</strong>,
            behind a school bus, and{' '}
            <strong className="font-semibold text-ui-fg">position 1 through the lookup</strong>,
            every time.
          </Why>
        </HoodSection>

        <HoodSection title="Why that needed building when there was already a search">
          <HoodText>
            Search looks for documents <em>similar to your words</em>. The words
            were “recall” and “20V197000”, and thousands of documents contain the
            word recall — so it returns things that are recall-shaped and
            number-shaped, and the actual one competes with all of them.
          </HoodText>
          <Why>
            <strong className="font-semibold text-ui-fg">
              A recall number is not a description of something. It is something.
            </strong>{' '}
            There is no <em>nearly</em> right answer: either you have that
            campaign or you do not. It is the difference between looking up a
            phone number and describing somebody until you recognise them. Search
            does the second. This does the first.
          </Why>
          <Code
            path="apps/ai/safety/src/tools/get-recall.tool.ts"
            note="Excerpt"
            lang="typescript"
            mark={[2, 3]}
            lines={[
              '  try {',
              '    const { rows } = await client.query(',
              '      `select content, metadata from ${TABLE}',
              "        where metadata->>'kind' = 'recall' and metadata->>'id' = $1",
              '        limit 1`,',
              '      [id],',
              '    );',
            ]}
          />
          <Why>
            No <code>order by</code> and no similarity. That is the entire
            difference from stage 3: an equality test on an id, rather than a
            distance calculation over 73,442 vectors.
          </Why>
        </HoodSection>

        <HoodSection title="Why it hands back fields rather than a paragraph">
          <HoodText>
            One question in the key is “did Ford volunteer this recall, or was it
            pushed?”. That sounds like something you would judge by reading.{' '}
            <strong className="font-semibold text-ui-fg">It is a box on the form.</strong>
          </HoodText>
          <Code
            path="apps/ai/safety/src/tools/get-recall.tool.ts"
            note="Excerpt"
            lang="typescript"
            lines={[
              'const INITIATED_BY: Record<string, string> = {',
              "  MFR: 'the manufacturer, voluntarily',",
              '  ODI: "NHTSA\'s Office of Defects Investigation — not volunteered",',
              '  OVSC: "NHTSA\'s Office of Vehicle Safety Compliance — not volunteered",',
              '};',
            ]}
          />
          <Data
            path="The same field, two campaigns, opposite answers"
            mark={[0, 1]}
            lines={[
              '20V197000   MFR   the manufacturer, voluntarily',
              '19V864000   ODI   NHTSA\'s investigators — not volunteered',
            ]}
          />
          <Why>
            <strong className="font-semibold text-ui-fg">
              One word apart, and the story inverts.
            </strong>{' '}
            Hand back only the narrative and the model has to infer that from the
            defect text — and will probably hedge. Hedging on a recorded fact is
            its own kind of wrong, which is why the key checks that this question
            must <em>not</em> escalate: the documents settle it.
          </Why>
          <Code
            path="apps/ai/safety/src/tools/get-recall.tool.ts"
            note="Excerpt"
            lang="typescript"
            mark={[0]}
            lines={['      initiated_by: INITIATED_BY[code] ?? `recorded as "${code}"`,']}
          />
          <HoodText>
            It falls through to the raw code rather than guessing, so a fourth
            code NHTSA adds later shows up <em>as itself</em> instead of as a
            confidently wrong sentence.
          </HoodText>
        </HoodSection>

        <HoodSection title="Two different ways of finding nothing">
          <Data
            path="And they must not sound alike"
            mark={[0, 1]}
            lines={[
              '20V19700     →  "that\'s not a campaign number"   (mistyped — 7 digits)',
              '99V999999    →  "no such campaign here"          (well-formed, truly absent)',
            ]}
          />
          <HoodText>
            Those look the same and are completely different problems. A typo is
            fixable. But a model told only “not found” may reasonably conclude{' '}
            <strong className="font-semibold text-ui-fg">the recall does not exist</strong>{' '}
            and write that into an answer about vehicle safety. One is “check your
            spelling”. The other is “this car may have an unaddressed defect”.
          </HoodText>
          <Code
            path="apps/ai/safety/src/tools/get-recall.tool.ts"
            note="Excerpt"
            lang="typescript"
            lines={['export const CAMPAIGN_PATTERN = /^\\d{2}[VETS]\\d{6}$/;']}
          />
          <HoodText>
            Two digits of year, a type letter, six digits — <code>V</code>{' '}
            vehicle, <code>E</code> equipment, <code>T</code> tyre,{' '}
            <code>S</code> child seat. Checked so the two can be reported
            differently, and checked <em>before</em> any query runs.
          </HoodText>
          <Code
            path="apps/ai/safety/src/tools/get-recall.tool.ts"
            note="Excerpt"
            lang="typescript"
            mark={[4]}
            lines={[
              '  if (!CAMPAIGN_PATTERN.test(id)) {',
              '    return {',
              '      found: false,',
              '      campaign_number: id,',
              "      reason: 'malformed',",
              '      note:',
              '        `"${id}" is not a campaign number. They are two digits, a letter ` +',
              "        '(V vehicle, E equipment, T tyre, S child seat) and six digits — e.g. 20V197000.',",
              '    };',
              '  }',
            ]}
          />
        </HoodSection>

        <HoodSection title="And it never guesses">
          <Code
            path="apps/ai/safety/src/tools/get-recall.tool.ts"
            note="Excerpt"
            lang="typescript"
            mark={[8]}
            lines={[
              '    if (!rows.length) {',
              '      return {',
              '        found: false,',
              '        campaign_number: id,',
              "        reason: 'absent',",
              '        note:',
              '          `No campaign ${id} in this corpus. The slice covers model years 2019-2020 ` +',
              "          'only, so the campaign may exist at NHTSA and fall outside it. Do not ' +",
              "          'substitute a different campaign.',",
              '      };',
              '    }',
            ]}
          />
          <Why>
            There is no <em>did you mean 20V197001?</em>. The corpus is a slice —
            model years 2019 and 2020 — so a properly formed number that is
            missing is far likelier to be a real recall outside the date range
            than a typo.{' '}
            <strong className="font-semibold text-ui-fg">
              Offering the nearest campaign hands the model a different recall at
              the moment it is answering about the one you asked for.
            </strong>{' '}
            That is how you cite the wrong defect on the wrong vehicle. Silence
            is the honest answer.
          </Why>
        </HoodSection>

        <HoodSection title="Reading the sections back out">
          <Code
            path="apps/ai/safety/src/tools/get-recall.tool.ts"
            note="Excerpt"
            lang="typescript"
            mark={[1]}
            lines={[
              'function section(text: string, label: string): string | null {',
              '  const m = new RegExp(`^${label}:\\\\s*(.*)$`, \'m\').exec(text);',
              '  return m ? m[1].trim() || null : null;',
              '}',
            ]}
          />
          <HoodText>
            Anchored to the{' '}
            <strong className="font-semibold text-ui-fg">start of a line</strong>, so
            the word <code>REMEDY:</code> appearing inside somebody's narrative
            cannot be mistaken for the section heading. Stage 3.1 wrote those
            labels; this reads them back.
          </HoodText>
        </HoodSection>

        <HoodSection title="What “done” means here">
          <Data
            path="pnpm safety:recall"
            note="With no arguments it runs these · 8 of 8 · commit 9047152"
            lines={[
              'ok  REC-002 · units affected matches the hand-written answer',
              'ok  REC-002 · owners notified matches',
              'ok  REC-002 · covers the three 2020 Ford vehicles',
              'ok  REC-002 · the remedy text survived parsing intact',
              'ok  REC-003 · 19V864000 is recorded as ODI-initiated, not volunteered',
              'ok  a mistyped number is reported as MALFORMED, not as absent',
              'ok  a well-formed but missing number is reported as ABSENT',
              'ok  the lookup returns the campaign itself, not the most similar document',
            ]}
          />
          <Why>
            Every expected value — 55,158, 27 April 2020, <code>ODI</code> — was
            written into the answer key by a person reading the raw files{' '}
            <em>before this tool existed</em>.{' '}
            <strong className="font-semibold text-ui-fg">
              A tool checked against its own output would pass no matter what it
              returned.
            </strong>
          </Why>
        </HoodSection>

        <HoodSection title="“Exact” and “fast” turned out not to be the same thing">
          <HoodText>
            The lookup was a sequential scan, because nothing in stage 3 ever
            needed an index on document ids — both retrieval arms sort the{' '}
            <em>whole</em> table by relevance and never look a document up by
            name.
          </HoodText>
          <Data
            path="Before the index"
            mark={[2]}
            lines={[
              '20V197000, found early     0.09 ms        65 rows scanned past',
              '21V353000, found later     0.09 ms        72 rows scanned past',
              '99V999999, ABSENT         45.13 ms    73,442 rows scanned past',
            ]}
          />
          <HoodText>
            The found cases look fine and are misleading: <code>limit 1</code>{' '}
            lets Postgres stop at the first match. The absent case cannot stop
            early, because{' '}
            <strong className="font-semibold text-ui-fg">
              proving something is missing means looking everywhere
            </strong>
            .
          </HoodText>
          <Why>
            Which is the interesting half rather than a performance note. “Is
            there a recall for this vehicle?” is answered by <em>not</em> finding
            one — so the safety question that matters most is precisely the one
            that took 500× longer, and the honest answer was the slow one. It is
            indexed now, and it is the same shape of idea as the next tool, whose
            entire purpose is returning an empty list.
          </Why>
        </HoodSection>

        <HoodSection title="The rule underneath">
          <HoodText>
            <strong className="font-semibold text-ui-fg">
              If a question has one exact answer, it is a lookup — not a search.
            </strong>{' '}
            The insurance engagement reached the identical rule on documents that
            share nothing with vehicle safety data, which is usually the sign of
            a real rule rather than a local quirk.
          </HoodText>
          <HoodText>
            It held once a model was choosing the tools, too. In stage 6 the first
            question put to the model named this campaign, and the check was that
            it called <code>get_recall</code> and did <em>not</em> call the
            search — which it did.
          </HoodText>
        </HoodSection>
      </div>
    </OriginDialog>
  );
}

/** A reason, set in the margin. Restyled on `/steps` by the `cal-why` rule in app.css. */
function Why({ children }: { children: ReactNode }) {
  return <p className="cal-why">{children}</p>;
}
