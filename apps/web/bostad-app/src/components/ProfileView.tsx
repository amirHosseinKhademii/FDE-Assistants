import { useEffect, useMemo, useRef, useState } from "react";
import { useLang } from "../lib/lang";
import { useProfile } from "../lib/useProfile";
import { gateOf, gatedCheck } from "../lib/checks";
import { MapPanel } from "./MapPanel";
import { ProfileError, ProfileSkeleton } from "./ProfileStates";
import { AddressHeader, ProfileBody, districtLine, quickResult } from "./ProfileContent";
import { setRecentDetails } from "../lib/recents";
import { SearchBox } from "./SearchBox";
import type { ModeFilter } from "../lib/transport";
import type { PlaceItem } from "@bostad/property";
import type { PlacesFilter } from "./placeFilter";
import { TopBar } from "./TopBar";
import { HeroPhoto } from "./HeroPhoto";
import { BottomSheet, type SheetMode } from "./BottomSheet";
import { FloatingSearch } from "./FloatingSearch";

const NO_STOPS: never[] = [];
const NO_PLACES: PlaceItem[] = [];

/** The profile for one address. Shareable: the address lives in the URL. */
export function ProfileView({ address, onSearch }: { address: string; onSearch: (address: string) => void }) {
  const { t } = useLang();
  const { state, retry } = useProfile(address);

  useEffect(() => {
    document.title = t("doc.profile", { address });
  }, [address, t]);

  const loading = state.status === "idle" || state.status === "loading";
  const profile = state.status === "ok" ? state.profile : null;
  // Once loaded, the recent-searches list gets this address's district and quick result.
  useEffect(() => {
    if (!profile) return;
    setRecentDetails(address, { district: districtLine(profile), quick: quickResult(profile, t) });
  }, [profile, address, t]);
  const coords = profile?.location.data;
  // Memoised on the profile, so the map view is fitted once per search, not per render.
  const stops = useMemo(() => {
    if (!profile) return NO_STOPS;
    const transit = gatedCheck(profile.transit, gateOf(profile));
    return transit.kind === "ok" ? transit.data.stops : NO_STOPS;
  }, [profile]);
  // Shared by the transport card and the map, so one tap filters both.
  const [filter, setFilter] = useState<ModeFilter>("all");
  const placeItems = useMemo(() => {
    if (!profile) return NO_PLACES;
    const places = gatedCheck(profile.places, "exact");
    return places.kind === "ok" ? places.data.items : NO_PLACES;
  }, [profile]);
  const [showPlaces, setShowPlaces] = useState(false);
  const [placeFilter, setPlaceFilter] = useState<PlacesFilter>("all");
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lon: number; nonce: number } | null>(null);
  // A new address starts with nothing chosen.
  useEffect(() => {
    setPlaceId(null);
    setFocus(null);
    setPlaceFilter("all");
  }, [coords?.lat, coords?.lon]);
  // A tap on a row turns the Places layer on, pans to the place and opens its card.
  const pickPlace = (item: PlaceItem) => {
    setShowPlaces(true);
    setPlaceId((cur) => (cur === item.id ? null : item.id));
    setFocus({ lat: item.lat, lon: item.lon, nonce: Date.now() });
  };

  // The Safety card, when open, shades its district on the map. Closed again on a new address.
  // The Safety card starts open, so the neighbourhood is shaded from the start.
  const [safetyOpen, setSafetyOpen] = useState(true);
  useEffect(() => setSafetyOpen(true), [coords?.lat, coords?.lon]);
  const district = useMemo(() => {
    if (!profile) return null;
    const s = gatedCheck(profile.safety, "exact");
    if (s.kind !== "ok") return null;
    // The neighbourhood (mellanområde) when the report covers it; the district otherwise.
    const nb = s.data.neighbourhood;
    if (nb && nb.outline.length > 0) return { name: nb.name, parts: nb.outline, kind: "neighbourhood" as const };
    if (!s.data.outline) return null;
    return { name: s.data.outlineName ?? "", parts: s.data.outline.parts, kind: "district" as const };
  }, [profile]);

  // Wide screens keep the search bar in the column; phones get the floating icon over the map.
  const [wide, setWide] = useState(false);
  // The phone sheet: open (the map is the top 45 %) or collapsed (the map is the whole screen).
  // Toggling changes only the sheet's top and the map's height; the map is never refitted.
  const [mode, setMode] = useState<SheetMode>("open");
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 960px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  // A new address opens with the sheet open.
  useEffect(() => setMode("open"), [coords?.lat, coords?.lon]);

  return (
    <div className="wrap">
      <TopBar
        overlay={!wide}
        searching={searching}
        search={
          !wide ? <FloatingSearch address={address} onSearch={onSearch} onOpenChange={setSearching} /> : undefined
        }
      />
      <div className="profile">
        {wide && (
          <div className="profile-search">
            <SearchBox compact initial={address} onSearch={onSearch} />
          </div>
        )}

        <MapPanel
          lat={coords?.lat}
          lon={coords?.lon}
          stops={stops}
          filter={filter}
          onFilter={setFilter}
          places={placeItems}
          placeFilter={placeFilter}
          onPlaceFilter={setPlaceFilter}
          selectedPlaceId={placeId}
          onSelectPlace={setPlaceId}
          focus={focus}
          placeCount={placeItems.length}
          showPlaces={showPlaces}
          onShowPlaces={setShowPlaces}
          loading={loading}
          resizeKey={mode === "collapsed" ? "collapsed" : "open"}
          district={safetyOpen ? district : null}
        />

        <BottomSheet mode={mode} onMode={setMode}>
          {coords && <HeroPhoto lat={coords.lat} lon={coords.lon} address={address} />}
          <AddressHeader address={address} profile={profile} />
          {loading && <ProfileSkeleton />}
          {state.status === "error" && <ProfileError kind={state.kind} onRetry={retry} />}
          {profile && (
            <ProfileBody
              profile={profile}
              onRetry={retry}
              filter={filter}
              onFilter={setFilter}
              placeFilter={placeFilter}
              onPlaceFilter={setPlaceFilter}
              selectedPlaceId={placeId}
              onPickPlace={pickPlace}
              onSafetyToggle={setSafetyOpen}
            />
          )}
          <p className="footnote">{t("profile.footer")}</p>
        </BottomSheet>
      </div>
    </div>
  );
}
