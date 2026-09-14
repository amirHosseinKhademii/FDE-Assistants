/**
 * The sub-agents, while they are working — the real job, not a counter.
 *
 * WHY THIS IS NOT A SPINNER AND NOT A PERCENTAGE. A fan-out takes the better
 * part of a minute and spends real money, and the most useful thing a person
 * can be told during it is not "58%" — it is WHICH LOTS. A reviewer watching
 * already knows which batches worry them; seeing LOT-AMX250-2411-A come back is
 * information, and a bar filling is not.
 *
 * THE WHOLE LIST IS DRAWN IMMEDIATELY, which is the fix for the version before
 * this one. That one grew from nothing as lots completed, because the only
 * event it had fired on COMPLETION — so for the first fifteen seconds it showed
 * an empty box and a total of "…", at exactly the moment somebody is wondering
 * whether anything is happening at all. `onStart` now hands over the entire
 * work list before the first call goes out, so the job is visible, named and
 * banded from the first instant and the sub-agents simply mark it off.
 *
 * ROWS ARE IN THE WALK'S OWN ORDER — exposure band, then quantity — because the
 * lots arrive that way and re-sorting on arrival would imply the first one back
 * is the worst one. So the reviewer's eye can go straight to the patient-facing
 * lots and watch those specifically, which is the actual thing they care about.
 *
 * TWO STATES, NOT THREE. A lot has either reported or it has not. `onProgress`
 * fires on completion, so "running right now" is not something this surface
 * knows — drawing four cells as in-flight would be a guess, and the four-at-a-
 * time figure is stated as configuration, which it is, rather than animated as
 * if it had been observed.
 *
 * EACH SUB-AGENT IS NAMED LIKE A PROCESS, NOT A PERSON. `agent-07` in the
 * monospace, beside the lot it was handed. A call sign makes the fan-out
 * legible as what it is — fourteen instances of one instruction, each with a
 * different input — and it gives the reader something to point at when one of
 * them fails. Anything more human-sounding would invite the deference this
 * product spends its whole design arguing against.
 *
 * IT DOES NOT SURVIVE THE ANSWER. Progress about a finished thing is clutter,
 * and the run figures under the work list carry what it cost.
 */
import { Mono } from '@fde/uikit';
import { LiveDot } from './LiveDot';
import type { FanoutState, FanoutLot } from '../../hooks/use-ask';

/** The same five bands the work list uses, so the two read as one page. */
const BAND: Record<string, { label: string; colour: string }> = {
  patient_facing: { label: 'with patients', colour: 'var(--color-exp-patient)' },
  distributor: { label: 'with a distributor', colour: 'var(--color-exp-distributor)' },
  in_transit: { label: 'in transit', colour: 'var(--color-exp-transit)' },
  in_our_control: { label: 'still ours', colour: 'var(--color-exp-ours)' },
  expired: { label: 'expired', colour: 'var(--color-exp-expired)' },
};

/**
 * Null rather than "unknown" when the band is missing.
 *
 * A lot only lacks an exposure if `fanout_start` never arrived — a stale build,
 * a dropped event — and in that case the truthful thing to draw is NOTHING,
 * because we have no band, not a band called unknown. Printing "unknown"
 * against twelve lots made the panel look broken and told the reader nothing
 * they could act on. The lot id and its state are still real, so those still
 * show.
 */
const bandOf = (e: string) => BAND[e] ?? null;

