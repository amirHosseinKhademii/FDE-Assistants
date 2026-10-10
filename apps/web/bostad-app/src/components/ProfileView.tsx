import { useEffect, useMemo, useState } from "react";
import { useLang } from "../lib/lang";
import { useProfile } from "../lib/useProfile";
import { gateOf, gatedCheck } from "../lib/checks";
import { MapPanel } from "./MapPanel";
import { ProfileError, ProfileSkeleton } from "./ProfileStates";
import { AddressHeader, ProfileBody } from "./ProfileContent";
import { SearchBox } from "./SearchBox";
import type { ModeFilter } from "../lib/transport";
import { StickyBar } from "./StickyBar";
import { TopBar } from "./TopBar";

const NO_STOPS: never[] = [];

/** The profile for one address. Shareable: the address lives in the URL. */
export function ProfileView({ address, onSearch }: { address: string; onSearch: (address: string) => void }) {
  const { t } = useLang();
  const { state, retry } = useProfile(address);

  useEffect(() => {
    document.title = t("doc.profile", { address });
  }, [address, t]);

  const loading = state.status === "idle" || state.status === "loading";
  const profile = state.status === "ok" ? state.profile : null;
  const coords = profile?.location.data;
  // Memoised on the profile, so the map view is fitted once per search, not per render.
  const stops = useMemo(() => {
    if (!profile) return NO_STOPS;
    const transit = gatedCheck(profile.transit, gateOf(profile));
    return transit.kind === "ok" ? transit.data.stops : NO_STOPS;
  }, [profile]);
  // Shared by the transport card and the map, so one tap filters both.
  const [filter, setFilter] = useState<ModeFilter>("all");

  return (
    <div className="wrap">
      <TopBar />
      <div className="profile">
        <div className="profile-search">
          <SearchBox compact initial={address} onSearch={onSearch} />
        </div>

        <MapPanel lat={coords?.lat} lon={coords?.lon} stops={stops} filter={filter} loading={loading} />

        <div className="profile-main">
          <AddressHeader address={address} profile={profile} />
          {loading && <ProfileSkeleton />}
          {state.status === "error" && <ProfileError kind={state.kind} onRetry={retry} />}
          {profile && <ProfileBody profile={profile} onRetry={retry} filter={filter} onFilter={setFilter} />}
        </div>
      </div>
      <p className="footnote">{t("profile.footer")}</p>
      <StickyBar />
    </div>
  );
}
