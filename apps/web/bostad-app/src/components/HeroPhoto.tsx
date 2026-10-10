/**
 * The building at the top of the profile. Tries, in order:
 *  1. Street View aimed at the address: the nearest outdoor panorama within
 *     50 m (free metadata call in the browser), heading computed from the
 *     panorama to the address, then a Static image of it.
 *  2. A satellite close-up (zoom 19) when there is no panorama, or when Street
 *     View Static is refused.
 *  3. Nothing, quietly, when neither image loads (e.g. the APIs are not enabled).
 * Tap the Street View image to open an interactive panorama, with a close
 * button and Esc. The Places photo tier is not built (it needs a server route).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useApiIsLoaded } from "@vis.gl/react-google-maps";
import { useLang } from "../lib/lang";
import { HAS_MAPS_KEY, MAPS_KEY } from "../lib/maps";

type Source =
  | { kind: "streetview"; pano: string; heading: number; date: string | null }
  | { kind: "satellite" }
  | { kind: "none" };

/** Compass bearing in degrees (0 = north) from one point to another. */
export function bearingDegrees(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const φ1 = from.lat * rad;
  const φ2 = to.lat * rad;
  const Δλ = (to.lng - from.lng) * rad;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) / rad + 360) % 360;
}

export function staticStreetView(pano: string, heading: number): string {
  const q = new URLSearchParams({
    size: "640x360",
    scale: "2",
    fov: "70",
    pitch: "10",
    heading: String(Math.round(heading)),
    pano,
    key: MAPS_KEY,
  });
  return `https://maps.googleapis.com/maps/api/streetview?${q.toString()}`;
}

export function staticSatellite(lat: number, lon: number): string {
  const q = new URLSearchParams({
    center: `${lat},${lon}`,
    zoom: "19",
    size: "640x360",
    scale: "2",
    maptype: "satellite",
    key: MAPS_KEY,
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${q.toString()}`;
}

export function HeroPhoto({ lat, lon, address }: { lat: number; lon: number; address: string }) {
  const { t, lang } = useLang();
  const loaded = useApiIsLoaded();
  const [source, setSource] = useState<Source | null>(null);
  const [imageFailed, setImageFailed] = useState<false | "streetview" | "satellite">(false);
  const [imageReady, setImageReady] = useState(false);
  const [open, setOpen] = useState(false);

  // The metadata call: nearest outdoor panorama within 50 m, free of image quota.
  useEffect(() => {
    if (!HAS_MAPS_KEY || !loaded || typeof google === "undefined") return;
    setSource(null);
    setImageFailed(false);
    setImageReady(false);
    const here = { lat, lng: lon };
    const service = new google.maps.StreetViewService();
    service.getPanorama(
      { location: here, radius: 50, source: google.maps.StreetViewSource.OUTDOOR },
      (data, status) => {
        if (status === google.maps.StreetViewStatus.OK && data?.location?.latLng && data.location.pano) {
          const panoLatLng = data.location.latLng;
          setSource({
            kind: "streetview",
            pano: data.location.pano,
            heading: bearingDegrees({ lat: panoLatLng.lat(), lng: panoLatLng.lng() }, here),
            date: data.imageDate ?? null,
          });
        } else {
          setSource({ kind: "satellite" });
        }
      },
    );
  }, [lat, lon, loaded]);

  const src = useMemo(() => {
    if (!source || source.kind === "none") return null;
    if (source.kind === "streetview" && imageFailed !== "streetview") return staticStreetView(source.pano, source.heading);
    if (imageFailed === "satellite") return null;
    return staticSatellite(lat, lon);
  }, [source, imageFailed, lat, lon]);

  // Opening the panorama pushes one history entry, so the browser's Back closes it instead of leaving the page.
  // Closing by button or Esc goes back over that entry; the popstate listener then just confirms the close.
  useEffect(() => {
    if (!open) return;
    history.pushState({ bostadPanorama: true }, "");
    const onPop = () => setOpen(false);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open]);

  const closePanorama = () => {
    if (history.state && (history.state as { bostadPanorama?: boolean }).bostadPanorama) history.back();
    setOpen(false);
  };

  // Esc closes the panorama; the page scroll is held while it is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanorama();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
    // closePanorama is recreated each render but only reads history and setOpen, which are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!HAS_MAPS_KEY || !source || source.kind === "none" || !src || imageFailed === "satellite") return null;

  const isStreet = source.kind === "streetview" && imageFailed !== "streetview";
  const caption = isStreet
    ? source.kind === "streetview" && source.date
      ? t("hero.streetview", { date: formatDate(source.date, lang) })
      : t("hero.streetviewPlain")
    : t("hero.aerial");

  const onImageError = () => {
    if (isStreet) setImageFailed("streetview");
    else setImageFailed("satellite");
  };

  return (
    <figure className="hero-photo" data-ready={imageReady ? "yes" : "no"}>
      <div className="hero-frame">
        {!imageReady && <div className="hero-shimmer" aria-hidden="true" />}
        {isStreet ? (
          <button type="button" className="hero-button" onClick={() => setOpen(true)} aria-label={t("hero.open")}>
            <img src={src} alt={t("hero.alt", { address })} onLoad={() => setImageReady(true)} onError={onImageError} />
          </button>
        ) : (
          <img src={src} alt={t("hero.alt", { address })} onLoad={() => setImageReady(true)} onError={onImageError} />
        )}
      </div>
      <figcaption className="hero-caption">
        {caption} · {t("hero.credit")}
      </figcaption>
      {open && source.kind === "streetview" && (
        <Panorama pano={source.pano} heading={source.heading} label={address} onClose={closePanorama} />
      )}
    </figure>
  );
}

/** Interactive Street View, full screen, at the same heading. */
function Panorama({ pano, heading, label, onClose }: { pano: string; heading: number; label: string; onClose: () => void }) {
  const { t } = useLang();
  const canvas = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!canvas.current || typeof google === "undefined") return;
    new google.maps.StreetViewPanorama(canvas.current, {
      pano,
      pov: { heading, pitch: 0 },
      zoom: 1,
      addressControl: false,
      fullscreenControl: false,
      enableCloseButton: false,
      motionTracking: false,
    });
  }, [pano, heading]);

  useEffect(() => {
    close.current?.focus();
  }, []);

  return (
    <div className="pano-overlay" role="dialog" aria-modal="true" aria-label={label}>
      <div className="pano-canvas" ref={canvas} />
      <button ref={close} type="button" className="pano-close" aria-label={t("hero.close")} onClick={onClose}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}

function formatDate(iso: string, lang: "en" | "sv"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === "sv" ? "sv-SE" : "en-GB", { month: "long", year: "numeric" });
}
