/**
 * Creates the router the whole app runs on.
 *
 * `routeTree.gen.ts` is GENERATED — the plugin writes it by reading the files in
 * `src/routes/`. That generation is what makes `<Link to="/claims/$id">` a
 * compile-time check instead of a string you hope is right.
 */
import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

// The name matters: the framework imports `getRouter` from this file via the
// `#tanstack-router-entry` alias. Call it anything else and the build fails with
// "getRouter is not exported by src/router.tsx" — which is at least an honest
// error message.
export function getRouter() {
  return createTanStackRouter({
    routeTree,
    // What to show while a route's data is loading, and when nothing matches.
    defaultPreload: 'intent',
    scrollRestoration: true,
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
