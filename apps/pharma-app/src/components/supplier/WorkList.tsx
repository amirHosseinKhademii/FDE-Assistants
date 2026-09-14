/**
 * The supplier work list, set as a list to work down rather than a document to
 * read.
 *
 * WRITTEN FRESH, NOT PARAMETERISED OUT OF `answer/Answer.tsx`, and the schema
 * settled that before the UI did: `supplier-impact-schema.ts` records the
 * verdict as "two shapes". A release dossier is ONE decision with one
 * escalation. This is N judgements, each with its own exposure band, its own
 * findings and its own named human. A renderer that did both would have to
 * decide at runtime which rules apply, and the rule that matters here — a
 * finding without a named owner is the system quietly deciding — has to fire
 * per row.
 *
 * THE ORDER IS NOT MINE TO CHOOSE. Rows arrive ranked by the orchestrator:
 * exposure band, then quantity within the band. Sorting here would mean the
 * page showed a different priority from the assessment that produced it, and a
 * recall coordinator would be working the wrong end of the list. So the numeral
 * is just the index — visible BECAUSE it is load-bearing. `DESIGN.md` warns
 * that numbered markers are usually decoration; this is the case it exempts,
 * where the content genuinely is a sequence.
 *
 * WHAT IS DELIBERATELY NOT HERE:
 *
 *   NO RECALL VERDICT, in any heading, chip or empty state. The assessment
 *   tool's own header is explicit — "a recall is a regulatory decision with a
 *   legal clock, made by people with names" — and `coherenceErrors` REJECTS the
 *   sentence in the model's prose. Reintroducing it in static markup would slip
 *   past the one check built to catch it. "23 lots affected" is a count and is
 *   fine. "Recall required" is a decision and is not.
 *
 *   NO GREEN, and no cleared state. Same rule as the release dossier.
 *
 *   A PARTIAL FAN-OUT NEVER DRAWS AS A COMPLETE LIST. Twenty-three independent
 *   sub-agents will not all succeed forever, and a 20-row list presented as the
 *   answer to a 23-lot question is what the orchestrator's own header calls a
 *   lie of omission about patient exposure. So when `fanout.ok` is false the
 *   problems are stated ABOVE the rows, in the register the escalation uses —
 *   not appended below, where somebody working down the list would meet them
 *   after deciding.
 *
 *   NO TOTAL AT THE TOP THAT SOFTENS THE WORST ROW. The scoreboard counts the
 *   patient-facing band separately rather than folding it into "23 lots",
 *   because the scale of the list and the reach of its worst row are different
 *   facts and the second is the one that sets today's clock.
 */
import { Mono, Quote, Chip, Panel, Prose, GavelIcon, GapIcon, EyeIcon, BlockIcon } from '@fde/uikit';
import { REFERENCE_PATTERNS } from '../../lib/tokens';

/**
 * The five bands, each with the word a human would use for it.
 *
 * THE LABEL SAYS WHERE THE MATERIAL IS, not how bad it is. "Delivered to
 * patients" is a location; "critical" would be a judgement, and the judgement
 * belongs to the person reading the row. The band's own ordering already
 * carries the urgency.
 */
const BANDS: Record<string, { label: string; band: string; says: string }> = {
  patient_facing: {
    label: 'With patients',
    band: 'var(--color-exp-patient)',
    says: 'Delivered to a hospital or a pharmacy chain. Out of our reach entirely.',
  },
  distributor: {
    label: 'With a distributor',
    band: 'var(--color-exp-distributor)',
    says: 'Delivered to a wholesaler. Recoverable, but not by us alone.',
  },
  in_transit: {
    label: 'In transit',
    band: 'var(--color-exp-transit)',
    says: 'On a lorry. It can still be stopped, which is why it is above the warehouse.',
  },
  in_our_control: {
    label: 'Still ours',
    band: 'var(--color-exp-ours)',
    says: 'Never shipped, or held. Ours to quarantine — the cheapest band to act on, not a cleared one.',
  },
  expired: {
    label: 'Expired',
    band: 'var(--color-exp-expired)',
    says: 'Past its expiry date. No live exposure remains, which is why no next step is owed.',
  },
};

