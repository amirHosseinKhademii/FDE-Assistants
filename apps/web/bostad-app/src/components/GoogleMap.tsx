import { useEffect, useMemo, useState } from "react";
import { Map, AdvancedMarker, Polygon, Polyline, useMap, ColorScheme } from "@vis.gl/react-google-maps";
import { useLang } from "../lib/lang";
import { useTheme } from "../lib/theme";
import { stopMatches, type MapStop, type ModeFilter } from "../lib/transport";
import { MAP_ID } from "../lib/maps";
import { PLACE_KEY } from "../lib/places";
import { HomePin, PlacePin, StopDot, StopPin } from "./MapPins";
import type { LatLng, PlaceItem } from "@bostad/property";

export type { MapStop } from "../lib/transport";

/** Below this zoom, stops are dots: the full pictograms would pile up on each other. */
const DOT_BELOW_ZOOM = 14;
/** Walking rings around home: 400 m is about 5 minutes, 800 m about 10. */
const RINGS = [
  { metres: 400, minutes: 5 },
  { metres: 800, minutes: 10 },
];

/** Points on a circle of `metres` around a coordinate (flat-earth, fine at city scale). */
function circlePoints(lat: number, lon: number, metres: number): google.maps.LatLngLiteral[] {
  const dLat = metres / 111320;
  const dLon = metres / (111320 * Math.cos((lat * Math.PI) / 180));
  const points: google.maps.LatLngLiteral[] = [];
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * 2 * Math.PI;
    points.push({ lat: lat + dLat * Math.cos(a), lng: lon + dLon * Math.sin(a) });
  }
  return points;
}

/** Fits the view to every point; a single point gets a fixed street-level zoom. Re-fits when `fitKey` changes. */
function FitBounds({ points, fitKey }: { points: google.maps.LatLngLiteral[]; fitKey: number }) {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;
    // The map's box may have changed size (the sheet moved): tell Google first, then fit.
    google.maps.event.trigger(map, "resize");
    if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(16);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 48);
  }, [map, points, fitKey]);

  return null;
}

/** After the map's box has changed size, tell Google to fill the new area. The centre and zoom are kept; nothing is refitted. */
function ResizeOnKey({ resizeKey }: { resizeKey?: string }) {
  const map = useMap();
  useEffect(() => {
    if (!map || resizeKey === undefined) return;
    const id = window.setTimeout(() => google.maps.event.trigger(map, "resize"), 260);
    return () => window.clearTimeout(id);
  }, [map, resizeKey]);
  return null;
}

/** Pans to a place when it is chosen from the list (a new nonce each time, so the same place can be chosen twice). */
function PanTo({ focus }: { focus: { lat: number; lon: number; nonce: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !focus) return;
    map.panTo({ lat: focus.lat, lng: focus.lon });
    if ((map.getZoom() ?? 0) < 16) map.setZoom(16);
  }, [map, focus]);
  return null;
}

/**
 * The map body. Client-only: the parent renders it after mount. `stops` sets the
 * view and `filter` only decides which markers are drawn. Selection is owned by
 * the parent (the stop card lives there): a tap on a stop selects it, a tap on
 * the same stop or on the background clears it.
 */
