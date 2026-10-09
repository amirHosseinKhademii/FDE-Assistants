/**
 * The document every page renders inside.
 *
 * THE ENTRANCE ANIMATIONS' SAFETY NET. Every entrance carries
 * `animation-fill-mode: both`, so an element sits at its first frame forever if
 * the animation never runs. The timer below marks the page as settled after
 * the entrances finish. It is a timer rather than an `animationend` listener
 * because the failure it guards against is precisely the one where that event
 * never fires. It is inline in the head so it still runs if hydration fails.
 */
import { createRootRoute, HeadContent, Link, Outlet, Scripts } from '@tanstack/react-router';
import appCss from '../styles/app.css?url';
import { RouteProgress } from '@veresk/surface';
import { VERESK } from '../lib/links';

const MOTION_SETTLE = `setTimeout(function(){document.documentElement.setAttribute('data-motion','settled')},1400)`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'color-scheme', content: 'dark' },
      { name: 'theme-color', content: '#121826' },
      { title: 'Wrap' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Atkinson+Hyperlegible+Mono:wght@400;500;600&display=swap',
      },
    ],
  }),
  component: RootLayout,
});

function RootLayout() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: MOTION_SETTLE }} />
      </head>
      <body>
        <header className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-5 sm:px-6">
          <Link to="/" className="text-[1rem] font-bold text-ui-fg">
            Wrap
          </Link>
          <nav aria-label="Main" className="flex gap-5 text-[0.9375rem]">
            <Link to="/" className="wrap-a">
              Home
            </Link>
            <Link to="/steps" className="wrap-a">
              How it works
            </Link>
            {/* A plain anchor: the firm's page is another deployment on another
                origin. `null` in a production build with nothing configured, and
                then it renders as text rather than as a link to nowhere. */}
            {VERESK ? (
              <a href={VERESK} className="wrap-a">
                Veresk
              </a>
            ) : (
              <span className="text-ui-faint">Veresk</span>
            )}
          </nav>
        </header>
        {/* Outside the Outlet on purpose: a progress indicator inside the page
            being navigated away from would unmount halfway through. */}
        <RouteProgress />
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
