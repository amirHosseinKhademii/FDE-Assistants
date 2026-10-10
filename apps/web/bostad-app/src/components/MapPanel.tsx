import { useLang } from "../lib/lang";
import { googleMapsHref } from "../lib/format";
import { Icon } from "./Icons";

/**
 * PLACEHOLDER. The Google map (part 2) replaces the body of this component; the
 * props stay. Until a key is present it shows this card, never a crash.
 */
export function MapPanel({
  lat,
  lon,
  loading = false,
  className = "",
}: {
  lat?: number;
  lon?: number;
  loading?: boolean;
  className?: string;
}) {
  const { t } = useLang();

  if (loading) {
    return (
      <div className={`profile-map skeleton skeleton-map ${className}`} role="status" aria-label={t("map.loading")} />
    );
  }

  const hasCoords = typeof lat === "number" && typeof lon === "number";
  return (
    <div className={`profile-map ${className}`}>
      <div className="map-placeholder">
        <Icon name="pin" />
        <p>{t("map.placeholder")}</p>
        {hasCoords && (
          <a className="btn-secondary" href={googleMapsHref(lat, lon)} target="_blank" rel="noreferrer">
            {t("map.open")}
          </a>
        )}
      </div>
    </div>
  );
}
