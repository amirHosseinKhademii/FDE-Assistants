/**
 * The right-hand column: whichever of the three states is true, in one place.
 *
 * WHY A STORED ANSWER AND A FRESH ONE GO THROUGH THE SAME COMPONENT. An entry
 * read back from Postgres carries exactly what a live one does, so selecting
 * one swaps the SOURCE and nothing else — `Answer` and `RunFigures` are handed
 * the same props either way and cannot drift into showing yesterday's batch
 * differently from today's. A second "historical answer" renderer would be a
 * second place for the rule that this page never says a batch may ship.
 *
 * The banner is the one thing a stored answer adds, and it has to be there: the
 * dossier itself looks identical, so a reviewer who scrolled straight to a
 * blocker would have no way to know which batch they were reading.
 */
import { RunFigures, type Run, type TraceLine } from '@fde/uikit';
import { Answer } from './Answer';
import { EmptyState, Failure } from './states';
import { ViewingEarlier } from '../history/History';
import type { HistoryEntry } from '../../lib/history';

export interface AnswerView {
  answer: any;
  failure: { message: string; stoppedBecause?: string } | null;
  trace: TraceLine[];
  run?: Run;
}

export function AnswerPane({
  view,
  busy,
  earlier,
  onDismissEarlier,
  className = '',
}: {
  view: AnswerView;
  busy: boolean;
  earlier: HistoryEntry | null;
  onDismissEarlier: () => void;
  className?: string;
}) {
  return (
    <section className={className} style={{ animationDelay: '240ms' }}>
      {earlier && <ViewingEarlier entry={earlier} onDismiss={onDismissEarlier} />}

      {!view.answer && !view.failure && !busy && <EmptyState />}

      {view.failure && (
        <>
          <Failure message={view.failure.message} stoppedBecause={view.failure.stoppedBecause} />
          <RunFigures run={view.run} />
        </>
      )}

      {view.answer && (
        <>
          <Answer data={view.answer} />
          <RunFigures run={view.run} />
        </>
      )}
    </section>
  );
}
