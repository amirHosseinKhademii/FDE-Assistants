# Bostad — UI plan (v1, 2026-10-10)

Decisions made by the learner:
- **Map:** Google Maps (learner is getting a key). Build against it now; if the key is missing, show a calm placeholder card — never a crash.
- **Language:** English first, with an EN / SV toggle.
- **Planned features without data:** show as "Coming soon" cards with a one-line plain explanation.
- **Style:** Calm Nordic — light, airy, soft neutrals, one accent, big clear type. Feels like a good bank app.

Product line (hero): **"Know the home before you bid."**
Sub-line: "Everything public about a Gothenburg address — risks, transport, and the housing association — in plain words."

## 1. Principles
1. **Mobile first.** Design at 375 px wide, then widen. No horizontal scroll ever. 16 px side gutter.
2. **Plain and short.** Every data point has one sentence saying what it means for a buyer. No jargon without a translation ("BRF = the housing association that owns the building").
3. **Honest.** Every card shows where the data came from and when. If we couldn't check, say so. If something is coming, say what it will tell you.
4. **Calm.** One accent colour. Status uses colour *and* a word (never colour alone).
5. **Fast feeling.** Skeleton cards while loading; the map appears first.

## 2. Design tokens (CSS custom properties in `src/styles/tokens.css`)
| Token | Value | Use |
|---|---|---|
| `--bg` | `#F7F6F3` | page background (warm off-white) |
| `--surface` | `#FFFFFF` | cards |
| `--surface-2` | `#EFEDE8` | chips, skeletons |
| `--text` | `#1E2328` | body text |
| `--muted` | `#5F6670` | secondary text (AA on both surfaces) |
| `--line` | `#E3E0DA` | borders |
| `--accent` | `#2F6F62` | pine green — buttons, links, house marker |
| `--accent-soft` | `#E3EFEC` | accent backgrounds |
| `--ok` | `#2F7D4F` | "Low risk" etc. |
| `--warn` | `#A86A12` | "Check this" |
| `--risk` | `#B4443C` | "In risk area" |
| `--soon` | `#6B6F8A` | "Coming soon" |
- Font: system stack (`-apple-system, "Segoe UI", Inter, Roboto, sans-serif`). Sizes: 28/22/17/15/13. Line height 1.45.
- Radius 16 (cards), 999 (pills, chips). Spacing on an 8 px grid. Shadow: `0 1px 2px rgba(0,0,0,.04), 0 4px 16px rgba(0,0,0,.04)`.
- Tap targets ≥ 44 px. Visible focus ring (2 px `--accent`). Respect `prefers-reduced-motion`.
- Follow the styling conventions of `apps/web/steering-app` (plain CSS files; check docs/SITE.md for which layer may use Tailwind — do not add Tailwind here unless steering-app does).

## 3. Screens

### 3.1 Home (`/`)
- Top bar: wordmark "Bostad" (left), EN | SV toggle (right).
- Hero: headline + sub-line (above).
- **Search box** (full width, 52 px tall, rounded): placeholder "Type an address in Gothenburg". With a Google key: Google Places Autocomplete restricted to Sweden, biased to Gothenburg. Without key: plain input → our `/api/profile`.
- Three example chips under it: "Djurgårdsgatan 23 A", "Linnégatan 1", "Kungsportsavenyen 10" → tap runs the search.
- "What you'll get" row: 4 small tiles with icon + 3 words each — Ground & landslide risk · Transport nearby · Housing association finances (soon) · Energy rating (soon).
- Footer line: "Uses public data. Not financial or legal advice."
- Navigating to a profile uses the URL `/?address=...` (or `/p?address=...`) so links are shareable.

