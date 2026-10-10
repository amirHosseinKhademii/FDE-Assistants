import { useId, useState } from "react";
import type { SafetyResult, SafetyYear } from "@bostad/property";
import { useLang } from "../lib/lang";
import type { Check } from "../lib/checks";
import type { MessageKey } from "../lib/i18n";
import { localeOf } from "../lib/format";
import { CHART_KEYS, LEVEL_TONE, levelOf, niceMax, type CatKey, type SafetyLevel } from "../lib/safety";
import { ProfileCard, type CardResult, type CardStatus } from "./ProfileCard";
import { REASON } from "./cards";
import { Icon, type IconName } from "./Icons";

const W = 340;
const H = 236;
const PAD_L = 34;
const PAD_R = 50;
const PAD_T = 14;
const PAD_B = 28;

/** One icon per category; the arrow beside each carries the level. */
const CAT_ICON: Record<CatKey, IconName> = {
  all: "clipboard",
  violence: "alertTri",
  burglary: "houseDoor",
  carTheft: "car",
  theftFromCar: "carWindow",
  bikeTheft: "bike",
  vandalism: "burst",
  fraud: "card",
  drugs: "pill",
};

/** Arrow for a level: up above city, down below, equals around. Colour comes from the tone. */
const LEVEL_ARROW: Record<SafetyLevel, IconName> = {
  wellBelow: "arrowDown",
  below: "arrowDown",
  around: "equals",
  above: "arrowUp",
  wellAbove: "arrowUp",
};

const fmt = (v: number | null | undefined, lang: "en" | "sv") =>
  v === null || v === undefined
    ? "–"
    : v < 10
      ? v.toLocaleString(localeOf(lang), { maximumFractionDigits: 1 })
      : Math.round(v).toLocaleString(localeOf(lang));

/**
 * Reported crimes at the address's district. A level badge and one sentence for the latest
 * year, one tile per category (the chart shows the selected one), then the trend chart.
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
  const all = latest.cats.all;
  const tone = level ? (LEVEL_TONE[level] ?? "neutral") : "muted";

  return (
    <>
      <div className="sx-head">
        {level && (
          <span className="sx-badge" data-tone={tone}>
            <Icon name="shield" />
            <span>{t(`safety.level.${level}` as MessageKey)}</span>
          </span>
        )}
        <p className="sx-sentence">
          {t("safety.head", { area, here: fmt(all.district.per1000, lang), year: latest.year, city: fmt(all.city.per1000, lang) })}
        </p>
      </div>

      <ul className="sx-cats" aria-label={t("safety.chips.label")}>
        {CHART_KEYS.map((k) => (
          <li key={k}>
            <CatTile k={k} here={latest.cats[k].district.per1000} city={latest.cats[k].city.per1000} selected={cat === k} onPick={() => onCat(k)} lang={lang} />
          </li>
        ))}
      </ul>

      <section className="sx-chart">
        <TrendChart data={data} cat={cat} extended={early} area={area} />
        <button type="button" role="switch" aria-checked={early} className="sx-switch" onClick={() => onEarly(!early)}>
          <span className="sx-track" aria-hidden="true">
            <span className="sx-thumb" />
          </span>
          <span>{t("safety.toggle.show")}</span>
        </button>
        {early && <p className="muted sx-note">{t("safety.note.mapping")}</p>}
      </section>

      {data.outline && <p className="muted sx-note">{t("safety.onMap")}</p>}
    </>
  );
}

/** One category: its icon and name, the rate here against the city, a bar, and an arrow with the level word. */
function CatTile({
  k,
  here,
  city,
  selected,
  onPick,
  lang,
}: {
  k: CatKey;
  here: number | null;
  city: number | null;
  selected: boolean;
  onPick: () => void;
  lang: "en" | "sv";
}) {
  const { t } = useLang();
  const name = t(`safety.cat.${k}` as MessageKey);
  const level = levelOf(here, city);
  const max = Math.max(here ?? 0, city ?? 0);
  const pct = (v: number | null) => (v === null || max <= 0 ? 0 : Math.min(100, (v / max) * 100));
  const tone = level ? (LEVEL_TONE[level] ?? "neutral") : "muted";
  return (
    <button type="button" className="sx-cat" aria-pressed={selected} data-tone={tone} onClick={onPick}>
      <span className="sx-cat-head">
        <Icon name={CAT_ICON[k]} />
        <span className="sx-cat-name">{name}</span>
      </span>
      <span className="sx-bar" aria-hidden="true">
        <span className="sx-bar-fill" style={{ width: `${pct(here)}%` }} />
        <span className="sx-bar-city" style={{ left: `${pct(city)}%` }} />
      </span>
      <span className="sx-cat-nums">
        {fmt(here, lang)} <span className="muted">· {fmt(city, lang)}</span>
      </span>
      <span className="sx-cat-level">
        {level ? (
          <>
            <Icon name={LEVEL_ARROW[level]} />
            <span>{t(`tile.safety.${level}` as MessageKey)}</span>
          </>
        ) : (
          <span className="muted">{t("safety.noRate")}</span>
        )}
      </span>
    </button>
  );
}

