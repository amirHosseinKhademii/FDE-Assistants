/**
 * Build and dev config for the Bostad property-profile app.
 *
 * `@bostad/property` is CommonJS compiled to `dist/`, so Node must load it as
 * it is rather than Vite bundling a second copy. `dotenv` is listed for the same
 * reason: the server route loads the repo-root .env through it at runtime.
 *
 * Both forms of the list are needed: the dev server matches by package name,
 * Rolldown matches the build's import strings exactly, hence the regexes.
 */
import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const DOMAIN_EXTERNALS = ['@bostad/property', 'dotenv'];

export default defineConfig({
  /**
   * The Google Maps key lives in the repo-root .env, so Vite reads env files from
   * there. Only VITE_-prefixed names reach the browser; everything else in that
   * file (database URLs, API keys) stays on the server.
   */
  envDir: fileURLToPath(new URL('../../..', import.meta.url)),

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
