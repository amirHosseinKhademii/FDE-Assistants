/**
 * The screen when it goes wrong.
 *
 * A failure says WHICH KIND of failure it was, because they need different
 * reactions: running out of turns is an infrastructure limit, not a wrong
 * answer, and telling someone to narrow the question is more use than an
 * apology. The caller supplies that sentence, because what "max_turns" means for
 * a user is a product decision, not a component one.
 */
import type { ReactNode } from 'react';
import { Mono } from './Mono';
import { BlockIcon } from '../icons';

export function Failure({
  message,
  stoppedBecause,
  advice,
  title = 'No answer',
}: {
  message: string;
  stoppedBecause?: string;
  /** What the user should do about this particular stop reason, if anything. */
  advice?: ReactNode;
  title?: string;
}) {
  return (
    <div className="ui-rise max-w-2xl overflow-hidden rounded-lg border border-ui-danger/40 bg-ui-danger/5">
      <div className="flex items-center gap-2.5 border-b border-ui-danger/25 px-5 py-3 text-ui-danger">
        <BlockIcon />
        <h2 className="font-medium">{title}</h2>
      </div>
      <div className="px-5 py-4">
        <p className="leading-relaxed text-ui-fg/90">{message}</p>
        {advice ? (
          <p className="mt-3 text-sm leading-relaxed text-ui-dim">{advice}</p>
        ) : (
          stoppedBecause && (
            <p className="mt-3 text-sm text-ui-dim">
              stopped because <Mono className="text-ui-faint">{stoppedBecause}</Mono>
            </p>
          )
        )}
      </div>
    </div>
  );
}
