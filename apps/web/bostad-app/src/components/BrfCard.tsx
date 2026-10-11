import { useState } from "react";
import type { BrfFigure, BrfResult } from "@bostad/property";
import { useLang } from "../lib/lang";
import type { Check } from "../lib/checks";
import type { MessageKey } from "../lib/i18n";
import { ProfileCard, type CardResult, type CardStatus, type Tone } from "./ProfileCard";
import { Icon } from "./Icons";
import { REASON } from "./cards";

export type BrfLevel = "low" | "medium" | "high";

/** Rule of thumb for debt per m²: low under 5 000 kr, high over 10 000 kr. */
export function debtLevel(kronorPerSqm: number): BrfLevel {
  return kronorPerSqm < 5000 ? "low" : kronorPerSqm <= 10000 ? "medium" : "high";
}

const LEVEL_TONE: Record<BrfLevel, Tone> = { low: "ok", medium: "warn", high: "risk" };

type Translate = ReturnType<typeof useLang>["t"];
/** Figures are shown the Swedish way (16 838, a space as the thousands separator) whatever the UI language. */
const sv = (v: number) => Math.round(v).toLocaleString("sv-SE");

export type BrfVerdict = "risk" | "watch" | "healthy" | "partial";

const VERDICT_TONE: Record<BrfVerdict, Tone> = { risk: "risk", watch: "warn", healthy: "ok", partial: "muted" };

/**
 * The overall verdict and the one reason line. Risk: debt over 10 000 kr/m², or an auditor remark.
 * Watch: debt from 5 000 to 10 000. Healthy: debt under 5 000 and a clean audit. Partial data: anything else.
 */
export function brfVerdict(data: BrfResult): { verdict: BrfVerdict; reason: MessageKey; vars: Record<string, string> } {
  const debt = data.debtPerSqm ? data.debtPerSqm.value : null;
  const audit = data.auditorRemarks?.value ?? null;
  const amount = debt === null ? "" : sv(debt);
  if (audit === "remark") return { verdict: "risk", reason: "brf.reason.remark", vars: {} };
  if (debt !== null && debt > 10000) return { verdict: "risk", reason: "brf.reason.debtHigh", vars: { amount } };
  if (debt !== null && debt >= 5000) return { verdict: "watch", reason: "brf.reason.debtMid", vars: { amount } };
  if (debt !== null && audit === "none") return { verdict: "healthy", reason: "brf.reason.healthy", vars: { amount } };
  if (debt === null) return { verdict: "partial", reason: "brf.reason.noDebt", vars: {} };
  return { verdict: "partial", reason: "brf.reason.noAudit", vars: { amount } };
}

/** The profile tile and the card header share this result, so they cannot disagree. */
export function brfResult(check: Check<BrfResult>, t: Translate): CardResult {
  if (check.kind !== "ok") return { text: t("summary.notChecked"), short: "–", tone: "muted" };
  const { verdict, reason, vars } = brfVerdict(check.data);
  return { text: t(reason, vars), short: t(`brf.verdict.${verdict}` as MessageKey), tone: VERDICT_TONE[verdict] };
}

/**
 * BRF figures from the association's annual report (demo, a few associations only). Buy mode only.
 * Each figure links to its PDF page. Addresses outside the demo keep the "awaiting Bolagsverket" reason.
 */
export function BrfCard({ check, result }: { check: Check<BrfResult>; result: CardResult }) {
  const { t } = useLang();
  const data = check.kind === "ok" ? check.data : null;
  const failed = check.kind === "failed";

  return (
    <ProfileCard
      id="card-brf"
      icon="building"
      title="card.brf.title"
      explain="card.brf.explain"
      ownIntro
      result={result}
      status={(failed ? "failed" : "checked") as CardStatus}
      reason={failed ? (check.reason === "notExact" ? REASON.notExact : "brf.awaiting") : undefined}
    >
      {data && <BrfBody data={data} result={result} t={t} />}
    </ProfileCard>
  );
}

/** The small "p. 8 ↗" chip: opens the PDF at the page the figure came from. */
function PageChip({ data, page, t }: { data: BrfResult; page: number; t: Translate }) {
  return (
    <a className="brf-page" href={`${data.sourceUrl}#page=${page}`} target="_blank" rel="noreferrer">
      {t("brf.page", { page })} ↗
    </a>
  );
}

