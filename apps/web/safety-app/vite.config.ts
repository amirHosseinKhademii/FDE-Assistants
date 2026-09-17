/**
 * The build.
 *
 * NO `ssr.external` LIST, and that is a claim about this app rather than a
 * shortcut. Nothing here opens a database, calls a model or serves an API
 * route: the landing page and `/data-flow` are both static readings of
 * `docs/safety/PLAN.md`, baked in at build time.
 *
 * The desk is not built yet, deliberately — the answer contract does not exist
 * until an answer key has been written by hand from the raw NHTSA files. When
 * that page lands it will need `@calder/safety` and the agent engines
 * externalised, and the list arrives in the same commit that needs it. Copying
 * pharma's list across now would hide that this app currently has nothing
 * behind it.
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
