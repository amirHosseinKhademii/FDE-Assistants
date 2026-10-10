import { useEffect, useMemo, useState } from "react";
import { Map, InfoWindow, Marker, ColorScheme, useMap } from "@vis.gl/react-google-maps";
import { useLang } from "../lib/lang";
import { walkMinutes } from "../lib/format";
import { useTheme } from "../lib/theme";
import { MAP_COLOURS, MODE_KEY, stopMatches, modesPresent, type MapStop, type Mode, type ModeFilter } from "../lib/transport";
import { MAP_ID } from "../lib/maps";
import { HomePin, StopPin } from "./MapPins";
import { LineBadge } from "./ModeIcon";
import { MapLegend } from "./MapLegend";
import { PLACE_KEY } from "../lib/places";
import type { PlaceItem } from "@bostad/property";

export type { MapStop } from "../lib/transport";

const MAX_BADGES = 8;

/** SVG as a data URI: no image request, and the marker size is the SVG's own. */
function svgIcon(svg: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

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
  places = [],
}: {
  house: { lat: number; lon: number };
  stops: MapStop[];
  filter?: ModeFilter;
  places?: PlaceItem[];
}) {
  const { t } = useLang();
  const { effective } = useTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  // Small neutral dots for everyday places: quieter than the transit markers.
  const placeIcon = useMemo(
    () =>
      svgIcon(
        `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14">` +
          `<circle cx="7" cy="7" r="5" fill="${effective === "dark" ? "#C9CFD6" : "#4B5563"}" stroke="${palette.surface}" stroke-width="2"/></svg>`,
      ),
    [effective, palette.surface],
  );

  return (
    <div className="gmap">
      <Map
        defaultCenter={houseAt}
        defaultZoom={15}
        gestureHandling={gesture}
        mapId={MAP_ID}
        colorScheme={effective === "dark" ? ColorScheme.DARK : ColorScheme.LIGHT}
        disableDefaultUI
        clickableIcons={false}
        style={{ width: "100%", height: "100%" }}
      >
        <FitBounds points={points} />
        <HomePin position={houseAt} title={t("map.house")} />
        {places.map((p) => (
          <Marker
            key={`place-${p.id}`}
            position={{ lat: p.lat, lng: p.lon }}
            icon={placeIcon}
            title={p.name || t(PLACE_KEY[p.category])}
            zIndex={-1}
          />
        ))}
        {shown.map((stop) => {
          const primary = stop.modes[0];
          if (!primary) return null;
          return (
            <StopPin
              key={stop.id || stop.name}
              position={{ lat: stop.lat, lng: stop.lon }}
              title={stop.name}
              mode={primary}
              secondary={stop.modes[1]}
              zIndex={1}
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
