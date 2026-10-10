/**
 * Build and dev config for the Bostad property-profile app.
 *
 * `@bostad/property` is imported from its SOURCE (packages/bostad/src), not its
 * compiled dist/. A dist copy goes stale the moment the package changes, and the
 * running dev server then serves old code until someone rebuilds and restarts.
 * Aliasing to source means Vite compiles the package with the app: a package
 * edit shows on the next request, with no separate build step. The package's own
 * build (tsc -> dist/) is still what the CLI and the typecheck use.
 *
 * `dotenv` stays external: the server route loads the repo-root .env through it.
 */
import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const PROPERTY_SOURCE = fileURLToPath(new URL('../../../packages/bostad/src/profile.ts', import.meta.url));
const DOMAIN_EXTERNALS = ['dotenv'];

export default defineConfig({
  /**
   * The Google Maps key lives in the repo-root .env, so Vite reads env files from
   * there. Only VITE_-prefixed names reach the browser; everything else in that
   * file (database URLs, API keys) stays on the server.
   */
  envDir: fileURLToPath(new URL('../../..', import.meta.url)),

  resolve: {
    alias: { '@bostad/property': PROPERTY_SOURCE },
  },

  plugins: [
    tanstackStart({ server: { entry: './server.ts' } }),
    react(),
    tailwindcss(),
  ],

  /**
   * Loopback only. This app has no auth and its API makes outbound calls with
   * credentials, so it is never bound to 0.0.0.0.
   */
  server: {
    host: '127.0.0.1',
    port: 3600,
    strictPort: true,
  },

  ssr: { external: DOMAIN_EXTERNALS },

  build: {
    rolldownOptions: {
      external: DOMAIN_EXTERNALS.map(
        (p) => new RegExp(`^${p.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&')}(/.*)?$`),
      ),
    },
  },
});
