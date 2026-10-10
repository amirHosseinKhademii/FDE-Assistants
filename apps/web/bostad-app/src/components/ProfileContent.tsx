import type { NoiseResult, Profile } from "@bostad/property";
import { useLang } from "../lib/lang";
import { gatedCheck, gateOf, locationCheck, type Check } from "../lib/checks";
import { localeOf, minutesAgo, walkMinutes } from "../lib/format";
import { MODE_KEY, nearestByMode, type ModeFilter } from "../lib/transport";
import { Icon } from "./Icons";
import { ComingSoonCard, GroundCard, LocationCard, NoiseCard, TransportCard } from "./cards";

type Lang = "en" | "sv";
type Translate = ReturnType<typeof useLang>["t"];

/** "Nearest tram 1 min · bus 2 min" for the two closest modes; the plain stop time when no mode is known. */
function transportSummary(stops: Parameters<typeof nearestByMode>[0], t: Translate, lang: Lang) {
  const nearest = nearestByMode(stops, 2);
  if (nearest.length === 0) {
    return { text: t("summary.transport.walk", { minutes: walkMinutes(stops[0].distanceMeters) }), tone: "ok" };
  }
  const locale = localeOf(lang);
  const list = nearest
    .map((n) =>
      t("summary.transport.modeMin", {
        mode: t(MODE_KEY[n.mode]).toLocaleLowerCase(locale),
        minutes: walkMinutes(n.distanceMeters),
      }),
    )
    .join(" · ");
  return { text: t("summary.transport.byMode", { list }), tone: "ok" };
}

/** "Noise: Quiet / Moderate / Loud" from the loudest facade point: under 50, 50 to 55, over 55 dB(A). */
function noiseSummary(check: Check<NoiseResult>, t: Translate) {
  if (check.kind !== "ok") return { text: t("summary.notChecked"), tone: undefined };
  const building = check.data.building;
  if (!building) return { text: t("summary.noise.none"), tone: undefined };
  if (building.loudestDb < 50) return { text: t("summary.noise.quiet"), tone: "ok" };
  if (building.loudestDb <= 55) return { text: t("summary.noise.moderate"), tone: "warn" };
  return { text: t("summary.noise.loud"), tone: "risk" };
}

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
export function ProfileBody({
  profile,
  onRetry,
  filter = "all",
  onFilter = () => {},
}: {
  profile: Profile;
  onRetry: () => void;
  filter?: ModeFilter;
  onFilter?: (f: ModeFilter) => void;
}) {
  const { t, lang } = useLang();
  const gate = gateOf(profile);
  const location = locationCheck(profile);
  const ground = gatedCheck(profile.landslide, gate);
  const noise = gatedCheck(profile.noise, gate);
  const transit = gatedCheck(profile.transit, gate);

  // The coverage chip counts only the checks that are built: the rest are "coming soon".
  const checks = [ground, noise, transit, location];
  const available = checks.filter((c) => c.kind === "ok").length;
  const stops = transit.kind === "ok" ? transit.data.stops : [];
  const groundValue =
    ground.kind === "ok"
      ? ground.data.inRiskArea
        ? { text: t("summary.ground.risk"), tone: "risk" }
        : { text: t("summary.ground.ok"), tone: "ok" }
      : { text: t("summary.notChecked"), tone: undefined };
  const noiseValue = noiseSummary(noise, t);
  const transportValue =
    transit.kind !== "ok"
      ? { text: t("summary.notChecked"), tone: undefined }
      : stops.length > 0
        ? transportSummary(stops, t, lang)
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
        <div className="summary-chip" data-tone={noiseValue.tone}>
          <span className="label">{t("summary.label.noise")}:</span>
          <span className="value">{noiseValue.text}</span>
        </div>
        <div className="summary-chip" data-tone={transportValue.tone}>
          <span className="label">{t("summary.label.transport")}:</span>
          <span className="value">{transportValue.text}</span>
        </div>
        <div className="summary-chip">
          <span className="label">{t("summary.label.coverage")}:</span>
          <span className="value">{t("summary.coverage", { count: available, total: checks.length })}</span>
        </div>
      </div>

      <GroundCard check={ground} onRetry={onRetry} />
      <NoiseCard check={noise} onRetry={onRetry} />
      <TransportCard check={transit} onRetry={onRetry} filter={filter} onFilter={onFilter} />
      <LocationCard check={location} onRetry={onRetry} />
      <ComingSoonCard icon="building" title="card.brf.title" explain="card.brf.explain" />
      <ComingSoonCard icon="leaf" title="card.energy.title" explain="card.energy.explain" />
      <ComingSoonCard icon="tag" title="card.listings.title" explain="card.listings.explain" />
      <ComingSoonCard icon="clipboard" title="card.inspection.title" explain="card.inspection.explain" />
      <ComingSoonCard icon="wave" title="card.flood.title" explain="card.flood.explain" />
    </>
  );
}
