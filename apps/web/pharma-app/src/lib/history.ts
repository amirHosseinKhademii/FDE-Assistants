/**
 * The history as the page sees it: what `/api/history` returns, and how to
 * read a timestamp out loud.
 *
 * THE STORE IS NOT HERE. Rows are written server-side in `api.ask.tsx` and read
 * from `server/ask-history.ts`; this file holds no persistence at all. That
 * split is the point — the browser never writes, so there is no write endpoint
 * to guard and no row lost when a tab closes mid-answer.
 *
 * THE SHAPE IS THE API'S, NOT A SECOND MODEL OF IT. `HistoryEntry` mirrors
 * `HistoryRow` in `server/ask-history.ts` field for field. It is redeclared
 * rather than imported because importing it would pull a `pg` pool into the
 * browser bundle; keeping the two in step is a small, visible cost, and
 * `pnpm typecheck` catches the half of it that matters — the route returning
 * something this cannot render.
 */
import type { Run } from '@fde/uikit';
import type { AskEvent } from './trace-lines';

export interface HistoryEntry {
  id: string;
  /** Which question this row answers, and therefore which renderer can read it. */
  kind: 'release' | 'supplier';
  /** ISO, from Postgres. */
  ts: string;
  question: string;
  /** Which engine answered. A row that hides this cannot explain a disagreement. */
  loop: string;
  surface: string;
  /** Exactly one of these two is set. A failed question is still history. */
  answer: unknown | null;
  failure: { message: string; stoppedBecause?: string } | null;
  run: Run | null;
  /** Raw events, rendered through `toTraceLines` at display time. */
  trace: AskEvent[];
}

/** "4m ago" — a reviewer asks "was that this morning?", never "was that at 09:41:07?". */
export function ago(iso: string, now: number = Date.now()): string {
  const secs = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
