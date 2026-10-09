/**
 * Wrap's build. No `ssr.external` list and no API routes: every page is
 * rendered from code in this app, so there is no server-only dependency to
 * keep out of the client bundle.
 */
import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    // `server.entry` is the only adapter hook this TanStack Start version has.
    // It makes src/server.ts the build input, so `node dist/server/server.js`
    // is a process that listens.
    tanstackStart({ server: { entry: './server.ts' } }),
    react(),
    tailwindcss(),
  ],
});
