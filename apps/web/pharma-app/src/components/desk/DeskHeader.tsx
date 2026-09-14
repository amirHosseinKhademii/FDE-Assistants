/**
 * The bar at the top, the way back to the front door, and the only thing on the
 * page that moves without a person asking it to.
 *
 * THE TITLE AND THE DESK SWITCHER ARE PROPS because there are two desks now and
 * they are the same product. A second header copied for the supplier page would
 * be the place the two slowly stop matching — and the switcher only works if
 * both pages draw the same one, with the current desk marked rather than
 * hidden. A link that vanishes on the page it points at is how somebody
 * concludes the other desk does not exist.
 *
 * TWO KINDS OF MOTION, AND THEY MUST NOT BE CONFUSED. The spectrum hairline
 * under the bar is always there — it is the same six hues as the landing page's
 * walk, so crossing between the two reads as one product. The travelling light
 * on top of it is tied to `busy` and nothing else: it starts when a question
 * goes out and stops the moment the stream closes. A spinner that animates on a
 * timer rather than on an event is a spinner that keeps spinning after the work
 * has failed, which is worse than no spinner.
 */
import { Link } from '@tanstack/react-router';
import { BoxIcon } from '@fde/uikit';

const DESKS = [
  { to: '/desk', label: 'Release' },
  { to: '/supplier', label: 'Supplier impact' },
] as const;

export function DeskHeader({
  busy,
  title = 'Release desk',
  here = '/desk',
}: {
  busy: boolean;
  title?: string;
  /** Which desk is being drawn. Marked, never removed. */
  here?: string;
}) {
  /* WHY THE HEADER IS SOFTER ON A PHONE. It had three hard horizontal edges
     stacked within 90px: a border under the bar, a full-strength six-hue rule
     under that, and a solid-filled tab capsule between them. On a wide screen
     those are 1400px long and read as structure. On a 390px screen they are the
     width of the content and read as the page being chopped into bands.

     So below `sm` the border goes — the hue rule is already a divider and two
     is one too many — the rule fades out at both ends instead of hitting the
     bezel, and the capsule goes translucent. Nothing changes from `sm` up. The
     rules themselves are in `styles/app.css`. */
  return (
    <header className="desk-header sticky top-0 z-20 border-b border-ui-line bg-ui-bg/70 backdrop-blur-xl">
      {/* WHY `w-full sm:w-auto` ON THE NAV BELOW. On a phone the pill used to
          take `ml-auto`, get pushed right onto its own wrapped row, and strand
          "Where your data goes" on a third row aligned left — three rows, two
          alignments, for two links. Below `sm` the nav takes the full width and
          the row breaks predictably; from `sm` up nothing changes. */}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 sm:px-6 sm:py-4">
        <Link
          to="/"
          aria-label="Back to the front page"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-ui-accent/15 text-ui-accent ring-1 ring-ui-accent/30 transition-all hover:scale-105 hover:bg-ui-accent/25"
        >
          <BoxIcon />
        </Link>
        <div className="flex flex-col leading-tight">
          <Link
            to="/"
            className="font-mono text-[0.6875rem] tracking-widest text-ui-faint uppercase transition-colors hover:text-ui-dim"
          >
            Meridian Pharma
          </Link>
          <h1 className="text-[1.0625rem] font-semibold tracking-tight">{title}</h1>
        </div>

        <nav className="desk-tabs flex w-full items-center gap-1 rounded-full border border-ui-line bg-ui-surface p-1 sm:ml-auto sm:w-auto">
          {DESKS.map((d) => (
            <Link
              key={d.to}
              to={d.to}
              className={`flex-1 rounded-full px-3 py-1 text-center text-sm transition-colors sm:flex-none ${
                d.to === here
                  ? 'bg-ui-accent/15 text-ui-accent'
                  : 'text-ui-dim hover:text-ui-fg'
              }`}
            >
              {d.label}
            </Link>
          ))}
        </nav>

        <Link to="/data-flow" className="text-xs text-ui-dim transition-colors hover:text-ui-fg sm:text-sm">
          Where your data goes
        </Link>
      </div>

      {/* The six hues, in the order the assessment walks them. */}
      <div
        aria-hidden
        className="desk-rule relative h-px overflow-hidden opacity-60"
        style={{
          backgroundImage:
            'linear-gradient(90deg, var(--color-hop-1), var(--color-hop-2), var(--color-hop-3), var(--color-hop-4), var(--color-hop-5), var(--color-hop-6))',
        }}
      >
        {busy && (
          <span className="ui-scan absolute inset-y-0 w-1/4 bg-linear-to-r from-transparent via-white to-transparent" />
        )}
      </div>
    </header>
  );
}
