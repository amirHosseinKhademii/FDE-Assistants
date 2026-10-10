/**
 * The phone's search, as a round icon over the map. Tap it and it widens into the
 * full address box (autofocused), with the suggestions below and a × to cancel.
 * A suggestion or Enter runs the search and the box folds back to the icon.
 * Esc and a tap outside also fold it back. The wrapper is transparent and passes
 * touches through; only the icon and the open box take them.
 */
import { useEffect, useRef, useState } from "react";
import { useLang } from "../lib/lang";
import { Icon } from "./Icons";
import { SearchBox } from "./SearchBox";

export function FloatingSearch({ address, onSearch, onOpenChange }: { address: string; onSearch: (address: string) => void; onOpenChange?: (open: boolean) => void }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => onOpenChange?.(open), [open, onOpenChange]);

  // Focus the box once it has widened; Esc and a tap outside fold it back.
  useEffect(() => {
    if (!open) return;
    document.getElementById("address-search")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <div ref={wrap} className={`float-search${open ? " is-open" : ""}`}>
      {open ? (
        <>
          <div className="float-search-box">
            <SearchBox
              initial={address}
              onSearch={(next) => {
                setOpen(false);
                onSearch(next);
              }}
              compact
            />
          </div>
          <button type="button" className="float-search-cancel" aria-label={t("search.cancel")} onClick={() => setOpen(false)}>
            <span aria-hidden="true">×</span>
          </button>
        </>
      ) : (
        <button type="button" className="float-search-btn" aria-label={t("search.open")} aria-expanded={false} onClick={() => setOpen(true)}>
          <Icon name="search" />
        </button>
      )}
    </div>
  );
}
