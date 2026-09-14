/**
 * The dossier, set as a document.
 *
 * WRITTEN FRESH, NOT ADAPTED FROM `apps/insurance-app/src/components/Answer.tsx`.
 * That one renders answer / citations / conflicts. This renders blockers /
 * concerns / missing / escalate, and the difference is not cosmetic: reusing the
 * coverage layout would have put a confident prose answer at the top in the
 * largest type on the page, which is precisely the shape this domain forbids.
 *
 * THE ORDER IS THE JUDGEMENT, and it is the reverse of the insurance page:
 *
 *   1. ESCALATION first. A human decides; say so before anything else.
 *   2. BLOCKERS next — what stands in the way, each with the RULE that makes it
 *      one, not just the fact. "Her refresher had expired" is a fact; the clause
 *      that makes a certification without one invalid is why it blocks.
 *   3. MISSING before concerns, deliberately. An unchecked thing is not a passed
 *      thing, and burying it below minor findings invites reading it as noise.
 *   4. CONCERNS — real, not blocking.
 *   5. UNVERIFIED CLAIMS last, and never styled as evidence.
 *
 * THERE IS NO "CLEARED" STATE AND THERE MUST NOT BE. When nothing blocks, the
 * page says what was checked and that a QP still decides. Note what is missing
 * from the whole file: there is no green tick, no "ready to ship" banner, and no
 * success colour anywhere. A reassuring green state would be this system making
 * the one decision it is built never to make — and the answer contract has no
 * field that could carry it, so inventing one in the UI would be a lie the
 * schema cannot catch.
 */
import {
  Mono, Quote, Chip, Panel, Prose, TONES, type Tone,
  BlockIcon, GavelIcon, GapIcon, EyeIcon, StepsIcon,
} from '@fde/uikit';
import { REFERENCE_PATTERNS } from '../../lib/tokens';

