import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useLang } from "../lib/lang";
import { MODE_KEY, modesPresent, type MapStop, type ModeFilter } from "../lib/transport";
import { PLACE_KEY, PLACE_ORDER } from "../lib/places";
import type { PlaceItem } from "@bostad/property";
import { Icon } from "./Icons";
import { LangToggle } from "./LangToggle";
import { ThemeToggle } from "./ThemeToggle";
import { ModeIcon } from "./ModeIcon";
import type { PlacesFilter } from "./placeFilter";
import "../styles/map-header.css";

/** Inline layers icon for the Filters button: 24-unit grid, stroked like the other icons. */
function LayersIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M12 3.5l8.5 4.5-8.5 4.5L3.5 8z" />
      <path d="M3.5 12.5l8.5 4.5 8.5-4.5" />
      <path d="M3.5 16.5l8.5 4.5 8.5-4.5" />
    </svg>
  );
}

/**
 * The map's top row: the wordmark, one Filters button that opens a dropdown with
 * the transport and place chips, then language, theme and (on phones) search.
 * The header keeps the "topbar is-overlay" classes so it sits where the old top bar did.
 */
export function MapHeader({
  stops,
  filter,
  onFilter,
  places,
  placeFilter,
  onPlaceFilter,
  placeCount,
  showPlaces,
  onShowPlaces,
  searching = false,
  search,
}: {
  stops: MapStop[];
  filter: ModeFilter;
  onFilter: (f: ModeFilter) => void;
  places: PlaceItem[];
  placeFilter: PlacesFilter;
  onPlaceFilter: (f: PlacesFilter) => void;
  placeCount: number;
  showPlaces: boolean;
  onShowPlaces: (on: boolean) => void;
  searching?: boolean;
  search?: ReactNode;
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 56, left: 16 });
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  const modes = modesPresent(stops);
  const categories = PLACE_ORDER.filter((c) => places.some((p) => p.category === c));
  const activeCount = (filter !== "all" ? 1 : 0) + (showPlaces ? 1 : 0) + (showPlaces && placeFilter !== "all" ? 1 : 0);

  // Anchor the panel under the button, clamped inside the 16px gutter on both sides.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const b = button.current?.getBoundingClientRect();
      const width = panel.current?.offsetWidth ?? 0;
      if (!b) return;
      const left = Math.max(16, Math.min(b.left, window.innerWidth - 16 - width));
      setPos({ top: b.bottom + 8, left });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);

  // Escape and a tap outside close the panel; Escape returns focus to the button.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  // Opening the search folds the panel away.
  useEffect(() => {
    if (searching) setOpen(false);
  }, [searching]);

  return (
    <header className={`topbar is-overlay map-header${searching ? " is-searching" : ""}`}>
      <Link to="/" className="map-header-brand">
        {t("brand")}
      </Link>

      <div className="map-filter" ref={wrap}>
        <button
          ref={button}
          type="button"
          className="map-filter-btn"
          aria-label={t("map.layers")}
          aria-expanded={open}
          aria-controls="map-filter-panel"
          data-active={activeCount > 0 ? "true" : undefined}
          onClick={() => setOpen((v) => !v)}
        >
          <LayersIcon />
          {activeCount > 0 && <span className="map-filter-count">{activeCount}</span>}
          <span className="map-filter-chevron" aria-hidden="true">
            <Icon name="chevron" />
          </span>
        </button>

        <div
          id="map-filter-panel"
          ref={panel}
          className={`map-filter-panel${open ? " is-open" : ""}`}
          style={{ top: pos.top, left: pos.left }}
          inert={!open}
        >
          <div className="map-chips-group" role="group" aria-label={t("transport.filter.label")}>
            {(["all", ...modes] as ModeFilter[]).map((option) => (
              <button
                key={option}
                type="button"
                className="map-chip"
                aria-pressed={filter === option}
                tabIndex={open ? 0 : -1}
                onClick={() => {
                  onFilter(option);
                  setOpen(false);
                }}
              >
                {option !== "all" && <ModeIcon mode={option} size={22} />}
                <span>{option === "all" ? t("transport.filter.all") : t(MODE_KEY[option])}</span>
              </button>
            ))}
            {placeCount > 0 && (
              <button
                type="button"
                className="map-chip"
                aria-pressed={showPlaces}
                tabIndex={open ? 0 : -1}
                onClick={() => {
                  onShowPlaces(!showPlaces);
                  setOpen(false);
                }}
              >
                <span>{t(showPlaces ? "map.hidePlaces" : "map.showPlaces")}</span>
              </button>
            )}
          </div>
          {showPlaces && categories.length > 0 && (
            <div className="map-chips-group" role="group" aria-label={t("card.places.filter.label")}>
              {(["all", ...categories] as PlacesFilter[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  className="map-chip"
                  aria-pressed={placeFilter === option}
                  tabIndex={open ? 0 : -1}
                  onClick={() => {
                    onPlaceFilter(option);
                    setOpen(false);
                  }}
                >
                  <span>{option === "all" ? t("transport.filter.all") : t(PLACE_KEY[option])}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="map-header-tools">
        <LangToggle />
        <ThemeToggle />
        {search}
      </div>
    </header>
  );
}
