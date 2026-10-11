import type { BrfFigure, BrfResult } from "@bostad/property";
import { useLang } from "../lib/lang";
import type { Check } from "../lib/checks";
import type { MessageKey } from "../lib/i18n";
import { localeOf } from "../lib/format";
import { ProfileCard, type CardResult, type CardStatus, type Tone } from "./ProfileCard";
import { REASON } from "./cards";

export type BrfLevel = "low" | "medium" | "high";

/** Rule of thumb for debt per m²: low under 5 000 kr, high over 10 000 kr. */
export function debtLevel(kronorPerSqm: number): BrfLevel {
  return kronorPerSqm < 5000 ? "low" : kronorPerSqm <= 10000 ? "medium" : "high";
}

const LEVEL_TONE: Record<BrfLevel, Tone> = { low: "ok", medium: "warn", high: "risk" };

type Translate = ReturnType<typeof useLang>["t"];
type Lang = ReturnType<typeof useLang>["lang"];

const kr = (v: number, lang: Lang) => Math.round(v).toLocaleString(localeOf(lang));

/** The profile tile for BRF debt: the level word, or a dash when the demo has no debt figure. */
export function brfResult(check: Check<BrfResult>, t: Translate, lang: Lang): CardResult {
  if (check.kind === "ok" && check.data.debtPerSqm) {
    const v = check.data.debtPerSqm.value;
    const level = debtLevel(v);
    const word = t(`brf.level.${level}` as MessageKey);
    return { text: t("brf.tile.sentence", { amount: kr(v, lang), level: word }), short: word, tone: LEVEL_TONE[level] };
  }
  if (check.kind === "ok") return { text: t("brf.debt.none"), short: "–", tone: "muted" };
  return { text: t("summary.notChecked"), short: "–", tone: "muted" };
}

/**
 * BRF figures from the association's annual report (demo, a few associations only). Buy mode only.
 * Each figure links to its PDF page. Addresses outside the demo keep the "awaiting Bolagsverket" reason.
 */
export function BrfCard({ check, result }: { check: Check<BrfResult>; result: CardResult }) {
  const { t, lang } = useLang();
  const data = check.kind === "ok" ? check.data : null;
  const failed = check.kind === "failed";

  return (
    <ProfileCard
      id="card-brf"
      icon="building"
      title="card.brf.title"
      explain="card.brf.explain"
      result={result}
      status={(failed ? "failed" : "checked") as CardStatus}
      reason={failed ? (check.reason === "notExact" ? REASON.notExact : "brf.awaiting") : undefined}
    >
      {data && <BrfBody data={data} t={t} lang={lang} />}
    </ProfileCard>
  );
}

function BrfBody({ data, t, lang }: { data: BrfResult; t: Translate; lang: Lang }) {
  const page = (fig: BrfFigure<unknown>) => (
    <a className="brf-page" href={`${data.sourceUrl}#page=${fig.page}`} target="_blank" rel="noreferrer">
      {t("brf.page", { page: fig.page })}
    </a>
  );
  const f = data;
  const level = f.debtPerSqm ? debtLevel(f.debtPerSqm.value) : null;

  return (
    <>
      <p className="muted">{t("brf.assoc", { name: f.name, org: f.orgNr })}</p>
      <dl className="kv">
        <dt>{t("brf.debt.label")}</dt>
        <dd>
          {f.debtPerSqm && level ? (
            <>
              <span className="sx-chip" data-tone={LEVEL_TONE[level]}>
                <span>{t(`brf.level.${level}` as MessageKey)}</span>
              </span>{" "}
              <span>{t("brf.perSqm", { amount: kr(f.debtPerSqm.value, lang) })}</span> {page(f.debtPerSqm)}
            </>
          ) : (
            <span className="muted">{t("brf.none")}</span>
          )}
        </dd>
        <dt>{t("brf.fee.label")}</dt>
        <dd>
          {f.annualFeePerSqm ? (
            <>
              {t("brf.perSqm", { amount: kr(f.annualFeePerSqm.value, lang) })} {page(f.annualFeePerSqm)}
            </>
          ) : (
            <span className="muted">{t("brf.none")}</span>
          )}
        </dd>
        <dt>{t("brf.interest.label")}</dt>
        <dd>
          {f.interestCost ? (
            <>
              {t("brf.perYear", { amount: kr(Math.abs(f.interestCost.value), lang) })} {page(f.interestCost)}
            </>
          ) : (
            <span className="muted">{t("brf.none")}</span>
          )}
        </dd>
        <dt>{t("brf.maint.label")}</dt>
        <dd>
          {f.plannedMaintenance ? (
            <>
              {f.plannedMaintenance.value} {page(f.plannedMaintenance)}
            </>
          ) : (
            <span className="muted">{t("brf.none")}</span>
          )}
        </dd>
        <dt>{t("brf.audit.label")}</dt>
        <dd>
          {f.auditorRemarks ? (
            <>
              {f.auditorRemarks.value === "remark" ? t("brf.audit.remark") : t("brf.audit.none")} {page(f.auditorRemarks)}
              {f.auditorRemarks.quote && <span className="muted brf-quote">&ldquo;{f.auditorRemarks.quote}&rdquo;</span>}
            </>
          ) : (
            <span className="muted">{t("brf.none")}</span>
          )}
        </dd>
      </dl>
      <p className="muted">{t("brf.level.note")}</p>
      <div className="card-foot">
        <span>{t("brf.footer", { year: data.year })}</span>
      </div>
    </>
  );
}
