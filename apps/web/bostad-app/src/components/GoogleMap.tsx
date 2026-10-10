import { useEffect, useMemo, useState } from "react";
import { Map, InfoWindow, Marker, useMap } from "@vis.gl/react-google-maps";
import { useLang } from "../lib/lang";
import { walkMinutes } from "../lib/format";
import { useTheme } from "../lib/theme";
import { MAP_COLOURS, MODE_KEY, MODE_PATHS, stopMatches, modesPresent, type MapStop, type Mode, type ModeFilter, type Palette } from "../lib/transport";
import { LineBadge } from "./ModeIcon";
import { MapLegend } from "./MapLegend";

export type { MapStop } from "../lib/transport";

const ACCENT = "#2F6F62";
const STOP_FILL = "#9AA59F";
const MAX_BADGES = 8;

/** SVG as a data URI: no image request, and the marker size is the SVG's own. */
function svgIcon(svg: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const HOUSE_ICON = svgIcon(
  `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">` +
    `<circle cx="20" cy="20" r="16" fill="${ACCENT}" stroke="#FFFFFF" stroke-width="3"/>` +
    `<path d="M20 11l9 7.5V29h-6v-6h-6v6h-6v-10.5z" fill="#FFFFFF"/></svg>`,
);

const STOP_ICON = svgIcon(
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">` +
    `<circle cx="8" cy="8" r="6" fill="${STOP_FILL}" stroke="#FFFFFF" stroke-width="2"/></svg>`,
);

/**
 * A round badge in the mode's colour with its pictogram. A stop served by more
 * than one primary mode gets a small "+" dot, so a tram stop that also has
 * buses says so before you tap it.
 */
function modeIcon(mode: Mode, multi: boolean, p: Palette): string {
  const fill = p.modes[mode];
  const paths = MODE_PATHS[mode].map((d) => `<path d="${d}"/>`).join("");
  const plus = multi
    ? `<circle cx="29" cy="7" r="6" fill="${p.surface}" stroke="${fill}" stroke-width="2"/>` +
      `<path d="M29 4.5v5M26.5 7h5" stroke="${p.text}" stroke-width="1.6" stroke-linecap="round"/>`
    : "";
  return svgIcon(
    `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">` +
      `<circle cx="18" cy="18" r="16" fill="${fill}" stroke="${p.surface}" stroke-width="2.5"/>` +
      `<g transform="translate(6.08 6.08) scale(0.66)" fill="none" stroke="${p.ink}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${paths}</g>` +
      plus +
      `</svg>`,
  );
}

/** Quieter base map in both themes: no POI labels or transit icons. */
const QUIET_RULES: google.maps.MapTypeStyle[] = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];

/** Light: slightly desaturated greenery on the warm base. */
const LIGHT_STYLE: google.maps.MapTypeStyle[] = [
  ...QUIET_RULES,
  { featureType: "landscape", stylers: [{ saturation: -25 }] },
];

/** Dark: a night base in the app's own greys, so the map sits in the page. */
const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1b2024" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1b2024" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8d959d" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2b3238" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1b2024" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#37414a" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f1417" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#161b1e" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1a2a25" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#22282d" }] },
  ...QUIET_RULES,
];

/** Fits the view to every point; a single point gets a fixed street-level zoom. */
function FitBounds({ points }: { points: google.maps.LatLngLiteral[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;
    if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(16);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 48);
  }, [map, points]);

  return null;
}

/**
 * The map body. Client-only: the parent renders it after mount, so there is no
 * server pass that touches `window` or the Maps API. `stops` is every stop (it
 * sets the view); `filter` only decides which markers are drawn.
 */
export function GoogleMap({
  house,
  stops,
  filter = "all",
}: {
  house: { lat: number; lon: number };
  stops: MapStop[];
  filter?: ModeFilter;
}) {
  const { t } = useLang();
  const { effective } = useTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const styles = effective === "dark" ? DARK_STYLE : LIGHT_STYLE;
  const palette = MAP_COLOURS[effective];

  const gesture: "cooperative" | "auto" =
    typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches ? "cooperative" : "auto";

  const houseAt = useMemo(() => ({ lat: house.lat, lng: house.lon }), [house.lat, house.lon]);
  // Fit to every stop, so changing the filter never moves the view.
  const points = useMemo(
    () => [houseAt, ...stops.map((s) => ({ lat: s.lat, lng: s.lon }))],
    [houseAt, stops],
  );
  const shown = useMemo(() => stops.filter((s) => stopMatches(s, filter)), [stops, filter]);
  const selected = useMemo(() => shown.find((s) => s.id === selectedId) ?? null, [shown, selectedId]);
  const present = useMemo(() => modesPresent(stops), [stops]);

  const icons = useMemo(() => {
    const byMode = {} as Record<Mode, { single: string; multi: string }>;
    for (const mode of ["tram", "train", "ferry", "bus"] as Mode[]) {
      byMode[mode] = { single: modeIcon(mode, false, palette), multi: modeIcon(mode, true, palette) };
    }
    return byMode;
  }, [palette]);

  return (
    <div className="gmap">
      <Map
        defaultCenter={houseAt}
        defaultZoom={15}
        gestureHandling={gesture}
        styles={styles}
        clickableIcons={false}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={false}
        style={{ width: "100%", height: "100%" }}
      >
        <FitBounds points={points} />
        <Marker position={houseAt} icon={HOUSE_ICON} title={t("map.house")} zIndex={2} />
        {shown.map((stop) => {
          const primary = stop.modes[0];
          const icon = primary ? (stop.modes.length > 1 ? icons[primary].multi : icons[primary].single) : STOP_ICON;
          return (
            <Marker
              key={stop.id || stop.name}
              position={{ lat: stop.lat, lng: stop.lon }}
              icon={icon}
              title={stop.name}
              zIndex={primary ? 1 : 0}
              onClick={() => setSelectedId(stop.id || stop.name)}
            />
          );
        })}
        {selected && (
          <InfoWindow
            position={{ lat: selected.lat, lng: selected.lon }}
            pixelOffset={[0, -8]}
            headerDisabled
            onCloseClick={() => setSelectedId(null)}
          >
            <div className="map-info">
              <strong>{selected.name}</strong>
              <span>
                {t("map.walk", {
                  minutes: walkMinutes(selected.distanceMeters),
                  meters: selected.distanceMeters,
                })}
              </span>
              {selected.modes.length > 0 && (
                <span className="map-info-modes">{selected.modes.map((m) => t(MODE_KEY[m])).join(" · ")}</span>
              )}
              {selected.lines.length > 0 && (
                <div className="line-badges">
                  {selected.lines.slice(0, MAX_BADGES).map((line) => (
                    <LineBadge key={`${line.mode}|${line.shortName}`} line={line} />
                  ))}
                  {selected.lines.length > MAX_BADGES && (
                    <span className="line-more">{t("transport.moreLines", { count: selected.lines.length - MAX_BADGES })}</span>
                  )}
                </div>
              )}
            </div>
          </InfoWindow>
        )}
      </Map>
      <MapLegend modes={present} />
    </div>
  );
}
