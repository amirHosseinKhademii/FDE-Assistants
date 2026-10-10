import type { ReactNode } from "react";
import type { AreaResult, DistrictResult, IncomeResult, Level, NoiseResult, PlaceCategory, PlaceItem, PlacesResult, Profile } from "@bostad/property";
import { useLang } from "../lib/lang";
import type { Check, Reason } from "../lib/checks";
import type { MessageKey } from "../lib/i18n";
import { clockTime, localeOf, sourceHref, sourceKey, walkMinutes } from "../lib/format";
import { PLACE_KEY, PLACE_ORDER } from "../lib/places";
import { PlaceBadge } from "./MapPins";
import { ListRow } from "./ListRow";
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
                <ListRow
                  key={stop.id || stop.name}
                  icon={
                    stop.modes.length > 0 ? (
                      <span className="stop-modes">
                        {stop.modes.map((mode) => (
                          <ModeIcon key={mode} mode={mode} size={28} />
                        ))}
                      </span>
                    ) : (
                      <span className="mode-icon mode-none" aria-hidden="true" />
                    )
                  }
                  title={stop.name}
                  meta={`${t("card.transport.walk", { minutes: walkMinutes(stop.distanceMeters) })} · ${t("card.transport.meters", { meters: stop.distanceMeters })}`}
                >
                  {stop.lines.length > 0 ? (
                    <span className="line-badges">
                      {stop.lines.slice(0, MAX_LINE_BADGES).map((line) => (
                        <LineBadge key={`${line.mode}|${line.shortName}`} line={line} />
                      ))}
                      {stop.lines.length > MAX_LINE_BADGES && (
                        <span className="line-more">
                          {t("transport.moreLines", { count: stop.lines.length - MAX_LINE_BADGES })}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="stop-empty">{t("transport.noDepartures")}</span>
                  )}
                </ListRow>
              ))}
            </ol>
          </>
        ))}
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
    <ProfileCard id="card-places" icon="pin" title="card.places.title" explain="card.places.explain" result={result} {...meta}>
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
            <ul className="stops list-rows">
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
    <ListRow
      icon={<PlaceBadge category={category} />}
      title={item.name || t(PLACE_KEY[category])}
      meta={`${t("card.transport.walk", { minutes: walkMinutes(item.distanceMeters) })} · ${t("card.transport.meters", { meters: item.distanceMeters })}`}
      onPick={() => onPick(item)}
      pressed={selected}
    >
      <span className="list-row-count">{capped && count >= 5 ? t("card.places.countMax") : t("card.places.count", { count })}</span>
    </ListRow>
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