export function Answer({ data }: { data: any }) {
  const escalated = Boolean(data.escalate);
  const blockers: any[] = data.blockers ?? [];
  const concerns: any[] = data.concerns ?? [];
  const missing: string[] = data.missing ?? [];
  const unverified: string[] = data.unverified_claims ?? [];
  const clearIt: string[] = data.what_would_clear_it ?? [];

  return (
    <article className="ui-stagger grid gap-7">
      {escalated && (
        <div className="overflow-hidden rounded-xl border border-ui-warn/40 bg-ui-warn/5 shadow-[0_0_50px_-20px] shadow-ui-warn/60">
          <div className="flex items-center gap-2.5 border-b border-ui-warn/25 px-5 py-3 text-ui-warn">
            <GavelIcon />
            <h2 className="font-medium">A person has to decide this</h2>
          </div>
          <div className="px-5 py-4">
            <Prose text={data.escalate.reason} patterns={REFERENCE_PATTERNS} className="text-ui-fg/90" />
            <p className="mt-2.5 text-sm text-ui-dim">
              Goes to <span className="text-ui-fg">{data.escalate.suggested_owner}</span>.
            </p>
          </div>
        </div>
      )}

      <header>
        <Scoreboard blockers={blockers.length} concerns={concerns.length} missing={missing.length} />

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Chip tone="neutral">{data.lot_id}</Chip>
          <span className="text-ui-faint">→</span>
          <Chip tone="neutral">{data.market}</Chip>
          {blockers.length > 0 && (
            <Chip tone="danger">
              {blockers.length} blocker{blockers.length === 1 ? '' : 's'}
            </Chip>
          )}
          {concerns.length > 0 && <Chip tone="info">{concerns.length} concern{concerns.length === 1 ? '' : 's'}</Chip>}
          {missing.length > 0 && <Chip tone="warn">{missing.length} unchecked</Chip>}
        </div>

        {/* THE VERDICT LINE IS COUNTED, NOT QUOTED. It is derived from the
            structured fields — how many blockers, is there an escalation — and
            never from the summary prose, so it cannot drift from what the
            findings below actually say. Note that no branch of it is positive:
            "Nothing is blocking it" is a statement about the checks, and the
            sentence after it says who still has to decide. */}
        <h2 className={`text-xl font-semibold tracking-tight sm:text-2xl ${verdict(data).tone}`}>
          {verdict(data).headline}
        </h2>
        <p className="mt-1.5 text-sm text-ui-dim">{verdict(data).sub}</p>

        {/* THE SUMMARY IS THE ONLY BLOCK ON THIS PAGE WITH ITS OWN SURFACE.
            Everything else — escalation, blockers, steps, gaps, concerns — is a
            bordered Panel with an icon and a header bar. The summary used to be
            bare prose under a 12px grey label, which made the one paragraph
            written for a person the least distinguished thing on a page of
            boxes: it read as preamble and got skipped.

            IT IS DELIBERATELY NOT A PANEL. Another bordered box would have made
            it a peer of the findings, and it is not one — it is the lede. So it
            gets a different KIND of emphasis: a raised surface, an accent rail,
            and prose a step larger than anything below it, while the counted
            verdict above stays the largest thing on the page.

            THE RAIL IS `ui-accent`, NOT A TONE COLOUR. Danger red here would
            read as a severity the summary does not carry, and the tone palette
            is how this page says how bad something is. */}
        {/* THE SUMMARY TAKES THE SEVERITY OF WHAT IT IS REPORTING, derived from
            the same counted fields as the verdict line above — never from the
            prose itself, which could describe a batch as clear while the panel
            below lists three blockers.

            WHEN NOTHING WAS FOUND it keeps the decorative six-hue rail, and
            that is the deliberate half of this. A calm, confident green panel
            would read as a clearance, and the contract has no field that could
            express one. Bad news gets a colour; the absence of bad news does
            not get the opposite colour. */}
        <section className={`lede mt-7 py-5 pr-6 pl-6 ${ledeTone(data)}`}>
          <h3 className="mb-3 text-xs font-medium tracking-wider text-ui-dim uppercase">
            {blockers.length > 0 ? 'What stops it' : 'What it found'}
          </h3>
          {data.summary ? (
            <Prose
              text={data.summary}
              patterns={REFERENCE_PATTERNS}
              /* 15px on a phone, 19px from `sm`. The answer is the point of the page
                 and stays the largest prose on it — but 19px on a 390px screen is
                 about six words a line, and a six-word line reads as a poem. */
              className="text-[0.9375rem] leading-relaxed text-ui-fg sm:text-[1.1875rem]"
            />
          ) : (
            <p className="text-ui-dim">No summary was returned.</p>
          )}
        </section>

        <p className="mt-4 max-w-[68ch] text-sm leading-relaxed text-ui-dim">
          {data.governing_spec_version ? (
            <>
              Judged against specification{' '}
              <Mono className="text-ui-fg">{data.governing_spec_version}</Mono> — the version the
              destination's authorisation was granted against, which is not always the one the
              batch was built to.
            </>
          ) : (
            <span className="text-ui-warn">
              No specification version governs this market, which is itself a finding.
            </span>
          )}
        </p>
      </header>

      <Findings
        title="What stands in the way"
        icon={<BlockIcon />}
        tone="danger"
        items={blockers}
        empty="Nothing found that blocks release. That is not a clearance — it is the result of the checks below, and a Qualified Person still decides."
      />

      {clearIt.length > 0 && (
        <Panel icon={<StepsIcon />} title="What would have to happen first" count={clearIt.length} tone="info">
          <div className="px-5 py-4">
            {/* NOT A PREDICTION AND NOT A VERDICT. These are the gates, in the
                order they must happen — and a Qualified Person still decides
                after every one of them is met. The heading says "would have to
                happen first", never "to release it", because the second phrasing
                quietly promises an outcome this system does not get to promise. */}
            <p className="mb-3 text-sm leading-relaxed text-ui-dim">
              The gates, in order. Meeting them all is what lets a Qualified Person review the
              lot — it is not a prediction that the lot will clear.
            </p>
            <ol className="gate-line grid gap-4">
              {clearIt.map((step, i) => (
                <li key={i} className="relative flex gap-4 text-ui-fg/90">
                  <span
                    className="ui-count-in relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-ui-info/50 bg-ui-surface font-mono text-[0.6875rem] text-ui-info"
                    style={{
                      animationDelay: `${i * 90}ms`,
                      boxShadow: '0 0 14px -2px var(--color-ui-info)',
                    }}
                  >
                    {i + 1}
                  </span>
                  <Prose text={step} patterns={REFERENCE_PATTERNS} className="pt-px" />
                </li>
              ))}
            </ol>
          </div>
        </Panel>
      )}

      {missing.length > 0 && (
        <Notes
          title="Could not be checked"
          icon={<GapIcon />}
          tone="warn"
          lead="A record is absent. An unchecked thing is not a passed thing."
          items={missing}
        />
      )}

      {concerns.length > 0 && (
        <Findings
          title="Worth seeing, not blocking"
          icon={<EyeIcon />}
          tone="info"
          items={concerns}
        />
      )}

      {unverified.length > 0 && (
        <Notes
          title="Stated without a source"
          tone="neutral"
          lead="No tool checked these and no retrieved document states them. Treat them as the assistant's reasoning, not as evidence."
          items={unverified}
        />
      )}
    </article>
  );
}

