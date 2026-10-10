/**
 * The address input with its suggestion list (a combobox). Without Places it
 * still offers recent searches and the examples on focus. With Places it adds
 * live suggestions: Places API (New) AutocompleteSuggestion, Sweden only,
 * biased to Gothenburg, one session token per selection, 120 ms debounce,
 * two characters to start, an in-memory cache, and stale responses dropped.
 */
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { useLang } from "../lib/lang";
import type { MessageKey } from "../lib/i18n";
import { GOTHENBURG_BIAS } from "../lib/maps";
import { readRecents } from "../lib/recents";

type Range = { startOffset: number; endOffset: number };
type Option = {
  key: string;
  main: string;
  ranges: Range[];
  /** A translated label (recent / example), or the Places secondary line. */
  secondaryKey?: MessageKey;
  secondary?: string;
  /** The full address that is searched when this row is picked. */
  value: string;
};

const MIN_CHARS = 2;
const DEBOUNCE_MS = 120;
const MAX_SUGGESTIONS = 5;
const CACHE_MAX = 40;
const LIST_ID = "address-suggest";

type Places = google.maps.PlacesLibrary;

export type AddressInputProps = {
  inputId: string;
  value: string;
  placeholder: string;
  maxLength: number;
  invalid?: boolean;
  describedBy?: string;
  onChange: (value: string) => void;
  onPick: (address: string) => void;
  places: Places | null;
};

/** Reads the Places library once it has loaded; null until then (and without a key). */
export function MapsAddressInput(props: Omit<AddressInputProps, "places">) {
  const places = useMapsLibrary("places");
  return <AddressInput {...props} places={places ?? null} />;
}

export function AddressInput({
  inputId,
  value,
  placeholder,
  maxLength,
  invalid,
  describedBy,
  onChange,
  onPick,
  places,
}: AddressInputProps) {
  const { t } = useLang();
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [items, setItems] = useState<Option[]>([]);
  const [active, setActive] = useState(-1);

  const seq = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const token = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const cache = useRef(new Map<string, Option[]>());

  const open = focused && !dismissed && items.length > 0;
  const activeId = open && active >= 0 ? `${LIST_ID}-${active}` : undefined;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // The Places library may finish loading after the user has already typed; ask once it arrives.
  useEffect(() => {
    if (places && focused && value.trim().length >= MIN_CHARS && items.length === 0) {
      fetchSuggestions(value.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places]);

  /** Recent searches: what a focused, empty box offers. */
  function idleItems(): Option[] {
    return readRecents().map((r) => ({
      key: `recent:${r.address}`,
      main: r.address,
      ranges: [],
      secondaryKey: "search.recent",
      value: r.address,
    }));
  }

  function fetchSuggestions(query: string) {
    if (!places) return;
    const key = query.toLocaleLowerCase("sv");
    const id = ++seq.current;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      try {
        if (!token.current) token.current = new places.AutocompleteSessionToken();
        const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          sessionToken: token.current,
          includedRegionCodes: ["se"],
          locationBias: GOTHENBURG_BIAS,
          includedPrimaryTypes: ["street_address", "premise", "subpremise", "route"],
        });
        if (id !== seq.current) return;
        const next: Option[] = [];
        for (const s of suggestions) {
          const p = s.placePrediction;
          if (!p) continue;
          const full = p.text.text;
          next.push({
            key: p.placeId,
            main: p.mainText?.text ?? full,
            ranges: p.mainText?.matches ?? [],
            secondary: p.secondaryText?.text ?? undefined,
            value: full,
          });
          if (next.length === MAX_SUGGESTIONS) break;
        }
        if (cache.current.size >= CACHE_MAX) cache.current.delete(cache.current.keys().next().value as string);
        cache.current.set(key, next);
        setItems(next);
        setActive(-1);
      } catch {
        if (id === seq.current) setItems([]);
      }
    }, DEBOUNCE_MS);
  }

  function handleChange(next: string) {
    onChange(next);
    setDismissed(false);
    setActive(-1);
    seq.current++; // anything still in flight is now stale
    window.clearTimeout(timer.current);
    const query = next.trim();
    if (query.length === 0) {
      setItems(focused ? idleItems() : []);
      return;
    }
    if (query.length < MIN_CHARS || !places) {
      setItems([]);
      return;
    }
    const hit = cache.current.get(query.toLocaleLowerCase("sv"));
    if (hit) {
      setItems(hit);
      return;
    }
    fetchSuggestions(query);
  }

  function pick(option: Option) {
    window.clearTimeout(timer.current);
    seq.current++;
    setItems([]);
    setActive(-1);
    setDismissed(true);
    token.current = null; // a selection ends the billing session
    onPick(option.value);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (items.length === 0) return;
      e.preventDefault();
      setDismissed(false);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => (a + step + items.length) % items.length);
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setDismissed(true);
        setActive(-1);
      }
    } else if (e.key === "Enter" && open) {
      if (active >= 0) {
        e.preventDefault(); // the row, not the form, takes this Enter
        pick(items[active]);
      } else {
        setDismissed(true); // the form submits what is typed; close the list
      }
    }
  }

  return (
    <div className="combo">
      <input
        id={inputId}
        name="address"
        type="text"
        role="combobox"
        autoComplete="off"
        autoCapitalize="words"
        spellCheck={false}
        enterKeyHint="search"
        placeholder={placeholder}
        maxLength={maxLength}
        value={value}
        aria-expanded={open}
        aria-controls={LIST_ID}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => {
          setFocused(true);
          setDismissed(false);
          if (value.trim() === "") setItems(idleItems());
        }}
        onBlur={() => {
          setFocused(false);
          setActive(-1);
        }}
        onKeyDown={onKeyDown}
      />
      <ul
        id={LIST_ID}
        role="listbox"
        aria-label={t("search.listLabel")}
        className="place-suggest"
        hidden={!open}
        onMouseDown={(e) => e.preventDefault()} // keeps focus in the input
      >
        {items.map((option, i) => (
          <li
            key={option.key}
            id={`${LIST_ID}-${i}`}
            role="option"
            aria-selected={i === active}
            className={i === active ? "is-active" : undefined}
            onClick={() => pick(option)}
          >
            <span className="sugg-main">{highlight(option.main, option.ranges)}</span>
            {(option.secondaryKey || option.secondary) && (
              <span className="sugg-sub">{option.secondaryKey ? t(option.secondaryKey) : option.secondary}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Wraps the matched ranges in <mark>. Without ranges, plain text. */
function highlight(text: string, ranges: Range[]) {
  if (ranges.length === 0) return text;
  const parts: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((r, i) => {
    if (r.startOffset > cursor) parts.push(text.slice(cursor, r.startOffset));
    parts.push(<mark key={i}>{text.slice(r.startOffset, r.endOffset)}</mark>);
    cursor = r.endOffset;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}
