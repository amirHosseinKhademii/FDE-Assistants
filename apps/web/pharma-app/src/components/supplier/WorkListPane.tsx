/**
 * The right-hand column of the supplier desk.
 *
 * A SIBLING OF `AnswerPane`, not a reuse of it, for the reason its own header
 * gives about the release dossier: the states are the same three, but the thing
 * rendered in the third is a different shape, and a pane that branched on which
 * shape it held would be the one place where a work list could be handed to the
 * dossier renderer. The states themselves — the failure card, the run figures —
 * are the shared ones.
 */
import { RunFigures, Failure, type Run, type TraceLine } from '@fde/uikit';
import { WorkList } from './WorkList';
import { FanoutProgress } from './FanoutProgress';
import { Debate } from './Debate';
import type { FanoutState, DebateState } from '../../hooks/use-ask';
import { ViewingEarlier } from '../history/History';
import type { HistoryEntry } from '../../lib/history';

export interface WorkListView {
  answer: any;
  failure: { message: string; stoppedBecause?: string } | null;
  trace: TraceLine[];
  run?: Run;
}

export function WorkListPane({
  view,
  busy,
  fanout,
  debate,
  earlier,
  onDismissEarlier,
  className = '',
}: {
  view: WorkListView;
  busy: boolean;
  /** Live sub-agent progress, while a fan-out is running and only then. */
  fanout?: FanoutState | null;
  /** A debate, which unlike the other two is itself the deliverable. */
  debate?: DebateState | null;
  earlier: HistoryEntry | null;
  onDismissEarlier: () => void;
  className?: string;
}) {
  return (
    <section className={className} style={{ animationDelay: '240ms' }}>
      {earlier && <ViewingEarlier entry={earlier} onDismiss={onDismissEarlier} />}

      {/* WHILE IT RUNS, AND NOT AFTER. Progress about a finished thing is
          clutter, and the answer below carries what it actually cost. */}
      {busy && !earlier && fanout && <FanoutProgress state={fanout} />}

      {/* THE DEBATE IS NOT PROGRESS — it is the answer, and it stays after the
          run finishes. There is no work list to replace it with: it returns an
          escalation memo, which is a different deliverable rather than a
          different rendering of the same one. */}
      {!earlier && debate && (
        <>
          <Debate state={debate} />
          {debate.run && <RunFigures run={debate.run} />}
        </>
      )}

      {!view.answer && !view.failure && !busy && !debate && <EmptyState />}

      {view.failure && (
        <>
          <Failure message={view.failure.message} stoppedBecause={view.failure.stoppedBecause} />
          <RunFigures run={view.run} />
        </>
      )}

      {view.answer && (
        <>
          <WorkList data={view.answer} />
          <RunFigures run={view.run} />
        </>
      )}
    </section>
  );
}

/**
 * What the page says before it has been asked anything.
 *
 * It describes the WALK, not the verdict, because there is no verdict to
 * promise — and it names the one thing this question does that the release
 * question does not: it ends with a list somebody has to work down.
 */
function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-ui-line px-6 py-10 text-center">
      <p className="text-ui-dim">
        Name a supplier and ask. The walk reads what they delivered, what was made from it, and
        where every one of those lots ended up.
      </p>
      <p className="mx-auto mt-3 max-w-md text-sm text-ui-faint">
        What comes back is a work list, ranked by how far the material got — not a decision about
        any of it.
      </p>
    </div>
  );
}
