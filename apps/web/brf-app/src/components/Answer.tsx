/**
 * The answer, set as a document. Escalation comes first. Conflicts quote both
 * sides. Every claim carries its document and § number and the exact wording.
 */
import { Mono, Quote } from './typography';

export function Answer({ data }: { data: any }) {
  const escalated = Boolean(data.escalate);

  return (
    <article className="grid gap-8">
      {escalated && (
        <div className="border border-ochre bg-ochre-wash px-5 py-4">
          <h2 className="mb-1.5 font-semibold text-ochre">Styrelsen måste avgöra detta</h2>
          <p className="leading-relaxed">{data.escalate.reason}</p>
          <p className="mt-2 text-sm text-muted">Går till: {data.escalate.suggested_owner}.</p>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm text-muted">{escalated ? 'Det dokumenten säger' : 'Svar'}</h2>
        <p className="max-w-2xl text-2xl leading-snug tracking-tight">{data.answer ?? '—'}</p>
      </div>

      {data.conflicts?.length > 0 && (
        <div className="border-l-2 border-claret pl-5">
          <h2 className="mb-3 font-semibold text-claret">Dokumenten säger olika saker</h2>
          {data.conflicts.map((c: any, i: number) => (
            <div key={i} className="mb-5 last:mb-0">
              <p className="mb-2">{c.topic}</p>
              {c.positions.map((pos: any, j: number) => (
                <Quote key={j} source={`${pos.file}, ${pos.section}`} text={pos.says} />
              ))}
              <p className="mt-2 text-sm text-muted">
                {c.resolved_by ? (
                  <>
                    Avgörs av <Mono className="text-xs">{c.resolved_by}</Mono>.
                  </>
                ) : (
                  <span className="text-claret">
                    Inget dokument anger vilket som gäller, därför går frågan till styrelsen.
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      )}

      {data.citations?.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm text-muted">Källor ({data.citations.length})</h2>
          <div className="grid gap-5">
            {data.citations.map((c: any, i: number) => (
              <div key={i}>
                <p className="mb-1.5">{c.claim}</p>
                <Quote source={`${c.file}, ${c.section}`} text={c.detail} />
              </div>
            ))}
          </div>
        </div>
      )}

      {data.unverified_claims?.length > 0 && (
        <div className="border-l-2 border-rule pl-5">
          <h2 className="mb-2 text-sm text-muted">Påstått utan källa</h2>
          <ul className="grid gap-2">
            {data.unverified_claims.map((u: string, i: number) => (
              <li key={i} className="leading-relaxed">
                {u}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.run && (
        <p className="border-t border-rule pt-4 font-mono text-xs text-muted">
          {data.run.toolCalls} sökningar, {(data.run.ms / 1000).toFixed(1)} s
        </p>
      )}
    </article>
  );
}
