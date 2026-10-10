import { useEffect, useState } from "react";
import { useLang } from "../lib/lang";
import { googleMapsHref, walkingDirectionsHref, walkMinutes } from "../lib/format";
import { HAS_MAPS_KEY } from "../lib/maps";
import { MODE_KEY, modesPresent, type MapStop, type ModeFilter } from "../lib/transport";
import { Icon } from "./Icons";
import { GoogleMap } from "./GoogleMap";
import { MapBoundary } from "./MapBoundary";
import { LineBadge, ModeIcon } from "./ModeIcon";
import type { PlaceItem } from "@bostad/property";

const MAX_BADGES = 8;

/** Inline icons for the map buttons: 24-unit grid, stroked like the other icons. */
function ExpandIcon({ close }: { close: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {close ? (
        <>
          <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />
        </>
      ) : (
        <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
      )}
    </svg>
  );
}

/**
 * The map panel: the map, its layer chips, the expand and recenter buttons and
 * the stop card. Owns the view state (fullscreen, selected stop). Without a key,
 * or before mount, it shows the placeholder card.
 */
export function MapPanel({
  lat,
  lon,
  stops = [],
  filter = "all",
  onFilter = () => {},
  places = [],
  placeCount = 0,
  showPlaces = false,
  onShowPlaces = () => {},
  loading = false,
}: {
  lat?: number;
  lon?: number;
  stops?: MapStop[];
  filter?: ModeFilter;
  onFilter?: (f: ModeFilter) => void;
  /** Everyday places to mark (empty unless the "Show places" chip is on). */
  places?: PlaceItem[];
  placeCount?: number;
  showPlaces?: boolean;
  onShowPlaces?: (on: boolean) => void;
  loading?: boolean;
}) {
  const { t } = useLang();
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fitKey, setFitKey] = useState(0);

  useEffect(() => setMounted(true), []);
  // A new address has new stops: the old selection and fullscreen do not carry over.
  useEffect(() => setSelectedId(null), [lat, lon]);

  // Esc closes the stop card first, then leaves fullscreen.
  useEffect(() => {
    if (!expanded && !selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (selectedId) setSelectedId(null);
      else setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, selectedId]);

  // Fullscreen takes the page scroll away while it is open.
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [expanded]);

  if (loading) {
    return <div className="map-col skeleton skeleton-map" role="status" aria-label={t("map.loading")} />;
  }

  const hasCoords = typeof lat === "number" && typeof lon === "number";
  const selected = stops.find((s) => (s.id || s.name) === selectedId) ?? null;
  const present = modesPresent(stops);
  const className = `map-col${expanded ? " is-expanded" : ""}`;

  const placeholder = (
    <div className="map-placeholder">
      <Icon name="pin" />
      <p>{t("map.placeholder")}</p>
      {hasCoords && (
        <a className="btn-secondary" href={googleMapsHref(lat, lon)} target="_blank" rel="noreferrer">
          {t("map.open")}
        </a>
      )}
    </div>
  );

  if (!(HAS_MAPS_KEY && mounted && hasCoords)) {
    return <div className={className}>{placeholder}</div>;
  }

  return (
    <div className={className}>
      <div className="map-canvas">
      <MapBoundary fallback={placeholder} resetKey={`${lat},${lon}`}>
        <GoogleMap
          house={{ lat, lon }}
          stops={stops}
          filter={filter}
          places={showPlaces ? places : []}
          selectedId={selectedId}
          onSelect={setSelectedId}
          expanded={expanded}
          fitKey={fitKey}
        />
      </MapBoundary>
      </div>

      <div className="map-chips" role="group" aria-label={t("map.layers")}>
        {(["all", ...present] as ModeFilter[]).map((option) => (
          <button
            key={option}
            type="button"
            className="map-chip"
            aria-pressed={filter === option}
            onClick={() => onFilter(option)}
          >
            {option !== "all" && <ModeIcon mode={option} size={22} />}
            <span>{option === "all" ? t("transport.filter.all") : t(MODE_KEY[option])}</span>
          </button>
        ))}
        {placeCount > 0 && (
          <button type="button" className="map-chip" aria-pressed={showPlaces} onClick={() => onShowPlaces(!showPlaces)}>
            <span>{t(showPlaces ? "map.hidePlaces" : "map.showPlaces")}</span>
          </button>
        )}
      </div>

      <button
        type="button"
        className="map-round map-expand"
        aria-label={t(expanded ? "map.collapse" : "map.expand")}
        onClick={() => setExpanded((v) => !v)}
      >
        <ExpandIcon close={expanded} />
      </button>

      {hasCoords && (
        <button
          type="button"
          className="map-round map-recentre"
          aria-label={t("map.recenter")}
          onClick={() => setFitKey((k) => k + 1)}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="6" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        </button>
      )}

      {selected && hasCoords && (
        <section className="map-card" aria-label={selected.name}>
          <div className="map-card-head">
            <span className="stop-modes">
              {selected.modes.map((mode) => (
                <ModeIcon key={mode} mode={mode} size={24} />
              ))}
            </span>
            <div className="map-card-text">
              <strong>{selected.name}</strong>
              <span className="muted">
                {t("map.walk", { minutes: walkMinutes(selected.distanceMeters), meters: selected.distanceMeters })}
              </span>
            </div>
            <button type="button" className="map-round map-card-close" aria-label={t("map.close")} onClick={() => setSelectedId(null)}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          {selected.lines.length > 0 && (
            <div className="line-badges">
              {selected.lines.slice(0, MAX_BADGES).map((line) => (
                <LineBadge key={`${line.mode}|${line.shortName}`} line={line} />
              ))}
            </div>
          )}
          <a
            className="btn-secondary map-card-directions"
            href={walkingDirectionsHref({ lat, lon }, selected)}
            target="_blank"
            rel="noreferrer"
          >
            {t("map.directions")}
          </a>
        </section>
      )}
    </div>
  );
}
