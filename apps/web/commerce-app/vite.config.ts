/**
 * Thornbury Goods' build.
 *
 * ── THIS APP HOLDS THE MCP TOKEN AND MODEL KEY ON THE SERVER ────────────
 *
 * The `/api/ask` route keeps `COMMERCE_MCP_TOKEN` and model keys server-side:
 * the browser sees only events, never the credentials. That is a demo decision
 * (2026-10-04), not a hard rule. Every package in the `ssr.external` list below
 * must not be bundled — bundling a database driver into a client chunk is how
 * a secret gets shipped to a reader.
 */
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { defineConfig, loadEnv as viteLoadEnv } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(__dirname, '../../../../');
// Also use Vite's loadEnv for the build process
viteLoadEnv('development', repoRoot, '');

const DOMAIN_EXTERNALS = [
  '@thornbury/commerce',
  '@fde/agent',
  '@fde/grounding',
  '@fde/foundry',
  '@fde/guard',
  '@fde/telemetry',
  '@fde/estate',
  '@mastra/core',
  '@ai-sdk/openai-compatible',
  'ai',
  '@openai/agents',
  'openai',
  '@azure/identity',
  '@modelcontextprotocol/client',
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
