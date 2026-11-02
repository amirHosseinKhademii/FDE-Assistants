/**
 * The question, the example questions, and the API key when the server asks for one.
 */
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

const field =
  'rounded-sm border border-rule bg-white px-3 py-2 outline-none focus:border-navy focus:ring-1 focus:ring-navy';

export function AskForm(p: AskFormProps) {
  return (
    <form onSubmit={p.onSubmit} className="grid gap-4 border-b border-rule py-7">
      <label className="grid gap-1.5">
        <span className="text-sm text-muted">Vad vill du veta?</span>
        <textarea
          value={p.question}
          onChange={(e) => p.onQuestion(e.target.value)}
          rows={2}
          className={`${field} w-full resize-y text-lg leading-snug`}
        />
      </label>

      <div className="grid gap-2">
        <span className="text-sm text-muted">Exempelfrågor</span>
        <ul className="flex flex-wrap gap-2">
          {EXAMPLE_QUESTIONS.map((ex) => (
            <li key={ex.text}>
              <button
                type="button"
                disabled={p.busy}
                onClick={() => p.onExample(ex.text)}
                className="rounded-sm border border-rule bg-white px-3 py-1.5 text-left text-sm transition-colors hover:border-navy disabled:opacity-40"
              >
                {ex.text}
                <span className="block text-xs text-muted">{ex.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        {p.showKey && (
          <label className="grid w-56 gap-1.5">
            <span className="text-sm text-muted">API-nyckel, krävs här</span>
            <input
              type="password"
              value={p.apiKey}
              onChange={(e) => p.onApiKey(e.target.value)}
              className={`${field} font-mono text-sm`}
            />
          </label>
        )}

        <button
          type="submit"
          disabled={p.busy || !p.question.trim()}
          className="rounded-sm bg-navy px-6 py-2.5 text-white transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          {p.busy ? 'Läser dokumenten…' : 'Fråga'}
        </button>
      </div>

      <p className="max-w-2xl text-sm leading-relaxed text-muted">
        Svaret bygger bara på föreningens dokument. Om dokumenten inte räcker till lämnas frågan till
        styrelsen, i stället för att gissa.
      </p>
    </form>
  );
}
