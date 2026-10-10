import { useEffect, useMemo, useState } from "react";
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

  return (
    <div className="wrap">
      <TopBar />
      <div className="profile">
        <div className="profile-search">
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

        <div className="profile-sheet">
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
        </div>
      </div>
      <p className="footnote">{t("profile.footer")}</p>
    </div>
  );
}
