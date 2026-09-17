/**
 * Which engines can actually serve the configured provider.
 *
 * ── THE PICKER HAS TO KNOW THIS, OR IT OFFERS GUARANTEED FAILURES ─────────
 *
 * `docs/ENGINES.md` records the open problem directly: each desk has an engine
 * picker and no provider picker, and *"the two controls are not independent — a
 * provider picker has to disable the engines that cannot serve the chosen
 * provider, or it will offer combinations that are guaranteed to fail."*
 *
 * This is that list, so a dropdown can grey an option out and SAY WHY rather
 * than letting someone choose it and watch a 400 come back.
 *
 * ── AND THE ANSWERS CHANGED TODAY ─────────────────────────────────────────
 *
 * `langgraph` was hosted-incompatible until 2026-09-17, when two wire-level
 * repairs landed — a dropped `thought_signature` and a request ending with a
 * model turn. It is listed as usable because it was measured answering REC-002
 * correctly, not because the fix looked right.
 *
 * `sdk` remains unusable on `hosted` and that is DELIBERATE rather than
 * unfinished: it drives the Responses API, which only OpenAI and Azure
 * implement. It refuses by name instead of failing at the transport.
 */
import type { LoopChoice } from '@fde/agent';

export interface EngineOption {
  id: LoopChoice;
  label: string;
  /** False when this engine cannot serve the configured provider. */
  usable: boolean;
  /** Shown in the picker. Present whether usable or not — the why matters both ways. */
  note: string;
}

/** The provider the environment is configured for. */
function provider(): string {
  return process.env.LLM_PROVIDER?.trim().toLowerCase() || 'azure';
}

/**
 * The three engines, with their standing against the CURRENT provider.
 *
 * Read per call rather than computed once: a server that built this list at
 * import time would keep serving it after the environment changed, and the
 * cost of being wrong is a picker offering an option that cannot work.
 */
export function availableEngines(): EngineOption[] {
  const hosted = provider() === 'hosted';
  const local = provider() === 'local';

  return [
    {
      id: 'mastra',
      label: 'Mastra',
      usable: true,
      note: hosted
        ? 'Builds its model against chat-completions and carries the whole message back.'
        : 'Works on every provider configured here.',
    },
    {
      id: 'langgraph',
      label: 'LangGraph',
      // Measured on hosted. On `local` it is untested, and the two wire repairs
      // are gated on `hosted`, so a local server needing either would fail the
      // same way Gemini did — which is a reason to say so, not to guess.
      usable: !local,
      note: local
        ? 'Untested against a local server — the hosted round-trip repairs do not apply there.'
        : hosted
          ? 'Reaches Gemini since 2026-09-17, after two wire-level repairs.'
          : 'Works on this provider.',
    },
    {
      id: 'sdk',
      label: 'OpenAI Agents SDK',
      usable: !hosted && !local,
      note:
        hosted || local
          ? 'Drives the Responses API, which only OpenAI and Azure implement. It refuses by name rather than failing at the transport.'
          : 'The default engine.',
    },
  ];
}

/**
 * Resolve a requested engine, refusing one that cannot serve the provider.
 *
 * REFUSING IS THE POINT. A caller that asked for `sdk` on Gemini has asked for
 * something that cannot work, and quietly substituting a different engine would
 * answer the question with a system the asker did not choose — which is worse
 * than an error, because the answer would look fine.
 */
export function resolveEngine(requested?: string): { engine: LoopChoice } | { error: string } {
  const options = availableEngines();
  if (!requested) return { engine: (options.find((o) => o.usable)?.id ?? 'mastra') as LoopChoice };

  const found = options.find((o) => o.id === requested.trim().toLowerCase());
  if (!found) {
    return { error: `"${requested}" is not an engine. Choose one of: ${options.map((o) => o.id).join(', ')}.` };
  }
  if (!found.usable) {
    return { error: `${found.label} cannot serve LLM_PROVIDER=${provider()}. ${found.note}` };
  }
  return { engine: found.id };
}
