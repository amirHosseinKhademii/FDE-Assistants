/**
 * All UI strings. `en` is the source of truth; `sv` must have every key.
 * Placeholders are written as {name} and filled by `translate`.
 */
export type Lang = "en" | "sv";

const en = {
  "brand": "Bostad",
  "nav.language": "Language",
  "nav.theme": "Theme",
  "theme.light": "Light",
  "theme.dark": "Dark",
  "theme.system": "System",

  "home.title": "Know the home before you bid.",
  "home.subtitle": "Everything public about a Gothenburg address — risks, transport, and the housing association — in plain words.",
  "home.examples": "Try an example",
  "home.getTitle": "What you'll get",
  "home.tile.ground": "Ground & landslide risk",
  "home.tile.transport": "Transport nearby",
  "home.tile.brf": "Housing association finances",
  "home.tile.energy": "Energy rating",
  "home.soon": "Soon",
  "home.footer": "Uses public data. Not financial or legal advice.",

  "search.label": "Address",
  "search.placeholder": "Type an address in Gothenburg",
  "search.submit": "Search",
  "search.empty": "Type an address in Gothenburg first.",
  "search.listLabel": "Address suggestions",
  "search.recent": "Recent",
  "search.example": "Example",

  "profile.newAddress": "New address",
  "profile.checkedNow": "Checked just now",
  "profile.checkedAgo": "Checked {when}",
  "profile.matchedAs": "Matched as",
  "profile.precision": "We couldn't find this exact address — showing the area around it. Risk and transport results are hidden.",
  "profile.footer": "Uses public data. Not financial or legal advice.",

  "summary.label.ground": "Ground",
  "summary.label.transport": "Transport",
  "summary.label.coverage": "Coverage",
  "summary.ground.ok": "Not in a landslide risk area",
  "summary.ground.risk": "Inside a landslide risk area",
  "summary.transport.walk": "Nearest stop {minutes} min walk",
  "summary.transport.none": "No stop within 500 m",
  "summary.notChecked": "Not checked",
  "summary.coverage": "{count} of {total} checks available",

  "status.checked": "Checked",
  "status.failed": "Couldn't check",
  "status.soon": "Coming soon",

  "reason.notExact": "Needs the exact address. We only matched the area.",
  "reason.noAddress": "We need a matched address to check this.",
  "reason.noMatch": "We couldn't find this address in the public map data. Check the spelling and try again.",
  "reason.sourceDown": "The source didn't answer. Try again in a moment.",
  "card.tryAgain": "Try again",
  "card.source": "Source: {name} · checked {time}",

  "card.ground.title": "Ground & landslide",
  "card.ground.explain": "Gothenburg is built on clay. Homes in a landslide risk area can be harder to insure and sell.",
  "card.ground.inArea": "In a landslide risk area",
  "card.ground.yes": "Yes",
  "card.ground.no": "No",
  "card.ground.zones": "Risk zones matched here: {count}",

  "card.transport.title": "Public transport",
  "card.transport.explain": "How far you walk to a tram or bus stop.",
  "mode.tram": "Tram",
  "mode.bus": "Bus",
  "mode.ferry": "Ferry",
  "mode.train": "Train",
  "transport.filter.label": "Filter by kind of transport",
  "transport.filter.all": "All",
  "transport.legend": "Legend",
  "transport.noDepartures": "No departures found for the next two hours.",
  "transport.moreLines": "+{count}",
  "summary.transport.byMode": "Nearest {list}",
  "summary.transport.modeMin": "{mode} {minutes} min",
  "card.transport.none": "No stops found within 500 m.",
  "card.transport.walk": "{minutes} min walk",
  "card.transport.meters": "{meters} m",

  "card.location.title": "Location",
  "card.location.explain": "Where we found this address.",
  "card.location.coords": "Coordinates",
  "card.location.openMaps": "Open in Google Maps",

  "card.brf.title": "Housing association (BRF)",
  "card.brf.explain": "Will show the association's debt, fees and planned renovations from its annual report — the biggest hidden cost of a flat.",
  "card.energy.title": "Energy rating",
  "card.energy.explain": "Will show the building's energy class (A–G) and whether radon and ventilation were checked.",
  "card.listings.title": "Homes for sale here",
  "card.listings.explain": "Will show listings at this address from broker systems.",
  "card.inspection.title": "Inspection",
  "card.inspection.explain": "Will summarise the inspection report and flag anything the listing doesn't mention.",
  "card.flood.title": "Flood, noise & radon",
  "card.flood.explain": "Will show flood risk, traffic noise and radon risk for the area.",

  "map.placeholder": "Map will appear once a Google Maps key is added.",
  "map.open": "Open in Google Maps",
  "map.loading": "Loading map",
  "map.house": "Your address",
  "map.walk": "{minutes} min walk ({meters} m)",

  "error.title": "Lookup failed",
  "error.tooMany": "Too many searches — wait a minute.",
  "error.badAddress": "Type an address in Gothenburg first.",
  "error.network": "Could not reach the server. Check your connection and try again.",
  "error.generic": "We couldn't look this up. Try again.",
  "error.retry": "Try again",

  "loading": "Looking up…",

  "source.sgi": "SGI",
  "source.vasttrafik": "Västtrafik",
  "source.osm": "OpenStreetMap",
  "source.photon": "Photon (OpenStreetMap)",
  "source.generic": "Public data",

  "doc.home": "Bostad — know the home before you bid",
  "doc.profile": "{address} — Bostad",
};

