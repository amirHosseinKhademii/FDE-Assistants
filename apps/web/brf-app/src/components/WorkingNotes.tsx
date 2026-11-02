/**
 * The step trace, in the side panel. These are real events from the loop, in Swedish.
 * The uikit WorkingNotes carries English labels, so this page keeps its own.
 */
import type { TraceLine } from '../lib/use-ask';
import { Mono } from '@fde/uikit';

const LABEL = { call: 'frågar', result: 'får', retry: 'försöker om' } as const;

export function WorkingNotes({ lines, busy }: { lines: TraceLine[]; busy: boolean }) {
  if (!busy && lines.length === 0) return null;

  return (
    <section className="ui-rise card-aura p-4 sm:p-5">
      <h2 className="mb-4 flex items-center justify-between text-sm font-medium text-ui-dim">
        Så här går det till
        <span className="font-mono text-xs text-ui-faint">{lines.length} steg</span>
      </h2>
      <ol className="grid gap-4 border-l border-ui-line pl-4">
        {lines.map((line, i) => (
          <li key={i} className="ui-note-in grid gap-1">
            <p className="flex items-baseline gap-1.5 text-sm">
              <span
                className={
                  line.kind === 'result' ? (line.ok ? 'text-ui-ok' : 'text-ui-danger') : 'text-ui-accent'
                }
              >
                {LABEL[line.kind]}
              </span>
              <Mono className="text-xs text-ui-dim">{line.name}</Mono>
            </p>
            <p className="text-sm leading-snug text-ui-fg/90">{line.detail}</p>
            <p className="text-xs leading-relaxed text-ui-faint">{line.why}</p>
          </li>
        ))}
        {busy && <li className="text-sm text-ui-dim">Arbetar…</li>}
      </ol>
    </section>
  );
}
