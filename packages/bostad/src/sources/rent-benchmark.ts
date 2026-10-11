/**
 * Average rent per square metre per month in Stor-Göteborg, 2025, from SCB's
 * table "Hyra och hyresförändring efter region" (Statistics Sweden). Hand-copied
 * into this file, not fetched: re-check the table each year and update the
 * value and year together. Research: proptech-sweden/research/09-rent.md.
 * The figure is for the whole region, not for one district; no district-level
 * rent table has been found yet.
 */
export const RENT_BENCHMARK = {
  area: "Stor-Göteborg",
  year: 2025,
  kronorPerM2PerMonth: 127,
  source: "SCB, Hyra och hyresförändring efter region",
  sourceUrl:
    "https://www.scb.se/hitta-statistik/statistik-efter-amne/boende-bebyggelse-och-mark/bostader-och-boende/hyror-i-bostadslagenheter/pong/tabell-och-diagram/hyra-och-hyresforandring-efter-region/",
} as const;
