/**
 * The document every page renders inside. Sets the Swedish language, the title,
 * the stylesheet and the query client.
 */
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import appCss from '../styles/app.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'description', content: 'Demo med påhittade dokument. Frågor och svar om en bostadsrättsförening, med källa till varje svar.' },
      { title: 'Brf Exempelgården, frågor och svar' },
    ],
    links: [
      { rel: 'icon', href: '/veresk-logo.svg', type: 'image/svg+xml' },
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,300..700;1,8..60,400&family=Courier+Prime:wght@400;700&display=swap',
      },
    ],
  }),
  component: RootLayout,
});

function RootLayout() {
  // One client per browser session, created in state so a re-render keeps it.
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="sv">
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <Outlet />
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
