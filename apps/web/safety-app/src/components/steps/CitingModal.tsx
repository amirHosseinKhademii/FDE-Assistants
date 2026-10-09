/**
 * Inside `complaints_citing` — stage 4.4b, and the complaint the filter cannot see.
 *
 * ── THE ANCHOR IS SEVEN ROWS WITH ONE THAT DOES NOT BELONG ────────────────
 *
 * Seven complaints name the campaign in their own text. The recall covers an
 * Expedition, an F-150 and a Ranger; one of the seven is filed as an F-250 SD,
 * and its narrative opens "The contact owns a 2020 Ford F-150."
 *
 * NHTSA's structured field says one thing and the owner says another. The
 * filter believes the field — verified, the vehicle filter cannot return that
 * complaint — and this tool finds it anyway, because it reaches by reference
 * rather than by attribute.
 *
 * ── WHICH IS THE ARGUMENT FOR BOTH TOOLS EXISTING ─────────────────────────
 *
 * Filtering on structured fields beats matching prose, and it inherits whatever
 * the fields get wrong. Neither tool replaces the other, and that is now a
 * check rather than an opinion: a complaint the vehicle filter misses is found
 * here.
 *
 * ── THE METRIC PUNISHES CALLING IT — PREDICTED AT 4.5, MEASURED AT 6 ──────
 *
 * 4.5 routed the tools BY HAND and recall@6 went 0.40 to 1.00 over three cases:
 * a ceiling, not a score, and REC-005 was already 1.00 with an empty result as
 * its rightness. This tool was NOT called there — not because it does not help,
 * but because calling it would have LOWERED the score. VERIFIED: none of the
 * seven is the one complaint REC-001 names, and six slots are all there are.
 *
 * Stage 6 then let a model route, and the prediction came true: REC-001 reached
 * for this tool and scored 0.50 on all three runs — the campaign every time,
 * the named complaint never (INGESTION.md, "MEASURED 2026-09-18"). The panel
 * says so beside the model-routed range, 0.17 to 0.50, which is never averaged.
 * Scoring the answer rather than the retrieval is stage 7, and the panel now
 * says that stage exists rather than "is a later stage".
 *
 * The warning is the other half. Any score over this corpus is partly a measure
 * of how good NHTSA's own data entry is, not only of how good the filters are,
 * and the F-250 SD row is the proof that those are different things. That was
 * written here before the number arrived, which is the only time such a thing
 * is worth writing.
 *
 * ── CORRECTED AND RESTYLED 2026-09-27 ─────────────────────────────────────
 *
 * The two comparison cards were labelled in cal-2 and cal-1 side by side —
 * ΔE 11, too close to carry two meanings — and are neutral now. "How it looks
 * up" quoted the substring match as data; it is now the real two queries from
 * `complaints-citing.tool.ts`, as an excerpt. The shared trigger, sentence-case
 * labels and 1rem body text are the `/steps` redesign.
 */
import { useCallback, useState } from 'react';
import { OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import { Code, Data } from '@veresk/surface';
import type { ReactNode } from 'react';
import { HoodButton, HoodSection, HoodText } from '@veresk/learn/steps';

/**
 * The seven complaints that name campaign 20V197000 in their own narrative.
 *
 * TYPED EXPLICITLY, because `as const` on a literal where only one entry
 * carries a flag narrows to a union in which the other six have no such
 * property — and the flag is then unreadable on any of them.
 */
const CITING: { id: string; filed: string; odd?: boolean }[] = [
  { id: '11589358', filed: 'EXPEDITION' },
  { id: '11590464', filed: 'F-150' },
  { id: '11592935', filed: 'RANGER' },
  { id: '11618838', filed: 'F-250 SD', odd: true },
  { id: '11624180', filed: 'EXPEDITION' },
  { id: '11625426', filed: 'F-150' },
  { id: '11659797', filed: 'EXPEDITION' },
];

/** Two ways of reaching a complaint. Neutral on purpose: neither is the "right" one. */
const REACH = [
  {
    name: 'Reaches by attribute',
    sub: 'search_complaints',
    rows: ['Fast', 'Precise', 'Trusts the metadata'],
  },
  {
    name: 'Reaches by reference',
    sub: 'complaints_citing',
    rows: ['Narrow', 'Immune to a mislabelled field', 'Finds what the filter misses'],
  },
] as const;

export function CitingModal() {
  const [from, setFrom] = useState<Origin | null>(null);
  const open = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => setFrom(originOf(e.currentTarget)),
    [],
  );

  return (
    <>
      <HoodButton
        blurb="How looking for a recall's own number in complaints finds one the vehicle filter cannot see."
        onClick={open}
      />

      {from && <CitingPanel from={from} onClose={() => setFrom(null)} />}
    </>
  );
}

