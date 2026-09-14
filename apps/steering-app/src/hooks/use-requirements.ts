/**
 * The programme's in-force requirements, fetched once when the desk opens.
 *
 * A FAILURE IS A STATE, NOT AN EMPTY LIST. The estate is a database that can be
 * asleep or unseeded, and rendering "no requirements" for "could not reach the
 * customer's ALM system" is the page inventing a fact about their programme.
 */
import { useEffect, useState } from 'react';
import type { Requirement } from './use-assess';

export function useRequirements(apiKey: string, onRefused: (status: number) => void) {
  const [items, setItems] = useState<Requirement[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setError(null);
    fetch('/api/requirements', { headers: apiKey ? { 'x-api-key': apiKey } : {} })
      .then(async (r) => {
        const body = await r.json();
        // 401 and 503 are different problems and the page must tell them apart:
        // one is a key this reader has to supply, the other is a key the
        // DEPLOYMENT does not have — and no amount of typing fixes the second.
        if (!r.ok) {
          onRefused(r.status);
          throw new Error(body?.error ?? `request failed (${r.status})`);
        }
        return body as Requirement[];
      })
      .then((rows) => live && setItems(rows))
      .catch((e) => live && setError(e?.message ?? String(e)));
    return () => {
      live = false;
    };
    // Refetched when the key changes: a key that starts working must not leave
    // the page showing the failure from before it was typed.
  }, [apiKey, onRefused]);

  return { items, error, loading: items === null && error === null };
}