/** Inline SVG trend chart with end labels and a legend. Lines break where a value is missing; a visually hidden table gives the same numbers. */
function TrendChart({ data, cat, extended, area }: { data: SafetyResult; cat: CatKey; extended: boolean; area: string }) {
  const { t, lang } = useLang();
  const id = useId();
  const years = data.years.filter((y) => extended || y.year >= 2021);
  const rows = years.map((y) => ({
    year: y.year,
    d: y.cats[cat].district.per1000,
    c: y.cats[cat].city.per1000,
    n: y.cats[cat].district.count,
  }));
  const N = rows.length;
  const padR = PAD_R;
  const plotW = W - PAD_L - padR;
  const plotH = H - PAD_T - PAD_B;
  const rateMax = niceMax(Math.max(0, ...rows.flatMap((r) => [r.d ?? 0, r.c ?? 0])));
  const countRows = extended ? rows.filter((r) => r.year <= 2020) : [];
  const countMax = niceMax(Math.max(0, ...countRows.map((r) => r.n ?? 0)));
  const x = (i: number) => (N <= 1 ? PAD_L + plotW / 2 : PAD_L + (i * plotW) / (N - 1));
  const yRate = (v: number) => PAD_T + plotH * (1 - v / rateMax);
  const yCount = (v: number) => PAD_T + plotH * (1 - v / countMax);

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
  const lastOf = (pts: ({ x: number; y: number } | null)[]) => {
    for (let i = pts.length - 1; i >= 0; i--) if (pts[i]) return { i, p: pts[i] as { x: number; y: number } };
    return null;
  };
  const lastD = lastOf(dPts);
  const lastC = lastOf(cPts);
  // Keep the two end labels apart when the lines finish close together.
  let cLabelY = lastC ? lastC.p.y + 4 : 0;
  let dLabelY = lastD ? lastD.p.y + 4 : 0;
  if (lastC && lastD && Math.abs(lastC.p.y - lastD.p.y) < 14) {
    if (lastD.p.y <= lastC.p.y) {
      dLabelY -= 5;
      cLabelY += 7;
    } else {
      dLabelY += 7;
      cLabelY -= 5;
    }
  }
  const ticks = [0, 0.5, 1];
  const labelYears = rows
    .map((r, i) => ({ r, i }))
    .filter(({ r, i }) => N <= 6 || i === N - 1 || ((r.year - 2002) % 8 === 0 && N - 1 - i >= 4));
  const catLabel = t(`safety.cat.${cat}` as MessageKey);
  const from = years[0]?.year ?? 2021;
  const to = years[N - 1]?.year ?? 2025;
  const title = t("safety.chart.title", { area, from, to });
  const desc = t("safety.chart.desc", { cat: catLabel, area });

  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-t ${id}-d`} focusable="false">
        <title id={`${id}-t`}>{title}</title>
        <desc id={`${id}-d`}>{desc}</desc>
        {ticks.map((f) => (
          <g key={f}>
            <line className="sx-grid" x1={PAD_L} x2={W - padR} y1={yRate(rateMax * f)} y2={yRate(rateMax * f)} />
            <text className="sx-axis" x={PAD_L - 6} y={yRate(rateMax * f) + 4} textAnchor="end">
              {Math.round(rateMax * f)}
            </text>
            {extended && countMax > 0 && (
              <text className="sx-axis" x={W - padR + 6} y={yCount(countMax * f) + 4} textAnchor="start">
                {Math.round(countMax * f)}
              </text>
            )}
          </g>
        ))}
        {labelYears.map(({ r, i }) => (
          <text key={r.year} className="sx-axis" x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === N - 1 ? "end" : "middle"}>
            {r.year}
          </text>
        ))}
        {extended && <path className="sx-line sx-line--count" d={path(nPts)} />}
        <path className="sx-line sx-line--city" d={path(cPts)} />
        <path className="sx-line sx-line--district" d={path(dPts)} />
        {cPts.map((p, i) => p && <circle key={`c${i}`} className="sx-dot sx-dot--city" cx={p.x} cy={p.y} r={2.8} />)}
        {dPts.map((p, i) => p && <circle key={`d${i}`} className="sx-dot sx-dot--district" cx={p.x} cy={p.y} r={3.4} />)}
        {lastC && (
          <text className="sx-end sx-end--city" x={lastC.p.x + 7} y={cLabelY}>
            {fmt(rows[lastC.i].c, lang)}
          </text>
        )}
        {lastD && (
          <text className="sx-end sx-end--district" x={lastD.p.x + 7} y={dLabelY}>
            {fmt(rows[lastD.i].d, lang)}
          </text>
        )}
      </svg>
      <ul className="sx-legend">
        <li>
          <span className="sx-swatch sx-swatch--district" aria-hidden="true" />
          {t("safety.legend.district")}
        </li>
        <li>
          <span className="sx-swatch sx-swatch--city" aria-hidden="true" />
          {t("safety.legend.city")}
        </li>
        {extended && (
          <li>
            <span className="sx-swatch sx-swatch--count" aria-hidden="true" />
            {t("safety.legend.count")}
          </li>
        )}
      </ul>
      <table className="sr-only">
        <caption>{t("safety.period", { from, to })}</caption>
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
