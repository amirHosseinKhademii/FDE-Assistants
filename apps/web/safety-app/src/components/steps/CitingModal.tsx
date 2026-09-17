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
 * ── AND IT CARRIES A WARNING FORWARD ──────────────────────────────────────
 *
 * If recall@6 improves at 4.5, part of what is being measured is how good
 * NHTSA's own data entry is — not only how good the filters are. That belongs
 * on the page before the number arrives, not after.
 */
import { useCallback, useState } from 'react';
import { Mono, OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import { Data } from '@veresk/surface';

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

export function CitingModal() {
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
          Inside <Mono>complaints_citing</Mono> — evidence by reference, and the
          one complaint the filter cannot see
        </span>
        <span className="font-mono text-sm text-ui-faint transition-colors group-hover:text-ui-fg">
          open →
        </span>
      </button>

      {from && <CitingPanel from={from} onClose={() => setFrom(null)} />}
    </>
  );
}

function CitingPanel({ from, onClose }: { from: Origin; onClose: () => void }) {
  return (
    <OriginDialog
      from={from}
      label="Inside complaints_citing"
      tone="var(--color-cal-1)"
      onClose={onClose}
      header={
        <>
          <p className="font-mono text-sm text-ui-fg">Inside complaints_citing</p>
          <p className="mt-0.5 text-[0.75rem] text-ui-faint">
            stage 4.4b · built, and checked against the raw file
          </p>
        </>
      }
    >
      <div className="sticky -top-3.5 z-20 -mx-5 -mt-3.5 mb-7 border-b border-ui-line bg-ui-bg px-5 pt-3.5 pb-4">
        <p className="pb-2.5 font-mono text-[0.625rem] tracking-[0.08em] text-ui-faint uppercase">
          the seven complaints that name campaign 20V197000 themselves
        </p>
        <div className="grid gap-1">
          {CITING.map((c) => (
            <div key={c.id} className="flex items-baseline gap-4 font-mono text-[0.75rem]">
              <span className={c.odd ? 'text-ui-fg' : 'text-ui-dim'}>{c.id}</span>
              <span style={{ color: c.odd ? 'var(--color-cal-1)' : 'var(--color-ui-faint)' }}>
                {c.filed}
              </span>
              {c.odd && (
                <span className="text-[0.625rem] text-ui-faint">
                  ← the recall does not cover this model
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-9 pb-2">
        <section>
          <H>What it does</H>
          <P>
            It finds the complaints where the owner{' '}
            <span className="text-ui-fg">typed the recall number into their own
            narrative</span>.
          </P>
          <Key>
            Not evidence by similarity. Evidence by reference. The person filing
            had the campaign in front of them.
          </Key>
          <Why>
            Which matters because the F-150 question's trap is that 1,057
            complaints share a <em>component</em> with the recall and only some
            describe the actual defect. These seven are neither — and it still
            does not prove the remedy failed, which is a claim no document here
            supports, but it is the strongest material the corpus offers on
            whether the fix is holding.
          </Why>
        </section>

        <section>
          <H>The one that does not belong</H>
          <P>
            The recall covers an Expedition, an F-150 and a Ranger. One of the
            seven is filed as an <Mono>F-250 SD</Mono>.
          </P>
          <Data
            path="complaint 11618838 — the structured field, and the first line of the text"
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
        </section>

        <section>
          <H>Which is why this is not a duplicate of the search</H>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                name: 'reaches by attribute',
                sub: 'search_complaints',
                rows: ['fast', 'precise', 'trusts the metadata'],
                tone: 'var(--color-cal-2)',
              },
              {
                name: 'reaches by reference',
                sub: 'complaints_citing',
                rows: ['narrow', 'immune to a mislabelled field', 'finds what the filter misses'],
                tone: 'var(--color-cal-1)',
              },
            ].map((c) => (
              <div key={c.sub} className="rounded-lg border border-ui-line bg-ui-surface p-4">
                <p
                  className="font-mono text-[0.6875rem] tracking-[0.06em] uppercase"
                  style={{ color: c.tone }}
                >
                  {c.name}
                </p>
                <p className="mt-0.5 font-mono text-[0.625rem] text-ui-faint">{c.sub}</p>
                <ul className="mt-3 grid gap-1.5">
                  {c.rows.map((r) => (
                    <li key={r} className="text-[0.8125rem] text-ui-dim">
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
        </section>

        <section>
          <H>The graph nobody designed</H>
          <Data
            path="two links between a complaint or an investigation and a recall"
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
        </section>

        <section>
          <H>And a warning to carry into the re-measurement</H>
          <Key>
            If recall@6 improves, part of what is being measured is how good
            NHTSA's own data entry is — not only how good the filters are.
          </Key>
        </section>

        <section>
          <H>Two things worth recording that produced nothing</H>
          <P>
            The recall's remedy text ends “Ford's number for this recall is
            20S18”, so owners might quote that instead of the campaign number.
          </P>
          <Data
            path="how many complaints name the manufacturer's own reference"
            mark={[1]}
            lines={['complaints naming 20V197000     7', "complaints naming 20S18         0"]}
          />
          <Why>
            Not built, and kept as a permanent check.{' '}
            <span className="text-ui-fg">
              An idea that measures to nothing is worth recording
            </span>
            , or somebody rebuilds it later.
          </Why>
          <Why>
            And one check had its premise the wrong way round — it assumed a
            campaign nobody cited, and two complaints name it. The tool was right
            and the test was wrong, so the replacement campaign is verified
            inside the check rather than assumed.
          </Why>
        </section>

        <section>
          <H>How it looks up</H>
          <Data
            path="a substring match, and an existence check before it"
            lines={[
              "where metadata->>'kind' = 'complaint' and content like '%' || $1 || '%'",
            ]}
          />
          <Why>
            The campaign's existence is checked first, so “nobody cites it” and
            “it is not in this corpus” cannot collapse into the same empty list —
            the same distinction the recall lookup draws between a typo and an
            absence.
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
