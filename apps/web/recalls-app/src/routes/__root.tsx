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
