import { useEffect } from "react";
import { useLang } from "../lib/lang";
import { SearchBox } from "./SearchBox";
import { RecentSearches } from "./RecentSearches";
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

      <RecentSearches onOpen={onSearch} />

      <p className="footnote">{t("home.footer")}</p>
    </div>
  );
}
