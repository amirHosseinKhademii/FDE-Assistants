import { useEffect, useState, type ReactNode } from "react";
import type { BrfFigure, BrfResult, RegistryFacts } from "@bostad/property";
import { useLang } from "../lib/lang";
import type { Check } from "../lib/checks";
import type { MessageKey } from "../lib/i18n";
import { sameAddressKey } from "../lib/recents";
import { ProfileCard, type CardResult, type Tone } from "./ProfileCard";
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

const ORG_NR = /^\d{6}-\d{4}$/;
const PICK_PREFIX = "bostad.brfPick.";
const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;
const HITS_MAX = 8;

type Hit = { org: string; name: string; active: boolean };
type Detail = { org: string; status: "loading" | "error" } | { org: string; status: "ok"; name: string; registry: RegistryFacts | null };

/** The org number picked for this address. localStorage can be missing or throw (private mode): then there is no pick. */
function readPick(address: string): string | null {
  try {
    const org = window.localStorage.getItem(PICK_PREFIX + sameAddressKey(address));
    return org && ORG_NR.test(org) ? org : null;
  } catch {
    return null;
  }
}

function writePick(address: string, org: string): void {
  try {
    window.localStorage.setItem(PICK_PREFIX + sameAddressKey(address), org);
  } catch {
    /* storage unavailable: the pick still holds for this page view */
  }
}

/**
 * BRF figures from the association's annual report (demo, a few associations only). Buy mode only.
 * Each figure links to its PDF page. When the address has no BRF in the demo, the card offers a search of the
 * Göteborg BRF index instead. A picked association is remembered per address and shows its registry facts,
 * and a pick overrides a matched BRF, because the user chose it.
 */
export function BrfCard({ address, check, result }: { address: string; check: Check<BrfResult>; result: CardResult }) {
  const { t } = useLang();
  const data = check.kind === "ok" ? check.data : null;
  const [pick, setPick] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);

  // Read after mount, not during render: the server has no localStorage, and reading it there would mismatch the page.
  useEffect(() => {
    setPick(readPick(address));
  }, [address]);

  useEffect(() => {
    if (!pick) return;
    const ac = new AbortController();
    setDetail({ org: pick, status: "loading" });
    fetch(`/api/brf?org=${encodeURIComponent(pick)}`, { signal: ac.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        return res.json();
      })
      .then((body: { name?: unknown; registry?: RegistryFacts | null }) => {
        setDetail({ org: pick, status: "ok", name: String(body.name ?? ""), registry: body.registry ?? null });
      })
      .catch(() => {
        if (!ac.signal.aborted) setDetail({ org: pick, status: "error" });
      });
    return () => ac.abort();
  }, [pick]);

  const current = detail && pick !== null && detail.org === pick ? detail : null;
  const pickFailed = current?.status === "error";
  const pickShown = pick !== null && !searching && !pickFailed;
  const pickedOrg = pickShown ? pick : null;
  const showMatch = data !== null && !pickShown && !searching;
  const canCancel = (pick !== null && !pickFailed) || data !== null;
  const reasonKey: MessageKey | null = check.kind === "failed" ? (check.reason === "notExact" ? REASON.notExact : "brf.awaiting") : null;
  const openSearch = () => setSearching(true);
  const choose = (org: string) => {
    writePick(address, org);
    setPick(org);
    setSearching(false);
  };

  let body: ReactNode;
  if (pickedOrg !== null) {
    body = <PickView org={pickedOrg} current={current} onChange={openSearch} t={t} />;
  } else if (data && showMatch) {
    body = (
      <>
        <BrfBody data={data} result={result} t={t} />
        <button type="button" className="brf-text-btn" onClick={openSearch}>
          {t("brf.find.notYours")}
        </button>
      </>
    );
  } else {
    body = (
      <FindView
        note={reasonKey ? t(reasonKey) : undefined}
        canCancel={canCancel}
        onPick={choose}
        onCancel={() => setSearching(false)}
        t={t}
      />
    );
  }

  return (
    <ProfileCard id="card-brf" icon="building" title="card.brf.title" explain="card.brf.explain" ownIntro result={result}>
      {body}
    </ProfileCard>
  );
}

/** "Find your BRF": a type-ahead over the Göteborg index. Picking a row reports its org number. */
function FindView({
  note,
  canCancel,
  onPick,
  onCancel,
  t,
}: {
  note?: string;
  canCancel: boolean;
  onPick: (org: string) => void;
  onCancel: () => void;
  t: Translate;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const q = query.trim();

  useEffect(() => {
    setHits(null);
    if (q.length < MIN_CHARS) return;
    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/brf-search?q=${encodeURIComponent(q)}`, { signal: ac.signal })
        .then((res) => (res.ok ? res.json() : { results: [] }))
        .then((body: { results?: Hit[] }) => {
          if (!ac.signal.aborted) setHits((body.results ?? []).slice(0, HITS_MAX));
        })
        .catch(() => {
          if (!ac.signal.aborted) setHits([]);
        });
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [q]);

  return (
    <div className="brf-find">
      <h3 className="brf-find-title">{t("brf.find.title")}</h3>
      {note && <p className="muted brf-note">{note}</p>}
      <div className="search">
        <input
          type="search"
          value={query}
          placeholder={t("brf.find.placeholder")}
          aria-label={t("brf.find.placeholder")}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {hits && hits.length > 0 && (
        <ul className="brf-hits">
          {hits.map((h) => (
            <li key={h.org}>
              <button type="button" className="brf-hit" onClick={() => onPick(h.org)}>
                <span>{h.name}</span>
                {!h.active && <span className="brf-hit-tag">{t("brf.find.inactive")}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {hits && hits.length === 0 && <p className="muted brf-note">{t("brf.find.none")}</p>}
      {canCancel && (
        <button type="button" className="brf-text-btn" onClick={onCancel}>
          {t("search.cancel")}
        </button>
      )}
    </div>
  );
}

/** The picked association: name, org nr, the live registry line, and the no-finances note. */
function PickView({ org, current, onChange, t }: { org: string; current: Detail | null; onChange: () => void; t: Translate }) {
  const ok = current && current.status === "ok" ? current : null;
  return (
    <div className="brf-find">
      {ok && <p className="card-lead">{ok.name}</p>}
      <p className="muted">{t("brf.find.org", { org })}</p>
      {ok?.registry && <RegistryRow registry={ok.registry} t={t} />}
      <p className="muted brf-note">{t("brf.find.noFinances")}</p>
      <button type="button" className="brf-text-btn" onClick={onChange}>
        {t("brf.find.change")}
      </button>
    </div>
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

/** The live Bolagsverket line: registration year and status. Status is one of three words, deregistered first. */
function RegistryRow({ registry, t }: { registry: RegistryFacts; t: Translate }) {
  const key: MessageKey = registry.deregistered
    ? "brf.registry.deregistered"
    : registry.inLiquidation
      ? "brf.registry.liquidation"
      : "brf.registry.active";
  return <p className="muted brf-note">{t(key, { year: registry.registered.slice(0, 4) })}</p>;
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
      {data.registry && <RegistryRow registry={data.registry} t={t} />}

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
