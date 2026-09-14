/**
 * THE CHECK CONTRACT — and the two checks that need no domain at all.
 *
 * A check answers "is this box empty when it should not be", NOT "was this a
 * good answer". The second is a judgment call, needs a human or an LLM judge,
 * costs money, and disagrees with itself between runs. The first is a script:
 * free, instant, identical every time. Anything you can push into the first
 * category, push.
 *
 * WHAT THIS PACKAGE PROVIDES: the types, the registry, and the checks that read
 * the TOOL TRACE rather than the answer — because a trace is the same shape in
 * every domain, while an answer is not.
 *
 * WHAT YOUR APPLICATION PROVIDES: every check that reads a field of YOUR answer
 * type, and the vocabulary those checks speak. There is no useful default.
 */

export interface CheckResult {
  pass: boolean;
  /**
   * Printed on failure, and the only thing that tells you what to do next.
   * "cited [PA-2023-01] but not PA-END-2024-03" is actionable; a red X is not.
   * Returned on PASS too, so a passing check can be audited for passing for the
   * right reason.
   */
  detail: string;
}

/**
 * What a check gets to look at.
 *
 * IT USED TO BE JUST THE ANSWER, and that was a hole. Every check could ask
 * "does the answer say $50" and none could ask "did it look up the record
 * before searching". A run that skipped the lookup entirely, got lucky, and
 * produced a right-looking answer scored GREEN — and that is not hypothetical.
 *
 * The tool trace was always there; the runner simply never handed it over.
 */
export interface CheckContext<A> {
  answer: A;
  /** Every tool call the loop made, in order, flattened across turns. */
  toolCalls: Array<{ name: string; ok: boolean }>;
}

export type Check<A> = (ctx: CheckContext<A>) => CheckResult;

// ---------------------------------------------------------------------------
// Checks that read the TOOL TRACE — genuinely domain-neutral
// ---------------------------------------------------------------------------

/**
 * A specific tool must be called BEFORE any other.
 *
 * The general form of "look up who this is about before searching for what
 * applies to them". A run that skips it can still produce a right-looking
 * answer, because a generic document usually says something plausible — which
 * is exactly why the answer alone cannot catch it.
 */
export const callsFirst =
  <A>(name: string): Check<A> =>
  ({ toolCalls }) => {
    if (toolCalls.length === 0) {
      return {
        pass: false,
        detail: 'called no tools at all — the answer came from the model, not the corpus',
      };
    }
    const first = toolCalls[0].name;
    return first === name
      ? { pass: true, detail: `called ${name} first` }
      : {
          pass: false,
          detail:
            `first tool call was ${first}, not ${name} — ` +
            `order: [${toolCalls.map((t) => t.name).join(' → ')}]`,
        };
  };

/** Was this tool called at all? For asserting a question reached the right corpus. */
export const callsTool =
  <A>(name: string): Check<A> =>
  ({ toolCalls }) => {
    const hit = toolCalls.some((t) => t.name === name);
    return hit
      ? { pass: true, detail: `called ${name}` }
      : {
          pass: false,
          detail:
            `never called ${name}; called: ` +
            `[${[...new Set(toolCalls.map((t) => t.name))].join(', ') || 'nothing'}]`,
        };
  };

// ---------------------------------------------------------------------------
// The registry
// ---------------------------------------------------------------------------

export interface CheckRegistry<A> {
  /** Turn a spec string from the case file into a function. */
  resolve(spec: string): Check<A>;
  /** Every known check name, for the severity self-test to assert against. */
  names(): string[];
}

/**
 * Build a registry from a domain's checks.
 *
 * The runner stays deliberately dumb about what any check DOES — adding one
 * means writing a function and a map entry, not touching the runner.
 *
 * AN UNKNOWN SPEC FAILS LOUDLY rather than being skipped. A typo'd check name
 * that silently passes is a test you think you have and do not, and it is worse
 * than no test because it shows green.
 */
export function createCheckRegistry<A>(opts: {
  /** Checks taking no argument: `escalates`, `has_answer`. */
  bare: Record<string, Check<A>>;
  /** Checks taking one: `cites_form:PP 00 01 06 24`. */
  parameterised: Record<string, (arg: string) => Check<A>>;
}): CheckRegistry<A> {
  // The two trace checks are always available: they need nothing from a domain.
  const bare: Record<string, Check<A>> = { ...opts.bare };
  const parameterised: Record<string, (arg: string) => Check<A>> = {
    calls_tool: (name) => callsTool<A>(name),
    calls_first: (name) => callsFirst<A>(name),
    ...opts.parameterised,
  };

  return {
    resolve(spec: string): Check<A> {
      // Split on the FIRST colon only: an argument may contain one.
      const idx = spec.indexOf(':');
      const name = idx === -1 ? spec : spec.slice(0, idx);
      const arg = idx === -1 ? '' : spec.slice(idx + 1);

      if (arg && parameterised[name]) return parameterised[name](arg);
      if (!arg && bare[name]) return bare[name];

      return () => ({
        pass: false,
        detail:
          `unknown check "${spec}". Known: ` +
          [...Object.keys(bare), ...Object.keys(parameterised).map((k) => `${k}:<arg>`)].join(', '),
      });
    },
    names() {
      return [...Object.keys(bare), ...Object.keys(parameterised)];
    },
  };
}
