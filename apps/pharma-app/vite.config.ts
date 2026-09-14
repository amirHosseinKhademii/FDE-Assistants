/**
 * The whole build, in one file. A sibling of `apps/insurance-app/vite.config.ts`
 * with one name changed — which is the point of the exercise: if a second
 * customer's surface needs a different build, the split above it is wrong.
 *
 * `tanstackStart()` watches `src/routes/` and generates `src/routeTree.gen.ts`,
 * wires the client and server entries, and builds a Node server into `.output/`.
 */
import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Packages Node must load, not Vite bundle.
 *
 * `@meridian/pharma` is CommonJS, and `@fde/agent`'s Mastra engine calls
 * require() at module scope to reach ESM-only packages through Node 22's
 * require(esm). Bundling that either fails or produces a second copy of the
 * domain with different module semantics — two loops pretending to be one. The
 * rest are its native and ESM-only dependencies, which must resolve the same way.
 */
const DOMAIN_EXTERNALS = [
  '@meridian/pharma',
  // Imported DIRECTLY by the API routes, not through the domain package, so it
  // needs naming here in its own right. Insurance never hit this: it reaches the
  // same guard through `@claims/insurance/security`, which the line above
  // already covered. Left out, Vite inlines its CommonJS dist as ESM and every
  // request dies with `exports is not defined` — and note that `vite build`
  // SUCCEEDS in that state. Dev and build fail differently here; run both.
  '@fde/guard',
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
      // The dev server honours `ssr.external`, which matches by PACKAGE, so
      // `@meridian/pharma/schema` is covered by naming `@meridian/pharma`.
      // Rolldown matches strings EXACTLY, so a subpath import slips straight
      // past the same list — hence regexes here rather than the plain names.
      // This is why `pnpm build` is run in step one and not left until the end:
      // `vite dev` passes with this list wrong.
      external: DOMAIN_EXTERNALS.map(
        (p) => new RegExp(`^${p.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&')}(/.*)?$`),
      ),
    },
  },
});
