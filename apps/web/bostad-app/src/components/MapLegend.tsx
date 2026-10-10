import { useState } from "react";
import { useLang } from "../lib/lang";
import { MODE_KEY, type Mode } from "../lib/transport";
import { ModeIcon } from "./ModeIcon";
import { Icon } from "./Icons";

/**
 * Bottom-left key for the markers. Lists only the modes on the map. Starts
 * open on wide screens and closed on phones, and can be folded either way.
 */
export function MapLegend({ modes }: { modes: Mode[] }) {
  const { t } = useLang();
  const [open, setOpen] = useState(() => window.matchMedia("(min-width: 600px)").matches);
  if (modes.length === 0) return null;
  return (
    <div className={`map-legend${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="map-legend-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="pin" className="icon" />
        <span>{t("transport.legend")}</span>
        <Icon name="chevron" className="icon map-legend-chevron" />
      </button>
      {open && (
        <ul className="map-legend-list">
          {modes.map((mode) => (
            <li key={mode}>
              <ModeIcon mode={mode} size={22} />
              <span>{t(MODE_KEY[mode])}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
