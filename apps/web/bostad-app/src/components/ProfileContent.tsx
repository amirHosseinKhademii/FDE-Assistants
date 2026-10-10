import type { Level, NoiseResult, PlaceItem, Profile } from "@bostad/property";
import { useLang } from "../lib/lang";
import { gatedCheck, gateOf, type Check } from "../lib/checks";
import { walkMinutes } from "../lib/format";
import type { ModeFilter } from "../lib/transport";
import type { MessageKey } from "../lib/i18n";
import { Icon, type IconName } from "./Icons";
import { AreaCard, GroundCard, NearbyPlacesCard, NoiseCard, TransportCard, placesSummary } from "./cards";
import { LEVEL_ARROW, SafetyCard } from "./SafetyCard";
import { LEVEL_ICON } from "./Badges";
import { LEVEL_TONE, levelOf, pctDiff } from "../lib/safety";
import type { PlacesFilter } from "./placeFilter";
import type { CardResult, Tone } from "./ProfileCard";

type Translate = ReturnType<typeof useLang>["t"];

/** The result of a card with no data: the sentence "Not checked" and a dash for the chip. */
function uncheckedResult(t: Translate): CardResult {
  return { text: t("summary.notChecked"), short: "–", tone: "muted" };
}

/** "Quiet / Moderate / Loud" from the loudest facade point: under 50, 50 to 55, over 55 dB(A). */
function noiseResult(check: Check<NoiseResult>, t: Translate): CardResult {
  if (check.kind !== "ok") return uncheckedResult(t);
  const building = check.data.building;
  if (!building) return { text: t("summary.noise.none"), short: t("tile.word.none"), tone: "muted" };
  if (building.loudestDb < 50) return { text: t("summary.noise.quiet"), short: t("summary.noise.quiet"), tone: "ok" };
  if (building.loudestDb <= 55) return { text: t("summary.noise.moderate"), short: t("summary.noise.moderate"), tone: "warn" };
  return { text: t("summary.noise.loud"), short: t("summary.noise.loud"), tone: "risk" };
}

/** One line for the recent-searches list: the noise word and the walk to the nearest stop, when known. */
export function quickResult(profile: Profile, t: Translate): string | undefined {
  const gate = gateOf(profile);
  const parts: string[] = [];
  const noise = gatedCheck(profile.noise, gate);
  if (noise.kind === "ok") parts.push(noiseResult(noise, t).short);
  const transit = gatedCheck(profile.transit, gate);
  if (transit.kind === "ok" && transit.data.stops.length > 0) {
    parts.push(t("tile.transport", { minutes: walkMinutes(Math.min(...transit.data.stops.map((x) => x.distanceMeters))) }));
  }
  return parts.length ? parts.join(" · ") : undefined;
}

/** The district line for the recent-searches list, e.g. "Hisingen · Eriksberg". */
export function districtLine(profile: Profile): string | undefined {
  const district = gatedCheck(profile.district, "exact");
  if (district.kind !== "ok") return undefined;
  const names = [district.data.stadsomrade?.name, district.data.primaryArea?.name].filter((n): n is string => Boolean(n));
  return names.length ? names.join(" · ") : undefined;
}

