import { useEffect } from "react";
import { useLang } from "../lib/lang";
import { SearchBox } from "./SearchBox";
import { RecentSearches } from "./RecentSearches";
import { TopBar } from "./TopBar";
import { ModeSwitch, type AppMode } from "./ModeSwitch";

/** The home page in either mode. Rent uses the same search box with its own prompt. */
export function HomeView({ mode = "buy", onSearch }: { mode?: AppMode; onSearch: (address: string) => void }) {
  const { t } = useLang();
  const rent = mode === "rent";

  useEffect(() => {
    document.title = t(rent ? "doc.rent" : "doc.home");
  }, [t, rent]);

  return (
    <div className="wrap home">
      <TopBar />
      <ModeSwitch mode={mode} />

      <section className="hero">
        <h1>{t(rent ? "rent.title" : "home.title")}</h1>
        <p>{t(rent ? "rent.subtitle" : "home.subtitle")}</p>
      </section>

      <SearchBox initial="" onSearch={onSearch} placeholder={rent ? t("search.rentPlaceholder") : undefined} />

      <RecentSearches onOpen={onSearch} />

      <p className="footnote">{t("home.footer")}</p>
    </div>
  );
}
