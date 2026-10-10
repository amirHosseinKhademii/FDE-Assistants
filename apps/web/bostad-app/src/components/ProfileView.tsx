import { useEffect } from "react";
import { useLang } from "../lib/lang";
import { useProfile } from "../lib/useProfile";
import { gateOf, gatedCheck } from "../lib/checks";
import { MapPanel } from "./MapPanel";
import { ProfileError, ProfileSkeleton } from "./ProfileStates";
import { AddressHeader, ProfileBody } from "./ProfileContent";
import { SearchBox } from "./SearchBox";
import { StickyBar } from "./StickyBar";
import { TopBar } from "./TopBar";

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
  const transit = profile ? gatedCheck(profile.transit, gateOf(profile)) : null;
  const stops = transit?.kind === "ok" ? transit.data.stops : [];

  return (
    <div className="wrap">
      <TopBar />
      <div className="profile">
        <div className="profile-search">
          <SearchBox compact initial={address} onSearch={onSearch} />
        </div>

        <MapPanel lat={coords?.lat} lon={coords?.lon} stops={stops} loading={loading} />

        <div className="profile-main">
          <AddressHeader address={address} profile={profile} />
          {loading && <ProfileSkeleton />}
          {state.status === "error" && <ProfileError kind={state.kind} onRetry={retry} />}
          {profile && <ProfileBody profile={profile} onRetry={retry} />}
        </div>
      </div>
      <p className="footnote">{t("profile.footer")}</p>
      <StickyBar />
    </div>
  );
}
