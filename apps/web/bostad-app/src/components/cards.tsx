import type { ReactNode } from "react";
import type { DistrictResult, IncomeResult, NoiseResult, PlaceCategory, PlaceItem, PlacesResult, Profile } from "@bostad/property";
import { useLang } from "../lib/lang";
import type { Check, Reason } from "../lib/checks";
import type { MessageKey } from "../lib/i18n";
import { clockTime, localeOf, sourceHref, sourceKey, walkMinutes } from "../lib/format";
import { PLACE_KEY, PLACE_ORDER } from "../lib/places";
import { PlaceBadge } from "./MapPins";
import type { PlacesFilter } from "./placeFilter";
import { ProfileCard, type CardResult, type CardStatus } from "./ProfileCard";
import { LineBadge, ModeIcon } from "./ModeIcon";
import { MODE_KEY, modesPresent, stopMatches, type ModeFilter } from "../lib/transport";

const REASON: Record<Reason, MessageKey> = {
  notExact: "reason.notExact",
  noAddress: "reason.noAddress",
  noMatch: "reason.noMatch",
  sourceDown: "reason.sourceDown",
};

type Props<T> = { check: Check<T>; onRetry: () => void; result?: CardResult };

/** Shared wiring: status, reason, source footer and time for a checked or failed card. */
function useCheckProps<T>(check: Check<T>, onRetry: () => void) {
  const { lang, t } = useLang();
  if (check.kind === "failed") {
    return { status: "failed" as CardStatus, reason: REASON[check.reason], onRetry };
  }
  return {
    status: "checked" as CardStatus,
    checkedAt: clockTime(check.checkedAt, lang),
    source: { name: t(sourceKey(check.source)), href: sourceHref(check.source) },
  };
}

export function GroundCard({ check, onRetry, result }: Props<NonNullable<Profile["landslide"]["data"]>>) {
  const { t } = useLang();
  const meta = useCheckProps(check, onRetry);
  return (
    <ProfileCard id="card-ground" icon="mountain" title="card.ground.title" explain="card.ground.explain" result={result} {...meta}>
      {check.kind === "ok" && (
        <dl className="kv">
          <dt>{t("card.ground.inArea")}</dt>
          <dd>
            <strong style={{ color: check.data.inRiskArea ? "var(--risk)" : "var(--ok)" }}>
              {check.data.inRiskArea ? t("card.ground.yes") : t("card.ground.no")}
            </strong>
          </dd>
        </dl>
      )}
    </ProfileCard>
  );
}

/** The bar runs from 35 to 75 dB(A): quiet homes sit at the left, the 55 dB guideline in the middle. */
const NOISE_MIN = 35;
const NOISE_MAX = 75;
const pct = (db: number) => `${Math.min(100, Math.max(0, ((db - NOISE_MIN) / (NOISE_MAX - NOISE_MIN)) * 100))}%`;

export function NoiseCard({ check, onRetry, result }: Props<NonNullable<Profile["noise"]["data"]>>) {
  const { t } = useLang();
  const meta = useCheckProps(check, onRetry);
  return (
    <ProfileCard id="card-noise" icon="sound" title="card.noise.title" explain="card.noise.explain" result={result} {...meta}>
      {check.kind === "ok" && <NoiseDetail data={check.data} />}
    </ProfileCard>
  );
}

/** The bar, then at most two facts: the street-side level and the loudest wall. */
function NoiseDetail({ data }: { data: NoiseResult }) {
  const { t } = useLang();
  const b = data.building;
  if (!b) return <p className="muted">{t("card.noise.noBuilding")}</p>;

  const over = b.loudestDb > data.guidelineDb;
  return (
    <>
      <div className="noise-bar" role="img" aria-label={`${t("card.noise.loudest")}: ${b.loudestDb} dB`}>
        <span className="noise-fill" data-over={over ? "yes" : "no"} style={{ width: pct(b.loudestDb) }} />
        <span className="noise-guide" style={{ left: pct(data.guidelineDb) }} />
      </div>
      <div className="noise-scale">
        <span style={{ left: pct(data.guidelineDb) }}>{t("card.noise.guideline")}</span>
      </div>
      <dl className="kv">
        <dt>{t("card.noise.street")}</dt>
        <dd>{b.streetDb !== null ? `${b.streetDb} dB` : "–"}</dd>
        <dt>{t("card.noise.loudest")}</dt>
        <dd>
          <strong style={{ color: over ? "var(--warn)" : "var(--ok)" }}>
            {b.loudestDb} dB · {over ? t("card.noise.above") : t("card.noise.within")}
          </strong>
        </dd>
      </dl>
    </>
  );
}

const MAX_LINE_BADGES = 8;