export function FanoutProgress({ state }: { state: FanoutState }) {
  const { done, total, lots } = state;
  const failed = lots.filter((l) => l.ok === false).length;
  const assessed = lots.filter((l) => l.ok === true).length;
  // A rate limit is a fact about quota, not about the customer's data, and it
  // reads completely differently — so it is counted and named separately.
  const rateLimited = lots.filter((l) => l.ok === false && /rate limit/i.test(l.error ?? '')).length;
  const newest = lots.reduce<FanoutLot | null>(
    (best, l) => (l.at != null && (best?.at == null || l.at > best.at) ? l : best),
    null,
  );

  return (
    <section
      className="agent-card card-aura rounded-xl border border-flow-model/30 px-4 py-5 sm:px-5"
      style={{ ['--agent' as any]: 'var(--color-flow-model)' }}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="agent-tag" style={{ ['--agent' as any]: 'var(--color-flow-model)' }}>
          fan-out
        </span>
        <h2 className="font-mono text-[0.9375rem] font-medium text-flow-model">
          {total} sub-agents, four at a time
        </h2>
        {/* CAME BACK, NOT ASSESSED. `done` counts every agent that returned,
            and a failed one returned. Reporting "23 of 23 assessed" beside
            fourteen failures was the page telling a reviewer the work was
            finished when most of it had not happened — the exact false-clean
            reading this product exists to prevent. */}
        <span className="text-sm text-ui-dim">
          {done} of {total} came back
        </span>
        <span className="text-sm text-ui-fg">{assessed} assessed</span>
        {failed > 0 && (
          <span className="text-sm text-ui-danger">
            {failed} failed
            {rateLimited > 0 && rateLimited === failed ? ' — rate limit' : ''}
          </span>
        )}
      </div>

      <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-ui-dim">
        Each agent is handed one lot&rsquo;s evidence and asked for one row. None of them can reach
        another lot — so however long this takes, no single request to the model ever contains more
        than one batch.
      </p>

      {/* THE BAR IS THE LIST AT A GLANCE, for the moment you look up from
          something else and want only "how far along". The list underneath
          answers "which ones".

          FAILURE IS DRAWN AS A GAP, NOT AS RED, and that is a correction. Red
          was already taken: `--color-exp-patient` is the band for a lot that
          reached patients, so a strip of red segments meant two completely
          different things at once — "this lot is the worst kind" and "this
          agent did not answer" — with no label anywhere to tell them apart. A
          failed agent produced no information, so it is drawn as an absence:
          hatched, in the neutral outline, unmistakable against any solid band.
          The count above says how many and why. */}
      <div className="mt-4 flex gap-1" aria-hidden>
        {lots.map((lot) => {
          const b = bandOf(lot.exposure);
          const reported = lot.ok !== undefined;
          return (
            <span
              key={`bar-${lot.lotId}`}
              /* `ui-ping` SCALES ITS ELEMENT, which inside a flex strip makes
                 the pending segments visibly wider than the finished ones. A
                 segment breathes in opacity instead — same "not yet" reading,
                 no distortion of the bar it belongs to. */
              className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
                !reported ? 'seg-waiting bg-ui-line' : lot.ok ? '' : 'seg-gap'
              }`}
              style={
                reported && lot.ok
                  ? { background: b?.colour ?? 'var(--color-flow-model)' }
                  : undefined
              }
            />
          );
        })}
      </div>

      <ul className="mt-3 grid gap-1.5">
        {lots.map((lot, i) => {
          const b = bandOf(lot.exposure);
          const colour = b?.colour ?? 'var(--color-flow-model)';
          const call = `agent-${String(i + 1).padStart(2, '0')}`;
          const reported = lot.ok !== undefined;
          const isNewest = newest?.lotId === lot.lotId;
          return (
            <li
              key={lot.lotId}
              /* TWO LAYOUTS, BECAUSE ONE ROW OF SIX THINGS DOES NOT FIT A
                 PHONE. On a narrow screen the four fixed tracks left the lot id
                 about forty pixels and it wrapped one character per line —
                 LOT-AMX250-2510-A became six lines of nonsense and the product
                 name vanished entirely. So mobile stacks: identity on the first
                 line, what and where on the second.

                 From `sm` up it is the fixed grid again, which is what makes a
                 list of fourteen states scannable — every status in the same
                 place, and the product name the only column allowed to
                 truncate because it is the only one that is decoration. */
              className={`grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-x-2.5 gap-y-1 rounded-lg border px-3 py-2 transition-colors duration-500 sm:grid-cols-[auto_auto_minmax(0,1fr)_auto] ${
                reported ? 'border-ui-line bg-ui-raised/40' : 'border-ui-line/50'
              }`}
              style={{ ['--band' as any]: colour }}
            >
              {/* THE MARK IS THE STATE. Waiting pulses — as a ring behind a
                  solid dot, never as the dot itself; see `LiveDot`. Done is
                  solid in its band, failed is the one red thing in the row. */}
              {!reported ? (
                <LiveDot colour="var(--color-ui-line-lit)" className="col-start-1" />
              ) : (
                <span
                  aria-hidden
                  className={`col-start-1 h-2 w-2 shrink-0 rounded-full ${lot.ok ? '' : 'bg-ui-danger'}`}
                  style={lot.ok ? { background: colour } : undefined}
                />
              )}
              <span
                className="agent-tag shrink-0"
                style={{ ['--agent' as any]: reported ? colour : 'var(--color-ui-faint)' }}
              >
                {call}
              </span>
              <Mono
                className={`truncate text-[0.8125rem] ${
                  isNewest ? 'ui-live-text' : reported ? 'text-ui-fg' : 'text-ui-faint'
                }`}
              >
                {lot.lotId}
              </Mono>

              {/* Second line on a phone (spanning the marker and tag columns),
                  third column on anything wider. */}
              <span className="col-span-3 min-w-0 truncate text-xs sm:col-span-1">
                <span className={reported ? 'text-ui-dim' : 'text-ui-faint'}>
                  {lot.productName}
                </span>
                {b && (
                  <span
                    className="ml-2.5 font-mono text-[0.625rem]"
                    style={{ color: reported ? b.colour : 'var(--color-ui-faint)' }}
                  >
                    {b.label}
                  </span>
                )}
              </span>
              <span
                className={`col-span-3 text-xs sm:col-span-1 sm:w-[9.5rem] sm:text-right ${
                  reported && !lot.ok ? 'text-ui-danger' : 'text-ui-faint'
                }`}
              >
                {/* THE REASON, NOT JUST THE FACT. "Could not be assessed" told
                    a reviewer nothing they could act on; "rate limit" tells
                    them it is quota rather than their data, and that running it
                    again later will work. */}
                {!reported
                  ? 'waiting'
                  : lot.ok
                    ? 'assessed'
                    : /rate limit/i.test(lot.error ?? '')
                      ? 'rate limit — not asked'
                      : 'could not be assessed'}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="sr-only" aria-live="polite">
        {done} of {total} lots assessed
      </p>

      <p className="mt-3.5 text-xs leading-relaxed text-ui-faint">
        In the order the walk ranked them — how far the material got, then quantity. They will not
        finish in that order; ranking is comparative and already done, in code rather than by a
        model.
      </p>
    </section>
  );
}
