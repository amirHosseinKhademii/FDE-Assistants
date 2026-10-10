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
import { BottomSheet } from "./BottomSheet";

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

  // The phone sheet: open or collapsed. The map stays full-screen and never moves.
  const [open, setOpen] = useState(true);
  const [vh, setVh] = useState(800);
  const [searchBottom, setSearchBottom] = useState(120);
  const searchRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const measure = () => {
      setVh(window.innerHeight);
      const r = searchRef.current?.getBoundingClientRect();
      if (r) setSearchBottom(Math.round(r.bottom));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  // A new address opens with the sheet open.
  useEffect(() => setOpen(true), [coords?.lat, coords?.lon]);

  return (
    <div className="wrap">
      <TopBar />
      <div className="profile">
        <div className="profile-search" ref={searchRef}>
          <SearchBox compact initial={address} onSearch={onSearch} />
        </div>

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
        />

        <BottomSheet open={open} vh={vh} searchBottom={searchBottom} onToggle={setOpen}>
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
            />
          )}
        </BottomSheet>
      </div>
      <p className="footnote">{t("profile.footer")}</p>
    </div>
  );
}
