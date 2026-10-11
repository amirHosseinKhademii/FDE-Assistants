import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type { BankInfo, BankRate, MortgageRates, PriceResult } from "@bostad/property";
import { OriginDialog, originOf, type Origin } from "@fde/uikit";
import { useLang } from "../lib/lang";
import type { MessageKey } from "../lib/i18n";
import { calculate, FIXATIONS, lowestRate, MAX_LTV, MIN_DOWN_SHARE, type Fixation } from "../lib/mortgage";
import { fetchMortgageRates } from "../lib/mortgageRates";
import { Icon } from "./Icons";
import { ProfileCard, type CardResult } from "./ProfileCard";

/**
 * Mortgage card for buy mode: the monthly cost on the average small-house price in Göteborg, the Riksbank
 * policy rate, and a calculator in a dialog. Rates come from /api/mortgage (cached on the server), loaded once
 * per page. The arithmetic is in lib/mortgage.ts. Amounts are always sv-SE, as the brief asks.
 */

type Translate = ReturnType<typeof useLang>["t"];
type Lang = ReturnType<typeof useLang>["lang"];

const SV = "sv-SE";
const kr = (v: number) => `${Math.round(v).toLocaleString(SV)} kr`;
const pct = (v: number, digits = 2) => v.toLocaleString(SV, { minimumFractionDigits: digits, maximumFractionDigits: digits });
const DEFAULT_PERIOD: Fixation = "5 år";

