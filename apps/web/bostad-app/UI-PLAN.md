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
