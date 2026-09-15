/**
 * Stacked blocks — used for the one request body a turn actually is.
 *
 * IT IS DRAWN AS A STACK OF BOXES BECAUSE THAT IS WHAT IT IS. There is no
 * hidden layer between these blocks, nothing summarises or re-ranks between
 * them, and the whole of `docs/AUGMENTED-GENERATION.md` §1 is the claim that
 * the context window is exactly this and nothing else. A flow diagram with
 * arrows would imply processing that does not happen.
 *
 * ONE BLOCK GROWS AND THE REST DO NOT, and `grows` marks it. That asymmetry is
 * the bill: the system prompt and the tool schemas are re-sent unchanged every
 * turn, so the cost of a question is not how much is assembled but how many
 * times it is assembled.
 */
export function Stack({
  blocks,
}: {
  blocks: Array<{ label: string; lines: string[]; meta?: string; grows?: boolean }>;
}) {
  return (
    <div className="space-y-2">
      {blocks.map((b) => (
        <div
          key={b.label}
          className="rounded-lg border bg-ui-bg px-4 py-3"
          style={{
            borderColor: b.grows
              ? 'color-mix(in oklab, var(--lesson) 40%, var(--color-ui-line))'
              : 'var(--color-ui-line)',
          }}
        >
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span
              className="font-mono text-[0.6875rem] tracking-[0.08em] uppercase"
              style={{ color: b.grows ? 'var(--lesson)' : 'var(--color-ui-faint)' }}
            >
              {b.label}
            </span>
            {b.meta && <span className="font-mono text-[0.6875rem] text-ui-faint">{b.meta}</span>}
          </p>
          <ul className="mt-2 space-y-1">
            {b.lines.map((l) => (
              <li key={l} className="font-mono text-[0.78125rem] leading-relaxed text-ui-dim">
                {l}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
