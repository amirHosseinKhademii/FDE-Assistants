/**
 * The build.
 *
 * ── THIS FILE USED TO SAY THERE WAS NOTHING TO EXTERNALISE ───────────────
 *
 * And that was the accurate statement about the engagement for as long as it
 * was true: no tool, no model call, no server route — the app read a generated
 * file and rendered it. The assessment desk changed that, and the comment went
 * with it rather than being left to rot.
 *
 * ── WHY A LIST OF PACKAGES NODE MUST LOAD RATHER THAN VITE BUNDLE ────────
 *
 * `@vantis/steering` is CommonJS compiled to `dist/`, and `@fde/agent` reaches
 * ESM-only packages through Node's `require(esm)` at module scope. Bundling
 * that either fails or produces a SECOND copy of the domain with different
 * module semantics — two loops pretending to be one. The rest are its native
 * and ESM-only dependencies, which have to resolve the same way.
 *
 * ── `@fde/guard` IS NAMED IN ITS OWN RIGHT ───────────────────────────────
 *
 * The API route imports it directly rather than through the domain package, so
 * the line above does not cover it. Left out, Vite inlines its CommonJS dist as
 * ESM and every request dies with `exports is not defined` — and `vite build`
 * SUCCEEDS in that state. This is pharma's scar, copied rather than re-earned.
 *
 * ── TWO FORMS OF THE SAME LIST, AND THAT IS NOT DUPLICATION ──────────────
 *
 * The dev server matches `ssr.external` by PACKAGE, so naming `@vantis/steering`
 * covers `@vantis/steering/assess`. Rolldown matches strings EXACTLY, so the
 * same subpath import walks straight past it — hence regexes for the build.
 * Which is why `pnpm build` is run early here and not left until the end:
 * `vite dev` passes with this list wrong.
 */
import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const DOMAIN_EXTERNALS = [
  '@vantis/steering',
  '@fde/guard',
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

  /**
   * ── THE DEV SERVER HAS TO BE REACHABLE FROM OUTSIDE THIS PROCESS ────────
   *
   * Vite binds loopback by default, and `--host` on the command line was being
   * swallowed — the banner kept printing "use --host to expose" with the flag
   * right there. An editor's built-in browser reaches the page through a
   * forwarded port on a DIFFERENT host, so a loopback-only bind answers the
   * terminal's curl and shows the editor a blank screen, which is a horrible
   * thing to debug from the outside.
   *
   * `allowedHosts: true` goes with it. Vite refuses requests whose Host header
   * it does not recognise, and a forwarded port arrives under a hostname this
   * config cannot know in advance. It relaxes the DEV server only — `vite
   * build` never reads this block — and the guard on every API route is
   * unaffected: it is fail-closed and does not care which host asked.
   *
   * `strictPort` because the alternative is worse than a failure. Without it a
   * second `pnpm steering:dev` silently moves to 3401 and you are left with a
   * browser pointed at an empty 3400 and no error anywhere.
   */
  server: {
    host: true,
    port: 3400,
    strictPort: true,
    allowedHosts: true,
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
