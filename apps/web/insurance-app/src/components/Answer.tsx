/**
 * The answer, set as a document.
 *
 * Escalation comes FIRST and in its own block: Pillar 7 makes it a field, and a
 * screen that buries it in a paragraph throws that structure away. Conflicts
 * quote both sides and say plainly whether anything settled them. Every claim
 * carries its source and the exact wording.
 */
import { Mono, Quote } from './typography';

export function Answer({ data }: { data: any }) {
  const escalated = Boolean(data.escalate);

  return (
    <article className="grid gap-8">
      {escalated && (
        <div className="border border-ochre bg-ochre-wash px-5 py-4">
          <h2 className="mb-1.5 font-semibold text-ochre">A person has to decide this</h2>
          <p className="leading-relaxed">{data.escalate.reason}</p>
          <p className="mt-2 text-sm text-muted">Goes to {data.escalate.suggested_owner}.</p>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm text-muted">{escalated ? 'What it found' : 'Answer'}</h2>
        <p className="max-w-2xl text-2xl leading-snug tracking-tight">{data.answer ?? '—'}</p>
        {(data.policy_id || data.policy_form) && (
          <p className="mt-3 text-sm text-muted">
            {data.policy_id && (
              <>
                Policy <Mono className="text-xs">{data.policy_id}</Mono>
              </>
            )}
            {data.policy_form && (
              <>
                , form <Mono className="text-xs">{data.policy_form}</Mono>
              </>
            )}
          </p>
        )}
      </div>

      {data.conflicts?.length > 0 && (
        <div className="border-l-2 border-claret pl-5">
          <h2 className="mb-3 font-semibold text-claret">The documents disagree</h2>
          {data.conflicts.map((c: any, i: number) => (
            <div key={i} className="mb-5 last:mb-0">
              <p className="mb-2">{c.topic}</p>
              {c.positions.map((pos: any, j: number) => (
                <Quote key={j} source={pos.source} text={pos.says} />
              ))}
              <p className="mt-2 text-sm text-muted">
                {c.resolved_by ? (
                  <>
                    Settled by <Mono className="text-xs">{c.resolved_by}</Mono>.
                  </>
                ) : (
                  <span className="text-claret">
                    Nothing settles it, which is why this goes to a person.
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      )}

      {data.citations?.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm text-muted">
            Where each part came from ({data.citations.length})
          </h2>
          <div className="grid gap-5">
            {data.citations.map((c: any, i: number) => (
              <div key={i}>
                <p className="mb-1.5">{c.claim}</p>
                <Quote source={c.source} text={c.detail} />
              </div>
            ))}
          </div>
        </div>
      )}

      {data.unverified_claims?.length > 0 && (
        <div className="border-l-2 border-rule pl-5">
          <h2 className="mb-2 text-sm text-muted">Stated without a source</h2>
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
          {data.run.turns} turns, {data.run.toolCalls} tool calls,{' '}
          {data.run.inputTokens.toLocaleString()} in / {data.run.outputTokens.toLocaleString()} out,{' '}
          {(data.run.ms / 1000).toFixed(1)}s, {data.run.engine}
        </p>
      )}
    </article>
  );
}
