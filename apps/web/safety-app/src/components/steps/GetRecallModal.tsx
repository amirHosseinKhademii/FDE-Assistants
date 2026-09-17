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
 * Every excerpt is verbatim from `apps/ai/safety/src/tools/get-recall.tool.ts`,
 * with its real line numbers, checked line for line against the file.
 */
import { useCallback, useState } from 'react';
import { Mono, OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import { Code, Data } from '@veresk/surface';

/** What search returned when asked for exactly that campaign. Stage 3.5's run. */
const SEARCH_SAID: { rank: number; what: string; wanted?: boolean }[] = [
  { rank: 1, what: 'a Lincoln Corsair complaint about USB ports' },
  { rank: 2, what: 'a Ford Ranger complaint' },
  { rank: 3, what: 'a recall about school bus cameras' },
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
      <button
        type="button"
        onClick={open}
        className="group flex w-full items-center gap-4 rounded-lg border border-ui-line bg-ui-surface px-4 py-3.5 text-left transition-colors hover:border-cal-1/50"
      >
        <span className="font-mono text-[0.6875rem] tracking-[0.08em] text-cal-1 uppercase">
          under the hood
        </span>
        <span className="min-w-0 flex-1 text-[0.875rem] text-ui-dim">
          Inside <Mono>get_recall</Mono> — why a lookup had to be built when there
          was already a search
        </span>
        <span className="font-mono text-sm text-ui-faint transition-colors group-hover:text-ui-fg">
          open →
        </span>
      </button>

      {from && <GetRecallPanel from={from} onClose={() => setFrom(null)} />}
    </>
  );
}

