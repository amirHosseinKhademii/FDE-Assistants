/**
 * The question box, the example chips, and the API key when the server asks for one.
 */
import { Field, SubmitButton, SearchIcon, KeyIcon } from '@fde/uikit';
import { EXAMPLE_QUESTIONS } from '../lib/examples';

export interface AskFormProps {
  question: string;
  onQuestion: (v: string) => void;
  apiKey: string;
  onApiKey: (v: string) => void;
  showKey: boolean;
  busy: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onExample: (text: string) => void;
}

export function AskForm(p: AskFormProps) {
  return (
    <form onSubmit={p.onSubmit} className="ui-rise card-aura lift-in grid gap-5 p-4 sm:p-6">
      <Field label="Fråga" labelIcon={<SearchIcon />}>
        <textarea
          value={p.question}
          onChange={(e) => p.onQuestion(e.target.value)}
          rows={2}
          className="ui-control w-full resize-y"
        />
      </Field>

      <div className="grid gap-2">
        <span className="text-xs font-medium tracking-wide text-ui-dim uppercase">Exempelfrågor</span>
        <ul className="flex flex-wrap gap-2">
          {EXAMPLE_QUESTIONS.map((ex) => (
            <li key={ex.text}>
              <button
                type="button"
                disabled={p.busy}
                onClick={() => p.onExample(ex.text)}
                className="rounded-xl border border-ui-line bg-ui-surface px-3 py-2 text-left text-sm text-ui-fg transition-colors hover:border-ui-accent/50 disabled:opacity-40"
              >
                {ex.text}
                <span className="mt-0.5 block text-xs text-ui-faint">{ex.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        {p.showKey ? (
          <Field label="API-nyckel, krävs här" labelIcon={<KeyIcon />}>
            <input
              type="password"
              value={p.apiKey}
              onChange={(e) => p.onApiKey(e.target.value)}
              className="ui-control w-full font-mono"
            />
          </Field>
        ) : (
          <p className="text-sm leading-relaxed text-ui-dim">
            Svaret bygger bara på föreningens dokument. Om dokumenten inte räcker till säger assistenten det
            och lämnar frågan till styrelsen.
          </p>
        )}
        <SubmitButton busy={p.busy} disabled={p.busy || !p.question.trim()} busyLabel="Läser dokumenten…">
          Fråga
        </SubmitButton>
      </div>
    </form>
  );
}
