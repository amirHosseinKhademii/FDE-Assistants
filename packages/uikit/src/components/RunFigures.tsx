/**
 * What a question cost and what it took, in one row.
 *
 * THE COST IS PRINTED AS A CEILING, and the `≤` is not decoration. Cached input
 * bills at a fraction of the normal rate and is not modelled, so the true figure
 * is at or below this one. `@fde/telemetry` states the rule this follows: a cost
 * figure that is quietly wrong is worse than no cost figure at all. An
 * unlabelled `$0.0097` is that quietly-wrong figure — it invites someone to
 * multiply it by ten thousand and put the result in a business case.
 *
 * A null cost means the model has no verified rate. It says so, rather than
 * showing a zero, which reads as "free".
 *
 * ── WHY IT IS A GRID WITH ICONS AND NOT A WRAPPING ROW ────────────────────
 *
 * It was six label/value pairs in a `flex-wrap`, which on a wide screen is one
 * tidy line and on a phone is a ragged block: three on the first row, two on
 * the second, one orphaned on the third, with nothing lining up vertically
 * because each pair is a different width. Six numbers that are meant to be
 * SCANNED were laid out as prose.
 *
 * So it is a fixed grid — two columns on a phone, three from `sm`, six from
 * `lg` — and every cell gets a mark. The icon is not decoration: it is what
 * lets the label shrink to 10px on a phone and still be identifiable at a
 * glance. Shape is read faster than a word at that size, and the word is still
 * there for anybody who wants it.
 *
 * COST IS FIRST AND CARRIES THE ACCENT, because it is the only figure here
 * anybody is accountable for. The rest are diagnostics.
 */
import type { ReactNode } from 'react';
import { ChipIcon, ClockIcon, CoinIcon, LoopIcon, TokensIcon, WrenchIcon } from '../icons';
import { Mono } from './Mono';

export interface Run {
  turns: number;
  toolCalls: number;
  inputTokens: number;
  outputTokens: number;
  ms: number;
  engine: string;
  stoppedBecause: string;
  /** Absent and null both mean "no verified rate" — see the cost line below. */
  costUsd?: number | null;
}

export function RunFigures({ run }: { run?: Run }) {
  if (!run) return null;

  // `== null` CATCHES UNDEFINED AS WELL AS NULL, and that is the point. A
  // caller that simply has no cost figure to give — a route assembling its own
  // `run` object and forgetting one field — used to crash the whole answer pane
  // on `.toFixed`. A shared component is the wrong place to be strict about an
  // optional field: the honest reading of "absent" is the same as the honest
  // reading of "null", which is that no rate was verified.
  const cost = run.costUsd == null ? 'no verified rate' : `≤ $${run.costUsd.toFixed(4)}`;

  return (
    <dl className="ui-count-in mt-8 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-ui-line pt-4 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-7">
      <Figure
        icon={<CoinIcon />}
        label="cost"
        value={cost}
        accent
        title="A ceiling: cached input bills lower and is not modelled."
      />
      <Figure
        icon={<ClockIcon />}
        label="time"
        value={run.ms == null ? '—' : `${(run.ms / 1000).toFixed(1)}s`}
      />
      <Figure icon={<LoopIcon />} label="turns" value={String(run.turns)} />
      <Figure icon={<WrenchIcon />} label="tools" value={String(run.toolCalls)} />
      {/* THE ONE THAT NEEDED THE ROOM. "21,531 in / 9,935 out" is twice the
          width of anything else here. In the old wrapping row it was what
          pushed `engine` onto a line of its own; in an even six-column grid it
          wrapped onto two lines and made every other cell's value sit high.
          So the grid is seven columns and this cell takes two of them — one
          line at every width, and the five single-width cells stay aligned. */}
      <Figure
        icon={<TokensIcon />}
        label="tokens"
        className="col-span-2 sm:col-span-1 lg:col-span-2"
        value={`${run.inputTokens.toLocaleString()} in / ${run.outputTokens.toLocaleString()} out`}
      />
      <Figure icon={<ChipIcon />} label="engine" value={run.engine} />
    </dl>
  );
}

function Figure({
  icon,
  label,
  value,
  accent,
  title,
  className = '',
}: {
  icon: ReactNode;
  label: string;
  value: string;
  accent?: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <div className={`ui-run-figure ${className}`} title={title}>
      <dt className="ui-run-label">
        <span aria-hidden className={accent ? 'text-ui-accent/70' : 'text-ui-faint'}>
          {icon}
        </span>
        {label}
      </dt>
      <dd>
        <Mono className={`ui-run-value ${accent ? 'text-ui-accent' : 'text-ui-fg/80'}`}>
          {value}
        </Mono>
      </dd>
    </div>
  );
}