function GetRecallPanel({ from, onClose }: { from: Origin; onClose: () => void }) {
  return (
    <OriginDialog
      from={from}
      label="Inside get_recall"
      tone="var(--color-cal-1)"
      onClose={onClose}
      header={
        <>
          <p className="font-mono text-sm text-ui-fg">Inside get_recall</p>
          <p className="mt-0.5 text-[0.75rem] text-ui-faint">
            stage 4.1 · built, and checked against the answer key
          </p>
        </>
      }
    >
      {/* THE ANCHOR IS THE RESULT THAT MADE IT NECESSARY. */}
      <div className="sticky -top-3.5 z-20 -mx-5 -mt-3.5 mb-7 border-b border-ui-line bg-ui-bg px-5 pt-3.5 pb-4">
        <p className="pb-2.5 font-mono text-[0.625rem] tracking-[0.08em] text-ui-faint uppercase">
          what search returned when asked for exactly 20V197000
        </p>
        <ol className="grid gap-1">
          {SEARCH_SAID.map((r) => (
            <li key={r.rank} className="flex items-baseline gap-3 font-mono text-[0.75rem]">
              <span className="text-ui-faint">{r.rank}.</span>
              <span className={r.wanted ? 'text-ui-fg' : 'text-ui-dim'}>{r.what}</span>
              {r.wanted && (
                <span className="text-[0.625rem]" style={{ color: 'var(--color-cal-1)' }}>
                  ← the thing we asked for
                </span>
              )}
            </li>
          ))}
        </ol>
        <p className="pt-2.5 font-mono text-[0.625rem] text-ui-faint">
          fourth. behind a bus.
        </p>
      </div>

      <div className="grid gap-9 pb-2">
        <section>
          <H>What it does</H>
          <P>You give it a recall number. It gives you that recall.</P>
          <Data
            path="get_recall(&quot;20V197000&quot;)"
            lines={[
              'Ford. 55,158 vehicles. The transmission shift cable clip.',
              'Owners notified 27 April 2020.',
            ]}
          />
          <P>
            That is the whole tool. No searching, no ranking, no “best match”.
          </P>
          <Data
            path="pnpm safety:recall 20V197000"
            note="the record, as it comes back"
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
          <Aside>
            Same campaign, two ways of asking:{' '}
            <span className="text-ui-fg">position 4 through search</span>, behind
            a school bus, and{' '}
            <span className="text-ui-fg">position 1 through the lookup</span>,
            every time.
          </Aside>
        </section>

        <section>
          <H>Why that needed building when there was already a search</H>
          <P>
            Search looks for documents <em>similar to your words</em>. The words
            were “recall” and “20V197000”, and thousands of documents contain the
            word recall — so it returns things that are recall-shaped and
            number-shaped, and the actual one competes with all of them.
          </P>
          <Aside>
            <span className="text-ui-fg">
              A recall number is not a description of something. It is something.
            </span>{' '}
            There is no <em>nearly</em> right answer: either you have that
            campaign or you do not. It is the difference between looking up a
            phone number and describing somebody until you recognise them. Search
            does the second. This does the first.
          </Aside>
          <Code
            path="apps/ai/safety/src/tools/get-recall.tool.ts:128–134"
            lang="typescript"
            startLine={128}
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
          <Aside>
            No <Mono>order by</Mono> and no similarity. That is the entire
            difference from stage 3: an equality test on an id, rather than a
            distance calculation over 73,442 vectors.
          </Aside>
        </section>

        <section>
          <H>Why it hands back fields rather than a paragraph</H>
          <P>
            One question in the key is “did Ford volunteer this recall, or was it
            pushed?”. That sounds like something you would judge by reading.{' '}
            <span className="text-ui-fg">It is a box on the form.</span>
          </P>
          <Code
            path="apps/ai/safety/src/tools/get-recall.tool.ts:52–56"
            lang="typescript"
            startLine={52}
            lines={[
              'const INITIATED_BY: Record<string, string> = {',
              "  MFR: 'the manufacturer, voluntarily',",
              '  ODI: "NHTSA\'s Office of Defects Investigation — not volunteered",',
              '  OVSC: "NHTSA\'s Office of Vehicle Safety Compliance — not volunteered",',
              '};',
            ]}
          />
          <Data
            path="the same field, two campaigns, opposite answers"
            mark={[0, 1]}
            lines={[
              '20V197000   MFR   the manufacturer, voluntarily',
              '19V864000   ODI   NHTSA\'s investigators — not volunteered',
            ]}
          />
          <Aside>
            <span className="text-ui-fg">
              One word apart, and the story inverts.
            </span>{' '}
            Hand back only the narrative and the model has to infer that from the
            defect text — and will probably hedge. Hedging on a recorded fact is
            its own kind of wrong, which is why the key checks that this question
            must <em>not</em> escalate: the documents settle it.
          </Aside>
          <Code
            path="apps/ai/safety/src/tools/get-recall.tool.ts:167"
            lang="typescript"
            startLine={167}
            mark={[0]}
            lines={['      initiated_by: INITIATED_BY[code] ?? `recorded as "${code}"`,']}
          />
          <P>
            It falls through to the raw code rather than guessing, so a fourth
            code NHTSA adds later shows up <em>as itself</em> instead of as a
            confidently wrong sentence.
          </P>
        </section>

        <section>
          <H>Two different ways of finding nothing</H>
          <Data
            path="and they must not sound alike"
            mark={[0, 1]}
            lines={[
              '20V19700     →  "that\'s not a campaign number"   (mistyped — 7 digits)',
              '99V999999    →  "no such campaign here"          (well-formed, truly absent)',
            ]}
          />
          <P>
            Those look the same and are completely different problems. A typo is
            fixable. But a model told only “not found” may reasonably conclude{' '}
            <span className="text-ui-fg">the recall does not exist</span> and
            write that into an answer about vehicle safety. One is “check your
            spelling”. The other is “this car may have an unaddressed defect”.
          </P>
          <Code
            path="apps/ai/safety/src/tools/get-recall.tool.ts:49"
            lang="typescript"
            startLine={49}
            lines={['export const CAMPAIGN_PATTERN = /^\\d{2}[VETS]\\d{6}$/;']}
          />
          <P>
            Two digits of year, a type letter, six digits — <Mono>V</Mono>{' '}
            vehicle, <Mono>E</Mono> equipment, <Mono>T</Mono> tyre,{' '}
            <Mono>S</Mono> child seat. Checked so the two can be reported
            differently, and checked <em>before</em> any query runs.
          </P>
          <Code
            path="apps/ai/safety/src/tools/get-recall.tool.ts:115–124"
            lang="typescript"
            startLine={115}
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
        </section>

        <section>
          <H>And it never guesses</H>
          <Code
            path="apps/ai/safety/src/tools/get-recall.tool.ts:141–151"
            lang="typescript"
            startLine={141}
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
          <Aside>
            There is no <em>did you mean 20V197001?</em>. The corpus is a slice —
            model years 2019 and 2020 — so a properly formed number that is
            missing is far likelier to be a real recall outside the date range
            than a typo.{' '}
            <span className="text-ui-fg">
              Offering the nearest campaign hands the model a different recall at
              the moment it is answering about the one you asked for.
            </span>{' '}
            That is how you cite the wrong defect on the wrong vehicle. Silence
            is the honest answer.
          </Aside>
        </section>

        <section>
          <H>Reading the sections back out</H>
          <Code
            path="apps/ai/safety/src/tools/get-recall.tool.ts:94–97"
            lang="typescript"
            startLine={94}
            mark={[1]}
            lines={[
              'function section(text: string, label: string): string | null {',
              '  const m = new RegExp(`^${label}:\\\\s*(.*)$`, \'m\').exec(text);',
              '  return m ? m[1].trim() || null : null;',
              '}',
            ]}
          />
          <P>
            Anchored to the <span className="text-ui-fg">start of a line</span>,
            so the word <Mono>REMEDY:</Mono> appearing inside somebody's
            narrative cannot be mistaken for the section heading. Stage 3.1 wrote
            those labels; this reads them back.
          </P>
        </section>

        <section>
          <H>What “done” means here</H>
          <Data
            path="pnpm safety:recall — with no arguments, it runs these"
            note="8 of 8 · commit 9047152"
            lines={[
              'ok  REC-002 units affected        55,158, key says 55,158',
              'ok  REC-002 owners notified       2020-04-27, key says 2020-04-27',
              'ok  REC-002 vehicles              2020 FORD EXPEDITION; F-150; RANGER',
              'ok  REC-002 remedy text intact    mentions "shift cable"',
              'ok  REC-003 19V864000             influenced_by = ODI, not volunteered',
              'ok  a mistyped number             reported as MALFORMED',
              'ok  a well-formed missing number  reported as ABSENT',
              'ok  the lookup                    returns the campaign itself',
            ]}
          />
          <Aside>
            Every expected value was written into the answer key by a person
            reading the raw files <em>before this tool existed</em>.{' '}
            <span className="text-ui-fg">
              A tool checked against its own output would pass no matter what it
              returned.
            </span>
          </Aside>
        </section>

        <section>
          <H>“Exact” and “fast” turned out not to be the same thing</H>
          <P>
            The lookup was a sequential scan, because nothing in stage 3 ever
            needed an index on document ids — both retrieval arms sort the{' '}
            <em>whole</em> table by relevance and never look a document up by
            name.
          </P>
          <Data
            path="before the index"
            mark={[3]}
            lines={[
              '20V197000, found early     0.09 ms        65 rows scanned past',
              '21V353000, found later     0.09 ms        72 rows scanned past',
              '99V999999, ABSENT         45.13 ms    73,442 rows scanned past',
            ]}
          />
          <P>
            The found cases look fine and are misleading:{' '}
            <Mono>limit 1</Mono> lets Postgres stop at the first match. The
            absent case cannot stop early, because{' '}
            <span className="text-ui-fg">
              proving something is missing means looking everywhere
            </span>
            .
          </P>
          <Aside>
            Which is the interesting half rather than a performance note. “Is
            there a recall for this vehicle?” is answered by{' '}
            <em>not</em> finding one — so the safety question that matters most
            is precisely the one that took 500× longer, and the honest answer was
            the slow one. It is indexed now, and it is the same shape of idea as
            the next tool, whose entire purpose is returning an empty list.
          </Aside>
        </section>

        <section>
          <H>The rule underneath</H>
          <P>
            <span className="text-ui-fg">
              If a question has one exact answer, it is a lookup — not a search.
            </span>{' '}
            The insurance engagement reached the identical rule on documents that
            share nothing with vehicle safety data, which is usually the sign of
            a real rule rather than a local quirk.
          </P>
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

function Aside({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3.5 max-w-[64ch] border-l-2 border-cal-2/50 py-0.5 pl-3.5 text-[0.875rem] leading-relaxed text-ui-dim">
      {children}
    </p>
  );
}
