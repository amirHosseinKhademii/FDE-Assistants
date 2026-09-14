/**
 * A dot that is still there while it pulses.
 *
 * `ui-ping` scales its own element to 2.4× and fades it to nothing, which is
 * correct for a RING drawn behind something and wrong for the thing itself —
 * put it straight on a visible dot and the dot spends most of every cycle
 * invisible and the rest of it the wrong size. That is what "the blinking icon
 * is a little off" was: not the timing, the element it was attached to.
 *
 * So: a solid dot that never moves, and a second element behind it carrying the
 * animation. `WorkingNotes` in the kit already does exactly this; this is the
 * same idea with the colour as a parameter, because here the pulse takes its
 * agent's colour rather than the one accent.
 */
export function LiveDot({
  colour = 'var(--color-ui-accent)',
  size = '0.5rem',
  className = '',
}: {
  colour?: string;
  size?: string;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-flex shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span
        className="ui-ping absolute inset-0 rounded-full"
        style={{ background: colour, opacity: 0.75 }}
      />
      <span className="absolute inset-0 rounded-full" style={{ background: colour }} />
    </span>
  );
}
