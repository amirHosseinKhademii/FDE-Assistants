import { useId, useState } from "react";
import type { SafetyResult, SafetyYear } from "@bostad/property";
import { useLang } from "../lib/lang";
import type { Check } from "../lib/checks";
import type { MessageKey } from "../lib/i18n";
import { localeOf } from "../lib/format";
import { CHART_KEYS, LEVEL_TONE, levelOf, niceMax, type CatKey, type SafetyLevel } from "../lib/safety";
import { ProfileCard, type CardResult, type CardStatus } from "./ProfileCard";
import { REASON } from "./cards";

const W = 340;
const H = 196;

/** Rates under 10 keep one decimal, so small categories do not read as 0 or 1. */
const fmt = (v: number | null | undefined, lang: "en" | "sv") =>
  v === null || v === undefined
    ? "–"
    : v < 10
      ? v.toLocaleString(localeOf(lang), { maximumFractionDigits: 1 })
      : Math.round(v).toLocaleString(localeOf(lang));

/**
 * Reported crimes at the address's district: one level word for the latest year, a trend
 * chart (2021-2025, or 2002-2025 when the toggle is on) and one row per category.
 * The map shades the district while this card is open (reported up through onOpenChange).
 */
export function SafetyCard({
  check,
  onRetry,
  onOpenChange,
}: {
  check: Check<SafetyResult>;
  onRetry: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, lang } = useLang();
  const [cat, setCat] = useState<CatKey>("all");
  const [early, setEarly] = useState(false);
  const data = check.kind === "ok" ? check.data : null;
  const latest = data?.years.find((y) => y.year === data.latestYear) ?? null;
  const level = latest ? levelOf(latest.cats.all.district.per1000, latest.cats.all.city.per1000) : null;
  const result: CardResult = level
    ? { text: t(`safety.summary.${level}` as MessageKey), tone: LEVEL_TONE[level] }
    : { text: t("summary.notChecked") };
  const failed = check.kind === "failed";

  return (
    <ProfileCard
      id="card-safety"
      icon="shield"
      title="safety.title"
      explain="safety.explain"
      result={result}
      status={(failed ? "failed" : "checked") as CardStatus}
      reason={failed ? REASON[check.reason] : undefined}
      onRetry={onRetry}
      onToggle={onOpenChange}
    >
      {data && latest && (
        <SafetyBody data={data} latest={latest} level={level} cat={cat} onCat={setCat} early={early} onEarly={setEarly} lang={lang} />
      )}
      {data && !latest && <p className="muted">{t("safety.noData")}</p>}
      {data && (
        <div className="card-foot">
          <span>{t("safety.src", { date: data.exportedAt ?? "–" })}</span>
        </div>
      )}
    </ProfileCard>
  );
}