export function GoogleMap({
  house,
  stops,
  filter = "all",
  places = [],
  selectedId,
  onSelect,
  selectedPlaceId = null,
  onSelectPlace = () => {},
  focus = null,
  expanded = false,
  fitKey = 0,
  resizeKey,
  district = null,
}: {
  house: { lat: number; lon: number };
  stops: MapStop[];
  filter?: ModeFilter;
  /** Places to mark: already filtered by the parent. */
  places?: PlaceItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  selectedPlaceId?: string | null;
  onSelectPlace?: (id: string | null) => void;
  focus?: { lat: number; lon: number; nonce: number } | null;
  expanded?: boolean;
  fitKey?: number;
  resizeKey?: string;
  /** The Safety card's area: a 2 px --text outline at 60 % and a 12 % --accent fill, labelled. */
  district?: { name: string; parts: LatLng[][][]; kind?: "district" | "neighbourhood" } | null;
}) {
  const { t } = useLang();
  const { effective } = useTheme();
  const [zoom, setZoom] = useState(15);

  const gesture: "cooperative" | "auto" | "greedy" =
    expanded ? "greedy" : typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches ? "cooperative" : "auto";

  const houseAt = useMemo(() => ({ lat: house.lat, lng: house.lon }), [house.lat, house.lon]);
  // Fit to every stop, so changing the filter never moves the view.
  // While the Safety card shows its district, the district's outline is in the fit too, so the shading is in view.
  const points = useMemo(
    () => [
      houseAt,
      ...stops.map((s) => ({ lat: s.lat, lng: s.lon })),
      ...(district ? district.parts.flatMap((rings) => rings.flatMap((ring) => ring.filter((_, i) => i % 8 === 0))) : []),
    ],
    [houseAt, stops, district],
  );
  const shown = useMemo(() => stops.filter((s) => stopMatches(s, filter)), [stops, filter]);
  const rings = useMemo(
    () => RINGS.map((r) => ({ ...r, path: circlePoints(house.lat, house.lon, r.metres) })),
    [house.lat, house.lon],
  );
  const ringColour = effective === "dark" ? "#A3AAB2" : "#5F6670";
  const dots = zoom < DOT_BELOW_ZOOM;
  // Label point: the mean of the first outer ring's vertices (fine for a district shape).
  const districtLabel = useMemo(() => {
    const ring = district?.parts[0]?.[0];
    if (!ring || ring.length === 0) return null;
    const sum = ring.reduce((a, p) => ({ lat: a.lat + p.lat, lng: a.lng + p.lng }), { lat: 0, lng: 0 });
    return { lat: sum.lat / ring.length, lng: sum.lng / ring.length };
  }, [district]);

  return (
    <Map
      mapId={MAP_ID}
      colorScheme={effective === "dark" ? ColorScheme.DARK : ColorScheme.LIGHT}
      disableDefaultUI
      defaultCenter={houseAt}
      defaultZoom={15}
      gestureHandling={gesture}
      clickableIcons={false}
      onCameraChanged={(e) => setZoom(e.detail.zoom)}
      onClick={() => {
        onSelect(null);
        onSelectPlace(null);
      }}
      style={{ width: "100%", height: "100%" }}
    >
      <FitBounds points={points} fitKey={fitKey} />
      <PanTo focus={focus} />
      <ResizeOnKey resizeKey={resizeKey} />

      {rings.map((ring) => (
        <Polyline
          key={`ring-${ring.metres}`}
          path={ring.path}
          strokeOpacity={0}
          clickable={false}
          icons={[
            {
              icon: { path: "M 0,-1 0,1", strokeColor: ringColour, strokeOpacity: 0.8, strokeWeight: 2, scale: 1 },
              offset: "0",
              repeat: "12px",
            },
          ]}
        />
      ))}
      {rings.map((ring) => {
        const top = ring.path[0];
        return (
          <AdvancedMarker key={`ring-label-${ring.metres}`} position={{ lat: top.lat, lng: top.lng }} zIndex={0}>
            <div className="ring-label">{t("map.ring", { minutes: ring.minutes })}</div>
          </AdvancedMarker>
        );
      })}

      {district &&
        district.parts.map((rings, i) => (
          <Polygon
            key={`district-${i}`}
            paths={rings.map((ring) => ring.map((p) => ({ lat: p.lat, lng: p.lng })))}
            fillColor={effective === "dark" ? "#5FB3A1" : "#2F6F62"}
            fillOpacity={0.12}
            strokeColor={effective === "dark" ? "#E8EAEC" : "#1E2328"}
            strokeOpacity={0.6}
            strokeWeight={2}
            clickable={false}
            zIndex={0}
          />
        ))}
      {district && districtLabel && (
        <AdvancedMarker position={districtLabel} clickable={false} zIndex={0}>
          <div className="district-label">
            {t(district.kind === "neighbourhood" ? "map.neighbourhoodLabel" : "map.districtLabel", { area: district.name })}
          </div>
        </AdvancedMarker>
      )}

      <HomePin position={houseAt} title={t("map.house")} />

      {places.map((p) => (
        <PlacePin
          key={`place-${p.id}`}
          position={{ lat: p.lat, lng: p.lon }}
          title={p.name || t(PLACE_KEY[p.category])}
          category={p.category}
          selected={p.id === selectedPlaceId}
          zIndex={p.id === selectedPlaceId ? 4 : 0}
          onClick={() => {
            onSelect(null);
            onSelectPlace(p.id === selectedPlaceId ? null : p.id);
          }}
        />
      ))}

      {shown.map((stop) => {
        const primary = stop.modes[0];
        // A stop with no known mode has no pictogram to draw; the transport list still shows it.
        if (!primary) return null;
        const id = stop.id || stop.name;
        const isSelected = id === selectedId;
        const position = { lat: stop.lat, lng: stop.lon };
        const toggle = () => {
          onSelectPlace(null);
          onSelect(isSelected ? null : id);
        };
        return dots ? (
          <StopDot key={id} position={position} title={stop.name} mode={primary} zIndex={1} onClick={toggle} />
        ) : (
          <StopPin
            key={id}
            position={position}
            title={stop.name}
            mode={primary}
            secondary={stop.modes[1]}
            selected={isSelected}
            label={isSelected ? stop.name : undefined}
            zIndex={isSelected ? 3 : 1}
            onClick={toggle}
          />
        );
      })}
    </Map>
  );
}
