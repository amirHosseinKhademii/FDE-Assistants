/**
 * The screen before anything is asked.
 *
 * The failure screen comes from `@fde/uikit` — its shape is the same everywhere.
 * What a failure MEANS, and what to do about it, is written here, because
 * "it ran out of turns" needs a different sentence in every product.
 */
import { Failure as KitFailure, BlockIcon } from '@fde/uikit';

export function EmptyState() {
  return (
    <div className="ui-rise max-w-2xl">
      {/* 17px on a phone, 20px from `sm` up. At full size this ran to seven
          lines on a 390px screen and read as the page's main content, which it
          is not — it is what is there BEFORE anybody asks anything. */}
      <p className="text-[1.0625rem] leading-relaxed text-ui-fg/90 sm:text-xl">
        Ask whether a batch can be released to a market and you get what every system actually
        says — the manufacturing record, the test results, who signed, which procedure was in
        force, and how it travelled.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-ui-dim sm:mt-5 sm:text-base">
        Six systems that cannot be joined by any single query, walked one hop at a time.
      </p>
      <p className="mt-6 flex items-start gap-3 rounded-lg border border-ui-line bg-ui-raised/40 p-3.5 text-xs leading-relaxed text-ui-dim sm:p-4 sm:text-sm">
        <span className="mt-0.5 text-ui-warn">
          <BlockIcon />
        </span>
        <span>
          It never says a batch <em className="text-ui-fg not-italic">may</em> ship. It prepares the
          file and names what would block it. A Qualified Person signs.
        </span>
      </p>
    </div>
  );
}

export function Failure({ message, stoppedBecause }: { message: string; stoppedBecause?: string }) {
  return (
    <KitFailure
      message={message}
      stoppedBecause={stoppedBecause}
      advice={
        stoppedBecause === 'max_turns'
          ? 'It ran out of turns rather than answering badly — an infrastructure limit, not a wrong answer. A narrower question usually gets there.'
          : undefined
      }
    />
  );
}
