/**
 * The screen before anything is asked, and the screen when it goes wrong.
 *
 * A failure says WHICH KIND of failure it was, because they need different
 * reactions: running out of turns is an infrastructure limit, not a wrong
 * answer, and telling someone to narrow the question is more use than an
 * apology.
 */
import { Mono } from './typography';

export function EmptyState({ count }: { count?: number }) {
  return (
    <div className="max-w-xl">
      <p className="text-lg leading-relaxed">
        Ask about a customer's coverage and you get the answer, the clause it came from, and the
        exact wording — or a clear statement that the documents do not settle it.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        Twelve policy forms and {count ?? 'eighteen'} policyholder records are on file. The
        assistant reads only those; anything it cannot find in them, it says so rather than filling
        the gap from memory.
      </p>
    </div>
  );
}

export function Failure({ message, stoppedBecause }: { message: string; stoppedBecause?: string }) {
  return (
    <div className="max-w-2xl border-l-2 border-claret pl-5">
      <h2 className="mb-2 text-lg font-semibold text-claret">No answer</h2>
      <p className="leading-relaxed">{message}</p>
      {stoppedBecause === 'max_turns' ? (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          It ran out of turns rather than answering badly — an infrastructure limit, not a wrong
          answer. A narrower question usually gets there.
        </p>
      ) : (
        stoppedBecause && (
          <p className="mt-3 text-sm text-muted">
            stopped because <Mono className="text-xs">{stoppedBecause}</Mono>
          </p>
        )
      )}
    </div>
  );
}
