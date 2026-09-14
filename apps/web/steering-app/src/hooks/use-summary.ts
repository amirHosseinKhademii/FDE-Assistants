/**
 * Where the bid stands — the free half, and the paid half, kept apart.
 *
 * ── THE ROLL-UP LOADS ITSELF; THE WRITTEN SUMMARY IS ASKED FOR ───────────
 *
 * `GET /api/summary` costs nothing: every count on the panel is arithmetic over
 * assessments already filed. So it loads with the page and refetches on the
 * falling edge of `busy`, exactly as `use-history` does and for the identical
 * reason — the row is only guaranteed to be committed once the stream closes.
 *
 * `POST` calls a model. Nothing here fires it; a person does, and the button
 * says so. A panel that quietly spent money every time somebody assessed a
 * requirement would be the most expensive kind of nice touch.
 *
 * ── AND THE ROLL-UP THAT COMES BACK WITH THE SUMMARY REPLACES THIS ONE ───
 *
 * The POST recomputes it server-side, from the same read the agent was given.
 * Keeping the older copy on screen beside newly written prose is how the counts
 * and the paragraph end up describing two different moments.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface RollUp {
  requirementCount: number;
  assessedRefs: string[];
  notAssessedRefs: string[];
  unexpectedRefs: string[];
  mix: Record<string, number>;
  priced: { ref: string; hours: number; eur: number; jobs: number }[];
  unpriced: { ref: string; finding: string; why: string; jobs: number | null }[];
  eurTotal: number;
  hoursTotal: number;
  jobsBehindTotal: number;
  neverAsked: number;
  citations: number;
  conflicts: { ref: string; about: string }[];
  questions: { ref: string; question: string; owner: string; whyItMatters: string }[];
  history: { failedSince: string[]; superseded: number; typed: number; unreadableRefs: string[]; noHistory: boolean };
}

export interface Summary {
  headline: string;
  refusal_themes: { theme: string; requirement_refs: string[]; what_would_settle_it: string }[];
  repeated_questions: { question: string; requirement_refs: string[]; suggested_owner: string }[];
}

export interface SummaryRun {
  engine: string;
  turns: number;
  ms: number;
  compression: { dossiers: number; lines: number };
}

export function useSummary(busy: boolean, apiKey: string, onRefused: (status: number) => void) {
  const [rollUp, setRollUp] = useState<RollUp | null>(null);
  const [notTheQuote, setNotTheQuote] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [run, setRun] = useState<SummaryRun | null>(null);
  const [writing, setWriting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const headers = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { 'content-type': 'application/json' };
    if (apiKey) h['x-api-key'] = apiKey;
    return h;
  }, [apiKey]);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/summary', { headers: headers() });
      const body = await res.json();
      if (!res.ok) {
        onRefused(res.status);
        throw new Error(body?.error ?? `summary unavailable (${res.status})`);
      }
      setRollUp(body.rollUp as RollUp);
      setNotTheQuote(body.notTheQuote ?? '');
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }, [headers, onRefused]);

  useEffect(() => {
    void load();
  }, [load]);

  const wasBusy = useRef(busy);
  useEffect(() => {
    if (wasBusy.current && !busy) void load();
    wasBusy.current = busy;
  }, [busy, load]);

  /**
   * The paid call. The previous summary is cleared BEFORE the request, not
   * after it resolves: leaving last run's prose on screen under a spinner shows
   * a paragraph about a set of assessments that has since changed.
   */
  const write = useCallback(async () => {
    setWriting(true);
    setSummary(null);
    setFailure(null);
    try {
      const res = await fetch('/api/summary', { method: 'POST', headers: headers() });
      const body = await res.json();
      if (!res.ok) {
        onRefused(res.status);
        throw new Error(body?.error ?? `summary failed (${res.status})`);
      }
      if (body.rollUp) setRollUp(body.rollUp as RollUp);
      setSummary((body.summary as Summary) ?? null);
      setRun((body.run as SummaryRun) ?? null);
      setFailure(body.failure?.message ?? null);
    } catch (e: any) {
      setFailure(e?.message ?? String(e));
    } finally {
      setWriting(false);
    }
  }, [headers, onRefused]);

  return { rollUp, notTheQuote, error, summary, run, writing, failure, write };
}
