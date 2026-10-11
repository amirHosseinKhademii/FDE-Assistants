import { useEffect, useState } from "react";
import { RENT_BENCHMARK } from "@bostad/property/rent-benchmark";
import { useLang } from "../lib/lang";
import type { MessageKey } from "../lib/i18n";
import { compareRent, type RentVerdict } from "../lib/rent";
import { ModeSwitch } from "./ModeSwitch";
import { TopBar } from "./TopBar";

const VERDICT_KEY: Record<RentVerdict, MessageKey> = {
  above: "rent.verdict.above",
  close: "rent.verdict.close",
  below: "rent.verdict.below",
  farBelow: "rent.verdict.farBelow",
};

/** Search pages only: we never fetch or copy listings from these sites. */
const LINKS: { key: MessageKey; href: string }[] = [
  { key: "rent.links.boplats", href: "https://boplats.se/sok?types=1hand" },
  { key: "rent.links.qasa", href: "https://qasa.se/" },
  { key: "rent.links.homeq", href: "https://www.homeq.se/search?location=G%C3%B6teborg" },
];

/** Rent mode: the benchmark, a fair-rent check on typed numbers, and links out to the rental sites. */
export function RentView() {
  const { t } = useLang();
  const [rent, setRent] = useState("");
  const [size, setSize] = useState("");

  useEffect(() => {
    document.title = t("doc.rent");
  }, [t]);

  const result = compareRent(rent, size);
  const typed = rent.trim() !== "" || size.trim() !== "";
  const { kronorPerM2PerMonth, area, year, source } = RENT_BENCHMARK;

  return (
    <div className="wrap home">
      <TopBar />
      <ModeSwitch mode="rent" />

      <section className="hero">
        <h1>{t("rent.title")}</h1>
        <p>{t("rent.subtitle")}</p>
      </section>

      <div className="card rent-card">
        <div className="card-body">
          <section className="rent-section" aria-labelledby="rent-benchmark-title">
            <h2 id="rent-benchmark-title" className="rent-heading">
              {t("rent.benchmark.title")}
            </h2>
            <p className="rent-big">{t("rent.benchmark.value", { kronor: kronorPerM2PerMonth })}</p>
            <p className="card-explain">{t("rent.benchmark.area", { year })}</p>
            <p className="card-foot">{t("rent.benchmark.source", { name: source, year })}</p>
          </section>

          <section className="rent-section" aria-labelledby="rent-check-title">
            <h2 id="rent-check-title" className="rent-heading">
              {t("rent.check.title")}
            </h2>
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
            {result && (
              <div className="rent-result" role="status">
                <p>{t("rent.check.yours", { kronor: Math.round(result.kronorPerM2) })}</p>
                <p className={`rent-verdict is-${result.verdict}`}>
                  {t(VERDICT_KEY[result.verdict], { percent: Math.abs(Math.round(result.percent)) })}
                </p>
              </div>
            )}
            {!result && typed && <p className="hint">{t("rent.check.invalid")}</p>}
          </section>

          <section className="rent-section" aria-labelledby="rent-links-title">
            <h2 id="rent-links-title" className="rent-heading">
              {t("rent.links.title")}
            </h2>
            <p className="card-explain">{t("rent.links.note")}</p>
            <ul className="rent-links">
              {LINKS.map((link) => (
                <li key={link.key}>
                  <a className="btn-secondary" href={link.href} target="_blank" rel="noopener noreferrer">
                    {t(link.key)}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