export function TransportCard({
  check,
  onRetry,
  filter,
  onFilter,
  result,
}: Props<NonNullable<Profile["transit"]["data"]>> & { filter: ModeFilter; onFilter: (f: ModeFilter) => void }) {
  const { t } = useLang();
  const meta = useCheckProps(check, onRetry);
  const stops = check.kind === "ok" ? check.data.stops : [];
  const present = modesPresent(stops);
  const shown = stops.filter((stop) => stopMatches(stop, filter));
  return (
    <ProfileCard id="card-transport" icon="bus" title="card.transport.title" explain="card.transport.explain" result={result} {...meta}>
      {check.kind === "ok" &&
        (stops.length === 0 ? (
          <p className="muted">{t("card.transport.none")}</p>
        ) : (
          <>
            {present.length > 0 && (
              <div className="mode-chips" role="group" aria-label={t("transport.filter.label")}>
                {(["all", ...present] as ModeFilter[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className="mode-chip"
                    aria-pressed={filter === option}
                    onClick={() => onFilter(option)}
                  >
                    {option !== "all" && <ModeIcon mode={option} size={22} />}
                    <span>{option === "all" ? t("transport.filter.all") : t(MODE_KEY[option])}</span>
                  </button>
                ))}
              </div>
            )}
            {/* The text version of the map's stops: the same list, with lines and walk time. */}
            <ol className="stops">
              {shown.map((stop) => (
                <li key={stop.id || stop.name} className="stop-row">
                  <div className="stop-head">
                    <span className="stop-modes">
                      {stop.modes.length > 0 ? (
                        stop.modes.map((mode) => <ModeIcon key={mode} mode={mode} size={28} />)
                      ) : (
                        <span className="mode-icon mode-none" aria-hidden="true" />
                      )}
                    </span>
                    <div className="stop-text">
                      <span className="stop-name">{stop.name}</span>
                      <span className="dist">
                        {t("card.transport.walk", { minutes: walkMinutes(stop.distanceMeters) })} ·{" "}
                        {t("card.transport.meters", { meters: stop.distanceMeters })}
                      </span>
                    </div>
                  </div>
                  {stop.lines.length > 0 ? (
                    <div className="line-badges">
                      {stop.lines.slice(0, MAX_LINE_BADGES).map((line) => (
                        <LineBadge key={`${line.mode}|${line.shortName}`} line={line} />
                      ))}
                      {stop.lines.length > MAX_LINE_BADGES && (
                        <span className="line-more">
                          {t("transport.moreLines", { count: stop.lines.length - MAX_LINE_BADGES })}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="stop-empty">{t("transport.noDepartures")}</p>
                  )}
                </li>
              ))}
            </ol>
          </>
        ))}
    </ProfileCard>
  );
}

/** Neighbourhood: three parts with their own sources. Each part can fail without hiding the others. */
export function NeighbourhoodCard({
  district,
  income,
  onRetry,
  result,
}: {
  district: Check<DistrictResult>;
  income: Check<IncomeResult>;
  onRetry: () => void;
  result?: CardResult;
}) {
  const { t, lang } = useLang();
  const parts = [district, income];
  const failed = parts.find((p): p is Extract<Check<unknown>, { kind: "failed" }> => p.kind === "failed");
  const anyOk = parts.some((p) => p.kind === "ok");
  const meta = anyOk
    ? { status: "checked" as CardStatus }
    : { status: "failed" as CardStatus, reason: REASON[failed?.reason ?? "sourceDown"], onRetry };
  return (
    <ProfileCard id="card-hood" icon="home" title="card.hood.title" explain="card.hood.explain" result={result} {...meta}>
      {anyOk && (
        <>
          <NeighbourhoodPart check={district}>
            {(d) => (
              <>
                <dl className="kv">
                  <dt>{t("card.hood.district")}</dt>
                  <dd>{d.stadsomrade?.name || "–"}</dd>
                  <dt>{t("card.hood.area")}</dt>
                  <dd>{d.primaryArea?.name || "–"}</dd>
                </dl>
                <PartSource name="card.hood.srcDistrict" time={checkedTime(district, lang)} />
              </>
            )}
          </NeighbourhoodPart>

          <NeighbourhoodPart check={income}>
            {(i) => (
              <>
                <dl className="kv">
                  <dt>{t("card.hood.incomeHere")}</dt>
                  <dd>{kronor(i.medianDesoTkr, lang)}</dd>
                  <dt>{t("card.hood.incomeCity")}</dt>
                  <dd>{kronor(i.medianGothenburgTkr, lang)}</dd>
                </dl>
                <p className="muted">{t("card.hood.incomeNote", { year: i.year })}</p>
                <PartSource name="card.hood.srcIncome" time={checkedTime(income, lang)} />
              </>
            )}
          </NeighbourhoodPart>

        </>
      )}
    </ProfileCard>
  );
}

/**
 * Nearby places: the nearest of each everyday place, one row each, like the
 * transport list. The chips filter this list and the map together; a tap on a
 * row pans the map to that place and opens its card there.
 */
export function NearbyPlacesCard({
  check,
  onRetry,
  filter,
  onFilter,
  selectedId,
  onPick,
  result,
}: {
  check: Check<PlacesResult>;
  onRetry: () => void;
  filter: PlacesFilter;
  onFilter: (f: PlacesFilter) => void;
  selectedId: string | null;
  onPick: (item: PlaceItem) => void;
  result?: CardResult;
}) {
  const { t } = useLang();
  const meta = useCheckProps(check, onRetry);
  const data = check.kind === "ok" ? check.data : null;
  const nearest = data?.nearest ?? {};
  const present = PLACE_ORDER.filter((c) => nearest[c]);
  const rows = PLACE_ORDER.filter((c) => (filter === "all" || filter === c) && nearest[c]);
  return (
    <ProfileCard id="card-places" icon="building" title="card.places.title" explain="card.places.explain" result={result} {...meta}>
      {data && (
        <>
          {present.length > 0 && (
            <div className="mode-chips" role="group" aria-label={t("card.places.filter.label")}>
              {(["all", ...present] as PlacesFilter[]).map((option) => (
                <button key={option} type="button" className="mode-chip" aria-pressed={filter === option} onClick={() => onFilter(option)}>
                  <span>{option === "all" ? t("transport.filter.all") : t(PLACE_KEY[option])}</span>
                </button>
              ))}
            </div>
          )}
          {rows.length === 0 ? (
            <p className="muted">{t("card.places.summaryEmpty")}</p>
          ) : (
            <ul className="stops place-rows">
              {rows.map((category) => (
                <PlaceRow
                  key={category}
                  category={category}
                  item={nearest[category] as PlaceItem}
                  count={data.counts[category]}
                  capped={data.source.includes("googleapis")}
                  selected={selectedId === nearest[category]?.id}
                  onPick={onPick}
                />
              ))}
            </ul>
          )}
          {data.source.includes("googleapis") && <p className="muted place-credit">{t("card.places.google")}</p>}
        </>
      )}
    </ProfileCard>
  );
}

function PlaceRow({
  category,
  item,
  count,
  capped,
  selected,
  onPick,
}: {
  category: PlaceCategory;
  item: PlaceItem;
  count: number;
  /** Google returns at most 5 places per category, so 5 means "5 or more". */
  capped: boolean;
  selected: boolean;
  onPick: (item: PlaceItem) => void;
}) {
  const { t } = useLang();
  return (
    <li className="stop-row place-row">
      <button type="button" className="place-pick" aria-pressed={selected} onClick={() => onPick(item)}>
        <PlaceBadge category={category} />
        <span className="stop-text">
          <span className="stop-name">{item.name || t(PLACE_KEY[category])}</span>
          <span className="dist">
            {t("card.transport.walk", { minutes: walkMinutes(item.distanceMeters) })} · {t("card.transport.meters", { meters: item.distanceMeters })}
          </span>
          <span className="dist">{capped && count >= 5 ? t("card.places.countMax") : t("card.places.count", { count })}</span>
        </span>
      </button>
    </li>
  );
}

/** "Grocery 4 min · Pharmacy 3 min": the nearest two categories, for the card's one-line summary. */
export function placesSummary(data: PlacesResult, t: (k: MessageKey, v?: Record<string, string | number>) => string): string {
  const parts = PLACE_ORDER.filter((c) => data.nearest[c]).slice(0, 2).map((c) => {
    const item = data.nearest[c] as PlaceItem;
    return `${t(PLACE_KEY[c])} ${walkMinutes(item.distanceMeters)} min`;
  });
  return parts.length > 0 ? parts.join(" · ") : t("card.places.summaryEmpty");
}

function checkedTime<T>(check: Check<T>, lang: "en" | "sv"): string {
  return check.kind === "ok" ? clockTime(check.checkedAt, lang) : "";
}

/** kr for a value in thousands of SEK per year, e.g. 318.5 -> "318 500 kr". */
function kronor(tkr: number | null, lang: "en" | "sv"): string {
  return tkr === null ? "–" : `${Math.round(tkr * 1000).toLocaleString(localeOf(lang))} kr`;
}

function PartSource({ name, time }: { name: MessageKey; time: string }) {
  const { t } = useLang();
  return (
    <div className="card-foot">
      <span>{t("card.source", { name: t(name), time })}</span>
    </div>
  );
}

function NeighbourhoodPart<T>({
  check,
  heading,
  children,
}: {
  check: Check<T>;
  heading?: MessageKey;
  children: (data: T) => ReactNode;
}) {
  const { t } = useLang();
  return (
    <section className="hood-part">
      {heading && <p className="hood-head">{t(heading)}</p>}
      {check.kind === "ok" ? (
        children(check.data)
      ) : (
        <p className="muted">
          {t("card.hood.partFailed")} {t(REASON[check.reason])}
        </p>
      )}
    </section>
  );
}
