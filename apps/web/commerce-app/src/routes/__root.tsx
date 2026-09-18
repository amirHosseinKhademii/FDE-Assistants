/**
 * The document every page renders inside.
 *
 * The route owns the <html>, which is what lets the server stream it.
 *
 * THE ENTRANCE ANIMATIONS' SAFETY NET, and it runs before React does. Every
 * entrance on this site carries `animation-fill-mode: both`, which applies the
 * animation's FIRST frame before it starts — that is what makes a staggered
 * entrance work, and it means the element is invisible FOREVER if the animation
 * never runs. SITE.md records the measurement: with playback frozen, 7 of the 8
 * `lift-in` sections on a landing page sat at opacity 0, from a build that
 * succeeded and a server returning 200.
 *
 * A TIMER, NOT AN `animationend` LISTENER, because the failure being guarded
 * against is precisely the one where `animationend` never fires. It is inline in
 * the head rather than in a component, because a page that cannot animate may
 * well be a page that failed to hydrate, and the guard has to outlive that.
 *
 * NO `QueryClientProvider` HERE, unlike the other four. This app fetches
 * nothing at runtime — both pages are readings of documents baked in at build
 * time — and a cache with nothing in it is a dependency that has to be
 * explained. It arrives with `/api/resolve`, along with the externals list
 * `vite.config.ts` does not yet have.
 */
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import appCss from '../styles/app.css?url';
import { RouteProgress } from '@veresk/surface';

const MOTION_SETTLE = `setTimeout(function(){document.documentElement.setAttribute('data-motion','settled')},1400)`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'color-scheme', content: 'dark' },
      /* THE FALLBACK, NOT THE TITLE. Every page below sets its own; this is what
         a route that forgets gets, and it names the customer because that is the
         only thing true of all of them. */
      { title: 'Thornbury Goods' },
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
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: MOTION_SETTLE }} />
      </head>
      <body>
        {/* Outside the Outlet on purpose: a navigation indicator that lived
            inside the page being navigated away from would unmount halfway
            through the thing it is reporting on. */}
        <RouteProgress />
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
