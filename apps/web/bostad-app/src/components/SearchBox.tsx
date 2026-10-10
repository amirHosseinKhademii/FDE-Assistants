import { useEffect, useState, type FormEvent } from "react";
import { useLang } from "../lib/lang";
import { ADDRESS_MAX_LENGTH } from "../lib/address";
import { HAS_MAPS_KEY } from "../lib/maps";
import { Icon } from "./Icons";
import { PlacesAutocomplete } from "./PlacesAutocomplete";

export const SEARCH_INPUT_ID = "address-search";

/**
 * The address box. An empty submit shows a hint and makes no request. `initial`
 * follows the URL, so a shared link fills the box it was opened with.
 */
export function SearchBox({
  initial,
  onSearch,
  compact = false,
}: {
  initial: string;
  onSearch: (address: string) => void;
  compact?: boolean;
}) {
  const { t } = useLang();
  const [value, setValue] = useState(initial);
  const [empty, setEmpty] = useState(false);

  useEffect(() => setValue(initial), [initial]);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setEmpty(true);
      return;
    }
    setEmpty(false);
    onSearch(trimmed);
  }

  return (
    <form className={`search${compact ? " compact" : ""}`} role="search" onSubmit={submit}>
      <label className="sr-only" htmlFor={SEARCH_INPUT_ID}>
        {t("search.label")}
      </label>
      <input
        id={SEARCH_INPUT_ID}
        name="address"
        type="text"
        autoComplete="off"
        enterKeyHint="search"
        placeholder={t("search.placeholder")}
        maxLength={ADDRESS_MAX_LENGTH}
        value={value}
        aria-invalid={empty || undefined}
        aria-describedby={empty ? `${SEARCH_INPUT_ID}-hint` : undefined}
        onChange={(e) => {
          setValue(e.target.value);
          if (empty) setEmpty(false);
        }}
      />
      {HAS_MAPS_KEY && (
        <PlacesAutocomplete
          inputId={SEARCH_INPUT_ID}
          value={value}
          onPlace={(address) => {
            setValue(address);
            setEmpty(false);
            onSearch(address);
          }}
        />
      )}
      <button type="submit" className="btn-primary" aria-label={t("search.submit")}>
        {compact ? <Icon name="search" /> : t("search.submit")}
      </button>
      {empty && (
        <p id={`${SEARCH_INPUT_ID}-hint`} className="hint" role="alert" style={{ flexBasis: "100%" }}>
          {t("search.empty")}
        </p>
      )}
    </form>
  );
}
