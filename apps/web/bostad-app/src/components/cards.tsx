import type { ReactNode } from "react";
import type { DistrictResult, IncomeResult, NoiseResult, PlacesResult, Profile } from "@bostad/property";
import { useLang } from "../lib/lang";
import type { Check, Reason } from "../lib/checks";
import type { MessageKey } from "../lib/i18n";
import { clockTime, googleMapsHref, localeOf, sourceHref, sourceKey, walkMinutes } from "../lib/format";
import { PLACE_KEY, PLACE_ORDER } from "../lib/places";
import { ProfileCard } from "./ProfileCard";
import { LineBadge, ModeIcon } from "./ModeIcon";
import { MODE_KEY, modesPresent, stopMatches, type ModeFilter } from "../lib/transport";
import type { CardStatus } from "./StatusPill";

const REASON: Record<Reason, MessageKey> = {
  notExact: "reason.notExact",
  noAddress: "reason.noAddress",
  noMatch: "reason.noMatch",
  sourceDown: "reason.sourceDown",
};

type Props<T> = { check: Check<T>; onRetry: () => void };

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

export function GroundCard({ check, onRetry }: Props<NonNullable<Profile["landslide"]["data"]>>) {
  const { t } = useLang();
  const meta = useCheckProps(check, onRetry);
  return (
    <ProfileCard icon="mountain" title="card.ground.title" explain="card.ground.explain" {...meta}>
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
      {check.kind === "ok" && check.data.inRiskArea && (
        <p className="muted">{t("card.ground.zones", { count: check.data.features.length })}</p>
      )}
    </ProfileCard>
  );
}

/** The bar runs from 35 to 75 dB(A): quiet homes sit at the left, the 55 dB guideline in the middle. */
const NOISE_MIN = 35;
const NOISE_MAX = 75;
const pct = (db: number) => `${Math.min(100, Math.max(0, ((db - NOISE_MIN) / (NOISE_MAX - NOISE_MIN)) * 100))}%`;

export function NoiseCard({ check, onRetry }: Props<NonNullable<Profile["noise"]["data"]>>) {
  const { t } = useLang();
  const meta = useCheckProps(check, onRetry);
  return (
    <ProfileCard icon="sound" title="card.noise.title" explain="card.noise.explain" {...meta}>
      {check.kind === "ok" && <NoiseDetail data={check.data} />}
    </ProfileCard>
  );
}

function NoiseDetail({ data }: { data: NoiseResult }) {
  const { t } = useLang();
  const b = data.building;
  const band = data.band && (
    <p className="muted">
      {t("card.noise.band", {
        range:
          data.band.maxDb === null
            ? t("card.noise.bandOpen", { min: data.band.minDb })
            : t("card.noise.bandRange", { min: data.band.minDb, max: data.band.maxDb }),
      })}
    </p>
  );
  const noBand = !data.band && <p className="muted">{t("card.noise.noBand")}</p>;

  if (!b) {
    return (
      <>
        <p className="muted">{t("card.noise.noBuilding")}</p>
        {band}
        {noBand}
        <p className="muted">{t("card.noise.caveat")}</p>
      </>
    );
  }

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
        {b.topDb !== null && (
          <>
            <dt>{t("card.noise.top")}</dt>
            <dd>{b.topDb} dB</dd>
          </>
        )}
        <dt>{t("card.noise.loudest")}</dt>
        <dd>
          <strong style={{ color: over ? "var(--warn)" : "var(--ok)" }}>
            {b.loudestDb} dB · {over ? t("card.noise.above") : t("card.noise.within")}
          </strong>
        </dd>
      </dl>
      {band}
      {noBand}
      <p className="muted">{t("card.noise.caveat")}</p>
    </>
  );
}

const MAX_LINE_BADGES = 8;

export function TransportCard({
  check,
  onRetry,
  filter,
  onFilter,
}: Props<NonNullable<Profile["transit"]["data"]>> & { filter: ModeFilter; onFilter: (f: ModeFilter) => void }) {
  const { t } = useLang();
  const meta = useCheckProps(check, onRetry);
  const stops = check.kind === "ok" ? check.data.stops : [];
  const present = modesPresent(stops);
  const shown = stops.filter((stop) => stopMatches(stop, filter));
  return (
    <ProfileCard icon="bus" title="card.transport.title" explain="card.transport.explain" {...meta}>
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
  places,
  onRetry,
}: {
  district: Check<DistrictResult>;
  income: Check<IncomeResult>;
  places: Check<PlacesResult>;
  onRetry: () => void;
}) {
  const { t, lang } = useLang();
  const parts = [district, income, places];
  const failed = parts.find((p): p is Extract<Check<unknown>, { kind: "failed" }> => p.kind === "failed");
  const anyOk = parts.some((p) => p.kind === "ok");
  const meta = anyOk
    ? { status: "checked" as CardStatus }
    : { status: "failed" as CardStatus, reason: REASON[failed?.reason ?? "sourceDown"], onRetry };
  return (
    <ProfileCard icon="home" title="card.hood.title" explain="card.hood.explain" {...meta}>
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

          <NeighbourhoodPart check={places} heading="card.hood.places">
            {(p) => (
              <>
                <ul className="place-list">
                  {PLACE_ORDER.map((category) => {
                    const near = p.nearest[category];
                    return (
                      <li key={category} className="place-row">
                        <div className="place-line">
                          <span>{t(PLACE_KEY[category])}</span>
                          <strong>{p.counts[category]}</strong>
                        </div>
                        {near && (
                          <p className="muted place-near">
                            {t("card.hood.nearestRow", {
                              name: near.name || t(PLACE_KEY[category]),
                              minutes: walkMinutes(near.distanceMeters),
                            })}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <PartSource name="card.hood.srcPlaces" time={checkedTime(places, lang)} />
              </>
            )}
          </NeighbourhoodPart>
        </>
      )}
    </ProfileCard>
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

export function LocationCard({ check, onRetry }: Props<NonNullable<Profile["location"]["data"]>>) {
  const { t } = useLang();
  const meta = useCheckProps(check, onRetry);
  return (
    <ProfileCard icon="pin" title="card.location.title" explain="card.location.explain" {...meta}>
      {check.kind === "ok" && (
        <>
          <p>{check.data.displayName}</p>
          <dl className="kv">
            <dt>{t("card.location.coords")}</dt>
            <dd>
              {check.data.lat.toFixed(5)}, {check.data.lon.toFixed(5)}
            </dd>
          </dl>
          <a
            className="btn-secondary"
            style={{ justifySelf: "start" }}
            href={googleMapsHref(check.data.lat, check.data.lon)}
            target="_blank"
            rel="noreferrer"
          >
            {t("card.location.openMaps")}
          </a>
        </>
      )}
    </ProfileCard>
  );
}

export function ComingSoonCard({
  icon,
  title,
  explain,
}: {
  icon: "building" | "leaf" | "tag" | "clipboard" | "wave";
  title: MessageKey;
  explain: MessageKey;
}) {
  return <ProfileCard icon={icon} title={title} explain={explain} status="soon" />;
}