function CitingPanel({ from, onClose }: { from: Origin; onClose: () => void }) {
  return (
    <OriginDialog
      from={from}
      label="Inside complaints_citing"
      tone="var(--color-cal-sky)"
      onClose={onClose}
      header={
        <>
          <p className="text-[1rem] font-semibold text-ui-fg">
            Inside <span className="font-mono">complaints_citing</span>
          </p>
          <p className="mt-0.5 text-[0.875rem] text-ui-faint">
            Step 4.4b · built, and checked against the raw file
          </p>
        </>
      }
    >
      <div className="sticky -top-3.5 z-20 -mx-5 -mt-3.5 mb-7 border-b border-ui-line bg-ui-bg px-5 pt-3.5 pb-4">
        <p className="cal-label pb-2.5" data-tone="quiet">
          The seven complaints that name campaign 20V197000 themselves
        </p>
        <div className="grid gap-1">
          {CITING.map((c) => (
            <div key={c.id} className="flex flex-wrap items-baseline gap-x-4 font-mono text-[0.875rem]">
              <span className={c.odd ? 'text-ui-fg' : 'text-ui-dim'}>{c.id}</span>
              <span className={c.odd ? 'font-semibold text-cal-1' : 'text-ui-faint'}>{c.filed}</span>
              {c.odd && (
                <span className="font-sans text-[0.875rem] text-ui-faint">
                  ← the recall does not cover this model
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="pb-2 [&_.snip-frame]:my-1">
        <HoodSection title="What it does">
          <HoodText>
            It finds the complaints where the owner{' '}
            <strong className="font-semibold text-ui-fg">
              typed the recall number into their own description of the problem
            </strong>
            . Nothing is matched by meaning; it looks for the number itself.
          </HoodText>
          <Key>
            Not evidence by similarity. Evidence by reference. The person filing
            had the campaign in front of them.
          </Key>
          <Why>
            Which matters because the F-150 question's trap is that 1,057
            complaints share a <em>component</em> with the recall and only some
            describe the actual defect. These seven are neither — and they still
            do not prove the remedy failed, which is a claim no document here
            supports, but they are the strongest material the corpus offers on
            whether the fix is holding.
          </Why>
        </HoodSection>

        <HoodSection title="The one that does not belong">
          <HoodText>
            The recall covers an Expedition, an F-150 and a Ranger. One of the
            seven is filed as an <code>F-250 SD</code>.
          </HoodText>
          <Data
            path="Complaint 11618838 — the structured field, and the first line of the text"
            mark={[1]}
            lines={[
              'model field   F-250 SD',
              'narrative     "The contact owns a 2020 Ford F-150."',
            ]}
          />
          <Key>
            NHTSA's structured field says one thing and the owner says another.
            The filter believes the field — verified: filtering on model F-150
            cannot return that complaint.
          </Key>
          <Why>
            Measured rate: 1 of the 177 complaints whose text says “owns a 2020
            Ford F-150” is filed under a different model. Small, and not zero.
          </Why>
        </HoodSection>

        <HoodSection title="Which is why this is not a duplicate of the search">
          <div className="grid gap-3 sm:grid-cols-2">
            {REACH.map((c) => (
              <div key={c.sub} className="rounded-lg border border-ui-line bg-ui-surface p-4">
                <p className="text-[0.9375rem] font-semibold text-ui-fg">{c.name}</p>
                <p className="mt-0.5 font-mono text-[0.8125rem] text-ui-faint">{c.sub}</p>
                <ul className="mt-3 grid gap-1.5">
                  {c.rows.map((r) => (
                    <li key={r} className="text-[0.9375rem] text-ui-dim">
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Key>
            Filtering on structured fields beats matching prose — and it inherits
            whatever the fields get wrong.
          </Key>
          <Why>
            Neither replaces the other, and that is a check rather than an
            opinion now: <em>a complaint the vehicle filter misses is found here,
            by reference</em>.
          </Why>
        </HoodSection>

        <HoodSection title="The graph nobody designed">
          <Data
            path="Two links between a complaint or an investigation and a recall"
            mark={[3]}
            lines={[
              'the documented link — investigations to recalls',
              '  114 investigations · 42 carry a campaign number · 14 resolve      12%',
              'the link owners made themselves — complaints to recalls',
              '  5,361 complaints name a campaign · 563 resolve                  works',
            ]}
          />
          <Why>
            One hop is a lookup, so this is a tool rather than a graph store with
            node embeddings. The edge that was documented barely resolves; the
            edge that works is the one nobody designed.
          </Why>
        </HoodSection>

        <HoodSection title="The measurement punishes calling this tool — and did">
          <HoodText>
            Step 4.5 re-ran the answer key with the tools called by hand, and
            recall@6 over the three retrieval cases went from 0.40 to 1.00 — a
            ceiling on what is reachable, not a score, and one of the three
            (REC-005) was already at 1.00 because its right answer is an empty
            result. This tool was not called.
          </HoodText>
          <Data
            path="Why it was left out"
            mark={[2]}
            lines={[
              'the complaint that question names        11353867',
              'the seven that name the campaign         not among them',
              'slots available                          6, and one holds the recall',
            ]}
          />
          <Key>
            So adding seven complaints found by reference would push the named
            one out, and the score would fall. The tool that finds the best
            evidence would cost you the number.
          </Key>
          <Why>
            Stage 6 turned that from a prediction into a measurement. With a
            model choosing the tools, REC-001 reached for this tool rather than
            the search — and scored{' '}
            <strong className="font-semibold text-ui-fg">0.50 on all three runs</strong>
            : the campaign every time, the complaint the key names never.
            Arguably the better evidence, scored as a miss. (Across all three
            cases the model-routed runs span 0.17 to 0.50 — a range, not an
            average.)
          </Why>
          <Why>
            That is a limit of recall@6, not of the tool. The measure rewards
            retrieving what the answer key <em>named</em>, and the key names one
            supporting complaint rather than every complaint a good answer would
            cite. Scoring the answer instead of the retrieval is what stage 7
            does: 28 of 28 decided checks, reported beside 0 of 3 judged ones and
            never added to them — and the judged zero is not a broken judge,
            since every control passed.
          </Why>
        </HoodSection>

        <HoodSection title="And the warning it carried forward still stands">
          <Key>
            Any score over this corpus is partly a measure of how good NHTSA's
            own data entry is — not only of how good the filters are.
          </Key>
          <Why>
            The F-250 SD row is the proof that those are different things: one
            complaint the filters cannot reach, through no fault of the filters.
            It was written here before the number arrived, which is the only time
            such a thing is worth writing.
          </Why>
        </HoodSection>

        <HoodSection title="Two things worth recording that produced nothing">
          <HoodText>
            The recall's remedy text ends “Ford's number for this recall is
            20S18”, so owners might quote that instead of the campaign number.
          </HoodText>
          <Data
            path="How many complaints name the manufacturer's own reference"
            mark={[1]}
            lines={['complaints naming 20V197000     7', 'complaints naming 20S18         0']}
          />
          <Why>
            Not built, and kept as a permanent check.{' '}
            <strong className="font-semibold text-ui-fg">
              An idea that measures to nothing is worth recording
            </strong>
            , or somebody rebuilds it later.
          </Why>
          <Why>
            And one check had its premise the wrong way round — it assumed a
            campaign nobody cited, and two complaints name it. The tool was right
            and the test was wrong, so the replacement campaign is verified
            inside the check rather than assumed.
          </Why>
        </HoodSection>

        <HoodSection title="How it looks up">
          <Code
            path="apps/ai/safety/src/tools/complaints-citing.tool.ts"
            note="Excerpt · an existence check, then a substring match"
            lang="typescript"
            mark={[8]}
            lines={[
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
          <Why>
            The campaign's existence is checked first, so “nobody cites it” and
            “it is not in this corpus” cannot collapse into the same empty list —
            the same distinction the recall lookup draws between a typo and an
            absence.
          </Why>
          <Why>
            And its note now says what the corpus cannot: a complaint is an
            allegation, no repair completions are recorded here, and whether the
            fix is working should be escalated to a person. This is the tool most
            likely to be reached for when somebody asks whether a fix is holding,
            so the fact sits where it will be read at that moment.
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
