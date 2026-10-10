import { useEffect, useState } from "react";
import { useLang } from "../lib/lang";
import { clearRecents, readRecents, removeRecent, type RecentSearch } from "../lib/recents";
import { localeOf } from "../lib/format";

/** "2 h ago", "yesterday": relative to now, in the page language. */
function ago(at: number, lang: "en" | "sv", now: number = Date.now()): string {
  const rtf = new Intl.RelativeTimeFormat(localeOf(lang), { numeric: "auto" });
  const minutes = Math.round((at - now) / 60000);
  if (Math.abs(minutes) < 1) return rtf.format(0, "minute");
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  return rtf.format(Math.round(hours / 24), "day");
}

/**
 * The last searches on the landing page: newest first, each one tap to open.
 * Removing one is ×; "Clear all" asks first. Reads localStorage after mount.
 */
export function RecentSearches({ onOpen }: { onOpen: (address: string) => void }) {
  const { t, lang } = useLang();
  // Read after mount: the server has no localStorage, so the first render must match it.
  const [items, setItems] = useState<RecentSearch[]>([]);
  useEffect(() => setItems(readRecents()), []);

  const remove = (address: string) => {
    removeRecent(address);
    setItems(readRecents());
  };
  const clear = () => {
    if (!window.confirm(t("recent.clearConfirm"))) return;
    clearRecents();
    setItems([]);
  };

  return (
    <section className="recents" aria-labelledby="recents-title">
      <div className="recents-head">
        <h2 id="recents-title">{t("recent.title")}</h2>
        {items.length > 0 && (
          <button type="button" className="link-button" onClick={clear}>
            {t("recent.clear")}
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="muted">{t("recent.empty")}</p>
      ) : (
        <ul className="recent-list">
          {items.map((r) => {
            const meta = [r.district, ago(r.at, lang)].filter(Boolean).join(" · ");
            return (
              <li key={r.address} className="recent-row">
                <button type="button" className="recent-open" onClick={() => onOpen(r.address)}>
                  <span className="recent-address">{r.address}</span>
                  <span className="recent-meta">{meta}</span>
                  {r.quick && <span className="recent-quick">{r.quick}</span>}
                </button>
                <button
                  type="button"
                  className="recent-remove"
                  aria-label={t("recent.remove", { address: r.address })}
                  onClick={() => remove(r.address)}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
