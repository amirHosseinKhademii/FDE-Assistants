/**
 * The history list, and the one moment it is allowed to be stale.
 *
 * WHY IT REFETCHES WHEN `busy` FALLS, AND NOT WHEN THE ANSWER ARRIVES. There is
 * a real race between the two. `api.ask.tsx` sends the answer event FIRST and
 * only then awaits `recordAsk` — deliberately, so a reviewer never waits on a
 * database round trip to read their own answer. A refetch fired on the answer
 * would therefore often run before the row was committed and come back without
 * it, leaving the newest question missing from the list until something else
 * happened to refresh it. The stream closes AFTER the insert resolves, and
 * `busy` goes false when the stream closes, so that edge is the first instant
 * the row is guaranteed to be there.
 *
 * WHY REACT QUERY AND NOT `useEffect` + `fetch`. Cache keyed by credential,
 * one in-flight request regardless of how many components ask, and a retry
 * policy that is stated rather than improvised. The lots dropdown already uses
 * it the same way.
 */
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { HistoryEntry } from '../lib/history';

export function useHistory({
  apiKey,
  kind,
  busy,
  onAuthRequired,
}: {
  apiKey: string;
  /** Which desk is asking. The filter runs server-side; this only selects it. */
  kind: 'release' | 'supplier';
  busy: boolean;
  onAuthRequired: () => void;
}) {
  const query = useQuery<HistoryEntry[]>({
    // Keyed on the credential: a key that starts working must not serve the
    // empty list cached while it was refused.
    // Keyed on the kind as well as the credential — two desks, two lists, and
    // one cache entry serving both would put a work list in the release sidebar.
    queryKey: ['history', kind, apiKey],
    queryFn: async () => {
      const res = await fetch(`/api/history?kind=${kind}`, {
        headers: apiKey ? { 'x-api-key': apiKey } : {},
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 503) onAuthRequired();
        // Thrown, not swallowed into `[]`. An empty list reads as "you have
        // never asked anything" — which is how somebody re-runs, and re-pays
        // for, a question they already asked.
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `history unavailable (${res.status})`);
      }
      return (await res.json()) as HistoryEntry[];
    },
    // Long, because the list only changes when this page asks something and
    // that moment is handled below — but NOT infinite, and the difference is a
    // real row rather than caution. `useAsk` ABANDONS a question when a second
    // one is asked: the server still files the abandoned one, because the
    // insert does not depend on anyone reading the stream, but `busy` never
    // makes the true→false transition for it. That row exists in Postgres and
    // would otherwise stay invisible until the next question happened to
    // refresh the list. A finite window means it heals itself.
    staleTime: 30_000,
    retry: 1,
  });

  const wasBusy = useRef(false);
  useEffect(() => {
    if (wasBusy.current && !busy) void query.refetch();
    wasBusy.current = busy;
    // `query` is stable enough for this; depending on it would refetch on every
    // status change, which is the loop this effect exists to avoid.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  return query;
}