/** The (i) button: the long explanation in a small popover. */
function InfoButton({ t }: { t: Translate }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="brf-info">
      <button type="button" className="brf-info-btn" aria-expanded={open} aria-label={t("brf.info")} onClick={() => setOpen((o) => !o)}>
        <Icon name="info" />
      </button>
      {open && (
        <span role="note" className="brf-info-pop">
          {t("card.brf.explain")}
        </span>
      )}
    </span>
  );
}

function Metric({
  label,
  value,
  unit,
  tone,
  basis,
  page,
  data,
  t,
}: {
  label: string;
  value: string | null;
  unit: string;
  tone?: Tone;
  basis?: string;
  page: number | null;
  data: BrfResult;
  t: Translate;
}) {
  return (
    <div className="brf-metric" data-tone={tone ?? "neutral"}>
      <span className="brf-metric-label">{label}</span>
      {value !== null ? (
        <>
          <span className="brf-metric-value">{value}</span>
          <span className="brf-metric-unit">{unit}</span>
          {basis && <span className="brf-basis">{basis}</span>}
        </>
      ) : (
        <span className="brf-missing">{t("brf.notExtracted")}</span>
      )}
      {page !== null && <PageChip data={data} page={page} t={t} />}
    </div>
  );
}

function BrfBody({ data, result, t }: { data: BrfResult; result: CardResult; t: Translate }) {
  const debt: BrfFigure<number> | null = data.debtPerSqm;
  const fee = data.annualFeePerSqm;
  const interest = data.interestCost;
  const audit = data.auditorRemarks;
  const maint = data.plannedMaintenance;
  const remark = audit?.value === "remark";
  const tone: Tone | undefined = debt ? LEVEL_TONE[debtLevel(debt.value)] : undefined;

  return (
    <>
      <div className="brf-head">
        <p className="card-lead">{result.text}</p>
        <InfoButton t={t} />
      </div>

      <p className="muted">{t("brf.assoc", { name: data.name, org: data.orgNr })}</p>

      <div className="brf-metrics">
        <Metric
          label={t("brf.debt.label")}
          value={debt ? sv(debt.value) : null}
          unit={t("brf.unit.perSqm")}
          tone={tone}
          basis={debt?.basis}
          page={debt?.page ?? null}
          data={data}
          t={t}
        />
        <Metric label={t("brf.metric.fee")} value={fee ? sv(fee.value) : null} unit={t("brf.unit.perSqmYear")} page={fee?.page ?? null} data={data} t={t} />
        <Metric
          label={t("brf.metric.interest")}
          value={interest ? sv(Math.abs(interest.value)) : null}
          unit={t("brf.unit.perYear")}
          page={interest?.page ?? null}
          data={data}
          t={t}
        />
      </div>

      <section className="brf-audit" data-tone={audit ? (remark ? "risk" : "ok") : "muted"}>
        <span className="brf-audit-label">{t("brf.audit.label")}</span>
        {audit ? (
          <div className="brf-audit-box">
            <Icon name={remark ? "alert" : "check"} />
            <div>
              <p>{t(remark ? "brf.audit.remarkPlain" : "brf.audit.cleanPlain")}</p>
              {audit.quote && <p className="brf-quote">&ldquo;{audit.quote}&rdquo;</p>}
              <PageChip data={data} page={audit.page} t={t} />
            </div>
          </div>
        ) : (
          <p className="muted">{t("brf.notExtracted")}</p>
        )}
      </section>

      <div className="brf-row">
        <span className="muted">{t("brf.maint.label")}</span>
        {maint ? (
          <span className="brf-row-value">
            {maint.value} <PageChip data={data} page={maint.page} t={t} />
          </span>
        ) : (
          <span className="brf-missing">{t("brf.notExtracted")}</span>
        )}
      </div>

      <div className="card-foot">
        <span>
          {t("brf.footer", { year: data.year, name: data.name, org: data.orgNr })} ·{" "}
          <a href={data.sourceUrl} target="_blank" rel="noreferrer">
            {t("brf.open")}
          </a>
        </span>
      </div>
      <p className="muted brf-note">{t("brf.level.note")}</p>
    </>
  );
}
