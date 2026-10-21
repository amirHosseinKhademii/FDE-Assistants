/**
 * Registry facts for a housing association from Bolagsverket's free API (Värdefulla datamängder):
 * name, legal form, registration date, and whether it is deregistered or in winding-up or
 * restructuring proceedings. Server-side only. Credentials come from BOLAGSVERKET_CLIENT_ID,
 * BOLAGSVERKET_CLIENT_SECRET and BOLAGSVERKET_TOKEN_URL. Any failure (missing credentials, HTTP
 * error, timeout) gives null and is never thrown to the caller. Answers are cached 24 h; the token
 * is cached until 60 s before it expires.
 *
 * PRIVACY: postadressOrganisation is never read, returned or logged, because its c/o line can
 * name a private person. verksamhetsbeskrivning is not read either.
 */
import { memo } from "./scb";

const TOKEN_SCOPE = "vardefulla-datamangder:read vardefulla-datamangder:ping";
const LOOKUP_URL = "https://gw.api.bolagsverket.se/vardefulla-datamangder/v1/organisationer";
const TIMEOUT_MS = 8000;
const TOKEN_MARGIN_MS = 60 * 1000;

export interface RegistryFacts {
  name: string;
  /** Legal form as the registry names it, e.g. "Bostadsrättsförening". */
  form: string;
  /** Registration date, YYYY-MM-DD. */
  registered: string;
  deregistered: boolean;
  /** True while the registry shows winding-up or restructuring proceedings. */
  inLiquidation: boolean;
  sni: { code: string; text: string }[];
}

interface Token {
  value: string;
  expiresAt: number;
}

let token: Token | null = null;

/** The bearer token, from memory while it is valid. Throws when the credentials or the answer are missing. */
async function getToken(signal: AbortSignal): Promise<string> {
  if (token && Date.now() < token.expiresAt) return token.value;
  const id = process.env.BOLAGSVERKET_CLIENT_ID;
  const secret = process.env.BOLAGSVERKET_CLIENT_SECRET;
  const url = process.env.BOLAGSVERKET_TOKEN_URL;
  if (!id || !secret || !url) throw new Error("Bolagsverket credentials not set");
  const basic = Buffer.from(`${id}:${secret}`, "utf8").toString("base64");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: TOKEN_SCOPE }).toString(),
    signal,
  });
  if (!res.ok) throw new Error(`Bolagsverket token HTTP ${res.status}`);
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error("Bolagsverket token response has no access_token");
  const lifetimeMs = (typeof json.expires_in === "number" ? json.expires_in : 3600) * 1000;
  token = { value: json.access_token, expiresAt: Date.now() + lifetimeMs - TOKEN_MARGIN_MS };
  return token.value;
}

interface Named {
  kod?: string;
  klartext?: string;
}

/** One organisation as the lookup returns it. Only the fields below are read. */
interface RawOrganisation {
  organisationsidentitet?: { identitetsbeteckning?: string };
  organisationsnamn?: { organisationsnamnLista?: { namn?: string; organisationsnamntyp?: Named }[] };
  organisationsform?: Named;
  juridiskForm?: Named;
  organisationsdatum?: { registreringsdatum?: string | null };
  avregistreradOrganisation?: unknown;
  /** An object even for a healthy organisation; the list inside is empty unless proceedings are running. */
  pagaendeAvvecklingsEllerOmstruktureringsforfarande?: {
    pagaendeAvvecklingsEllerOmstruktureringsforfarandeLista?: unknown[];
  } | null;
  naringsgrenOrganisation?: { sni?: { kod?: string; klartext?: string }[] };
}

function factsOf(o: RawOrganisation): RegistryFacts | null {
  const names = o.organisationsnamn?.organisationsnamnLista ?? [];
  const name = (names.find((n) => n.organisationsnamntyp?.kod === "FORETAGSNAMN") ?? names[0])?.namn;
  const registered = o.organisationsdatum?.registreringsdatum ?? null;
  if (!name || !registered || !/^\d{4}-\d{2}-\d{2}$/.test(registered)) return null;
  const sni = (o.naringsgrenOrganisation?.sni ?? [])
    .map((s) => ({ code: (s.kod ?? "").trim(), text: (s.klartext ?? "").trim() }))
    .filter((s) => s.code !== "");
  return {
    name,
    form: o.organisationsform?.klartext ?? o.juridiskForm?.klartext ?? "",
    registered,
    deregistered: o.avregistreradOrganisation != null,
    inLiquidation: (o.pagaendeAvvecklingsEllerOmstruktureringsforfarande?.pagaendeAvvecklingsEllerOmstruktureringsforfarandeLista ?? []).length > 0,
    sni,
  };
}

/** One lookup call. Throws on HTTP or network errors. Null when the registry has no such organisation. */
async function fetchFacts(digits: string): Promise<RegistryFacts | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const tok = await getToken(ctrl.signal);
    const res = await fetch(LOOKUP_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tok}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ identitetsbeteckning: digits }),
      signal: ctrl.signal,
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Bolagsverket lookup HTTP ${res.status}`);
    const json = (await res.json()) as { organisationer?: RawOrganisation[] };
    const match = (json.organisationer ?? []).find(
      (o) => o.organisationsidentitet?.identitetsbeteckning === digits,
    );
    return match ? factsOf(match) : null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The registry facts for an organisation number ("757200-9087" or "7572009087"), or null when the
 * number is malformed, unknown, or the registry cannot be reached. Never throws.
 */
export async function lookupOrganisation(orgNr: string): Promise<RegistryFacts | null> {
  const digits = orgNr.replace(/-/g, "");
  if (!/^\d{10}$/.test(digits)) return null;
  try {
    return await memo(`bolagsverket:${digits}`, () => fetchFacts(digits));
  } catch {
    return null;
  }
}