/** Area & prices: one card for the small area. Each row has its level word and one plain sentence, with the source below. */
export function AreaCard({
  district,
  income,
  area,
  onRetry,
  result,
}: {
  district: Check<DistrictResult>;
  income: Check<IncomeResult>;
  area: Check<AreaResult>;
  onRetry: () => void;
  result?: CardResult;
}) {
  const { t, lang } = useLang();
  const parts = [district, income, area];
  const failed = parts.find((p): p is Extract<Check<unknown>, { kind: "failed" }> => p.kind === "failed");
  const anyOk = parts.some((p) => p.kind === "ok");
  const meta = anyOk
    ? { status: "checked" as CardStatus }
    : { status: "failed" as CardStatus, reason: REASON[failed?.reason ?? "sourceDown"], onRetry };
  const pct = (v: number | null | undefined) => (v === null || v === undefined ? "–" : String(Math.round(v * 100)));
  const num = (v: number) => v.toLocaleString(localeOf(lang));
  return (
    <ProfileCard id="card-area" icon="houseTag" title="area.title" explain="area.explain" result={result} {...meta}>
      {anyOk && (
        <>
          <NeighbourhoodPart check={district}>
            {(d) => (
              <>
                <p className="area-row-label">{t("area.district")}</p>
                <p className="area-sentence">
                  {[d.stadsomrade?.name, d.primaryArea?.name].filter(Boolean).join(" · ") || "–"}
                </p>
                <PartSource name="card.hood.srcDistrict" time={checkedTime(district, lang)} />
              </>
            )}
          </NeighbourhoodPart>

          <NeighbourhoodPart check={income}>
            {(i) => (
              <AreaRow label="area.income.label" level={i.level}>
                {i.medianDesoTkr !== null && i.percentile !== null
                  ? t("area.income.sentence", {
                      here: kronor(i.medianDesoTkr, lang),
                      city: kronor(i.medianGothenburgTkr, lang),
                      pct: Math.round(i.percentile),
                      count: i.areaCount,
                    })
                  : "–"}
              </AreaRow>
            )}
          </NeighbourhoodPart>

          <NeighbourhoodPart check={area}>
            {(a) => {
              const f = a.flats;
              const mix = [
                { k: "rental" as const, v: f.rental ?? 0 },
                { k: "condo" as const, v: f.condo ?? 0 },
                { k: "owned" as const, v: f.owned ?? 0 },
              ];
              const top = mix.reduce((best, m) => (m.v > best.v ? m : best), mix[0]);
              const mixKey = top.k === "rental" ? "area.mix.rental" : top.k === "condo" ? "area.mix.condo" : "area.mix.owned";
              return (
                <>
                  <AreaRow label="area.mix.label" word={t(mixKey)}>
                    {t("area.mix.sentence", {
                      r: pct(f.rental),
                      c: pct(f.condo),
                      o: pct(f.owned),
                      gr: pct(f.gothenburg.rental),
                      gc: pct(f.gothenburg.condo),
                      go: pct(f.gothenburg.owned),
                    })}
                  </AreaRow>
                  <AreaRow label="area.edu.label" level={a.higherEducation.level}>
                    {t("area.edu.sentence", { v: pct(a.higherEducation.value), g: pct(a.higherEducation.gothenburg) })}
                  </AreaRow>
                  <AreaRow label="area.age.label" level={a.over65.level}>
                    {t("area.age.sentence", { v: pct(a.over65.value), g: pct(a.over65.gothenburg), u: pct(a.under20) })}
                  </AreaRow>
                  <AreaRow label="area.kids.label" level={a.withChildren.level}>
                    {t("area.kids.sentence", { v: pct(a.withChildren.value), g: pct(a.withChildren.gothenburg) })}
                  </AreaRow>
                  <AreaRow label="area.pop.label">
                    {a.population !== null ? t("area.pop.sentence", { n: num(a.population) }) : "–"}
                  </AreaRow>
                  <PartSource name="area.src.scb" time={checkedTime(area, lang)} />
                </>
              );
            }}
          </NeighbourhoodPart>

          <section className="area-row area-row--soon">
            <p className="area-row-label">
              {t("area.price.label")} <span className="area-soon">{t("area.price.soon")}</span>
            </p>
            <p className="muted">{t("area.price.reason")}</p>
            <a href="https://www.maklarstatistik.se/omrade/riket/vastra-gotalands-lan/goteborg/" target="_blank" rel="noreferrer">
              {t("area.price.link")}
            </a>
          </section>
          <p className="muted area-compare">{t("area.compare", { count: 320 })}</p>
        </>
      )}
    </ProfileCard>
  );
}

/** One area row: label, level word (or a word of its own), and one plain sentence. */
function AreaRow({
  label,
  level,
  word,
  children,
}: {
  label: MessageKey;
  level?: Level | null;
  word?: string;
  children?: ReactNode;
}) {
  const { t } = useLang();
  const shown = word ?? (level ? t(`level.${level}` as MessageKey) : null);
  return (
    <section className="area-row">
      <p className="area-row-label">
        {t(label)}
        {shown && (
          <span className="area-level" data-level={level ?? "word"}>
            {shown}
          </span>
        )}
      </p>
      {children && <p className="area-sentence">{children}</p>}
    </section>
  );
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
