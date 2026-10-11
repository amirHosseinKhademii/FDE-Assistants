import { Link } from "@tanstack/react-router";
import { useLang } from "../lib/lang";

export type AppMode = "buy" | "rent";

/** Active only when the search string matches too, so Buy is not lit up in rent mode. */
const ACTIVE = { exact: true, includeSearch: true } as const;

/** Buy | Rent, on the home screen only. Plain links, so the mode lives in the URL: buy is `/`, rent is `/?mode=rent`. */
export function ModeSwitch({ mode }: { mode: AppMode }) {
  const { t } = useLang();
  return (
    <nav className="mode" aria-label={t("mode.label")}>
      <Link to="/" search={{}} activeOptions={ACTIVE} className="mode-option" aria-current={mode === "buy" ? "page" : undefined}>
        {t("mode.buy")}
      </Link>
      <Link to="/" search={{ mode: "rent" }} activeOptions={ACTIVE} className="mode-option" aria-current={mode === "rent" ? "page" : undefined}>
        {t("mode.rent")}
      </Link>
    </nav>
  );
}
