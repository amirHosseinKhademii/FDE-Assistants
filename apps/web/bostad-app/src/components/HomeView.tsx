import { useEffect } from "react";
import { useLang } from "../lib/lang";
import { SearchBox } from "./SearchBox";
import { EXAMPLE_ADDRESSES, exampleQuery } from "../lib/recents";
import { TopBar } from "./TopBar";

export function HomeView({ onSearch }: { onSearch: (address: string) => void }) {
  const { t } = useLang();

  useEffect(() => {
    document.title = t("doc.home");
  }, [t]);

  return (
    <div className="wrap home">
      <TopBar />

      <section className="hero">
        <h1>{t("home.title")}</h1>
        <p>{t("home.subtitle")}</p>
      </section>

      <SearchBox initial="" onSearch={onSearch} />

      <div className="examples">
        <span className="caption">{t("home.examples")}</span>
        <div className="chips">
          {EXAMPLE_ADDRESSES.map((address) => (
            <button key={address} type="button" className="chip" onClick={() => onSearch(exampleQuery(address))}>
              {address}
            </button>
          ))}
        </div>
      </div>

      <p className="footnote">{t("home.footer")}</p>
    </div>
  );
}
