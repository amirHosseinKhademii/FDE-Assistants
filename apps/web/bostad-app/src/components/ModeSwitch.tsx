import { Link } from "@tanstack/react-router";
import { useLang } from "../lib/lang";

export type AppMode = "buy" | "rent";

/** Active only when the search string matches too, so Buy is not lit up in rent mode. */
const ACTIVE = { exact: true, includeSearch: true } as const;

/**
 * Buy | Rent. Plain links, so the mode lives in the URL: buy is `/`, rent is `/?mode=rent`.
 * On a profile, `address` is kept, so switching mode keeps the same address.
 */
export function ModeSwitch({ mode, address }: { mode: AppMode; address?: string }) {
  const { t } = useLang();
  return (
    <nav className="mode" aria-label={t("mode.label")}>
      <Link to="/" search={address ? { address } : {}} activeOptions={ACTIVE} className="mode-option" aria-current={mode === "buy" ? "page" : undefined}>
        {t("mode.buy")}
      </Link>
      <Link to="/" search={address ? { address, mode: "rent" } : { mode: "rent" }} activeOptions={ACTIVE} className="mode-option" aria-current={mode === "rent" ? "page" : undefined}>
        {t("mode.rent")}
      </Link>
    </nav>
  );
}
