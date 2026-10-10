import { useEffect, useMemo, useState } from "react";
import { Map, InfoWindow, Marker, useMap } from "@vis.gl/react-google-maps";
import { useLang } from "../lib/lang";
import { walkMinutes } from "../lib/format";
import { useTheme } from "../lib/theme";

export type MapStop = { id: string; name: string; lat: number; lon: number; distanceMeters: number };

const ACCENT = "#2F6F62";
const STOP_FILL = "#9AA59F";

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
 * server pass that touches `window` or the Maps API.
 */
export function GoogleMap({ house, stops }: { house: { lat: number; lon: number }; stops: MapStop[] }) {
  const { t } = useLang();
  const { effective } = useTheme();
  const [selected, setSelected] = useState<MapStop | null>(null);
  const styles = effective === "dark" ? DARK_STYLE : LIGHT_STYLE;

  const gesture: "cooperative" | "auto" =
    typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches ? "cooperative" : "auto";

  const houseAt = useMemo(() => ({ lat: house.lat, lng: house.lon }), [house.lat, house.lon]);
  const points = useMemo(
    () => [houseAt, ...stops.map((s) => ({ lat: s.lat, lng: s.lon }))],
    [houseAt, stops],
  );

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
        {stops.map((stop) => (
          <Marker
            key={stop.id}
            position={{ lat: stop.lat, lng: stop.lon }}
            icon={STOP_ICON}
            title={stop.name}
            zIndex={1}
            onClick={() => setSelected(stop)}
          />
        ))}
        {selected && (
          <InfoWindow
            position={{ lat: selected.lat, lng: selected.lon }}
            pixelOffset={[0, -8]}
            headerDisabled
            onCloseClick={() => setSelected(null)}
          >
            <div className="map-info">
              <strong>{selected.name}</strong>
              <span>
                {" · "}
                {t("map.walk", {
                  minutes: walkMinutes(selected.distanceMeters),
                  meters: selected.distanceMeters,
                })}
              </span>
            </div>
          </InfoWindow>
        )}
      </Map>
    </div>
  );
}
