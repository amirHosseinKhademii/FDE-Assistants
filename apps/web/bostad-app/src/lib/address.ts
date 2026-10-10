export const ADDRESS_MAX_LENGTH = 200;

export type AddressParse = { ok: true; address: string } | { ok: false; error: string };

/** Validates the `address` query parameter: present, non-blank, at most 200 characters. */
export function parseAddress(raw: unknown): AddressParse {
  if (typeof raw !== 'string') return { ok: false, error: 'address is required' };
  const address = raw.trim();
  if (address.length === 0) return { ok: false, error: 'address must not be empty' };
  if (address.length > ADDRESS_MAX_LENGTH) {
    return { ok: false, error: `address must be at most ${ADDRESS_MAX_LENGTH} characters` };
  }
  return { ok: true, address };
}
