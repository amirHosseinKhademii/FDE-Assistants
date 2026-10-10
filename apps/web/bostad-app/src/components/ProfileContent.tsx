import type { NoiseResult, PlaceItem, Profile } from "@bostad/property";
import { useLang } from "../lib/lang";
import { gatedCheck, gateOf, type Check } from "../lib/checks";
import { walkMinutes } from "../lib/format";
import type { ModeFilter } from "../lib/transport";
import { Icon, type IconName } from "./Icons";
import { GroundCard, NearbyPlacesCard, NeighbourhoodCard, NoiseCard, TransportCard, placesSummary } from "./cards";
import type { PlacesFilter } from "./placeFilter";
import type { CardResult } from "./ProfileCard";

type Translate = ReturnType<typeof useLang>["t"];

/** "Quiet / Moderate / Loud" from the loudest facade point: under 50, 50 to 55, over 55 dB(A). */
function noiseResult(check: Check<NoiseResult>, t: Translate): CardResult {
  if (check.kind !== "ok") return { text: t("summary.notChecked") };
  const building = check.data.building;
  if (!building) return { text: t("summary.noise.none") };
  if (building.loudestDb < 50) return { text: t("summary.noise.quiet"), tone: "ok" };
  if (building.loudestDb <= 55) return { text: t("summary.noise.moderate"), tone: "warn" };
  return { text: t("summary.noise.loud"), tone: "risk" };
}

/** The address, large; the district under it in small muted text. Nothing else about matching. */
export function AddressHeader({ address, profile }: { address: string; profile: Profile | null }) {
  const district = profile ? gatedCheck(profile.district, gateOf(profile)) : null;
  const names =
    district?.kind === "ok"
      ? [district.data.stadsomrade?.name, district.data.primaryArea?.name].filter((n): n is string => Boolean(n))
      : [];
  return (
    <section className="address">
      <h1>{address}</h1>
      {names.length > 0 && <p className="muted">{names.join(" · ")}</p>}
    </section>
  );
}

/** Opens the card a tile points at, so the tap lands on the detail, not just the heading. */
function openCard(id: string) {
  return () => {
    const el = document.getElementById(id);
    if (el instanceof HTMLDetailsElement) el.open = true;
  };
}

/** Every section of a loaded profile: three status tiles, the cards, then one row for what is coming. */
export function ProfileBody({
  profile,
  onRetry,
  filter = "all",
  onFilter = () => {},
  placeFilter = "all",
  onPlaceFilter = () => {},
  selectedPlaceId = null,
  onPickPlace = () => {},
}: {
  profile: Profile;
  onRetry: () => void;
  filter?: ModeFilter;
  onFilter?: (f: ModeFilter) => void;
  placeFilter?: PlacesFilter;
  onPlaceFilter?: (f: PlacesFilter) => void;
  selectedPlaceId?: string | null;
  onPickPlace?: (item: PlaceItem) => void;
}) {
  const { t } = useLang();
  const gate = gateOf(profile);
  const ground = gatedCheck(profile.landslide, gate);
  const noise = gatedCheck(profile.noise, gate);
  const transit = gatedCheck(profile.transit, gate);
  const district = gatedCheck(profile.district, gate);
  const income = gatedCheck(profile.income, gate);
  // Places are distances from the point, not a risk claim: shown even when the match is only a street (see profile.precision).
  const places = gatedCheck(profile.places, "exact");

  const groundRes: CardResult =
    ground.kind === "ok"
      ? ground.data.inRiskArea
        ? { text: t("tile.word.groundRisk"), tone: "risk" }
        : { text: t("tile.word.groundSafe"), tone: "ok" }
      : { text: t("summary.notChecked") };
  const noiseRes = noiseResult(noise, t);
  const stops = transit.kind === "ok" ? transit.data.stops : [];
  const transitRes: CardResult =
    transit.kind !== "ok"
      ? { text: t("summary.notChecked") }
      : stops.length > 0
        ? { text: t("tile.transport", { minutes: walkMinutes(Math.min(...stops.map((s) => s.distanceMeters))) }), tone: "ok" }
        : { text: t("tile.word.none") };
  const placesRes: CardResult =
    places.kind === "ok" ? { text: placesSummary(places.data, t) } : { text: t("summary.notChecked") };
  const hoodRes: CardResult =
    district.kind === "ok" && district.data.stadsomrade?.name
      ? { text: district.data.stadsomrade.name }
      : { text: t("summary.notChecked") };

  const tiles: Array<{ id: string; icon: IconName; label: "summary.label.ground" | "summary.label.noise" | "summary.label.transport"; res: CardResult }> = [
    { id: "card-ground", icon: "mountain", label: "summary.label.ground", res: groundRes },
    { id: "card-noise", icon: "sound", label: "summary.label.noise", res: noiseRes },
    { id: "card-transport", icon: "bus", label: "summary.label.transport", res: transitRes },
  ];

  return (
    <>
      <nav className="status-tiles" aria-label={t("summary.label.overview")}>
        {tiles.map((tile) => (
          <a key={tile.id} href={`#${tile.id}`} className="status-tile" data-tone={tile.res.tone} onClick={openCard(tile.id)}>
            <Icon name={tile.icon} />
            <span className="tile-name">{t(tile.label)}</span>
            <span className="tile-word">{tile.res.text}</span>
          </a>
        ))}
      </nav>

      {gate === "inexact" && (
        <div className="alert" role="note">
          <Icon name="alert" />
          <p>{t("profile.precision")}</p>
        </div>
      )}

      <GroundCard check={ground} onRetry={onRetry} result={groundRes} />
      <NoiseCard check={noise} onRetry={onRetry} result={noiseRes} />
      <TransportCard check={transit} onRetry={onRetry} filter={filter} onFilter={onFilter} result={transitRes} />
      <NearbyPlacesCard
        check={places}
        onRetry={onRetry}
        filter={placeFilter}
        onFilter={onPlaceFilter}
        selectedId={selectedPlaceId}
        onPick={onPickPlace}
        result={placesRes}
      />
      <NeighbourhoodCard district={district} income={income} onRetry={onRetry} result={hoodRes} />

      <p className="more-row">
        {t("more.coming", { items: [t("more.brf"), t("more.energy"), t("more.inspection"), t("more.flood")].join(" · ") })}
      </p>
    </>
  );
}