export type MessageKey = keyof typeof en;

// TODO: review Swedish. First draft, written without a native review.
const sv: Record<MessageKey, string> = {
  "brand": "Bostad",
  "nav.language": "Språk",
  "nav.theme": "Tema",
  "theme.light": "Ljust",
  "theme.dark": "Mörkt",
  "theme.system": "System",

  "home.title": "Känn till bostaden innan du bjuder.",
  "home.subtitle": "Allt offentligt om en adress i Göteborg — risker, kollektivtrafik och bostadsrättsföreningen — med enkla ord.",
  "home.examples": "Prova ett exempel",
  "home.getTitle": "Det här får du",
  "home.tile.ground": "Mark- & skredrisk",
  "home.tile.transport": "Kollektivtrafik nära",
  "home.tile.brf": "Bostadsrättsföreningens ekonomi",
  "home.tile.energy": "Energideklaration",
  "home.soon": "Snart",
  "home.footer": "Använder offentliga data. Inte finansiell eller juridisk rådgivning.",

  "search.label": "Adress",
  "search.placeholder": "Skriv en adress i Göteborg",
  "search.submit": "Sök",
  "search.empty": "Skriv en adress i Göteborg först.",
  "search.listLabel": "Adressförslag",
  "search.recent": "Senaste",
  "search.example": "Exempel",

  "profile.newAddress": "Ny adress",
  "profile.checkedNow": "Kontrollerad just nu",
  "profile.checkedAgo": "Kontrollerad {when}",
  "profile.matchedAs": "Matchad som",
  "profile.precision": "Vi hittade inte just den här adressen — visar området runt den. Resultat om risk och kollektivtrafik är dolda.",
  "profile.footer": "Använder offentliga data. Inte finansiell eller juridisk rådgivning.",

  "summary.label.ground": "Mark",
  "summary.label.transport": "Kollektivtrafik",
  "summary.label.coverage": "Täckning",
  "summary.ground.ok": "Inte i skredriskområde",
  "summary.ground.risk": "Inom skredriskområde",
  "summary.transport.walk": "Närmaste hållplats {minutes} min gång",
  "summary.transport.none": "Ingen hållplats inom 500 m",
  "summary.notChecked": "Inte kontrollerad",
  "summary.coverage": "{count} av {total} kontroller tillgängliga",

  "status.checked": "Kontrollerad",
  "status.failed": "Kunde inte kontrollera",
  "status.soon": "Kommer snart",

  "reason.notExact": "Kräver den exakta adressen. Vi hittade bara området.",
  "reason.noAddress": "Vi behöver en matchad adress för att kontrollera detta.",
  "reason.noMatch": "Vi hittade inte den här adressen i de offentliga kartdata. Kontrollera stavningen och försök igen.",
  "reason.sourceDown": "Källan svarade inte. Försök igen om en stund.",
  "card.tryAgain": "Försök igen",
  "card.source": "Källa: {name} · kontrollerad {time}",

  "card.ground.title": "Mark & skred",
  "card.ground.explain": "Göteborg bygger delvis på lera. Bostäder i skredriskområden kan vara svårare att försäkra och sälja.",
  "card.ground.inArea": "I skredriskområde",
  "card.ground.yes": "Ja",
  "card.ground.no": "Nej",
  "card.ground.zones": "Riskzoner som matchar här: {count}",

  "card.transport.title": "Kollektivtrafik",
  "card.transport.explain": "Hur långt du går till en spårvagns- eller busshållplats.",
  "mode.tram": "Spårvagn",
  "mode.bus": "Buss",
  "mode.ferry": "Färja",
  "mode.train": "Tåg",
  "transport.filter.label": "Filtrera efter typ av trafik",
  "transport.filter.all": "Alla",
  "transport.legend": "Förklaring",
  "transport.noDepartures": "Inga avgångar hittades de närmaste två timmarna.",
  "transport.moreLines": "+{count}",
  "summary.transport.byMode": "Närmaste {list}",
  "summary.transport.modeMin": "{mode} {minutes} min",
  "card.transport.none": "Inga hållplatser hittades inom 500 m.",
  "card.transport.walk": "{minutes} min gång",
  "card.transport.meters": "{meters} m",

  "card.location.title": "Plats",
  "card.location.explain": "Var vi hittade den här adressen.",
  "card.location.coords": "Koordinater",
  "card.location.openMaps": "Öppna i Google Maps",

  "card.brf.title": "Bostadsrättsförening (BRF)",
  "card.brf.explain": "Visar föreningens skulder, avgifter och planerade renoveringar från årsredovisningen — den största dolda kostnaden för en lägenhet.",
  "card.energy.title": "Energideklaration",
  "card.energy.explain": "Visar byggnadens energiklass (A–G) och om radon och ventilation har kontrollerats.",
  "card.listings.title": "Bostäder till salu här",
  "card.listings.explain": "Visar annonser för den här adressen från mäklarsystem.",
  "card.inspection.title": "Besiktning",
  "card.inspection.explain": "Sammanfattar besiktningsprotokollet och flaggar det som annonsen inte nämner.",
  "card.flood.title": "Översvämning, buller & radon",
  "card.flood.explain": "Visar översvämningsrisk, trafikbuller och radonrisk för området.",

  "map.placeholder": "Kartan visas när en Google Maps-nyckel har lagts till.",
  "map.open": "Öppna i Google Maps",
  "map.loading": "Laddar karta",
  "map.house": "Din adress",
  "map.walk": "{minutes} min till fots ({meters} m)",

  "error.title": "Sökningen misslyckades",
  "error.tooMany": "För många sökningar — vänta en minut.",
  "error.badAddress": "Skriv en adress i Göteborg först.",
  "error.network": "Kunde inte nå servern. Kontrollera anslutningen och försök igen.",
  "error.generic": "Vi kunde inte slå upp adressen. Försök igen.",
  "error.retry": "Försök igen",

  "loading": "Söker…",

  "source.sgi": "SGI",
  "source.vasttrafik": "Västtrafik",
  "source.osm": "OpenStreetMap",
  "source.photon": "Photon (OpenStreetMap)",
  "source.generic": "Offentliga data",

  "doc.home": "Bostad — känn till bostaden innan du bjuder",
  "doc.profile": "{address} — Bostad",
};

export const dictionaries: Record<Lang, Record<MessageKey, string>> = { en, sv };

export const LANGS: Lang[] = ["en", "sv"];

export function translate(lang: Lang, key: MessageKey, vars?: Record<string, string | number>): string {
  const raw = dictionaries[lang][key] ?? en[key];
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}

const STORAGE_KEY = "bostad.lang";

/** The saved language, or null. Storage can be blocked, so every access is guarded. */
export function readStoredLang(): Lang | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "en" || value === "sv" ? value : null;
  } catch {
    return null;
  }
}

export function storeLang(lang: Lang): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* private window or blocked storage: the choice lasts for this page only */
  }
}
