/**
 * The document every page renders inside. Dark surface, Inter and JetBrains Mono as in
 * the Veresk demos, and the Swedish language tag.
 */
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import appCss from '../styles/app.css?url';

/**
 * The entrance animations use fill-mode both, so an element that never animates stays
 * invisible. This timer marks the page settled after the entrance, so the content
 * shows even where animation is throttled.
 */
const MOTION_SETTLE = `setTimeout(function(){document.documentElement.setAttribute('data-motion','settled')},1400)`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'color-scheme', content: 'dark' },
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
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap',
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
        <script dangerouslySetInnerHTML={{ __html: MOTION_SETTLE }} />
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
