import { useState } from "react";
import { RENT_BENCHMARK } from "@bostad/property/rent-benchmark";
import { useLang } from "../lib/lang";
import type { MessageKey } from "../lib/i18n";
import { compareRent, type RentVerdict } from "../lib/rent";
import { ProfileCard, type CardResult } from "./ProfileCard";

const VERDICT_KEY: Record<RentVerdict, MessageKey> = {
  above: "rent.verdict.above",
  close: "rent.verdict.close",
  below: "rent.verdict.below",
  farBelow: "rent.verdict.farBelow",
};

/**
 * Search pages only: we never fetch or copy listings from these sites. HomeQ is
 * asked for the district the address is in (or the city when no district is known).
 */
function linksFor(place: string): { key: MessageKey; href: string }[] {
  return [
    { key: "rent.links.boplats", href: "https://boplats.se/sok?types=1hand" },
    { key: "rent.links.qasa", href: "https://qasa.se/" },
    { key: "rent.links.homeq", href: `https://www.homeq.se/search?location=${encodeURIComponent(place)}` },
  ];
}

/** Rent mode's first card: the rental share here, the rent benchmark, the fair-rent check and the rental sites. */
export function RentCard({
  rentalShare,
  rentalCity,
  year,
  place,
  result,
}: {
  /** Share of flats that are rented here, 0 to 1, or null when the area has no tenure figure. */
  rentalShare: number | null;
  /** The same share for all of Gothenburg. */
  rentalCity: number | null;
  year: string;
  place: string;
  result: CardResult;
}) {
  const { t } = useLang();
  const [rent, setRent] = useState("");
  const [size, setSize] = useState("");

  const check = compareRent(rent, size);
  const typed = rent.trim() !== "" || size.trim() !== "";
  const { kronorPerM2PerMonth, year: benchmarkYear, source } = RENT_BENCHMARK;
  const pct = (v: number | null) => (v === null ? "–" : String(Math.round(v * 100)));

  return (
    <ProfileCard id="card-rent" icon="houseDoor" title="rent.card.title" explain="rent.card.explain" result={result}>
      <section className="rent-section" aria-labelledby="rent-share-title">
        <h3 id="rent-share-title" className="rent-heading">
          {t("rent.share.title")}
        </h3>
        {rentalShare === null ? (
          <p className="muted">{t("rent.share.none")}</p>
        ) : (
          <>
            <p className="rent-big">{t("rent.share.sentence", { pct: pct(rentalShare) })}</p>
            <p className="card-explain">{t("rent.share.city", { pct: pct(rentalCity) })}</p>
          </>
        )}
        {rentalShare !== null && (
          <div className="card-foot">
            <span>{t("rent.share.source", { year })}</span>
          </div>
        )}
      </section>

      <section className="rent-section" aria-labelledby="rent-benchmark-title">
        <h3 id="rent-benchmark-title" className="rent-heading">
          {t("rent.benchmark.title")}
        </h3>
        <p className="rent-big">{t("rent.benchmark.value", { kronor: kronorPerM2PerMonth })}</p>
        <p className="card-explain">{t("rent.benchmark.area", { year: benchmarkYear })}</p>
        <p className="card-explain">{t("rent.benchmark.scope")}</p>
        <p className="card-foot">{t("rent.benchmark.source", { name: source, year: benchmarkYear })}</p>
      </section>

      <section className="rent-section" aria-labelledby="rent-check-title">
        <h3 id="rent-check-title" className="rent-heading">
          {t("rent.check.title")}
        </h3>
        <p className="card-explain">{t("rent.check.explain")}</p>
        <div className="rent-fields">
          <label className="rent-field">
            <span>{t("rent.check.rent")}</span>
            <input type="text" inputMode="decimal" autoComplete="off" value={rent} onChange={(e) => setRent(e.target.value)} />
          </label>
          <label className="rent-field">
            <span>{t("rent.check.size")}</span>
            <input type="text" inputMode="decimal" autoComplete="off" value={size} onChange={(e) => setSize(e.target.value)} />
          </label>
        </div>
        {check && (
          <div className="rent-result" role="status">
            <p>{t("rent.check.yours", { kronor: Math.round(check.kronorPerM2) })}</p>
            <p className={`rent-verdict is-${check.verdict}`}>
              {t(VERDICT_KEY[check.verdict], { percent: Math.abs(Math.round(check.percent)) })}
            </p>
          </div>
        )}
        {!check && typed && <p className="hint">{t("rent.check.invalid")}</p>}
      </section>

      <section className="rent-section" aria-labelledby="rent-links-title">
        <h3 id="rent-links-title" className="rent-heading">
          {t("rent.links.title")}
        </h3>
        <p className="card-explain">{t("rent.links.note")}</p>
        <ul className="rent-links">
          {linksFor(place).map((link) => (
            <li key={link.key}>
              <a className="btn-secondary" href={link.href} target="_blank" rel="noopener noreferrer">
                {t(link.key)}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </ProfileCard>
  );
}
