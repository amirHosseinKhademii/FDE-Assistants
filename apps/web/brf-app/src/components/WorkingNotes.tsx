/**
 * What the assistant is doing, as it does it, in the margin. These are real events
 * from the loop, not a progress animation.
 */
import type { TraceLine } from '../lib/use-ask';
import { Mono } from './typography';

export function WorkingNotes({ lines, busy }: { lines: TraceLine[]; busy: boolean }) {
  if (!busy && lines.length === 0) return null;

  return (
    <>
      <h2 className="mb-3 text-sm text-muted">Så här går det till</h2>
      <ol className="grid gap-4 border-l border-rule pl-4">
        {lines.map((line, i) => (
          <li key={i} className="note-in grid gap-1">
            <p className="flex items-baseline gap-1.5 text-sm">
              <span
                className={
                  line.kind === 'result' ? (line.ok ? 'text-moss' : 'text-claret') : 'text-navy'
                }
              >
                {line.kind === 'call' ? 'frågar' : line.kind === 'retry' ? 'försöker om' : 'får'}
              </span>
              <Mono className="text-xs">{line.name}</Mono>
            </p>
            <p className="text-sm leading-snug">{line.detail}</p>
            <p className="text-xs leading-relaxed text-muted">{line.why}</p>
          </li>
        ))}
        {busy && <li className="text-sm text-muted">Arbetar…</li>}
      </ol>
    </>
  );
}