function bandOf(exposure: string) {
  return (
    BANDS[exposure] ?? {
      label: exposure,
      band: 'var(--color-ui-line-lit)',
      says: 'An exposure band this page does not recognise. Read the row, not the colour.',
    }
  );
}

export function WorkList({ data }: { data: any }) {
  const rows: any[] = data.rows ?? [];
  const preventable: string[] = data.preventable ?? [];
  const missing: string[] = data.missing ?? [];
  const unverified: string[] = data.unverified_claims ?? [];

  const patientFacing = rows.filter((r) => r.exposure === 'patient_facing').length;
  const units = rows.reduce((n, r) => n + (Number(r.quantity_units) || 0), 0);
  const owed = rows.filter((r) => r.escalate).length;

  // Present only on a fan-out run; the single loop has no partial state.
  const fanout = data.fanout as { ok: boolean; problems: string[] } | undefined;

  return (
    <article className="ui-stagger grid gap-7">
      {fanout && !fanout.ok && (
        <div className="overflow-hidden rounded-xl border border-ui-danger/45 bg-ui-danger/8">
          <div className="flex items-center gap-2.5 border-b border-ui-danger/25 px-5 py-3 text-ui-danger">
            <BlockIcon />
            <h2 className="font-medium">This list is incomplete</h2>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm leading-relaxed text-ui-fg/90">
              Not every lot could be assessed, so the rows below are not the whole answer. Whether a
              partial list is usable is your call — it is not one this page will make quietly by
              showing you a shorter list.
            </p>
            <ul className="mt-3 grid gap-2">
              {(fanout.problems ?? []).map((p) => (
                <li key={p} className="finding-row rounded-lg px-3.5 py-2.5 text-sm text-ui-fg/90">
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <header>
        <Scoreboard lots={rows.length} patientFacing={patientFacing} missing={missing.length} />

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Chip tone="neutral">{data.supplier_id}</Chip>
          <span className="text-ui-faint">·</span>
          <span className="text-sm text-ui-dim">{data.supplier_name}</span>
          {data.disqualified_on ? (
            <Chip tone="danger">disqualified {data.disqualified_on}</Chip>
          ) : (
            <Chip tone="info">never disqualified</Chip>
          )}
        </div>

        {/* COUNTED, NEVER QUOTED — derived from the rows, not from the model's
            summary, so the headline cannot drift from the list underneath it.
            No branch of it says what to do about the material. */}
        <h2 className={`text-xl font-semibold tracking-tight sm:text-2xl ${verdict(rows, patientFacing).tone}`}>
          {verdict(rows, patientFacing).headline}
        </h2>
        <p className="mt-1.5 text-sm text-ui-dim">{verdict(rows, patientFacing).sub}</p>

        {data.summary && (
          <div className="card-aura mt-5 rounded-xl border border-ui-line bg-ui-surface px-4 py-3.5 sm:px-5 sm:py-4">
            <Prose
              text={data.summary}
              patterns={REFERENCE_PATTERNS}
              /* 15px on a phone, 16px from `sm`. This is the model's paragraph and
                 the widest block of prose on the page; at body size it filled a
                 phone screen on its own and pushed the list it summarises off
                 the bottom. */
              className="text-[0.9375rem] leading-relaxed text-ui-fg/90 sm:text-base"
            />
          </div>
        )}
      </header>

      {/* ── ESTATE-LEVEL ESCALATION, AFTER THE FIGURES AND THE SUMMARY ────
          It used to sit ABOVE the header, on the reasoning that a reader who
          starts working row 1 will not scroll back up for it. That reasoning
          still holds against the LIST — and this is still above the list — but
          it was wrong about the header. The three counts and the summary are
          what the escalation is ABOUT: "a person has to decide this" means
          nothing until you know it concerns five lots that reached patients.
          Put first, it demanded a decision before saying what about.

          So it moves below the counts and the summary, and stays above the
          rows. Same field, same weight, read in the order the sentence needs. */}
      {data.escalate && (
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

      {/* ABOVE THE ROWS AND VISUALLY APART, which is the whole reason the schema
          gives this its own field: these are the only findings left that can be
          PREVENTED rather than remediated. Material from a disqualified supplier
          still flagged usable is a thing somebody can stop today. Inside the
          list it would be one item among twenty-three, sorted below lots that
          already shipped — exactly backwards. */}
      {preventable.length > 0 && (
        <Panel tone="danger" icon={<BlockIcon />} title="Still preventable">
          <p className="mb-3 text-sm text-ui-dim">
            Everything below this block has already happened. These have not.
          </p>
          <ul className="grid gap-2.5">
            {preventable.map((p) => (
              <li key={p} className="finding-row rounded-lg px-3.5 py-2.5">
                <Prose text={p} patterns={REFERENCE_PATTERNS} className="text-sm text-ui-fg/90" />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <section>
        <h3 className="mb-1 text-lg font-medium">
          {rows.length === 0
            ? 'No affected lots'
            : `${rows.length} affected lot${rows.length === 1 ? '' : 's'}`}
        </h3>
        <p className="mb-4 text-sm text-ui-dim">
          {rows.length === 0 ? (
            'Nothing was made with this supplier’s material in the records that were read. That is a statement about the records, not a clearance.'
          ) : (
            <>
              Ranked by how far the material got, then by quantity — {units.toLocaleString()} units
              in total, {owed} row{owed === 1 ? '' : 's'} with a named owner.
            </>
          )}
        </p>

        <ol className="grid gap-3.5">
          {rows.map((row, i) => (
            <Row key={row.lot_id ?? i} row={row} rank={i + 1} />
          ))}
        </ol>
      </section>

      {/* MISSING BEFORE UNVERIFIED, and never as a footnote: "an unchecked thing
          is not a cleared thing" is the schema's own sentence, and a work list
          with a hole in it is the one that sends somebody to the wrong shelf. */}
      {missing.length > 0 && (
        <Panel tone="warn" icon={<GapIcon />} title="Could not be checked">
          <ul className="grid gap-2.5">
            {missing.map((m) => (
              <li key={m} className="finding-row rounded-lg px-3.5 py-2.5">
                <Prose text={m} patterns={REFERENCE_PATTERNS} className="text-sm text-ui-fg/90" />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* LAST, AND NEVER STYLED AS EVIDENCE. These are things the model asserted
          that the assessment did not report. They are shown because hiding them
          is how an invented lot becomes a fact. */}
      {unverified.length > 0 && (
        <Panel tone="neutral" icon={<EyeIcon />} title="Said, but not found in the records">
          <ul className="grid gap-2 text-sm text-ui-dim">
            {unverified.map((u) => (
              <li key={u} className="leading-relaxed">
                {u}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </article>
  );
}

/**
 * One lot.
 *
 * THE BAND IS SET ONCE, ON THE ROW, and everything inside inherits it through
 * `--band`. A finding cannot pick its own colour, the same rule the data-flow
 * lanes use — so nothing can end up drawn in a calmer band than the row it sits
 * in.
 */
function Row({ row, rank }: { row: any; rank: number }) {
  const b = bandOf(row.exposure);
  const findings: any[] = row.findings ?? [];

  return (
    <li className="exp-row px-4 py-4 sm:px-5" style={{ ['--band' as any]: b.band }}>
      <div className="flex items-start gap-3.5">
        <span className="exp-rank mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[0.75rem]">
          {rank}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <Mono className="text-[0.9375rem] font-medium text-ui-fg">{row.lot_id}</Mono>
            <span className="text-sm text-ui-dim">{row.product_name}</span>
            <span
              className="rounded-full border px-2 py-px font-mono text-[0.625rem]"
              style={{ color: b.band, borderColor: b.band }}
            >
              {b.label}
            </span>
          </div>

          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ui-faint">
            <span>{row.market}</span>
            <span>{Number(row.quantity_units ?? 0).toLocaleString()} units</span>
          </p>

          <Prose
            text={row.in_short}
            patterns={REFERENCE_PATTERNS}
            className="mt-2.5 text-sm leading-relaxed text-ui-fg/90"
          />

          {findings.length > 0 && (
            <ul className="mt-3 grid gap-2">
              {findings.map((f, i) => (
                <li key={f.code ?? i} className="finding-row rounded-lg px-3 py-2.5">
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    {/* THE CODE VERBATIM. The schema forbids rewording it, and
                        printing it is what lets a reviewer grep the assessment
                        for the same string. */}
                    <Mono className="text-[0.6875rem] text-ui-faint">{f.code}</Mono>
                    <span className="text-sm text-ui-fg/90">{f.in_short}</span>
                  </div>
                  {(f.citations ?? []).length > 0 && (
                    <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                      {f.citations.map((c: string) => (
                        <Mono key={c} className="text-[0.6875rem] text-ui-dim">
                          {c}
                        </Mono>
                      ))}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* NEXT ACTION AND OWNER TOGETHER. A step with nobody's name on it is
              the failure this schema exists to prevent, so they are never drawn
              in separate places where one can be read without the other. */}
          <div className="mt-3 border-t border-ui-line pt-3">
            {row.next_action ? (
              <>
                <p className="text-sm text-ui-fg">
                  <span className="text-ui-faint">Next: </span>
                  {row.next_action}
                </p>
                {row.escalate ? (
                  <p className="mt-1.5 text-xs text-ui-warn">
                    {row.escalate.suggested_owner} — {row.escalate.reason}
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-ui-faint">
                    No named owner on this row. The step above is still somebody’s to take.
                  </p>
                )}
              </>
            ) : (
              /* STATED, NOT BLANK. `next_action` is legitimately null for an
                 expired lot, and an empty space there reads as an oversight. */
              <p className="text-sm text-ui-dim">
                No step remains — this lot is past its expiry date. It stays on the
                list because it was still made with the material.
              </p>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * The three figures, each on the surface that matches what it means — the same
 * rule the release scoreboard follows. A zero here is never green: zero
 * patient-facing lots is a fact about reach, not a clearance.
 */
function Scoreboard({
  lots,
  patientFacing,
  missing,
}: {
  lots: number;
  patientFacing: number;
  missing: number;
}) {
  return (
    <div className="mb-5 grid grid-cols-3 gap-2.5">
      <Tile n={lots} label={`affected lot${lots === 1 ? '' : 's'}`} tone="neutral" />
      <Tile n={patientFacing} label="reached patients" tone={patientFacing > 0 ? 'danger' : 'neutral'} />
      <Tile n={missing} label="unchecked" tone={missing > 0 ? 'warn' : 'neutral'} />
    </div>
  );
}

const TILE: Record<string, string> = {
  neutral: 'border-ui-line bg-ui-surface text-ui-fg',
  danger: 'border-ui-danger/35 bg-ui-danger/8 text-ui-danger',
  warn: 'border-ui-warn/35 bg-ui-warn/8 text-ui-warn',
};

function Tile({ n, label, tone }: { n: number; label: string; tone: string }) {
  return (
    <div className={`rounded-xl border px-3.5 py-3 ${TILE[tone]}`}>
      <p className="font-mono text-2xl leading-none font-semibold">{n}</p>
      <p className="mt-1.5 text-[0.6875rem] leading-tight text-ui-dim">{label}</p>
    </div>
  );
}

/**
 * The headline, derived from the rows and nothing else.
 *
 * NOTE WHAT NO BRANCH SAYS. None of them names a remedy, and none of them says
 * a lot must be pulled. The worst case states reach — "reached patients" — and
 * leaves what follows from that to the people whose job it is.
 */
function verdict(rows: any[], patientFacing: number) {
  if (rows.length === 0) {
    return {
      headline: 'Nothing was made with this material',
      sub: 'In the records that were read. Check what could not be checked, below.',
      tone: 'text-ui-fg',
    };
  }
  if (patientFacing > 0) {
    return {
      headline: `${patientFacing} lot${patientFacing === 1 ? '' : 's'} reached patients`,
      sub: 'That material is outside our control. Quality and Regulatory decide what happens next.',
      tone: 'text-ui-danger',
    };
  }
  return {
    headline: `${rows.length} lot${rows.length === 1 ? '' : 's'} affected, none with patients`,
    sub: 'Every row still needs working. "Not with patients" is about reach, not about risk.',
    tone: 'text-ui-fg',
  };
}
