/**
 * The question, the customer, and the engine.
 *
 * The customer dropdown is a STAND-IN FOR THE CLAIMS SYSTEM. In a real
 * deployment the adjuster is already looking at a claim and the host passes the
 * policy id as context — she never picks from a list. The model never sees this
 * list either: a person picks, and the pick becomes the `policy` parameter, so
 * a near-match can never become an answer.
 */
import { Mono } from './typography';

export interface AskFormProps {
  question: string;
  onQuestion: (v: string) => void;
  policy: string;
  onPolicy: (v: string) => void;
  loop: string;
  onLoop: (v: string) => void;
  apiKey: string;
  onApiKey: (v: string) => void;
  showKey: boolean;
  people: { data?: any[]; isLoading: boolean };
  busy: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

const field =
  'rounded-sm border border-rule bg-white px-3 py-2 outline-none focus:border-navy focus:ring-1 focus:ring-navy';

export function AskForm(p: AskFormProps) {
  const chosen = p.people.data?.find((x: any) => x.policyId === p.policy);

  return (
    <form onSubmit={p.onSubmit} className="grid gap-4 border-b border-rule py-7">
      <label className="grid gap-1.5">
        <span className="text-sm text-muted">What do you need to know?</span>
        <textarea
          value={p.question}
          onChange={(e) => p.onQuestion(e.target.value)}
          rows={2}
          className={`${field} w-full resize-y text-lg leading-snug`}
        />
      </label>

      <div className="flex flex-wrap items-end gap-4">
        <label className="grid min-w-64 flex-1 gap-1.5">
          <span className="text-sm text-muted">
            Customer{' '}
            <span className="text-xs">
              {p.people.isLoading ? 'loading…' : `${p.people.data?.length ?? 0} on file`}
            </span>
          </span>
          <select value={p.policy} onChange={(e) => p.onPolicy(e.target.value)} className={field}>
            <option value="">Ask without a policy id</option>
            {(p.people.data ?? []).map((x: any) => (
              <option key={x.policyId} value={x.policyId}>
                {x.name} — {x.policyId}
              </option>
            ))}
          </select>
        </label>

        <label className="grid w-40 gap-1.5">
          <span className="text-sm text-muted">Engine</span>
          <select value={p.loop} onChange={(e) => p.onLoop(e.target.value)} className={field}>
            <option value="sdk">Agents SDK</option>
            <option value="mastra">Mastra</option>
          </select>
        </label>

        {p.showKey && (
          <label className="grid w-56 gap-1.5">
            <span className="text-sm text-muted">API key, required here</span>
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
          {p.busy ? 'Reading the forms…' : 'Ask'}
        </button>
      </div>

      <p className="max-w-2xl text-sm leading-relaxed text-muted">
        {chosen ? (
          <>
            {chosen.name} is on form <Mono className="text-xs">{chosen.form}</Mono>, which is what
            decides the numbers — twelve near-identical forms each carry a section 4.4 saying
            something different. Choosing a customer here stands in for the claims system, which
            supplies the policy id in a real deployment.
          </>
        ) : (
          <>
            With no customer chosen, the assistant will ask for a policy id rather than guess one.
            That is deliberate: the alternative is a confident answer about the wrong person.
          </>
        )}
      </p>
    </form>
  );
}
