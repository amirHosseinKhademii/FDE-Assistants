# Göteborg reported-crime data (bostad package)

Exported 2026-10-10. Used by `src/sources/crime.ts` (no network calls at runtime).

## Files

| File | What |
|---|---|
| `bra-goteborg-history.csv` | BRÅ reported crimes (anmälda brott), 1996–2025 kommun, 2002–2025 districts. Columns: `year,area_scheme,area,category,subcategory,count,source_url,exported_at`. 49 560 rows; empty `count` = BRÅ suppressed/unavailable (`..`), not zero. |
| `goteborg-area-population.csv` | Göteborg kommun population per year (1996–2025). **No district population** (see caveats). |
| `areas/stadsomrade_2021.geojson` | 4 stadsområden (2021–), EPSG:4326, simplified (Douglas-Peucker, ~10 m). `name` = BRÅ name. |
| `bra-goteborg-stadsomraden.csv`, `goteborg-stadsomraden-population.csv` | **Superseded** by the two files above (2023–2025, 5 areas only). Kept, not read by `crime.ts`; delete when convenient. |

## area_scheme

- `kommun`: Göteborg kommun (BRÅ id 8628), 1996–2025.
- `stadsdel_pre2011`: 20 pre-2011 stadsdelar (BRÅ ids 8640–8659), 2002–2010. **Incomplete**: they cover only ~60–68 % of the city total (e.g. 2005: 58 254 of 85 796). Do not use for city-wide shares.
- `sdn_2011_2020`: 10 stadsdelsnämndsområden (BRÅ ids 8629–8638, names "… stadsdel (upphörde 2021-01-01)"), 2011–2020. BRÅ also publishes values for 2002–2010 under these 10 areas; they sum to ~91 % of the city, so `crime.ts` uses them for 2002–2010 (BRÅ's exact method for those years is not stated in the export).
- `stadsomrade_2021`: 4 stadsområden (BRÅ ids 8733–8736), 2021–2025. Zeros before 2021 in BRÅ's table are not real values and were dropped.

Area names are exactly as BRÅ prints them, including the `(Gbg)` suffix and the nbsp-free form.

## Categories

`category` = BRÅ's own name for the item (e.g. `3-7 kap. Brott mot person`, `Totalt antal brott`). `subcategory` is set for the requested subcategories: `misshandel`, `ran`, `sexualbrott`, `bostadsinbrott_lagenhet`, `bostadsinbrott_villa`, `biltillgrepp`, `stold_ur_fordon`, `cykelstold`, `skadegorelse`, `narkotikabrott`, `bedrageri`. Items are 116 BRÅ top-level items (chapters and special laws) minus the age/sex breakdowns, plus `Totalt antal brott`, plus 5 leaf items (lägenhet, villa/radhus, fullbordat biltillgrepp, ur/från motordrivet fordon, cykel). Breakdown items are not in the export.

## Sources and licence

- Crime counts: Brottsförebyggande rådet (BRÅ), Statistik över anmälda brott, `https://statistik.bra.se/solwebb/action/anmalda/urval/urval?menyid=101` (table builder, "Årsvis – Kommun och storstädernas stadsområden 1996-"). Export via the table's "Öppna som excelfil" function. Check BRÅ's terms of reuse before publishing outside the project; attribute as "BRÅ, Statistik över anmälda brott".
- Kommun population: Statistics Sweden (SCB), table BE0101A/BefolkningNy, Region 1480, all ages and sexes summed (`api.scb.se`). 2025 value from the Göteborgsregionen table (`goteborgsregionen.se`, Folkmängd 2025-12-31). SCB open-data terms: verify before redistribution.
- Area polygons, stadsområden: Göteborgs Stad, WFS `geodata-external.sbk.goteborg.se/services/slk-administrativ-indelning-v2/wfs`, layer `stadsomraden` (EPSG:3007, reprojected to EPSG:4326). Attribute "Göteborgs Stad" per the service; licence not checked.

## Export procedure (how it was done)

1. Start session (`/solwebb/action/start?menykatalogid=1`), open `urval;menyid=101`, read the item/region/period arrays from that page.
2. POST `.../anmalda/urval/vantapopup` with `brottstyp_id_string`, `region_id_string`, `period_id_string`, `antal=1`, `antal_100k=0`; GET `sok` and `soktabell`; POST `/solwebb/action/anmalda/resultat/excel` → XLS. Converted to UTF-8 CSV with LibreOffice.
3. Requests: 1 table of 118 items × kommun × 1996–2025, and 10 tables of up to 12 items × 34 districts × 2002–2025 (cell limit 10 000 per table). 46 requests in total, ~1.2 s apart, User-Agent set.
4. Parsed by region header rows and item labels; checked: every expected (item, region) row found; kommun `Totalt antal brott` 2025 = 84 816 (matches BRÅ).

Scripts and raw files are not committed (they are in the session scratchpad). The parse rule is in `crime.ts`'s header comment and this README.

## Refresh (yearly, after BRÅ publishes the new year)

1. Re-run the export with the new year added to the period list (the period ids in `arrayPeriod` on the urval page change each year; read them from the page, do not reuse the 2026-10-10 ids).
2. Re-parse; check that kommun totals match BRÅ's published totals for the year.
3. Update `goteborg-area-population.csv` from SCB BefolkningNy (Region 1480).
4. Update `exported_at` and this file's date.

## Caveats

- **Reported crimes, not crime.** Reporting differs between areas and crime types; fraud and cybercrime especially. Show the year and the city figure next to the district figure.
- **Boundaries change.** 2011 and 2021 changes break continuity between schemes; do not compare a district across them without a note.
- **Districts sum to ~90–98 % of the city total** in each year (checked 2002, 2005, 2010, 2021, 2025); the rest is not assigned to a district.
- **Suppressed cells** (`..` in BRÅ) are empty here, not zero. A `0` is a real BRÅ zero.
- **No district population.** SCB and Göteborgs Stad population by stadsområde/stadsdelsnämndsområde/stadsdel was not found in the sources checked, so per-1000 rates are only computed for the city. The SCB DeSO table (BE0101Y, DeSO 2010–2025) exists but does not map to districts without a crosswalk.
- **Missing polygons.** Only `stadsomrade_2021` exists. The 10 stadsdelsnämndsområden (2011–2020) and the pre-2011 stadsdelar have no polygon source yet. The WFS service offers only current areas (stadsområden 4, mellanområden 36, primärområden 96, basområden). Until these are found, `crimeHistory` returns `area: null` for 2002–2020. Building them from primärområden would need a source that states the mapping.
