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
 * THE ENTRANCE ANIMATIONS' SAFETY NET — see `packages/surface/src/styles/surface.css`.
 *
 * Every entrance carries `animation-fill-mode: both`, which applies the FIRST
 * frame before the animation starts. That is what makes a stagger work and it
 * means the element is invisible forever if the animation never runs — a hidden
 * or throttled frame, an embedded webview, a remote desktop with compositing
 * off. Measured on the sibling deployment: 7 of 8 sections at opacity 0, from a
 * server returning 200.
 *
 * A TIMER, NOT AN `animationend` LISTENER, because the failure being guarded
 * against is the one where `animationend` never fires. If the entrance ran, this
 * fires afterwards and changes nothing.
 */
const MOTION_SETTLE = `setTimeout(function(){document.documentElement.setAttribute('data-motion','settled')},1400)`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'color-scheme', content: 'dark' },
      /* THE FALLBACK, NOT THE TITLE. Every page below sets its own; this is
         what a route that forgets gets, and it names the firm because the firm
         is the only thing true of all of them. */
      { title: 'Veresk' },
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
