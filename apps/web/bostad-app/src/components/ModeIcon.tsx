import { MODE_PATHS, lineBadgeStyle, type Mode } from "../lib/transport";
import type { TransitLine } from "@bostad/property";

/** A round badge with the mode's pictogram. Colour comes from the --mode-* tokens. */
export function ModeIcon({ mode, size = 24 }: { mode: Mode; size?: number }) {
  return (
    <span className={`mode-icon mode-${mode}`} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" focusable="false">
        {MODE_PATHS[mode].map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    </span>
  );
}

/** A Västtrafik line number on its own colours. Directions go in the tooltip. */
export function LineBadge({ line }: { line: TransitLine }) {
  const title = line.directions.length > 0 ? `${line.shortName} → ${line.directions.join(", ")}` : line.shortName;
  return (
    <span className="line-badge" style={lineBadgeStyle(line)} title={title}>
      {line.shortName}
    </span>
  );
}
