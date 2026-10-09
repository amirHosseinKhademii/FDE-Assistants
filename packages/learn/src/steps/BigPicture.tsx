/**
 * A flow drawn as one bold figure: boxes in the order the data travels, arrows
 * between them. Each box is ours or somebody else's; a dashed arrow marks where
 * data leaves our control. On a phone the boxes stack and the arrows point down.
 *
 * THE CONTENT IS THE HOST'S. It passes the boxes and arrows as `flow`, the words
 * for the key, and an optional note under the figure. Nothing here names a
 * customer, a data source or a model.
 */
import type { ReactNode } from 'react';

export type FlowSide = 'ours' | 'theirs' | 'person';

export type FlowItem =
  | { kind: 'node'; side: FlowSide; name: string; who: string; holds: string }
  | { kind: 'arrow'; label: string; line?: boolean };

export interface BigPictureProps {
  flow: FlowItem[];
  /** The key under the figure. `dashed: null` leaves the dashed-line entry out. */
  legend?: { ours?: string; theirs?: string; dashed?: string | null };
  /** Prose under the figure, e.g. why a line sits where it does. */
  note?: ReactNode;
}

export function BigPicture({ flow, legend, note }: BigPictureProps) {
  const ours = legend?.ours ?? 'What we build and run';
  const theirs = legend?.theirs ?? 'Somebody else’s';
  const dashed = legend && 'dashed' in legend ? legend.dashed : 'Dashed line: where data leaves our control';

  return (
    <>
      <div className="cal-map mt-8" role="list">
        {flow.map((item, i) =>
          item.kind === 'node' ? (
            <Node key={i} side={item.side} name={item.name} who={item.who} holds={item.holds} />
          ) : (
            <Arrow key={i} label={item.label} line={item.line} />
          ),
        )}
      </div>

      <div className="cal-map-key mt-5">
        <span>
          <span className="cal-swatch" data-side="ours" />
          {ours}
        </span>
        <span>
          <span className="cal-swatch" />
          {theirs}
        </span>
        {dashed && <span>{dashed}</span>}
      </div>

      {note && <div className="cal-prose mt-6 max-w-[66ch]">{note}</div>}
    </>
  );
}

function Node({ side, name, who, holds }: { side: FlowSide; name: string; who: string; holds: string }) {
  return (
    <div className="cal-node" data-side={side} role="listitem">
      <span className="cal-node-name">{name}</span>
      <span className="cal-node-who">{who}</span>
      <span className="cal-node-holds">{holds}</span>
    </div>
  );
}

function Arrow({ label, line = false }: { label: string; line?: boolean }) {
  return (
    <div className="cal-arrow" data-line={line} aria-hidden>
      <span className="cal-arrow-head" />
      <span>{label}</span>
    </div>
  );
}
