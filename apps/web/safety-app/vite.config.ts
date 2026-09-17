/**
 * Calder Safety's build.
 *
 * ── THE `ssr.external` LIST ARRIVED WITH THE DESK, AS PROMISED ────────────
 *
 * This file used to say it had no list, and that the absence was a claim about
 * the app rather than a shortcut: nothing here opened a database or called a
 * model, because the landing page and `/data-flow` are static readings of a
 * document baked in at build time.
 *
 * `/desk` changed that. It runs the same loop the CLI runs — five tools, a
 * model, a nine-rule contract — so the domain package and every engine it can
 * reach have to stay OUT of the browser bundle and be required at runtime on
 * the server instead. Bundling `pg` or an embedder into a client chunk is how
 * a secret gets shipped to a reader.
 *
 * SAME LIST AS STEERING'S, and that is not laziness. Both apps drive the same
 * `runLoop` over the same three engines, so the set of things that must not be
 * bundled is a property of `@fde/agent` rather than of either surface.
 */
import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Everything that must be required at runtime rather than bundled.
 *
 * The three engines are all reachable through `LOOP`, so all three sets of
 * dependencies are listed even though one run uses one of them.
 */
const DOMAIN_EXTERNALS = [
  '@calder/safety',
  '@fde/agent',
  '@fde/grounding',
  '@fde/foundry',
  '@fde/telemetry',
  '@mastra/core',
  '@ai-sdk/openai-compatible',
  'ai',
  '@openai/agents',
  'openai',
  '@azure/identity',
  'pg',
  '@langchain/pgvector',
  '@langchain/core',
  '@huggingface/transformers',
];

export default defineConfig({
  plugins: [
    // `server.entry` is the only adapter hook this version has — it becomes the
    // rolldown input, so our node:http wrapper in src/server.ts is what gets
    // built into dist/server/server.js and can actually listen.
    tanstackStart({ server: { entry: './server.ts' } }),
    react(),
    tailwindcss(),
  ],

  ssr: { external: DOMAIN_EXTERNALS },

  build: {
    rolldownOptions: {
      external: DOMAIN_EXTERNALS.map(
        (p) => new RegExp(`^${p.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&')}(/.*)?$`),
      ),
    },
  },
});
