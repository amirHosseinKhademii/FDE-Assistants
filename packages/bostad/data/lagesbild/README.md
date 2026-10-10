# Lägesbild brott och otrygghet per mellanområde (Göteborg)

`goteborg-mellanomraden.json` holds one record per Göteborg mellanområde (36 in total) taken from the four stadsområde "Lägesbild brott och otrygghet" reports. Each record has bilingual summaries and quotes that are checked against the PDF text.

## Sources (latest found)

| Stadsområde | Report (year) | Printed pages | Source |
|---|---|---|---|
| Centrum | Lägesbild brott och otrygghet, stadsområde Centrum (2024) | 71 | [PDF](https://www4.goteborg.se/prod/Intraservice/Namndhandlingar/SamrumPortal.nsf/2304742C65758FB7C1258B0100274AC2/$File/13B_Bilaga_Trygg_i_Centrums_lagesbild_brott_och_otrygghet_stadsomrade_Centrum_2024.pdf?OpenElement=) |
| Hisingen | Lägesbild stadsområde Hisingen (2024) | 74 | [PDF](https://www4.goteborg.se/prod/intraservice/namndhandlingar/samrumportal.nsf/60A61EE0B730DF3EC1258AE400273AC5/$File/7.%20Lagesbild%20brott%20och%20otrygghet%20Hisingen%202024.pdf) |
| Nordost | Stadsområde Nordosts lägesbild för brott och otrygghet (2024) | 54 (PDF has 65 pages incl. cover and attachments) | [PDF](https://www4.goteborg.se/prod/intraservice/namndhandlingar/samrumportal.nsf/8204F39910C3ED62C1258AE4003316F2/$File/17.%20Stadsomrade%20Nordosts%20lagesbild%20for%20brott%20och%20otrygghet%202024.pdf) |
| Sydväst | Lägesbild brott och otrygghet för stadsområde Sydväst (2024, beslutad 2024-02-28) | 35 | [PDF](https://www4.goteborg.se/prod/Intraservice/Namndhandlingar/SamrumPortal.nsf/AD813C0C90CE5E85C1258AE000514142/$File/19.1%20bilaga%201%20Lagesbild%20brott%20och%20otrygghet%20for%20stadsomrade%20Sydvast%20i%20Goteborg.pdf) |

- Report years are 2024 for all four. The reports describe 2023 crime and 2022 SOM survey data.
- A web search on 2026-10-10 found no 2026 lägesbild for any of the four areas. The search does not replace a check of the nämndhandlingar portal.
- Reports are made every two years under the Lagen (2023:196) om kommuners ansvar för brottsförebyggande arbete. Refresh this file when new reports are published, which should be about every two years.

## Method

1. Each PDF was downloaded and converted with `pdftotext`. Page numbers are the printed page numbers in each report's footer (for Nordost, the "N (54)" footer, not the PDF page index).
2. One record was written per mellanområde section (chapter 10 in Centrum and Nordost, chapter 13 in Hisingen, and the "Trygghet i mellanområden" and "Brott" passages in Sydväst). Section headings were read directly from the text.
3. Summaries are short, neutral bullets in English and Swedish. Each bullet is backed by one of the quotes in the record. No names of individuals are given.
4. Every quote was checked against the `pdftotext` output by a script. Whitespace is normalised, but the wording is not changed. The page field is taken from the footer of the page where the quote occurs. **Result: 141 of 141 quotes match verbatim.**
5. Boundaries come from the WFS layer `slk-administrativ-indelning-v2:mellanomraden` (EPSG:4326), simplified to about 10 m tolerance with shapely (`preserve_topology=True`). The file is `packages/bostad/data/areas/mellanomraden.geojson`. It has 36 polygons, with `id`, `nr`, `namn`, `area_km2` and the stadsområde.

## Name matching

All 36 record names match a WFS `namn` exactly, so no name map is needed. There are no unmatched records or polygons.

## Notes on the source structure

- **Nordost:** the table of contents lists six mellanområden under chapter 10, but the body covers seven. Gamlestaden-Utby is printed as subsection 10.2.4 under Centrala Angered, and the WFS layer has it as its own mellanområde. It is therefore a separate record. Norra Angered and Södra Angered have no numbered heading in the body text.
- **Sydväst:** the report describes its eight mellanområden in groups (Centrala Tynnered and Frölunda Torg-Tofta; Stora Högsbo; and Älvsborg, Billdal, Askim-Hovås, Bratthammar-Näset-Önnered and Södra Skärgården). Group text is quoted in each of the matching records, so some records repeat the same quotes. `primaromraden` is empty because the text does not list primärområden.
- **Centrum:** `primaromraden` comes from the hyphenated mellanområde name (for example Kålltorp, Torpa, Björkekärr), because the report does not list them separately.
- **Hisingen:** `primaromraden` comes from the parenthesis in each section heading.
- `trend_en` is `null` where the text gives no before-and-after comparison.
- Riskbedömning colours (for example "gult läge") are used only where the text states them.

## Caveats

- These are qualitative descriptions written by the city and police. They are **not statistics**, and the reports do not give comparable crime rates per mellanområde.
- SOM survey results for mellanområden have few respondents. The reports themselves say that differences between areas should be read with caution.
- Housing company surveys (AktivBo, Poseidon, Bostadsbolaget and others) cover only their own properties, not the whole mellanområde.
- Where the text gives a place name without a quote, it is included only as a place note and is not a summary claim.