/** The address, large; the district under it in small muted text. Nothing else about matching. */
export function AddressHeader({ address, profile }: { address: string; profile: Profile | null }) {
  const district = profile ? gatedCheck(profile.district, "exact") : null;
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

/** Opens the card a tile points at and scrolls the sheet to it. */
function openCard(id: string) {
  return () => {
    const el = document.getElementById(id);
    if (!(el instanceof HTMLDetailsElement)) return;
    el.open = true;
    el.scrollIntoView({ block: "start" });
  };
}

/** One status tile: an icon, a small name and the card's chip word. Its screen-reader label is the card's sentence. */
type Tile = { id: string; icon: IconName; res: CardResult };

/** The short name printed under each tile's icon. */
const TILE_NAME: Record<string, MessageKey> = {
  "card-safety": "tile.name.safety",
  "card-transport": "tile.name.transport",
  "card-noise": "tile.name.noise",
  "card-area": "tile.name.price",
  "card-places": "tile.name.nearby",
  "card-ground": "tile.name.ground",
};

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
  onSafetyToggle = () => {},
}: {
  profile: Profile;
  onRetry: () => void;
  filter?: ModeFilter;
  onFilter?: (f: ModeFilter) => void;
  placeFilter?: PlacesFilter;
  onPlaceFilter?: (f: PlacesFilter) => void;
  selectedPlaceId?: string | null;
  onPickPlace?: (item: PlaceItem) => void;
  onSafetyToggle?: (open: boolean) => void;
}) {
  const { t } = useLang();
  const gate = gateOf(profile);
  const ground = gatedCheck(profile.landslide, gate);
  const noise = gatedCheck(profile.noise, gate);
  const transit = gatedCheck(profile.transit, gate);
  // Area facts describe the small area, not the exact door: shown with a street-level match too (see profile.precision).
  const district = gatedCheck(profile.district, "exact");
  const income = gatedCheck(profile.income, "exact");
  // Places are distances from the point, not a risk claim: shown even when the match is only a street (see profile.precision).
  const places = gatedCheck(profile.places, "exact");
  const safety = gatedCheck(profile.safety, "exact");

  // One result per card. The card's chip and the tile above it are the same object, so they cannot disagree.
  const groundRes: CardResult =
    ground.kind === "ok"
      ? ground.data.inRiskArea
        ? { text: t("summary.ground.risk"), short: t("tile.word.groundRisk"), tone: "risk", icon: "mountain" }
        : { text: t("summary.ground.ok"), short: t("tile.word.groundSafe"), tone: "ok", icon: "mountain" }
      : uncheckedResult(t);
  const noiseRes = noiseResult(noise, t);
  const stops = transit.kind === "ok" ? transit.data.stops : [];
  const transitMinutes = stops.length > 0 ? walkMinutes(Math.min(...stops.map((s) => s.distanceMeters))) : null;
  const transitRes: CardResult =
    transit.kind !== "ok"
      ? uncheckedResult(t)
      : transitMinutes !== null
        ? {
            text: t("summary.transport.walk", { minutes: transitMinutes }),
            short: t("tile.transport", { minutes: transitMinutes }),
            tone: transitMinutes <= 5 ? "ok" : transitMinutes <= 10 ? "warn" : "muted",
            icon: "bus",
          }
        : { text: t("summary.transport.none"), short: t("tile.word.none"), tone: "muted" };
  const placesRes: CardResult = places.kind === "ok" ? placesSummary(places.data, t) : uncheckedResult(t);
  const area = gatedCheck(profile.area, "exact");
  // Price shows the income level until house prices exist (see the card's sentence).
  const incomeLevel: Level | null = income.kind === "ok" ? income.data.level : null;
  const areaRes: CardResult = incomeLevel
    ? {
        text: t("area.summary.income", { level: t(`level.${incomeLevel}` as MessageKey) }),
        short: t(`chip.level.${incomeLevel}` as MessageKey),
        tone: incomeLevel === "high" || incomeLevel === "aboveAverage" ? "accent" : incomeLevel === "average" ? "neutral" : "warn",
        icon: LEVEL_ICON[incomeLevel],
      }
    : uncheckedResult(t);
  const latestSafety = safety.kind === "ok" && safety.data.latestYear !== null ? safety.data.years.find((y) => y.year === safety.data.latestYear) : undefined;
  const safetyLevel = latestSafety ? levelOf(latestSafety.cats.all.district.per1000, latestSafety.cats.all.city.per1000) : null;
  const safetyRes: CardResult = safetyLevel
    ? {
        text: t(`safety.summary.${safetyLevel}` as MessageKey, { pct: pctDiff(latestSafety?.cats.all.district.per1000, latestSafety?.cats.all.city.per1000) }),
        short: t(`tile.safety.${safetyLevel}` as MessageKey),
        tone: (LEVEL_TONE[safetyLevel] ?? "neutral") as Tone,
        icon: LEVEL_ARROW[safetyLevel],
      }
    : uncheckedResult(t);

  const tiles: Tile[] = [
    { id: "card-safety", icon: "shield", res: safetyRes },
    { id: "card-transport", icon: "bus", res: transitRes },
    { id: "card-noise", icon: "sound", res: noiseRes },
    { id: "card-area", icon: "houseTag", res: areaRes },
    { id: "card-places", icon: "pin", res: placesRes },
    { id: "card-ground", icon: "mountain", res: groundRes },
  ];

  return (
    <>
      <nav className="status-tiles" aria-label={t("summary.label.overview")}>
        {tiles.map((tile) => (
          <button
            key={tile.id}
            type="button"
            className="status-tile"
            data-tone={tile.res.tone ?? "muted"}
            aria-label={t("tile.aria.generic", { name: t(TILE_NAME[tile.id]), word: tile.res.text })}
            onClick={openCard(tile.id)}
          >
            <span className="tile-icon" aria-hidden="true">
              <Icon name={tile.icon} />
            </span>
            <span className="tile-name">{t(TILE_NAME[tile.id])}</span>
            <span className="tile-word">{tile.res.short}</span>
          </button>
        ))}
      </nav>

      {gate === "inexact" && (
        <div className="alert" role="note">
          <Icon name="alert" />
          <p>{t("profile.precision")}</p>
        </div>
      )}

      {/* Card order matches the tiles: Safety, Transport, Noise, Area & prices, Nearby places, Ground. */}
      <SafetyCard check={safety} result={safetyRes} onRetry={onRetry} onOpenChange={onSafetyToggle} />
      <TransportCard check={transit} onRetry={onRetry} filter={filter} onFilter={onFilter} result={transitRes} />
      <NoiseCard check={noise} onRetry={onRetry} result={noiseRes} />
      <AreaCard district={district} income={income} area={area} onRetry={onRetry} result={areaRes} />
      <NearbyPlacesCard
        check={places}
        onRetry={onRetry}
        filter={placeFilter}
        onFilter={onPlaceFilter}
        selectedId={selectedPlaceId}
        onPick={onPickPlace}
        result={placesRes}
      />
      <GroundCard check={ground} onRetry={onRetry} result={groundRes} />

      <p className="more-row">
        {t("more.coming", { items: [t("more.brf"), t("more.energy"), t("more.inspection"), t("more.flood")].join(" · ") })}
      </p>
    </>
  );
}

