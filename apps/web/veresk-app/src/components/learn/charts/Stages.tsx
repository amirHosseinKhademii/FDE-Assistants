/**
 * A pipeline, drawn as what comes OUT of each stage rather than what each stage
 * is called.
 *
 * WHY THAT WAY ROUND. `docs/RETRIEVAL.md` §2 draws the same pipeline and its
 * left column is the verbs — LOAD, PARSE, CHUNK, EMBED, INDEX — while the shape
 * of the data between them is what the arrows carry. A box per verb teaches the
 * vocabulary; a box per intermediate teaches what the machine is holding at
 * that moment, and only the second lets a reader answer "so what is a chunk".
 *
 * `rule` is the thing that stage got wrong once. Every one of them in this
 * repo's pipeline was set by a bug, and a stage with no scar is a stage nobody
 * has run in anger.
 */
export function Stages({
  stages,
}: {
  stages: Array<{ verb: string; out: string; does: string; rule?: string }>;
}) {
  return (
    <ol className="space-y-0">
      {stages.map((s, i) => (
        <li key={s.verb} className="relative grid grid-cols-[5.5rem_1fr] gap-4 pb-6 last:pb-0">
          {/* The thread joining the stages, stopping at the last one — the same
              rule as the numbered steps: a line running past the final box
              promises another. */}
          {i < stages.length - 1 && (
            <span
              aria-hidden
              className="absolute top-6 bottom-0 left-[5.5rem] w-px"
              style={{ background: 'var(--color-ui-line)' }}
            />
          )}

          <span
            className="pt-1 text-right font-mono text-[0.6875rem] tracking-[0.08em] uppercase"
            style={{ color: 'var(--lesson)' }}
          >
            {s.verb}
          </span>

          <div className="relative -ml-[0.4375rem] pl-6">
            <span
              aria-hidden
              className="absolute top-[0.4375rem] left-0 h-[0.4375rem] w-[0.4375rem] rounded-full"
              style={{ background: 'var(--lesson)' }}
            />
            <p className="font-mono text-[0.8125rem] leading-snug text-ui-fg">{s.out}</p>
            <p className="mt-1.5 max-w-[58ch] text-[0.8125rem] leading-relaxed text-ui-dim">{s.does}</p>
            {s.rule && (
              <p className="mt-2 max-w-[58ch] border-l border-ui-line pl-3 text-[0.75rem] leading-relaxed text-ui-faint">
                {s.rule}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
