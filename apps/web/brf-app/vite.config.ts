/**
 * The whole build, in one file. Same shape as insurance-app, with the BRF engine
 * in place of the insurance domain.
 *
 * `@brf/ai` is CommonJS and loads ESM-only packages through require(esm), so it
 * is left to Node rather than bundled. The rest are native or ESM-only
 * dependencies that must resolve the same way at runtime. Rolldown matches
 * strings exactly, so each entry also gets a regex that covers its subpaths.
 */
import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const DOMAIN_EXTERNALS = [
  '@brf/ai',
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
    tanstackStart({ server: { entry: './server.ts' } }),
    react(),
    tailwindcss(),
  ],

  ssr: {
    external: DOMAIN_EXTERNALS,
  },

  build: {
    rolldownOptions: {
      external: DOMAIN_EXTERNALS.map((p) => new RegExp(`^${p.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&')}(/.*)?$`)),
    },
  },
});
