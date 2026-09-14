/**
 * Earlier assessments, and the one moment this is allowed to be stale.
 *
 * IT REFETCHES WHEN `busy` FALLS, NOT WHEN THE ANSWER ARRIVES. There is a real
 * race between the two. `api.assess.tsx` sends the answer event FIRST and only
 * then awaits `recordAssessment` — deliberately, so nobody waits on a database
 * round trip to read their own answer. A refetch fired on the answer would
 * therefore often run before the row was committed and come back without it,
 * leaving the newest assessment missing from the list until something else
 * happened to refresh it. The stream closes AFTER the insert resolves, and
 * `busy` goes false when the stream closes, so that edge is the first instant
 * the row is guaranteed to be there.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface HistoryRow {
  id: string;
  ts: string;
  ref: string | null;
  text: string;
  loop: string;
  surface: string;
  answer: { assessment?: any; citations?: any } | null;
  failure: { message?: string; stoppedBecause?: string } | null;
  run: any | null;
  trace: any[];
}

export function useHistory(busy: boolean, apiKey: string, onRefused: (status: number) => void) {
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/history', { headers: apiKey ? { 'x-api-key': apiKey } : {} });
      const body = await res.json();
      if (!res.ok) {
        onRefused(res.status);
        throw new Error(body?.error ?? `history unavailable (${res.status})`);
      }
      setRows(body as HistoryRow[]);
      setError(null);
    } catch (e: any) {
      // Thrown into state, not swallowed into `[]`. An empty list reads as "you
      // have never assessed anything" — which is how somebody re-runs, and
      // re-pays for, an assessment they already have.
      setError(e?.message ?? String(e));
    }
  }, [apiKey, onRefused]);

  useEffect(() => {
    void load();
  }, [load]);

  // The falling edge of `busy`, and only that — see the header.
  const wasBusy = useRef(busy);
  useEffect(() => {
    if (wasBusy.current && !busy) void load();
    wasBusy.current = busy;
  }, [busy, load]);

  return { rows, error, loading: rows === null && error === null, reload: load };
}
