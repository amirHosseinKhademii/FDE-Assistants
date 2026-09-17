/**
 * The document every page renders inside.
 *
 * The route owns the <html>, which is what lets the server stream it. Two
 * things are wired here because they belong to the whole app rather than to any
 * page: the stylesheet, and the query client that caches server data.
 */
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import appCss from '../styles/app.css?url';
import { RouteProgress } from '@veresk/surface';

/**
 * THE ENTRANCE ANIMATIONS' SAFETY NET, and it runs before React does.
 *
 * Every entrance on this site carries `animation-fill-mode: both`, which
 * applies the animation's FIRST frame before it starts. That is what makes a
 * staggered entrance work — an element with a 90ms delay has to be invisible
 * for those 90ms — and it means the element is invisible FOREVER if the
 * animation never runs. Measured: with playback frozen, 7 of the 8 `lift-in`
 * sections on the landing page sit at opacity 0. That is the whole body of the
 * page, from a build that succeeded and a server returning 200.
 *
 * `prefers-reduced-motion: no-preference` covers the honest case. It does not
 * cover a browser that says no-preference and then throttles animations anyway:
 * a hidden or backgrounded frame, an embedded webview, a remote desktop with
 * compositing off. So after a delay longer than the longest entrance, this
 * marks the document settled and the stylesheets drop every entrance to its
 * finished state.
 *
 * A TIMER, NOT AN `animationend` LISTENER. The failure being guarded against is
 * precisely the one where `animationend` never fires, so a guard that waits for
 * it is not a guard. If the entrance did run, this fires after it finished and
 * changes nothing visible.
 *
 * IT IS INLINE IN THE HEAD rather than in a component, because a page that
 * cannot animate may well be a page that failed to hydrate, and the guard has
 * to outlive that. It is the shortest thing that could work: one attribute.
 */
const MOTION_SETTLE = `setTimeout(function(){document.documentElement.setAttribute('data-motion','settled')},1400)`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'color-scheme', content: 'dark' },
      /* THE FALLBACK, NOT THE TITLE. Every page below sets its own; this is
         what a route that forgets gets, and it names Calder because the customer
         is the only thing true of both of them. */
      { title: 'Calder Safety' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap',
      },
    ],
  }),
  component: RootLayout,
});

function RootLayout() {
  // One client per browser session. Created in state so a re-render does not
  // throw the cache away.
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: MOTION_SETTLE }} />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          {/* Outside the Outlet on purpose: a navigation indicator that lived
              inside the page being navigated away from would unmount halfway
              through the thing it is reporting on. */}
          <RouteProgress />
          <Outlet />
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
