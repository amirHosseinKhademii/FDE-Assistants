/**
 * Small badges shared by the cards: proximity (a place's walk, Close / Medium / Far) and
 * the five area levels (icon + colour + word). Colour is never the only signal: each
 * badge carries a word, and the level badges an arrow or bar icon too.
 */
import type { Level, PlaceCategory } from "@bostad/property";
import { useLang } from "../lib/lang";
import type { MessageKey } from "../lib/i18n";
import { PLACE_PATHS } from "../lib/places";
import { Icon, type IconName } from "./Icons";

export type Proximity = "close" | "medium" | "far";

/** Close up to 5 minutes' walk, Medium up to 10, Far beyond. */
export function proximityOf(minutes: number): Proximity {
  return minutes <= 5 ? "close" : minutes <= 10 ? "medium" : "far";
}

/** A category pictogram inside a circle coloured by walking distance (the colour and the word say the same). */
export function ProximityCircle({ category, prox }: { category: PlaceCategory; prox: Proximity }) {
  return (
    <span className="prox-circle" data-prox={prox} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="18" height="18" focusable="false">
        {PLACE_PATHS[category].map((d) => (
          <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
    </span>
  );
}

/** "Close" / "Medium" / "Far" in the proximity colour. */
export function ProximityWord({ prox }: { prox: Proximity }) {
  const { t } = useLang();
  return (
    <span className="prox-word" data-prox={prox}>
      {t(`prox.${prox}` as MessageKey)}
    </span>
  );
}

/** The legend line at the top of the open Nearby places card. */
export function ProximityLegend() {
  const { t } = useLang();
  const items: Proximity[] = ["close", "medium", "far"];
  return (
    <ul className="prox-legend" aria-label={t("prox.legend.label")}>
      {items.map((p) => (
        <li key={p}>
          <ProximityWord prox={p} />
          <span className="muted">{t(`prox.legend.${p}` as MessageKey)}</span>
        </li>
      ))}
    </ul>
  );
}

const LEVEL_ICON: Record<Level, IconName> = {
  high: "arrowUpDouble",
  aboveAverage: "arrowUp",
  average: "equals",
  belowAverage: "arrowDown",
  low: "arrowDownDouble",
};

/**
 * An area level as a badge: arrow icon, colour, and the word. `label` replaces the
 * word when the badge carries more (e.g. "High income").
 */
export function LevelBadge({ level, label }: { level: Level; label?: string }) {
  const { t } = useLang();
  return (
    <span className="level-badge" data-level={level}>
      <Icon name={LEVEL_ICON[level]} />
      <span>{label ?? t(`level.${level}` as MessageKey)}</span>
    </span>
  );
}
