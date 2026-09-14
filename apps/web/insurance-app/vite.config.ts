/**
 * The whole build, in one file.
 *
 * `tanstackStart()` does three jobs: it watches `src/routes/` and generates
 * `src/routeTree.gen.ts` (which is what makes links type-safe), it wires the
 * client and server entry points, and it builds a Node server into `.output/`.
 *
 * `react()` is the plain Vite React plugin — JSX and fast refresh, nothing more.
 */
import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Packages Node must load, not Vite bundle.
 *
 * `@claims/insurance` is CommonJS and `loop-mastra.ts` calls require() at module
 * scope to reach ESM-only packages through Node 22's require(esm). Bundling that
 * either fails or produces a second copy of the domain with different module
 * semantics — two loops pretending to be one. The rest are its native and
 * ESM-only dependencies, which must resolve the same way.
 */
const DOMAIN_EXTERNALS = [
  '@claims/insurance',
  // CommonJS, like the domain package — Vite's SSR runner would evaluate its
  // dist as ESM and die on `ReferenceError: exports is not defined`. pharma-app
  // has carried this line since it started using the guard; insurance-app
  // reached for `@claims/insurance/security` instead, a module that has never
  // existed on any ref, so it never got here to find out.
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

  ssr: {
    /**
     * Leave the domain package to Node instead of bundling it.
     *
     * `src/` is CommonJS and `loop-mastra.ts` calls require() at module scope to
     * load ESM-only packages (`ai`, `@ai-sdk/openai-compatible`) through Node
     * 22's require(esm). Bundling that would either fail outright or produce a
     * second copy of the domain with different module semantics — two loops that
     * are supposed to be one. Externalising means the server route imports the
     * same built CommonJS that `pnpm ask` runs, loaded the same way.
     */
    external: DOMAIN_EXTERNALS,
  },

  build: {
    rolldownOptions: {
      // The dev server honours `ssr.external`, which matches by PACKAGE, so
      // `@claims/insurance/loop` is covered by naming `@claims/insurance`. Rolldown
      // matches strings EXACTLY, so a subpath import slips straight past the
      // same list — hence regexes here rather than the plain names.
      external: DOMAIN_EXTERNALS.map((p) => new RegExp(`^${p.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&')}(/.*)?$`)),
    },
  },
});
