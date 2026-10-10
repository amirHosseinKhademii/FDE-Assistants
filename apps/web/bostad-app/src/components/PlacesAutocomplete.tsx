import { useEffect, useRef, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { GOTHENBURG_BOUNDS } from "../lib/maps";

type Suggestion = { id: string; text: string };

/**
 * Address suggestions from Places API (New), via AutocompleteSuggestion. The
 * legacy google.maps.places.Autocomplete widget is not enabled for this key's
 * project, so it is not used. Restricted to Sweden, biased to Gothenburg.
 * Picking a suggestion (click, or Enter on the highlighted row) calls onPlace
 * with the full address. Renders the list under the input; no list, no request.
 */
export function PlacesAutocomplete({
  inputId,
  value,
  onPlace,
}: {
  inputId: string;
  value: string;
  onPlace: (address: string) => void;
}) {
  const places = useMapsLibrary("places");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(-1);
  const requestSeq = useRef(0);
  const onPlaceRef = useRef(onPlace);
  const itemsRef = useRef<Suggestion[]>([]);
  const activeRef = useRef(-1);

  useEffect(() => {
    onPlaceRef.current = onPlace;
  }, [onPlace]);

  useEffect(() => {
    itemsRef.current = items;
    activeRef.current = active;
  }, [items, active]);

  // Fetch suggestions as the user types (debounced; stale responses dropped).
  useEffect(() => {
    if (!places) return;
    const query = value.trim();
    if (query.length < 3) {
      setItems([]);
      setActive(-1);
      return;
    }
    const seq = ++requestSeq.current;
    const timer = window.setTimeout(async () => {
      // Only a focused input asks for suggestions; a pre-filled value does not.
      if (document.activeElement?.id !== inputId) return;
      try {
        const bounds = new google.maps.LatLngBounds(
          { lat: GOTHENBURG_BOUNDS.south, lng: GOTHENBURG_BOUNDS.west },
          { lat: GOTHENBURG_BOUNDS.north, lng: GOTHENBURG_BOUNDS.east },
        );
        const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          includedRegionCodes: ["se"],
          locationBias: bounds,
          includedPrimaryTypes: ["street_address", "premise", "subpremise"],
        });
        if (seq !== requestSeq.current) return;
        const next: Suggestion[] = [];
        for (const s of suggestions) {
          const p = s.placePrediction;
          if (p) next.push({ id: p.placeId, text: p.text.toString() });
        }
        setItems(next.slice(0, 5));
        setActive(-1);
      } catch {
        if (seq === requestSeq.current) setItems([]);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [places, value, inputId]);

  // Keyboard: arrows move, Enter takes the highlighted row, Escape closes.
  useEffect(() => {
    const input = document.getElementById(inputId);
    if (!input) return;
    const onKey = (e: KeyboardEvent) => {
      const list = itemsRef.current;
      if (list.length === 0) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : -1;
        setActive((a) => (a + step + list.length) % list.length);
      } else if (e.key === "Escape") {
        setItems([]);
      } else if (e.key === "Enter" && activeRef.current >= 0) {
        e.preventDefault();
        onPlaceRef.current(list[activeRef.current].text);
        setItems([]);
      }
    };
    const onBlur = () => setItems([]);
    input.addEventListener("keydown", onKey);
    input.addEventListener("blur", onBlur);
    return () => {
      input.removeEventListener("keydown", onKey);
      input.removeEventListener("blur", onBlur);
    };
  }, [inputId]);

  if (items.length === 0) return null;

  return (
    <ul className="place-suggest" role="listbox" aria-label="Address suggestions">
      {items.map((item, i) => (
        <li key={item.id} role="option" aria-selected={i === active}>
          <button
            type="button"
            className={i === active ? "is-active" : undefined}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onPlaceRef.current(item.text);
              setItems([]);
            }}
          >
            {item.text}
          </button>
        </li>
      ))}
    </ul>
  );
}
