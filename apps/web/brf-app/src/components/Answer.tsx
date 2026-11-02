/**
 * The answer, set as a board file. A refusal is a result, shown as one. Escalation comes
 * first. Conflicts quote both sides. Each source is a card with its document and §.
 */
import { Mono, Panel } from '@fde/uikit';

export function Answer({ data }: { data: any }) {
  if (data.refusal) {
    return (
      <article className="ui-rise grid gap-6">
        <Panel tone="warn" title="Står inte i dokumenten" count={undefined}>
          <div className="grid gap-3 px-5 py-5">
            <p className="text-xl leading-snug text-ui-fg">{data.refusalText}</p>
            {data.escalate && (
              <>
                <p className="leading-relaxed text-ui-dim">{data.escalate.reason}</p>
                <p className="text-sm text-ui-faint">Går till: {data.escalate.suggested_owner}.</p>
              </>
            )}
          </div>
        </Panel>
        <RunLine run={data.run} />
      </article>
    );
  }

  const escalated = Boolean(data.escalate);

  return (
    <article className="ui-rise grid gap-6">
      {escalated && (
        <Panel tone="warn" title="Styrelsen måste avgöra detta">
          <div className="grid gap-2 px-5 py-4">
            <p className="leading-relaxed text-ui-fg/90">{data.escalate.reason}</p>
            <p className="text-sm text-ui-faint">Går till: {data.escalate.suggested_owner}.</p>
          </div>
        </Panel>
      )}

      <section className="card-aura p-5 sm:p-6">
        <h2 className="mb-2 font-mono text-xs tracking-widest text-ui-faint uppercase">
          {escalated ? 'Det dokumenten säger' : 'Svar'}
        </h2>
        <p className="text-xl leading-relaxed text-ui-fg sm:text-2xl">{data.answer ?? '—'}</p>
      </section>

      {data.conflicts?.length > 0 && (
        <Panel tone="danger" title="Dokumenten säger olika saker" count={data.conflicts.length}>
          <div className="grid gap-5 px-5 py-4">
            {data.conflicts.map((c: any, i: number) => (
              <div key={i} className="grid gap-2">
                <p className="text-ui-fg">{c.topic}</p>
                {c.positions.map((pos: any, j: number) => (
                  <blockquote key={j} className="border-l-2 border-ui-line-lit pl-4 text-sm leading-relaxed text-ui-fg/90">
                    {pos.says}
                    <span className="mt-1 block font-mono text-xs text-ui-faint">
                      {pos.file} · {pos.section}
                    </span>
                  </blockquote>
                ))}
                <p className="text-sm text-ui-dim">
                  {c.resolved_by ? (
                    <>
                      Avgörs av <Mono className="text-xs text-ui-fg">{c.resolved_by}</Mono>.
                    </>
                  ) : (
                    <span className="text-ui-danger">
                      Inget dokument anger vilket som gäller, därför går frågan till styrelsen.
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {data.citations?.length > 0 && (
        <section className="grid gap-3">
          <h2 className="font-mono text-xs tracking-widest text-ui-faint uppercase">
            Källor ({data.citations.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {data.citations.map((c: any, i: number) => (
              <article key={i} className="grid content-start gap-3 rounded-xl border border-ui-line bg-ui-surface p-4">
                <div className="flex items-center justify-between gap-2">
                  <Mono className="truncate text-xs text-ui-accent">{c.file}</Mono>
                  <span className="shrink-0 rounded-full border border-ui-accent/30 bg-ui-accent/10 px-2.5 py-0.5 font-mono text-xs text-ui-accent">
                    {c.section}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-ui-fg/90">{c.claim}</p>
                <blockquote className="border-l-2 border-ui-line-lit pl-3 text-sm leading-relaxed text-ui-dim">
                  {c.detail}
                </blockquote>
              </article>
            ))}
          </div>
        </section>
      )}

      {data.unverified_claims?.length > 0 && (
        <Panel tone="neutral" title="Påstått utan källa" count={data.unverified_claims.length}>
          <ul className="grid gap-2 px-5 py-4">
            {data.unverified_claims.map((u: string, i: number) => (
              <li key={i} className="leading-relaxed text-ui-fg/90">
                {u}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <RunLine run={data.run} />
    </article>
  );
}

function RunLine({ run }: { run?: { toolCalls: number; ms: number } }) {
  if (!run) return null;
  return (
    <p className="border-t border-ui-line pt-4 font-mono text-xs text-ui-faint">
      {run.toolCalls} {run.toolCalls === 1 ? 'sökning' : 'sökningar'} · {(run.ms / 1000).toFixed(1)} s
    </p>
  );
}
