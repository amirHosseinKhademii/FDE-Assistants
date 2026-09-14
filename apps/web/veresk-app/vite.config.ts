/**
 * The build, and it is deliberately the short version.
 *
 * `apps/pharma-app/vite.config.ts` carries a list of packages Node must load
 * rather than Vite bundle — the domain package, the guard, the agent engines
 * and their native dependencies. NONE OF THAT IS HERE, and the absence is the
 * accurate statement about this app: since the pharma surface moved out on
 * 2026-09-13 it serves one page, the firm's door, which calls no model, opens
 * no database and has no API route.
 *
 * If a route here ever needs one of those, the externals list comes with it —
 * copying the list across now, before anything needs it, would hide that this
 * app is the only one in the repo with nothing behind it.
 */
import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    // `server.entry` is the only adapter hook this version has — it becomes the
    // rolldown input, so our node:http wrapper in src/server.ts is what gets
    // built into dist/server/server.js and can actually listen.
    tanstackStart({ server: { entry: './server.ts' } }),
    react(),
    tailwindcss(),
  ],
});
