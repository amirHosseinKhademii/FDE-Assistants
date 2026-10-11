/**
 * The banks the calculator shows, with the site, the favicon (copied from research/banks.json)
 * and the bank's own list-rate page. `match` is the company name as the Konsumenternas compare page
 * writes it, so a row from that page can be tied to a bank here. Other companies on the page still show,
 * with an initial in place of the icon and the compare page as the link.
 */
export interface BankInfo {
  name: string;
  site: string;
  faviconUrl: string;
  ratesUrl: string;
  /** Company name as the Konsumenternas page writes it. */
  match: string;
}

export const BANKS: BankInfo[] = [
  {
    name: "SBAB",
    site: "https://www.sbab.se",
    faviconUrl: "https://www.sbab.se/essentials/favicon.ico",
    ratesUrl: "https://www.sbab.se/1/privat/vara_rantor.html",
    match: "SBAB",
  },
  {
    name: "Swedbank",
    site: "https://www.swedbank.se",
    faviconUrl: "https://www.swedbank.se/content/dam/assets/favicon.ico",
    ratesUrl: "https://www.swedbank.se/privat/boende-och-bolan/bolanerantor.html",
    match: "Swedbank",
  },
  {
    name: "Handelsbanken",
    site: "https://www.handelsbanken.se",
    faviconUrl: "https://www.handelsbanken.se/favicon.ico",
    ratesUrl: "https://www.handelsbanken.se/sv/privat/bolan/bolanerantor",
    match: "Handelsbanken",
  },
  {
    name: "SEB",
    site: "https://seb.se",
    faviconUrl: "https://seb.se/favicon.ico",
    ratesUrl: "https://seb.se/privat/bolan/bolanerantor",
    match: "SEB",
  },
  {
    name: "Nordea",
    site: "https://www.nordea.se",
    faviconUrl: "https://www.nordea.se/favicon.ico",
    ratesUrl: "https://www.nordea.se/privat/produkter/bolan/listrantor.html",
    match: "Nordea",
  },
  {
    name: "Danske Bank",
    site: "https://danskebank.se",
    faviconUrl: "https://danskebank.se/favicon.ico",
    ratesUrl: "https://danskebank.se/privat/produkter/bolan/relaterat/aktuella-bolanerantor",
    match: "Danske Bank",
  },
  {
    name: "Länsförsäkringar",
    site: "https://www.lansforsakringar.se",
    faviconUrl: "https://www.lansforsakringar.se/favicon.ico",
    ratesUrl: "https://www.lansforsakringar.se/privat/bank/bolan/bolaneranta/",
    match: "Länsförsäkringar",
  },
  {
    name: "Skandiabanken",
    site: "https://www.skandia.se",
    faviconUrl: "https://static.skandia.se/external-libs/favicon/1.0.1/favicon.ico",
    ratesUrl: "https://www.skandia.se/lana/bolan/bolanerantor/",
    match: "Skandiabanken",
  },
  {
    name: "ICA Banken",
    site: "https://www.icabanken.se",
    faviconUrl: "https://www.icabanken.se/favicon.ico",
    ratesUrl: "https://www.icabanken.se/lana/bolan/bolanerantor/",
    match: "ICA Banken",
  },
  {
    name: "Landshypotek",
    site: "https://www.landshypotek.se",
    faviconUrl: "https://www.landshypotek.se/Assets/static/favicons/favicon-32x32.png",
    ratesUrl: "https://www.landshypotek.se/lana-till-bostad/bolan/",
    match: "Landshypotek",
  },
  {
    name: "Hypoteket",
    site: "https://hypoteket.com",
    faviconUrl: "https://hypoteket.com/favicons/favicon.ico",
    ratesUrl: "https://hypoteket.com/borantor",
    match: "Hypoteket",
  },
  {
    name: "Stabelo",
    site: "https://www.stabelo.se",
    faviconUrl: "https://stabelo.directus.app/assets/bc7ba3d9-770e-4129-92b7-a066a6a055d3",
    ratesUrl: "https://www.stabelo.se/bolanerantor",
    match: "Stabelo",
  },
  {
    name: "Ikano Bank",
    site: "https://ikanobank.se",
    faviconUrl: "https://ikanobank.se/-/media/sweden/icons/favi.png",
    ratesUrl: "https://ikanobank.se/bolan/bolanerantor",
    match: "Ikano Bank",
  },
  {
    name: "Bluestep",
    site: "https://www.bluestep.se",
    faviconUrl: "https://www.bluestep.se/favicon.ico",
    ratesUrl: "https://www.bluestep.se/bolan/borantor/",
    match: "Bluestep",
  },
];

/** The bank for a company name from the compare page, or null when it is not one of the listed banks. */
export function bankFor(company: string): BankInfo | null {
  return BANKS.find((b) => company.startsWith(b.match)) ?? null;
}