/** The number a text field holds, read leniently: a comma is a decimal point, spaces are ignored. */
function num(text: string): number {
  const n = Number(text.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** The average new-loan rate for a period from SCB, or null. */
function averageFor(rates: MortgageRates | null, period: Fixation): number | null {
  const hit = rates?.averages.data?.rates.find((r) => r.period === period);
  return hit ? hit.rate : null;
}

/** The starting rate for a period: the lowest bank list rate, else SCB's average. */
function startRate(rates: MortgageRates | null, period: Fixation): number | null {
  const list = rates?.banks.data?.rates ?? [];
  return lowestRate(list, period) ?? averageFor(rates, period);
}

/** The loaded rates, or null while loading or when the server has none. Fetched once per page. */
function useMortgageRates(): { rates: MortgageRates | null; loaded: boolean } {
  const [state, setState] = useState<{ rates: MortgageRates | null; loaded: boolean }>({ rates: null, loaded: false });
  useEffect(() => {
    let live = true;
    fetchMortgageRates().then((rates) => {
      if (live) setState({ rates, loaded: true });
    });
    return () => {
      live = false;
    };
  }, []);
  return state;
}

export function MortgageCard({ price, brfFeePerSqm }: { price: PriceResult | null; brfFeePerSqm: number | null }) {
  const { t, lang } = useLang();
  const { rates, loaded } = useMortgageRates();
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [open, setOpen] = useState(false);

  // The card's own figure: the SCB price, 10 % down, the starting rate for the default period, no fee.
  const basePrice = price ? price.value * 1000 : null;
  const baseRate = startRate(rates, DEFAULT_PERIOD);
  const headline = basePrice !== null && baseRate !== null ? calculate({ price: basePrice, down: basePrice * MIN_DOWN_SHARE, rate: baseRate, fee: 0 }).base.totalMonth : null;

  const result: CardResult =
    headline !== null && basePrice !== null && baseRate !== null
      ? {
          text: t("mortgage.lead", { amount: kr(headline), price: kr(basePrice), period: DEFAULT_PERIOD, rate: pct(baseRate) }),
          short: `${Math.round(headline).toLocaleString(SV)} kr`,
          tone: "neutral",
        }
      : { text: t(loaded ? "mortgage.noRates" : "summary.notChecked"), short: "–", tone: "muted" };

  return (
    <ProfileCard id="card-mortgage" icon="houseTag" title="card.mortgage.title" explain="card.mortgage.explain" result={result} status="checked">
      {rates?.policyRate.data && (
        <p className="muted">{t("mortgage.policy", { rate: pct(rates.policyRate.data.value), date: rates.policyRate.data.date })}</p>
      )}
      <button
        type="button"
        className="mortgage-open"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(e) => {
          setOrigin(originOf(e.currentTarget));
          setOpen(true);
        }}
      >
        <span className="mortgage-open-mark" aria-hidden="true">
          <Icon name="houseTag" />
        </span>
        <span>{t("mortgage.open")}</span>
      </button>
      {origin && open && (
        <MortgageDialog
          from={origin}
          rates={rates}
          price={basePrice}
          brfFeePerSqm={brfFeePerSqm}
          lang={lang}
          t={t}
          onClose={() => {
            setOpen(false);
            setOrigin(null);
          }}
        />
      )}
    </ProfileCard>
  );
}

function MortgageDialog({
  from,
  rates,
  price,
  brfFeePerSqm,
  lang,
  t,
  onClose,
}: {
  from: Origin;
  rates: MortgageRates | null;
  price: number | null;
  brfFeePerSqm: number | null;
  lang: Lang;
  t: Translate;
  onClose: () => void;
}) {
  const [period, setPeriod] = useState<Fixation>(DEFAULT_PERIOD);
  const [priceText, setPriceText] = useState(price !== null ? String(Math.round(price)) : "");
  const [downPct, setDownPct] = useState(Math.round(MIN_DOWN_SHARE * 100));
  const [incomeText, setIncomeText] = useState("");
  const [sizeText, setSizeText] = useState("");
  const [feeText, setFeeText] = useState("0");
  const [rateText, setRateText] = useState(() => {
    const r = startRate(rates, DEFAULT_PERIOD);
    return r !== null ? String(r) : "";
  });

  // A new fixation period starts from its own rate, as the brief asks.
  function pickPeriod(next: Fixation) {
    setPeriod(next);
    const r = startRate(rates, next);
    setRateText(r !== null ? String(r) : "");
  }

  // With a flat size and the association's fee per m², the monthly fee is filled in.
  function changeSize(text: string) {
    setSizeText(text);
    if (brfFeePerSqm !== null) setFeeText(String(Math.round((brfFeePerSqm * num(text)) / 12)));
  }

  const priceKr = num(priceText);
  const down = (priceKr * downPct) / 100;
  const rate = num(rateText);
  const fee = num(feeText);
  const income = num(incomeText);
  const calc = useMemo(() => calculate({ price: priceKr, down, rate, fee }), [priceKr, down, rate, fee]);
  const share = income > 0 ? (calc.base.totalMonth / income) * 100 : null;

  const ratesData = rates?.banks.data ?? null;
  const directory = useMemo(() => new Map<string, BankInfo>((ratesData?.directory ?? []).map((b) => [b.name, b])), [ratesData]);
  const bankRows = useMemo(
    () => (ratesData?.rates ?? []).filter((r) => r.period === period).sort((a, b) => a.rate - b.rate),
    [ratesData, period],
  );
  const avg = averageFor(rates, period);
  const avgMonth = rates?.averages.data?.month ?? "";
  const seg = calc.base.totalMonth > 0 ? calc.base.totalMonth : 1;
  const sourceUrl = ratesData?.sourceUrl ?? "https://konsumenternasbankochfinansbyra.se/";

  return (
    <OriginDialog
      from={from}
      tone="var(--accent)"
      label={t("mortgage.dialogTitle")}
      onClose={onClose}
      header={
        <>
          <span className="mort-head-mark" aria-hidden="true">
            <Icon name="houseTag" />
          </span>
          <h2 className="mort-head-title">{t("mortgage.dialogTitle")}</h2>
        </>
      }
    >
      <div className="mortgage-modal">
        <section className="mort-section">
          <Field label={t("mortgage.price")} hint={t("mortgage.priceHint")} id="mort-price">
            <input id="mort-price" className="mort-input" inputMode="numeric" value={priceText} onChange={(e) => setPriceText(e.target.value)} />
          </Field>

          <Field label={`${t("mortgage.down")}: ${kr(down)} (${downPct} %)`} hint={t("mortgage.downMin")} id="mort-down">
            <input
              id="mort-down"
              className="mort-range"
              type="range"
              min={Math.round(MIN_DOWN_SHARE * 100)}
              max={50}
              step={1}
              value={downPct}
              onChange={(e) => setDownPct(Number(e.target.value))}
            />
          </Field>

          <Field label={t("mortgage.period")} id="mort-period">
            <select id="mort-period" className="mort-input" value={period} onChange={(e) => pickPeriod(e.target.value as Fixation)}>
              {FIXATIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t("mortgage.rate")} hint={avg !== null ? t("mortgage.rateAvg", { rate: pct(avg), month: avgMonth }) : t("mortgage.rateHint")} id="mort-rate">
            <input id="mort-rate" className="mort-input" inputMode="decimal" value={rateText} onChange={(e) => setRateText(e.target.value)} />
          </Field>

          <Field label={t("mortgage.income")} hint={share !== null ? t("mortgage.incomeShare", { pct: pct(share, 0) }) : undefined} id="mort-income">
            <input id="mort-income" className="mort-input" inputMode="numeric" value={incomeText} onChange={(e) => setIncomeText(e.target.value)} />
          </Field>

          {brfFeePerSqm !== null && (
            <Field label={t("mortgage.size")} id="mort-size">
              <input id="mort-size" className="mort-input" inputMode="numeric" value={sizeText} onChange={(e) => changeSize(e.target.value)} />
            </Field>
          )}

          <Field label={t("mortgage.fee")} hint={brfFeePerSqm !== null ? t("mortgage.feeHint", { amount: pct(brfFeePerSqm, 0) }) : t("mortgage.feeNone")} id="mort-fee">
            <input id="mort-fee" className="mort-input" inputMode="numeric" value={feeText} onChange={(e) => setFeeText(e.target.value)} />
          </Field>
        </section>

        <section className="mort-section mort-results" aria-live="polite">
          <dl className="mort-kv">
            <dt>{t("mortgage.loan")}</dt>
            <dd>{kr(calc.loan)}</dd>

            <dt>{t("mortgage.ltv")}</dt>
            <dd>
              {pct(calc.ltv * 100, 0)} %
              <span className="mort-ltv" aria-hidden="true">
                <span className="mort-ltv-fill" style={{ width: `${Math.min(100, calc.ltv * 100)}%` }} />
                <span className="mort-ltv-limit" style={{ left: `${MAX_LTV * 100}%` }} />
              </span>
              <span className="mort-note">{t("mortgage.ltvLimit")}</span>
            </dd>

            <dt>{t("mortgage.amort")}</dt>
            <dd>
              {calc.amortRate > 0 ? (
                <>
                  {t("mortgage.amortRule", { pct: pct(calc.amortRate * 100, 0) })}
                  <br />
                  {t("mortgage.perMonth", { amount: kr(calc.amortMonth) })}
                </>
              ) : (
                t("mortgage.amortNone")
              )}
            </dd>

            <dt>{t("mortgage.interest")}</dt>
            <dd>
              {kr(calc.base.interestMonthGross)} <span className="mort-note">{t("mortgage.interestGross")}</span>
              <br />
              {kr(calc.base.interestMonthNet)} <span className="mort-note">{t("mortgage.interestNet")}</span>
            </dd>

            <dt>{t("mortgage.deduction")}</dt>
            <dd>{kr(calc.base.deductionMonth)}</dd>
          </dl>

          <div className="mort-total">
            <span>{t("mortgage.total")}</span>
            <strong>{kr(calc.base.totalMonth)}</strong>
          </div>

          <div className="mort-stack" role="img" aria-label={t("mortgage.total")}>
            <span style={{ width: `${(calc.base.interestMonthNet / seg) * 100}%`, background: "var(--sec-transit)" }} />
            <span style={{ width: `${(calc.amortMonth / seg) * 100}%`, background: "var(--sec-price)" }} />
            <span style={{ width: `${(calc.feeMonth / seg) * 100}%`, background: "var(--sec-district)" }} />
          </div>
          <ul className="mort-legend">
            <li><i style={{ background: "var(--sec-transit)" }} />{t("mortgage.legend.interest")}</li>
            <li><i style={{ background: "var(--sec-price)" }} />{t("mortgage.legend.amort")}</li>
            <li><i style={{ background: "var(--sec-district)" }} />{t("mortgage.legend.fee")}</li>
          </ul>

          <div className="mort-stress">
            <span>{t("mortgage.stress")}</span>
            <strong>
              {kr(calc.stress.totalMonth)} <span className="mort-note">{t("mortgage.stressRate", { rate: pct(calc.stress.rate) })}</span>
            </strong>
          </div>
        </section>

        <section className="mort-section">
          <h3 className="mort-heading">{t("mortgage.banks", { period })}</h3>
          {!ratesData ? (
            <p className="muted">{t("mortgage.banksError")}</p>
          ) : bankRows.length === 0 ? (
            <p className="muted">{t("mortgage.banksNone")}</p>
          ) : (
            <ol className="bank-list">
              {bankRows.map((row, i) => (
                <BankRow key={row.bank} row={row} info={directory.get(row.bank) ?? null} lowest={i === 0} sourceUrl={sourceUrl} t={t} />
              ))}
            </ol>
          )}
          {ratesData && (
            <p className="muted mort-banknote">
              {t("mortgage.banksNote", { source: ratesData.source, date: ratesData.updated })}{" "}
              <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                {ratesData.source}
              </a>
            </p>
          )}
        </section>

        <section className="mort-section mort-rules">
          <h3 className="mort-heading">{t("mortgage.rulesTitle")}</h3>
          <ul>
            <li>
              {t("mortgage.rule.ltv")} <Source name={rates?.rules.maxLtv.source} url={rates?.rules.maxLtv.url} t={t} />
            </li>
            <li>
              {t("mortgage.rule.amort")} <Source name={rates?.rules.amortization.source} url={rates?.rules.amortization.url} t={t} />
            </li>
            <li>
              {t("mortgage.rule.deduction")} <Source name={rates?.rules.interestDeduction.source} url={rates?.rules.interestDeduction.url} t={t} />
            </li>
            <li>
              {t("mortgage.rule.noIncome")} <Source name={rates?.rules.noIncomeMultipleRule.source} url={rates?.rules.noIncomeMultipleRule.url} t={t} />
            </li>
          </ul>
          <p className="muted">{t("mortgage.estimate")}</p>
        </section>
      </div>
    </OriginDialog>
  );
}

function Field({ label, hint, id, children }: { label: string; hint?: string; id: string; children: ReactNode }) {
  return (
    <div className="mort-field">
      <label className="mort-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && <p className="mort-hint">{hint}</p>}
    </div>
  );
}

function Source({ name, url, t }: { name?: string; url?: string; t: Translate }) {
  if (!url) return null;
  return (
    <a className="mort-source" href={url} target="_blank" rel="noopener noreferrer">
      {t("mortgage.rule.source")}: {name ?? url}
    </a>
  );
}

function BankRow({ row, info, lowest, sourceUrl, t }: { row: BankRate; info: BankInfo | null; lowest: boolean; sourceUrl: string; t: Translate }) {
  return (
    <li className={lowest ? "bank-row is-lowest" : "bank-row"}>
      <BankIcon name={row.bank} faviconUrl={info?.faviconUrl} />
      <div className="bank-main">
        <span className="bank-name">
          {row.bank}
          {lowest && <span className="bank-tag">{t("mortgage.banksLowest")}</span>}
        </span>
        <span className="muted bank-updated">{t("mortgage.banksUpdated", { date: row.updated })}</span>
      </div>
      <div className="bank-rate">
        <strong>{pct(row.rate)} %</strong>
        {row.from && <span className="muted">{t("mortgage.banksFrom", { rate: pct(row.rate) })}</span>}
      </div>
      <a className="bank-go" href={info?.ratesUrl ?? sourceUrl} target="_blank" rel="noopener noreferrer">
        {t("mortgage.banksGo")}
      </a>
    </li>
  );
}

/** The bank's favicon at 20 px, or a coloured initial when the image is missing or fails. */
export function BankIcon({ name, faviconUrl }: { name: string; faviconUrl?: string }) {
  const [failed, setFailed] = useState(!faviconUrl);
  if (failed || !faviconUrl) {
    const hue = [...name].reduce((h, ch) => (h + ch.charCodeAt(0)) % 360, 0);
    return (
      <span className="bank-initial" aria-hidden="true" style={{ "--hue": hue } as CSSProperties}>
        {name.charAt(0)}
      </span>
    );
  }
  return (
    <img
      className="bank-icon"
      src={faviconUrl}
      width={20}
      height={20}
      loading="lazy"
      referrerPolicy="no-referrer"
      alt={name}
      onError={() => setFailed(true)}
    />
  );
}
