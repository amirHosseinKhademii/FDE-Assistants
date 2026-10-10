import { useEffect, useState } from "react";
import { useLang } from "../lib/lang";
import { googleMapsHref } from "../lib/format";
import { HAS_MAPS_KEY } from "../lib/maps";
import { Icon } from "./Icons";
import { GoogleMap, type MapStop } from "./GoogleMap";
import { MapBoundary } from "./MapBoundary";
import type { ModeFilter } from "../lib/transport";

/**
 * The map panel. With a key and coordinates it shows the Google map (client
 * only). Without a key, or before mount, it shows the placeholder card.
 */
export function MapPanel({
  lat,
  lon,
  stops = [],
  filter = "all",
  loading = false,
  className = "",
}: {
  lat?: number;
  lon?: number;
  stops?: MapStop[];
  filter?: ModeFilter;
  loading?: boolean;
  className?: string;
}) {
  const { t } = useLang();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (loading) {
    return (
      <div className={`profile-map skeleton skeleton-map ${className}`} role="status" aria-label={t("map.loading")} />
    );
  }

  const hasCoords = typeof lat === "number" && typeof lon === "number";

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
    return <div className={`profile-map ${className}`}>{placeholder}</div>;
  }

  return (
    <div className={`profile-map ${className}`}>
      <MapBoundary fallback={placeholder} resetKey={`${lat},${lon}`}>
        <GoogleMap house={{ lat, lon }} stops={stops} filter={filter} />
      </MapBoundary>
    </div>
  );
}