function SafetyBody({
  data,
  latest,
  level,
  cat,
  onCat,
  early,
  onEarly,
  lang,
}: {
  data: SafetyResult;
  latest: SafetyYear;
  level: SafetyLevel | null;
  cat: CatKey;
  onCat: (c: CatKey) => void;
  early: boolean;
  onEarly: (v: boolean) => void;
  lang: "en" | "sv";
}) {
  const { t } = useLang();
  const area = latest.area ?? "–";
  const shownFrom = early ? 2002 : 2021;
  const period = t("safety.period", { from: shownFrom, to: latest.year });
  const all = latest.cats.all;

  return (
    <>
      <p className="safety-head">
        <strong>{t("safety.area", { area })}</strong> <span className="muted">· {period}</span>
      </p>

      <div className="safety-latest">
        {level && (
          <span className="safety-level" data-tone={LEVEL_TONE[level] ?? "neutral"}>
            {t(`safety.level.${level}` as MessageKey)}
          </span>
        )}
        <p className="area-sentence">
          {t("safety.latest", { year: latest.year, here: fmt(all.district.per1000, lang), city: fmt(all.city.per1000, lang) })}
        </p>
      </div>

      <section className="safety-chart">
        <div className="safety-chips" role="group" aria-label={t("safety.chips.label")}>
          {CHART_KEYS.map((k) => (
            <button key={k} type="button" className="mode-chip" aria-pressed={cat === k} onClick={() => onCat(k)}>
              <span>{t(`safety.cat.${k}` as MessageKey)}</span>
            </button>
          ))}
        </div>
        <TrendChart data={data} cat={cat} extended={early} area={area} period={period} />
        <button type="button" className="btn-secondary safety-toggle" aria-pressed={early} onClick={() => onEarly(!early)}>
          {t(early ? "safety.toggle.hide" : "safety.toggle.show")}
        </button>
        {early && <p className="muted safety-note">{t("safety.note.mapping")}</p>}
      </section>

      <section className="safety-cats">
        <p className="area-row-label">{t("safety.cats.label", { year: latest.year })}</p>
        <ul className="safety-rows">
          {CHART_KEYS.map((k) => (
            <CategoryRow key={k} name={t(`safety.cat.${k}` as MessageKey)} detail={k === "violence" ? t("safety.detail.violence") : k === "burglary" ? t("safety.detail.burglary") : null} here={latest.cats[k].district.per1000} city={latest.cats[k].city.per1000} lang={lang} />
          ))}
        </ul>
      </section>

      {data.outline && <p className="muted safety-note">{t("safety.onMap")}</p>}
    </>
  );
}

function CategoryRow({
  name,
  detail,
  here,
  city,
  lang,
}: {
  name: string;
  detail: string | null;
  here: number | null;
  city: number | null;
  lang: "en" | "sv";
}) {
  const { t } = useLang();
  const level = levelOf(here, city);
  const max = Math.max(here ?? 0, city ?? 0);
  const pct = (v: number | null) => (v === null || max <= 0 ? 0 : Math.min(100, (v / max) * 100));
  return (
    <li className="safety-row">
      <div className="safety-row-top">
        <span>
          <span className="safety-row-name">{name}</span>
          {detail && <span className="muted"> · {detail}</span>}
        </span>
        {level ? (
          <span className="safety-level" data-tone={LEVEL_TONE[level] ?? "neutral"}>
            {t(`safety.level.${level}` as MessageKey)}
          </span>
        ) : (
          <span className="muted">{t("safety.noRate")}</span>
        )}
      </div>
      <div className="safety-bar" aria-hidden="true">
        <span className="safety-bar-fill" style={{ width: `${pct(here)}%` }} />
        <span className="safety-bar-city" style={{ left: `${pct(city)}%` }} />
      </div>
      <p className="safety-row-nums">
        {t("safety.row.nums", { here: fmt(here, lang), city: fmt(city, lang) })}
      </p>
    </li>
  );
}