/**
 * The three counts, before any of them are read.
 *
 * WHAT IT IS FOR. The dossier is long by design — every finding carries the
 * rule that makes it one and the evidence under that. Someone arriving at it
 * needs to know the shape of the answer before they start reading: is this one
 * blocker and a clean file, or four findings and three gaps? That is a
 * different decision about how much time to spend, and it should not require
 * scrolling to make.
 *
 * A ZERO IS NEVER GREEN, and this is the tile most likely to get it wrong.
 * "0 blockers" in a reassuring green is this product issuing a clearance in the
 * one visual language nobody audits — the schema forbids the sentence and the
 * page must not smuggle it back as a colour. A zero goes grey and says
 * "none found", which is a report on the checks, not a verdict about the batch.
 * Colour arrives only when there is something to colour.
 *
 * THE UNCHECKED TILE IS AMBER AT ONE, NOT AT FIVE. A record that is absent is
 * not a record that passed, and there is no threshold below which that stops
 * being true.
 */
/**
 * A tile is FILLED with its severity, not outlined in it on black.
 *
 * The gradient runs from a real tint down to almost nothing, so three tiles in
 * a row read as three different states from across a desk while the numerals on
 * them stay legible — a flat fill at this strength would fight the figure
 * sitting on it.
 *
 * `none` IS NOT A FOURTH SEVERITY, it is the absence of one, and it stays grey
 * on purpose. Filling a zero with green would be the product issuing a
 * clearance in the one visual language nobody audits.
 */
const TILE: Record<Tone | 'none', string> = {
  danger: 'border-ui-danger/45 bg-linear-to-br from-ui-danger/32 to-ui-danger/8 text-ui-danger',
  warn: 'border-ui-warn/45 bg-linear-to-br from-ui-warn/32 to-ui-warn/8 text-ui-warn',
  info: 'border-ui-info/45 bg-linear-to-br from-ui-info/32 to-ui-info/8 text-ui-info',
  ok: 'border-ui-ok/45 bg-linear-to-br from-ui-ok/32 to-ui-ok/8 text-ui-ok',
  neutral: 'border-ui-line bg-ui-raised/50 text-ui-dim',
  none: 'border-ui-line bg-ui-raised/50 text-ui-faint',
};

