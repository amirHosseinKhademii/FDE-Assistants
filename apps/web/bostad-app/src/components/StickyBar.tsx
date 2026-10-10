import { useLang } from "../lib/lang";
import { SEARCH_INPUT_ID } from "./SearchBox";

/** Phones only: jumps back to the search box to start a new address. */
export function StickyBar() {
  const { t } = useLang();
  return (
    <div className="sticky-bar">
      <button
        type="button"
        className="btn-primary"
        onClick={() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
          document.getElementById(SEARCH_INPUT_ID)?.focus();
        }}
      >
        {t("profile.newAddress")}
      </button>
    </div>
  );
}
