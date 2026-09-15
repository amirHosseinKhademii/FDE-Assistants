/**
 * `/learn` — the layout every lesson renders inside.
 *
 * A LAYOUT ROUTE BECAUSE THE RAIL IS IDENTICAL ON ALL SIX PAGES. Without it,
 * navigating between lessons would unmount and remount the rail, which is both
 * wasteful and visibly wrong — the highlight would flicker off and back on.
 *
 * THIS APP NOW SERVES MORE THAN THE DOOR, and `vite.config.ts` still has no
 * `ssr.external` list. That is correct rather than an oversight: every figure
 * under here is baked into the bundle at build time from a document in `docs/`.
 * Nothing on these pages opens a database, calls a model, or has an API route,
 * so none of pharma's externals are needed. The day a lesson wants a live
 * retrieval demo is the day that list comes with it — deliberately, and in one
 * commit that says so.
 */
import { createFileRoute, Link, Outlet } from '@tanstack/react-router';
import { BoxIcon } from '@fde/uikit';
import { Aurora } from '@veresk/surface';
import { AURORA } from '../lib/aurora';
import { LessonNav } from '../components/learn/LessonNav';
import { PHARMA, STEERING } from '../lib/links';

export const Route = createFileRoute('/learn')({
  component: LearnLayout,
});

function LearnLayout() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Aurora tones={AURORA} />

      <nav className="relative z-10 mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-5 py-5 sm:px-6 sm:py-6">
        {/* Home is a typed <Link> and the two engagements are plain anchors,
            and the difference is not stylistic: they are separate deployments
            on separate origins. See `lib/links.ts` for the bug that taught it. */}
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ui-accent/15 text-ui-accent ring-1 ring-ui-accent/30">
            <BoxIcon />
          </span>
          <span className="font-medium tracking-tight">Veresk</span>
        </Link>
        <Link to="/learn" className="text-sm text-ui-dim transition-colors hover:text-ui-fg">
          Learn
        </Link>
        {PHARMA && (
          <a href={PHARMA} className="text-sm text-ui-dim transition-colors hover:text-ui-fg sm:ml-auto">
            Meridian Pharma
          </a>
        )}
        {STEERING && (
          <a href={STEERING} className="text-sm text-ui-dim transition-colors hover:text-ui-fg">
            Vantis Steering
          </a>
        )}
      </nav>

      <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-5 pb-16 sm:px-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        {/* The rail comes SECOND in the DOM on small screens would be the
            obvious reading of this — it does not. It is first, because on a
            narrow screen a reader arriving mid-track needs to know where they
            are before they start reading, and a contents list below the article
            is a contents list nobody sees. */}
        <aside className="pt-2 lg:pt-10">
          <LessonNav />
        </aside>

        <main className="min-w-0 pt-2 lg:pt-10">
          <Outlet />
        </main>
      </div>

      <footer className="relative z-10 mx-auto max-w-6xl border-t border-ui-line px-5 py-10 text-sm text-ui-faint sm:px-6">
        Veresk — a practice portfolio. Every customer, estate and document behind these pages is synthetic;
        the engineering, the measurements and the failures are not.
      </footer>
    </div>
  );
}