### 3.2 Property profile (same page, after search)
Order top to bottom on mobile:
1. **Map** (45 vh, rounded bottom corners). House marker (accent, larger). Transit stops as small markers; tapping a stop opens an info bubble: stop name + "4 min walk (290 m)". Fit bounds to house + stops. Muted map style (reduce POI clutter).
2. **Address header**: the address as typed, then the matched address in muted text, then "Checked just now" (relative time).
3. **Precision warning** (only if the geocoder matched only a street/area/city): amber banner "We couldn't find this exact address — showing the area around it. Risk and transport results are hidden." and hide those cards' data.
4. **Quick summary strip** (horizontal scroll of 3 chips allowed *inside* the strip only): 
   - Ground: "Not in a landslide risk area" (ok) / "Inside a landslide risk area" (risk)
   - Transport: "Nearest stop 1 min walk"
   - Coverage: "3 of 8 checks available"
5. **Cards**, each collapsible (open by default for available ones):
   | Card | Status now | What it shows | Plain explanation (EN) |
   |---|---|---|---|
   | Ground & landslide | Checked | yes/no in SGI risk area; number of zones nearby | "Gothenburg is built on clay. Homes in a landslide risk area can be harder to insure and sell." |
   | Public transport | Checked | 5 nearest stops: name, walk minutes (distance ÷ 80 m/min, round up), metres | "How far you walk to a tram or bus stop." |
   | Location | Checked | coordinates, district if available, "Open in Google Maps" link | "Where we found this address." |
   | Housing association (BRF) | Coming soon | — | "Will show the association's debt, fees and planned renovations from its annual report — the biggest hidden cost of a flat." |
   | Energy rating | Coming soon | — | "Will show the building's energy class (A–G) and whether radon and ventilation were checked." |
   | Homes for sale here | Coming soon | — | "Will show listings at this address from broker systems." |
   | Inspection | Coming soon | — | "Will summarise the inspection report and flag anything the listing doesn't mention." |
   | Flood, noise & radon | Coming soon | — | "Will show flood risk, traffic noise and radon risk for the area." |
   Each card: icon, title, status pill (Checked / Couldn't check / Coming soon), the plain sentence, the data, and a small footer "Source: SGI · checked 14:02" linking to the source URL.
   "Couldn't check" shows the reason in plain words and a "Try again" button.
6. **Sticky bottom bar** on mobile: "New address" button (focuses search).

### 3.3 Desktop (≥ 960 px)
Two columns: map left (sticky, full height), cards right (max 520 px, scrolling).

### 3.4 States
- Loading: map placeholder shimmer + 3 skeleton cards.
- Error (API down / 429): friendly message + retry; 429 says "Too many searches — wait a minute."
- Empty search: inline hint, no request.

## 4. Language
- `src/lib/i18n.ts`: a typed dictionary `{ en: {...}, sv: {...} }` and `t(key)`. All UI strings go through it.
- Swedish strings: write a first draft; add `// TODO: review Swedish` once at the top of the sv block.
- Toggle persists in `localStorage` (wrapped in try/catch); default English.

## 5. Data needed from `@bostad/property` (small changes in packages/bostad)
- Transit stops must include `lat`/`lon` (from the Västtrafik v4 response) for map markers.
- Geocode result must include a `precision` field: `"address" | "street" | "area"` (Nominatim `addresstype`/`type`; Photon `type`). The app hides risk/transport when precision is not `"address"`.
- Keep section shape `{status, data?, source, fetchedAt, reason?}`.

## 6. Google Maps
- Library: `@vis.gl/react-google-maps` (pin an exact version). Load Maps JavaScript API + Places.
- Key: `VITE_GOOGLE_MAPS_API_KEY` from `project-a/.env` (exposed to the browser by design — the learner must restrict it in Google Cloud to HTTP referrer `http://localhost:3600/*` and to the Maps JavaScript + Places APIs).
- Missing key → placeholder card: "Map will appear once a Google Maps key is added" + an "Open in Google Maps" link built from coordinates (`https://www.google.com/maps/search/?api=1&query=lat,lon`).

## 7. Out of scope for v1
Accounts, saved homes, real BRF/energy/listing data, deploy workflow changes, dark mode.

## 8. Done means
- 375 px and 1280 px screenshots look right (no overflow, tap targets ok).
- typecheck + build for `@bostad/app` and `@bostad/property`, `pnpm leak:check` pass.
- Dev server running on 127.0.0.1:3600; `/` and `/api/profile?address=Djurgårdsgatan%2023%20A,%20Göteborg` return 200.

---

# v2 additions (2026-10-10, after learner feedback)

## Done since v1
| Item | Commit |
|---|---|
| Google map, Places suggestions, layout fixes | 0ea2957 |
| Dark theme (Light / Dark / System toggle, dark map style) | 5453fa4 |
| Faster suggestions: Places (New) `fetchAutocompleteSuggestions`, session token, 120 ms debounce, stale-drop, cache, recents, keyboard, highlight (~290 ms to list) | 5453fa4 |
| Transport modes: tram / bus / ferry / train markers (theme-aware), "+" for multi-mode, legend, InfoWindow line badges in Västtrafik colours, filter chips shared by card + map, summary "Nearest bus 2 min · tram 4 min" | 7805e87 |

## Bugs / hardening (next)
1. **Crash `stop.modes is not iterable`** (`transport.ts:81` via `GoogleMap.tsx:131`) when a profile from an older server/cache has stops without `modes`/`lines`. Fix: normalise the API response once on the client (`modes ?? []`, `lines ?? []`, every array field defaulted) and add a schema version to cached/recents data so stale shapes are dropped. Map must never take the page down — wrap MapPanel in its own error boundary with the placeholder as fallback.
2. One 404 in the console on mobile-light load — find and fix.
3. Dev workflow: after changing `packages/bostad`, it must be rebuilt (app consumes `dist/`) — add a `dev` watch (`tsc -w`) or make the app import source, so the running server never serves stale package code.

## New cards (data researched in proptech-sweden/research/07 + 08)
Card order on the profile: Ground & landslide · **Noise** · Public transport · **Neighbourhood** · **Safety** · Location · Housing association (soon) · Energy (soon) · Homes for sale (soon) · Inspection (soon) · Flood & radon (soon).
Coverage chip counts real checks only.

### Noise (Checked) — Göteborg Miljöförvaltningen 2023, free WFS
- Source: `https://geoserverextern.miljoforvaltningen.goteborg.se/geoserver/miljoovervakning_buller_v1/ows`, layers `…:interna_berakningar_trafikbuller_2023_fasadpunkter` (facade points: `nivå_bott`, `nivå_takv`, `lägst_niv`, `vån_lägs`, `högst_niv`, `vån_högs`, `antal_vån`) and `…:interna_berakningar_trafikbuller_2023_LAeq_v1` (contours `min`/`max`).
- Shows: "Road and tram noise at the building: ~43 dB at street level, ~50 dB at the top floor (6)." + a bar against the guideline **55 dB at the facade** (ok below, warn above). Plain line: "Traffic noise at the building's walls. Swedish guidance for homes is 55 dB or less." Caveat line from the city: "A rough estimate — not a detailed noise study."
- Summary chip: "Noise: Quiet / Moderate / Loud" (<50 / 50–55 / >55 dB at the loudest facade point of the nearest building).
- Attribution: "Göteborgs Stad, Miljöförvaltningen — trafikbullerberäkning 2023". Licence unverified (layers named "interna_beräkningar") — note in code; ask the city before commercial launch.

### Neighbourhood (Checked)
- District + primary area: `https://geodata-external.sbk.goteborg.se/services/slk-administrativ-indelning-v2/wfs`, `…:stadsomraden` and `…:primaromraden` (point-in-polygon, not bbox).
- Income + population: SCB DeSO (WFS `geodata.scb.se/geoserver/stat/wfs` layer `stat:DeSO_2025` → DeSO code; PxWeb `HE0110I` median net income, code suffix `_DeSO2025`). Show "Median income here: 349 000 kr/yr · Gothenburg: N".
- Everyday places within 500 m via OSM Overpass (with User-Agent): supermarkets, pharmacies, schools/preschools, parks, healthcare — counts + nearest with walk minutes; optional map toggle "Show places".
- Schools: Skolverket planned-educations API (school units near the point, type). No ratings.

### Safety (Checked, district level) — separate task, needs a yearly BRÅ export
- BRÅ reported crimes by Göteborg stadsområde (Centrum / Hisingen / Nordost / Sydväst), yearly, from `statistik.bra.se/solwebb` table builder → committed CSV `packages/bostad/data/bra-goteborg-stadsomraden.csv` (year, district, crime type, count, per 1 000) with source + export date.
- Show per 1 000 residents **next to the city average**, for: all reported crimes, residential burglary, car theft. Wording: "reported crimes", district level only, year shown, neutral colours (no red maps).
- Police "utsatta områden": neutral note if the primary area is on the current list (Polisen lägesbild Dec 2025) — needs boundaries/names confirmed first.
- Plain line: "Reported crimes in the district, compared with the city. Reporting rates differ between areas."

### Still "Coming soon"
BRF finances (Bolagsverket paid API, ~40 kr/report), Energy (Boverket — awaiting reply), Homes for sale (Vitec/Mspecs — awaiting reply), Inspection (broker/inspector partner), Flood & radon (MSB/Länsstyrelsen flood maps, SGU radon — not yet researched in depth).

## Later (not built)
- Compare two addresses side by side; save homes (needs accounts).
- Share link preview image.
- Swedish copy review by a native speaker.

---

# v3 — Map redesign (learner feedback 2026-10-10: "map can be much better and mobile friendly, dark mode better, transport icons not centred and weird")

Reference feel: Apple Maps / Google Maps mobile — the map is the hero, content slides over it.

## Rendering
- Switch to **Advanced Markers** (`AdvancedMarker` from @vis.gl/react-google-maps) with HTML/React content → crisp, perfectly centred icons. Requires a `mapId`: use `DEMO_MAP_ID` for local dev, read `VITE_GOOGLE_MAPS_MAP_ID` if set (learner can create a vector Map ID later in Google Cloud → Map Management).
- **Dark mode via `colorScheme`** (`ColorScheme.DARK` / `LIGHT`, following the app's effective theme, switching live) instead of a hand-written styles array. Remove the old `styles` arrays (not allowed with mapId).
- Hide default Google controls except attribution/terms (`disableDefaultUI`), keep pinch/scroll zoom.

## Markers
- **Home:** 44 px round pin in `--accent`, white house pictogram 20 px centred (flex center, no baseline offset), 3 px ring in `--surface`, soft shadow, slow pulse ring (disabled under prefers-reduced-motion). Always on top (zIndex).
- **Stops:** 32 px circle in the mode colour, white 18 px pictogram centred with `display:grid; place-items:center` and the SVG `viewBox` tight to the glyph (no padding offset), 2 px ring in `--surface`, shadow. Multi-mode stops: primary mode circle + a small 14 px secondary badge at bottom-right (not a "+" dot). Anchor at the circle centre (`anchorTop/Left` or translate −50%,−50%).
- Pictograms redrawn as one consistent set (same stroke width, rounded joins, 24×24 grid): tram, bus, ferry, train, home, plus places (cart, pill, school, tree, cross) for the Neighbourhood layer.
- **Selected stop:** scales to 1.15, ring becomes `--text`, and a name label chip appears above it.
- Zoom-dependent: below zoom 14 show stops as 12 px dots; ≥ 14 full icons. Collision: `collisionBehavior: OPTIONAL_AND_HIDES_LOWER_PRIORITY` for stops, `REQUIRED` for home.
- **Walking rings:** dashed circles around home at 400 m (≈5 min) and 800 m (≈10 min) with small "5 min" / "10 min" labels — subtle, theme-aware.

## Mobile layout (< 960 px)
- Map 55 vh on load, full-bleed (no side margins, no rounded top). Content cards in a **bottom sheet** that overlaps the map's bottom edge by 24 px with a grab handle; dragging/scrolling up moves the sheet over the map (simple version: sheet is the scroll container starting at 55 vh; map stays fixed behind it).
- **Expand button** (top-right, 44 px round, surface colour) → fullscreen map (100 dvh) with `gestureHandling: 'greedy'`; close button returns. Inline map uses `cooperative`.
- **Recenter button** (bottom-right, 44 px) → fit home + visible stops.
- **Layer chips overlaid at the top of the map** (horizontal scroll inside the chip row only): Transport · Places · Noise (Noise = shade the LAeq contour polygon containing the home / facade points of the home building as small dB dots, if cheap). These replace the "Legend" button; each transport chip shows its colour + icon, so it *is* the legend. Chips stay in sync with the transport card filters.
- **Tapping a stop** on mobile opens an in-map **mini card** pinned to the bottom of the map (not a Google InfoWindow): mode icons, stop name, "4 min walk · 289 m", line badges (Västtrafik colours), "Directions" link (Google Maps walking directions from home to the stop). Tap elsewhere closes it.
- Desktop keeps the two-column layout; the mini card appears as a floating card at the bottom-left of the map.

## Dark mode details
- Map `colorScheme` DARK; marker rings use `--surface` dark value so they don't glow; chips/mini card/buttons use tokens; shadows softer (`rgba(0,0,0,.4)`), never white halos.
- Check contrast of line badges whose Västtrafik background is very dark on the dark map — add a 1 px `--line` border to badges in dark.

## Done means
- Screenshots 375 light, 375 dark, 375 fullscreen map dark with a stop selected, 1280 light, 1280 dark: icons visibly centred (check by zooming the PNG), no overlap with Google attribution, tap targets ≥ 44 px.
- No console errors; typecheck/build/leak:check pass.

---

# v4 — Buy | Rent (research: proptech-sweden/research/09-rent.md)

## Navigation
- Segmented control **Buy | Rent** under the top bar (persists in URL: `?mode=rent`). Same search box; placeholder in Rent: "Area or address to rent in".
- Area cards (map, landslide, noise, transport, neighbourhood, safety) are shared by both modes.

## Rent mode
1. **Rentals on the map**: pins for available rentals within ~1.5 km of the searched point (or in the searched district). Pin = rent label chip ("6 718 kr"); tap → mini card (same pattern as stops): rent, m², rooms, floor, kr/m²/month vs area average, "First-hand · Boplats queue", publish date, **"View on Boplats"** link (always link back; we never host the listing).
2. **Rentals list card** (below summary): sort by distance / rent / newest; filters rooms, max rent. Empty state explains sources.
3. **Source v1 = Boplats Väst first-hand** (`https://boplats.se/sok?types=1hand`, public, server-rendered): server-side fetch on demand, parse facts only (area, address, rent, m², rooms, floor, publish date, link), geocode addresses (cache), **no long-term storage, no photos/descriptions**, ≤1 fetch per 10 min (in-memory cache), User-Agent identifying the app. Label everything "Source: Boplats Väst". Learner is asking Boplats for permission/feed. Qasa/HomeQ = "coming soon" until partnerships.
4. **Renter tools card** (collapsible sections):
   - **Fair rent check (second-hand)**: inputs market value (kr), monthly avgift, other monthly costs, furnished yes/no → capital cost = value × rate (config constant `RETURN_RATE = 0.04`, cited, "verify yearly") /12 + operating costs → max fair rent; compare with asked rent; ≥5 % above → "Likely above the legal level — you can apply to Hyresnämnden". Plain explanation + sources.
   - **Scam check**: 6-item checklist (seen the flat in person? ID + ownership checked? no deposit before contract? landlord in Sweden? written contract? consent from landlord/BRF?) + auto warning when a rent is >30 % below area kr/m² average.
   - **Is this sublet legal?**: hyresrätt needs landlord consent (illegal subletting is a crime since 2019); bostadsrätt needs BRF board consent.
5. **Queue reality** (first-hand): "Typical queue in this area: ~N years" from Boplats statistics (manual yearly export → JSON in packages/bostad/data/) — coming soon until exported.
6. **Rent benchmark**: SCB Stor-Göteborg 127 kr/m²/month (2025) as the comparison until a district-level table is found.

## Data/package
- `packages/bostad/src/sources/boplats.ts` (fetch + parse + cache), `src/rent/fair-rent.ts` (pure function + tests via a small self-check script, like the repo's `*:check` pattern), constants with sources in `src/rent/constants.ts`.
- `/api/rentals?lat=&lon=&radius=` route with the same rate limit + origin check.

## Done means
Rent mode works on Djurgårdsgatan 23 A and "Biskopsgården": pins + list + tools; Buy mode unchanged; 375/1280 light+dark screenshots; checks pass.

---

# v5 — Simplify everything (learner feedback 2026-10-10: "remove the matched stuff below the address, use less stuff, simpler, easier, more accessible; transport icons STILL not centred")
**v5 overrides earlier sections where they conflict.** Principle: one screen should answer "is this a good place?" in 5 seconds; details only on tap.

## Remove / reduce
- Address header: show **only the address** (big) + small muted district ("Centrum · Stigberget"). **Remove** "Matched as: …", coordinates, "Checked N minutes ago" (move the time into each card's source line only).
- **Location card: delete** (map + "Open in Google Maps" button in the map controls cover it).
- Summary strip → **3 big status tiles** in a 3-column grid (no horizontal scroll): Ground · Noise · Transport. Each: icon, one word ("Safe" / "Quiet" / "4 min"), tap scrolls to its card. Remove the "Coverage" chip.
- Cards: **collapsed by default**, one line each: icon · title · one-word result · chevron. Tap opens: one plain sentence, the key facts (max 3 rows), source line. No paragraphs of explanation.
- "Coming soon" cards: **collapse into one row** "More coming: BRF finances · Energy · Inspection · Flood & radon" (single muted card, no individual cards).
- Remove the sticky "New address" bottom bar; the search box stays at the top (sticky on scroll on mobile, compact 44 px).
- Home page: headline, search, 3 example chips. Remove the 4 feature tiles.
- Fewer colours: status words coloured only (ok/warn/risk); everything else neutral.

## Accessibility
- All text ≥ 15 px on mobile (body 16 px), contrast AA in both themes, tap targets ≥ 44 px, focus visible, every icon button has aria-label, cards are `<details>`/button with `aria-expanded`, map has a text alternative (the transport card lists the same stops). Respect reduced motion. Test with keyboard only.

## Transport icons on the map — fix for real
Previous attempt still renders glyphs off-centre. Required implementation:
- Use `AdvancedMarker` (mapId `DEMO_MAP_ID` unless `VITE_GOOGLE_MAPS_MAP_ID`) with React content:
  `<div class="pin pin--tram"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>…</svg></div>`
  CSS: `.pin{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;line-height:0;box-sizing:border-box;border:2px solid var(--surface);transform:translate(0,50%)}` (or the marker's anchor options so the CIRCLE CENTRE sits on the coordinate) and `svg{display:block}`.
- Redraw each pictogram so its artwork is **centred in the 24×24 viewBox** (equal margins; check the path bounding box) — no glyph from an icon font, no text characters.
- **Verify by pixels:** screenshot the map at 3× device scale, crop each marker, compute the bounding box of the white glyph pixels vs the circle; offset must be ≤ 1 px on both axes. Put the crops in scratchpad/shots/markers/.

## Buy listings: Hemnet, Booli (link-out, no copying)
- Hemnet has no public API and copying its listings is high legal risk (research/06). So: in Buy mode add a **"Homes for sale nearby"** row with deep-link buttons **"See on Hemnet"** and **"See on Booli"** that open their search for the same area (build the URL from the district/street name; verify the URL format works by opening it). Label: "Opens Hemnet — we don't copy listings." Same pattern in Rent mode: **"See on Qasa"**, **"See on HomeQ"**, next to the Boplats pins.
- Real listing pins only from sources with permission (Boplats now; brokers via Vitec/Mspecs later).

## Rent — research findings to respect (full: proptech-sweden/research/09-rent.md)
- Two markets: first-hand via queues (Boplats Väst ≈7 yrs average, HomeQ) vs second-hand/private (Qasa — Blocket Bostad closed Nov 2025; Samtrygg).
- Boplats public search page returned 111 first-hand listings (area, address, rent, m², rooms, floor) — v1 source, facts + link only, no storage; permission asked.
- Rent benchmark: SCB Stor-Göteborg 127 kr/m²/month 2025 (+4.4 %).
- Second-hand legal cap: owner's capital cost (value × ~4 % — verify) + operating costs; ≥5 % above → Hyresnämnden.
- Scams: deposit to several people, pay-before-viewing, landlord abroad, too-cheap rent.
- Sublets need landlord / BRF consent; illegal subletting a crime since 2019.
In v5 style: Rent mode = map with rent pins + one "Rentals here" list card + one "Renter tools" card (fair rent · scam check · is it legal) — collapsed by default.

## Build order
1. v5 simplification + v3 map redesign + icon fix (one agent).
2. v4 Rent mode in v5 style + Hemnet/Booli/Qasa/HomeQ link-outs (next agent).

---

# v6 — Split "Neighbourhood" into two sections (learner feedback 2026-10-10)

## A. "Nearby places" — same UI pattern as Public transport
- Card title **"Nearby places"**; one-line summary: "Grocery 4 min · Pharmacy 3 min".
- Always show the **nearest of each category**, even if it is beyond 500 m: search radius 1.5 km (one Overpass query, same fallback servers + 24 h cache as v5 step 5b). Categories + OSM tags: Grocery (shop=supermarket|convenience|greengrocer), Pharmacy (amenity=pharmacy), Healthcare (amenity=doctors|clinic|hospital, healthcare=*), School (amenity=school), Preschool (amenity=kindergarten), Park (leisure=park), Gym (leisure=fitness_centre), Restaurant/café (amenity=restaurant|cafe) — counts only for the last two.
- **Filter chips** at the top (All · Grocery · Pharmacy · Health · School · Preschool · Park), ≥44 px, shared with the map — exactly like transport chips.
- Rows like transport rows: category pictogram in a coloured circle (same centred `.pin` component as stops), name, "4 min walk · 320 m", small muted "3 within 500 m". Tap a row → map pans to it and opens the same mini card (closable ×, map tap, Esc) with "Directions".
- **Map**: "Places" layer chip shows category pins (same AdvancedMarker `.pin` component, category colours distinct from transport colours, theme-aware); only nearest 3 per category to avoid clutter.

## B. "Area & prices" (new section, replaces the income part of Neighbourhood)
One-line summary: e.g. "High income · Expensive area".
Rows (each with level word + plain sentence + source, raw numbers secondary):
1. **District · neighbourhood** (e.g. Hisingen · Eriksberg).
2. **Income level** — percentile rank among Göteborg DeSO areas (v5 step 5a).
3. **Home prices** — what "expensive" really means. Find a source for sold-price level per area: try Svensk Mäklarstatistik (maklarstatistik.se area pages for Göteborg delområden — bostadsrätt kr/m², villa price; facts + link back, check terms), SCB fastighetspriser (kommun only, fallback), Booli/Hemnet only as link-outs. Show "Flats here sell for ~X kr/m² — N % above the Gothenburg average" with period + source. If no permitted source works, show the row as "coming soon" and say why.
4. **Housing mix** — share of bostadsrätt / hyresrätt / äganderätt in the DeSO (SCB DeSO "upplåtelseform" table).
5. **Who lives here** — education (share with post-secondary education), age profile (median age or share 0–19 / 65+), households with children — SCB DeSO tables, each compared with the city.
6. Population of the small area (SCB).
- Each row compares with Gothenburg and gives a level word (Low / Below average / Average / Above average / High) using the same percentile method across all Göteborg DeSOs (one PxWeb request per table, cached 24 h).
- Plain line at the top: "What the small area around this address is like, compared with the rest of Gothenburg."

## C. Safety (separate card, after data export lands) — district crime history 2002–2025, per 1 000 vs city, trend chart, district polygon shaded neutrally on the map.

Card order: Ground · Noise · Transport · Nearby places · Area & prices · Safety · More coming.

## D. Landing page (learner, 2026-10-10)
- **Remove the example address chips** (and examples in the empty-focus suggestion list).
- **Search history** on the landing page under the search box: "Recent searches" list (max 8, newest first) — each row: address, district (if known), relative time ("2 h ago"), one-word quick result if cached (e.g. "Quiet · 4 min to tram"); tap → open profile; swipe/× to remove one; "Clear all" link with confirm. Stored in localStorage (try/catch, versioned key), deduped by normalised address. Empty state: a single muted line "Your searches will appear here." Same list shown in the suggestion dropdown on empty focus.

## E. Hero photo of the building (learner, 2026-10-10)
- At the top of the profile sheet (above the address), a **hero image** of the building, 16:9, rounded 16, full sheet width; on desktop at the top of the right column.
- Source order:
  1. **Google Street View**, aimed AT the building: call the Street View **metadata** endpoint (free, no image quota) to get the nearest outdoor panorama (`source=outdoor`, radius 50 m); compute the heading from the panorama location to the geocoded address point; then the Street View Static image `size=640x360&scale=2&fov=70&pitch=10&heading=<computed>`. Show "© Google" + capture date (from metadata, e.g. "Street View · May 2024").
  2. If no panorama: a **Places (New) photo** of the address/building place if one exists (with the required author attribution).
  3. Else a **satellite close-up** (Maps Static API, zoom 19, maptype satellite) labelled "Aerial view".
- Tap the image → **interactive Street View** (Maps JS `StreetViewPanorama`) fullscreen with a close × (Esc, back), same heading.
- Loading: shimmer placeholder with the same aspect ratio (no layout shift); errors → hide the hero quietly.
- Requires the learner to enable **Street View Static API** and **Maps Static API** for the key (and keep the referrer restriction). Detect "API not enabled" and show nothing instead of a broken image.

---

# v7 — Google server APIs (learner enabled them 2026-10-10)
Server-only key: `GOOGLE_MAPS_SERVER_KEY` in repo-root `.env` (NO `VITE_` prefix — must never reach the browser; unrestricted for now, will be IP-restricted at deploy). All calls below happen in server code / `/api/*` routes only. Cache every response (24 h, keyed by ~50 m grid) to protect the free-trial credit; log call counts per API in dev.

1. **Geocoding API** — primary geocoder (region=se, components=country:SE); Nominatim/Photon become fallbacks. Use `location_type` (ROOFTOP/RANGE_INTERPOLATED/…) for the precision field.
2. **Places API (New) Nearby Search** — primary source for v6 A "Nearby places" (includedTypes per category, rankPreference DISTANCE, maxResultCount ~5, radius 1500); Overpass becomes fallback. Show Google attribution where required.
3. **Routes API** — real walking times (computeRouteMatrix, WALK) from home to the shown stops + nearest places (one matrix call per profile); plus a **"Commute" row** in the Transport card: user enters a destination once (stored in localStorage) → walk / bike / drive / transit times (transit from Västtrafik stays primary in the card).
4. **New card "Environment"** (between Noise and Transport): 
   - Air quality (Air Quality API currentConditions + 30-day history: Swedish/EU AQI level word + dominant pollutant + "Usually good/fair/poor here" from history).
   - Sunlight (Solar API buildingInsights: sunshine hours/yr, max panel capacity; say "not available here" if no coverage).
   - Height above sea level (Elevation API): metres + plain line "Low-lying — check flood maps" if < 3 m.
   - Pollen (Pollen API forecast: today's levels for grass/birch, "Spring is high birch season" etc.).
   Summary word: "Good air · Sunny roof · 12 m above sea".
5. Status tile row stays 3 tiles (Ground · Noise · Transport); Environment shows in cards only.