/** Inline SVG trend chart. Lines break where a value is missing. Hidden data table for screen readers. */
function TrendChart({
  data,
  cat,
  extended,
  area,
  period,
}: {
  data: SafetyResult;
  cat: CatKey;
  extended: boolean;
  area: string;
  period: string;
}) {
  const { t, lang } = useLang();
  const id = useId();
  const years = data.years.filter((y) => extended || y.year >= 2021);
  const rows = years.map((y) => ({
    year: y.year,
    d: y.cats[cat].district.per1000,
    c: y.cats[cat].city.per1000,
    n: y.cats[cat].district.count,
    verified: y.verified,
  }));
  const N = rows.length;
  const padL = 34;
  const padR = extended ? 42 : 12;
  const padT = 12;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const rateMax = niceMax(Math.max(0, ...rows.flatMap((r) => [r.d ?? 0, r.c ?? 0])));
  const countRows = extended ? rows.filter((r) => r.year <= 2020) : [];
  const countMax = niceMax(Math.max(0, ...countRows.map((r) => r.n ?? 0)));
  const x = (i: number) => (N <= 1 ? padL + plotW / 2 : padL + (i * plotW) / (N - 1));
  const yRate = (v: number) => padT + plotH * (1 - v / rateMax);
  const yCount = (v: number) => padT + plotH * (1 - v / countMax);

  const path = (pts: ({ x: number; y: number } | null)[]) => {
    let d = "";
    let pen = false;
    for (const p of pts) {
      if (!p) {
        pen = false;
        continue;
      }
      d += `${pen ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      pen = true;
    }
    return d;
  };
  const dPts = rows.map((r, i) => (r.d === null ? null : { x: x(i), y: yRate(r.d) }));
  const cPts = rows.map((r, i) => (r.c === null ? null : { x: x(i), y: yRate(r.c) }));
  const nPts = rows.map((r, i) => (extended && r.year <= 2020 && r.n !== null ? { x: x(i), y: yCount(r.n) } : null));
  const ticks = [0, 0.5, 1];
  // Five years: label them all. Twenty-four: every fourth year, and the last.
  const labelYears = rows
    .map((r, i) => ({ r, i }))
    .filter(({ r, i }) => N <= 6 || i === N - 1 || ((r.year - 2002) % 4 === 0 && N - 1 - i >= 4));
  const catLabel = t(`safety.cat.${cat}` as MessageKey);
  const title = t("safety.chart.title", { area, from: years[0]?.year ?? 2021, to: years[N - 1]?.year ?? 2025 });
  const desc = t("safety.chart.desc", { cat: catLabel, area });

  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-t ${id}-d`} focusable="false">
        <title id={`${id}-t`}>{title}</title>
        <desc id={`${id}-d`}>{desc}</desc>
        {ticks.map((f) => (
          <g key={f}>
            <line className="safety-grid" x1={padL} x2={W - padR} y1={yRate(rateMax * f)} y2={yRate(rateMax * f)} />
            <text className="safety-axis" x={padL - 6} y={yRate(rateMax * f) + 4} textAnchor="end">
              {Math.round(rateMax * f)}
            </text>
            {extended && countMax > 0 && (
              <text className="safety-axis" x={W - padR + 6} y={yCount(countMax * f) + 4} textAnchor="start">
                {Math.round(countMax * f)}
              </text>
            )}
          </g>
        ))}
        {labelYears.map(({ r, i }) => (
          <text key={r.year} className="safety-axis" x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === N - 1 ? "end" : "middle"}>
            {r.year}
          </text>
        ))}
        {extended && <path className="safety-line--count" d={path(nPts)} />}
        <path className="safety-line--city" d={path(cPts)} />
        <path className="safety-line--district" d={path(dPts)} />
        {cPts.map((p, i) => p && <circle key={`c${i}`} className="safety-dot--city" cx={p.x} cy={p.y} r={2.6} />)}
        {dPts.map((p, i) => p && <circle key={`d${i}`} className="safety-dot--district" cx={p.x} cy={p.y} r={3} />)}
      </svg>
      <ul className="safety-legend">
        <li>
          <span className="sw sw--district" aria-hidden="true" />
          {t("safety.legend.district")}
        </li>
        <li>
          <span className="sw sw--city" aria-hidden="true" />
          {t("safety.legend.city")}
        </li>
        {extended && (
          <li>
            <span className="sw sw--count" aria-hidden="true" />
            {t("safety.legend.count")}
          </li>
        )}
      </ul>
      <table className="sr-only">
        <caption>{period}</caption>
        <thead>
          <tr>
            <th scope="col">{t("safety.tbl.year")}</th>
            <th scope="col">{t("safety.legend.district")}</th>
            <th scope="col">{t("safety.legend.city")}</th>
            <th scope="col">{t("safety.tbl.count")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.year}>
              <th scope="row">{r.year}</th>
              <td>{fmt(r.d, lang)}</td>
              <td>{fmt(r.c, lang)}</td>
              <td>{r.year <= 2020 && extended ? fmt(r.n, lang) : "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
