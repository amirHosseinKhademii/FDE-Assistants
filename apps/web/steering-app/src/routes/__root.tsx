/**
 * The document every page of this app renders inside.
 *
 * A SIBLING OF `apps/veresk-app/src/routes/__root.tsx`, not an import of it. A
 * root route owns the <html>, the stylesheet and the fallback title — three
 * things that are per-deployment by definition, and a shared one would have to
 * take all three as configuration to say anything less than "this is Veresk's
 * document". What IS shared sits one level in: the stylesheet imports
 * `@veresk/surface`, and the progress bar is imported from it.
 */
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { RouteProgress } from '@veresk/surface';
import appCss from '../styles/app.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'color-scheme', content: 'dark' },
      /* THE FALLBACK, NOT THE TITLE. The page below sets its own; this names
         the firm, because the firm is the only thing true of every route. */
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
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <RouteProgress />
          <Outlet />
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
