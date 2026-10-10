import { useEffect } from "react";
import { useLang } from "../lib/lang";
import { Icon, type IconName } from "./Icons";
import { SearchBox } from "./SearchBox";
import { EXAMPLE_ADDRESSES, exampleQuery } from "../lib/recents";
import { TopBar } from "./TopBar";


const TILES: Array<{ icon: IconName; label: "home.tile.ground" | "home.tile.transport" | "home.tile.brf" | "home.tile.energy"; soon: boolean }> = [
  { icon: "mountain", label: "home.tile.ground", soon: false },
  { icon: "bus", label: "home.tile.transport", soon: false },
  { icon: "building", label: "home.tile.brf", soon: true },
  { icon: "leaf", label: "home.tile.energy", soon: true },
];

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

      <section className="tiles" aria-label={t("home.getTitle")}>
        {TILES.map((tile) => (
          <div className="tile" key={tile.label}>
            <Icon name={tile.icon} />
            <span className="tile-label">{t(tile.label)}</span>
            {tile.soon && <span className="caption">{t("home.soon")}</span>}
          </div>
        ))}
      </section>

      <p className="footnote">{t("home.footer")}</p>
    </div>
  );
}
