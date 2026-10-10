import type { Profile } from "@bostad/property";
import { useLang } from "../lib/lang";
import { gatedCheck, gateOf, locationCheck } from "../lib/checks";
import { minutesAgo, walkMinutes } from "../lib/format";
import { Icon } from "./Icons";
import { ComingSoonCard, GroundCard, LocationCard, TransportCard } from "./cards";

const TOTAL_CHECKS = 8;

/** Top of the profile: the address as typed, what it matched, and when. */
export function AddressHeader({ address, profile }: { address: string; profile: Profile | null }) {
  const { t, lang } = useLang();
  const matched = profile?.location.data?.displayName;
  const ago = profile ? minutesAgo(profile.location.fetchedAt, lang) : null;
  return (
    <section className="address">
      <h1>{address}</h1>
      {matched && (
        <p className="muted">
          {t("profile.matchedAs")}: {matched}
        </p>
      )}
      {profile && <p className="caption">{ago ? t("profile.checkedAgo", { when: ago }) : t("profile.checkedNow")}</p>}
    </section>
  );
}

/** Every section of a loaded profile, in the order the plan gives. */
export function ProfileBody({ profile, onRetry }: { profile: Profile; onRetry: () => void }) {
  const { t } = useLang();
  const gate = gateOf(profile);
  const location = locationCheck(profile);
  const ground = gatedCheck(profile.landslide, gate);
  const transit = gatedCheck(profile.transit, gate);

  const available = [ground, transit, location].filter((c) => c.kind === "ok").length;
  const stops = transit.kind === "ok" ? transit.data.stops : [];
  const groundValue =
    ground.kind === "ok"
      ? ground.data.inRiskArea
        ? { text: t("summary.ground.risk"), tone: "risk" }
        : { text: t("summary.ground.ok"), tone: "ok" }
      : { text: t("summary.notChecked"), tone: undefined };
  const transportValue =
    transit.kind !== "ok"
      ? { text: t("summary.notChecked"), tone: undefined }
      : stops.length > 0
        ? {
            text: t("summary.transport.walk", { minutes: walkMinutes(stops[0].distanceMeters) }),
            tone: "ok",
          }
        : { text: t("summary.transport.none"), tone: undefined };

  return (
    <>
      {gate === "inexact" && (
        <div className="alert" role="note">
          <Icon name="alert" />
          <p>{t("profile.precision")}</p>
        </div>
      )}

      <div className="summary" aria-label={t("summary.label.coverage")}>
        <div className="summary-chip" data-tone={groundValue.tone}>
          <span className="label">{t("summary.label.ground")}:</span>
          <span className="value">{groundValue.text}</span>
        </div>
        <div className="summary-chip" data-tone={transportValue.tone}>
          <span className="label">{t("summary.label.transport")}:</span>
          <span className="value">{transportValue.text}</span>
        </div>
        <div className="summary-chip">
          <span className="label">{t("summary.label.coverage")}:</span>
          <span className="value">{t("summary.coverage", { count: available, total: TOTAL_CHECKS })}</span>
        </div>
      </div>

      <GroundCard check={ground} onRetry={onRetry} />
      <TransportCard check={transit} onRetry={onRetry} />
      <LocationCard check={location} onRetry={onRetry} />
      <ComingSoonCard icon="building" title="card.brf.title" explain="card.brf.explain" />
      <ComingSoonCard icon="leaf" title="card.energy.title" explain="card.energy.explain" />
      <ComingSoonCard icon="tag" title="card.listings.title" explain="card.listings.explain" />
      <ComingSoonCard icon="clipboard" title="card.inspection.title" explain="card.inspection.explain" />
      <ComingSoonCard icon="wave" title="card.flood.title" explain="card.flood.explain" />
    </>
  );
}
