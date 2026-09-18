/**
 * Thornbury Goods' build.
 *
 * ── THERE IS NO `ssr.external` LIST, AND THAT IS A CLAIM ABOUT THE APP ─────
 *
 * Every other surface here carries one: `@fde/agent`, `pg`, an embedder and
 * three engines have to be required at runtime rather than bundled, because
 * bundling a database driver into a client chunk is how a secret gets shipped
 * to a reader. This app needs no such list because it opens no database, calls
 * no model and holds no credential — the two pages it serves are readings of
 * documents in `docs/commerce/` and of source files in `apps/mcp/commerce/`,
 * baked in at build time.
 *
 * `apps/web/veresk-app` says the same thing about itself and `apps/web/
 * safety-app` used to, right up until `/desk` arrived and made it false. So this
 * comment has a shelf life: THE DAY THIS APP GROWS `/api/resolve`, the list
 * arrives with it, and it will be safety's — the set of things that must not be
 * bundled is a property of `@fde/agent`, not of any one surface.
 *
 * ── AND IT DEPENDS ON NONE OF THE OTHER FOUR COMMERCE PACKAGES ────────────
 *
 * `@thornbury/commerce`, `@thornbury/commerce-api` and `@thornbury/commerce-mcp`
 * are being written by three other sessions right now, and this app imports
 * nothing from any of them. That is deliberate rather than incidental: a
 * dependency on a half-built package means their red build is this app's red
 * build, and there is nothing here that needs their types. The MCP server's
 * source appears on `/steps` as QUOTED TEXT, which is a different relationship
 * from an import and survives the file being mid-refactor.
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
