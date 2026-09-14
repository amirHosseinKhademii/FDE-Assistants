/**
 * The coverage desk — composition only.
 *
 * An adjuster has a claim open and a question about what the policy covers.
 * Today that costs twelve minutes of reading. This answers in under a minute
 * from the insurer's own forms, quoting the wording it used.
 *
 * Everything with an opinion lives elsewhere: `useAsk` owns the stream state,
 * `lib/explain.ts` owns the plain-English notes, and the components own how it
 * looks. This file decides only what appears where — the same separation the
 * domain makes one level down, where `askCoverage()` owns the assembly and the
 * surfaces only render.
 */
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { AskForm } from '../components/AskForm';
import { WorkingNotes } from '../components/WorkingNotes';
import { Answer } from '../components/Answer';
import { EmptyState, Failure } from '../components/states';
import { load, save } from '../lib/storage';
import { useAsk } from '../lib/use-ask';

export const Route = createFileRoute('/')({ component: CoverageDesk });

function CoverageDesk() {
  const [question, setQuestion] = useState(() =>
    load('question', 'how much rental car reimbursement is covered per day and for how many days?'),
  );
  const [policy, setPolicy] = useState(() => load('policy', 'AUT-4471'));
  const [loop, setLoop] = useState(() => load('loop', 'sdk'));
  const [apiKey, setApiKey] = useState(() => load('apiKey', ''));
  // Hidden until the server actually refuses a request: an unconfigured guard
  // should not make every user wonder what credential they are missing.
  const [keyNeeded, setKeyNeeded] = useState(false);

  const { busy, trace, answer, failure, ask } = useAsk(() => setKeyNeeded(true));

  const people = useQuery({
    queryKey: ['policyholders', apiKey],
    queryFn: async () => {
      const res = await fetch('/api/policyholders', {
        headers: apiKey ? { 'x-api-key': apiKey } : {},
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 503) setKeyNeeded(true);
        return [] as any[];
      }
      return (await res.json()) as any[];
    },
    staleTime: 5 * 60 * 1000, // the corpus does not change while you look at it
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    save('question', question);
    save('policy', policy);
    save('apiKey', apiKey);
    save('loop', loop);
    void ask({ question, policy: policy || undefined, loop, apiKey: apiKey || undefined });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-5xl flex-wrap items-baseline gap-x-4 gap-y-1 px-6 py-5">
          <span className="font-mono text-xs tracking-tight text-muted">Meridian Mutual</span>
          <h1 className="text-xl font-semibold tracking-tight">Coverage desk</h1>
          <p className="ml-auto max-w-md text-sm leading-snug text-muted">
            Answers from the insurer's own forms, with the wording each answer relied on.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24">
        <AskForm
          question={question}
          onQuestion={setQuestion}
          policy={policy}
          onPolicy={setPolicy}
          loop={loop}
          onLoop={setLoop}
          apiKey={apiKey}
          onApiKey={setApiKey}
          showKey={keyNeeded || Boolean(apiKey)}
          people={people}
          busy={busy}
          onSubmit={onSubmit}
        />

        <div className="grid gap-10 py-8 lg:grid-cols-[15rem_1fr]">
          <aside className="lg:pt-1">
            <WorkingNotes lines={trace} busy={busy} />
          </aside>

          <section>
            {!answer && !failure && !busy && <EmptyState count={people.data?.length} />}
            {failure && <Failure {...failure} />}
            {answer && <Answer data={answer} />}
          </section>
        </div>
      </main>
    </div>
  );
}
