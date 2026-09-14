/**
 * The four findings, in plain words. ONE MAP, read by every surface.
 *
 * It began inside `BidDesk.tsx` and moved here the moment the bid summary
 * needed the same labels. Two copies of this would drift, and the drift would
 * be invisible: the desk would call `change_needed` "it exists, and it has to
 * change" while the summary beside it called the same enum something else, and
 * both would look right on their own.
 *
 * THE LABEL IS NOT THE ENUM. `change_needed` is a value in a contract; the
 * label is what a person reads. The tone is the only other colour on these
 * pages and it encodes one thing: how much work the answer implies.
 */
export const FINDING: Record<string, { label: string; tone: string; means: string }> = {
  have_it: {
    label: 'We have it',
    tone: 'var(--color-ui-ok, var(--color-vst-1))',
    means: 'It exists and the documents demonstrate it. Not a commitment to quote it as carryover.',
  },
  change_needed: {
    label: 'It exists, and it has to change',
    tone: 'var(--color-vst-2)',
    means: 'Something in the estate is close, and modifying or re-evidencing it is the work.',
  },
  new_work: {
    label: 'It does not exist',
    tone: 'var(--color-vst-3)',
    means: 'Nothing in the estate answers this. The price is for building it.',
  },
  cannot_tell: {
    label: 'The documents do not settle it',
    tone: 'var(--color-ui-warn)',
    means: 'Not a failure. The files genuinely do not say, and saying so is the honest answer.',
  },
};