function Scoreboard({
  blockers,
  concerns,
  missing,
}: {
  blockers: number;
  concerns: number;
  missing: number;
}) {
  const tiles: Array<{ n: number; label: string; tone: Tone }> = [
    { n: blockers, label: blockers === 1 ? 'blocker' : 'blockers', tone: 'danger' },
    // "unchecked" reads the same at one as at five, so it takes no plural.
    { n: missing, label: 'unchecked', tone: 'warn' },
    { n: concerns, label: concerns === 1 ? 'concern' : 'concerns', tone: 'info' },
  ];

  return (
    <dl className="mb-7 grid grid-cols-3 gap-3">
      {tiles.map((tile, i) => {
        const lit = tile.n > 0;
        return (
          <div
            key={tile.label}
            className={`ui-count-in rounded-xl border px-4 py-3.5 ${TILE[lit ? tile.tone : 'none']}`}
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <dt className="sr-only">{tile.label}</dt>
            <dd>
              <Mono className="block text-3xl leading-none font-semibold">{tile.n}</Mono>
              {/* The label never changes with the count. "0" beside "no gaps"
                  said the same thing twice, and a tile whose wording moves is a
                  tile you have to read rather than glance at. The grey does the
                  work of saying there is nothing there. */}
              <span className="mt-2 block text-xs opacity-75">{tile.label}</span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/**
 * Which variant the summary wears.
 *
 * The precedence is `verdict()`'s, and deliberately the same object: two
 * functions ranking the same fields is two functions that will one day rank
 * them differently, and the page would then say one thing in its headline and
 * another in its colour.
 */
function ledeTone(data: any): string {
  if ((data.blockers ?? []).length > 0) return 'lede--danger';
  if ((data.missing ?? []).length > 0 || data.escalate) return 'lede--warn';
  return '';
}

/**
 * The one-line verdict, counted from the structured answer.
 *
 * THERE IS NO GOOD-NEWS BRANCH. The strongest thing this can say is that nothing
 * was found blocking — which is a report on the checks that ran, not a
 * clearance, and the sub-line says so. "Cleared", "approved" and "ready to ship"
 * are the sentences the whole system exists to not produce.
 */
function verdict(data: any): { headline: string; sub: string; tone: string } {
  const n = (data.blockers ?? []).length;
  const missing = (data.missing ?? []).length;

  if (n > 0) {
    return {
      headline: n === 1 ? 'One thing blocks this release' : `${n} things block this release`,
      sub: 'Each is a fact from the systems, with the rule that makes it a blocker.',
      tone: 'text-ui-danger',
    };
  }
  if (missing > 0) {
    return {
      headline: 'Nothing blocking, but not everything could be checked',
      sub: 'An unchecked thing is not a passed thing. The gaps are listed below.',
      tone: 'text-ui-warn',
    };
  }
  if (data.escalate) {
    return {
      headline: 'Nothing blocking, and a person still has to decide',
      sub: 'The reason is at the top of this page.',
      tone: 'text-ui-warn',
    };
  }
  return {
    headline: 'Nothing found that blocks release',
    sub: 'That is the result of the checks below, not a clearance. A Qualified Person decides.',
    tone: 'text-ui-fg',
  };
}


/**
 * A list of findings, each with the rule that makes it one and the evidence.
 *
 * The `as_of` on a citation is surfaced whenever it is present, because in this
 * domain it is load-bearing: the revision that governs an act is the one in
 * force when the act happened, and a citation without its date cannot be checked
 * against the original.
 */
function Findings({
  title, icon, tone, items, empty,
}: {
  title: string;
  icon?: React.ReactNode;
  tone: Tone;
  items: any[];
  empty?: string;
}) {
  const t = TONES[tone];

  if (items.length === 0) {
    return empty ? (
      <section>
        <h2 className="mb-2 text-xs font-medium tracking-wide text-ui-dim uppercase">{title}</h2>
        <p className="max-w-2xl leading-relaxed text-ui-dim">{empty}</p>
      </section>
    ) : null;
  }

  return (
    <Panel icon={icon} title={title} count={items.length} tone={tone}>
      <div className="grid gap-px bg-ui-line">
        {items.map((f, i) => (
          <div key={i} className={`finding-row bg-ui-surface py-5 pr-5 pl-6 ${t.text}`}>
            {/* THREE ALTITUDES, AND ONLY ONE OF THEM IS A HEADING.
                `in_short` is what a person reads; it gets the size, the weight
                and the full-strength colour, on its own line. The code above it
                is a kicker — it is what the assessment actually emitted and an
                auditor matches against the tool output, so it must stay visible,
                but it is not a sentence and must never out-shout one. The rule
                underneath is demoted to supporting text: it is the most
                IMPORTANT thing on the row and the LEAST readable, and putting it
                first is what made the old page a wall. Label, then rule, then
                proof — each a step quieter than the last.

                THE COUNTER IS NOT DECORATION. Findings ran together when three
                stacked up; a tone-coloured ordinal in the gutter is what lets
                the eye count them without reading them. */}
            <div className="flex gap-3.5">
              {items.length > 1 && (
                <Mono
                  className={`mt-1 w-5 shrink-0 text-right text-xs tabular-nums opacity-50 ${t.text}`}
                >
                  {i + 1}
                </Mono>
              )}

              <div className="min-w-0 flex-1">
                <Mono className={`text-[0.6875rem] tracking-wider uppercase opacity-60 ${t.text}`}>
                  {f.code}
                </Mono>
                <h3 className="mt-1 text-lg leading-snug font-semibold tracking-tight text-ui-fg sm:text-xl">
                  {f.in_short}
                </h3>

                <Prose
                  text={f.why_it_blocks}
                  patterns={REFERENCE_PATTERNS}
                  className="mt-3 text-[0.9375rem] leading-relaxed text-ui-fg/70"
                />

                <div className="mt-4 grid gap-3">
                  {(f.citations ?? []).map((c: any, j: number) => (
                    <div key={j}>
                      <p className="text-sm text-ui-dim">{c.claim}</p>
                      <Quote
                        source={c.as_of ? `${c.ref}   ·   as of ${c.as_of}` : c.ref}
                        text={c.detail}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/** Plain sentences, no evidence — used where there is nothing to cite. */
function Notes({
  title, icon, tone, lead, items,
}: {
  title: string;
  icon?: React.ReactNode;
  tone: Tone;
  lead: string;
  items: string[];
}) {
  const t = TONES[tone];
  return (
    <Panel icon={icon} title={title} count={items.length} tone={tone}>
      <div className="px-5 py-4">
        <p className="mb-3 text-sm leading-relaxed text-ui-dim">{lead}</p>
        <ul className="grid gap-2">
          {items.map((m, i) => (
            <li key={i} className="flex gap-2.5 text-ui-fg/90">
              <span className={`mt-2.5 h-1 w-1 shrink-0 rounded-full ${t.text} bg-current`} />
              <Prose text={m} patterns={REFERENCE_PATTERNS} />
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}
