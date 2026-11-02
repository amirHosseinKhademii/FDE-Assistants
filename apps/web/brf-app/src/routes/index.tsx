/**
 * The page. Composition only: the banner, the header, the question form, the
 * working notes and the answer. useAsk owns the stream state.
 */
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { AskForm } from '../components/AskForm';
import { WorkingNotes } from '../components/WorkingNotes';
import { Answer } from '../components/Answer';
import { EmptyState, Failure } from '../components/states';
import { load, save } from '../lib/storage';
import { useAsk } from '../lib/use-ask';

export const Route = createFileRoute('/')({ component: BrfPage });

function BrfPage() {
  const [question, setQuestion] = useState(() =>
    load('question', 'Vilka rör i huset ansvarar föreningen för?'),
  );
  const [apiKey, setApiKey] = useState(() => load('apiKey', ''));
  // Shown only once the server refuses a request, so visitors are not asked for a key up front.
  const [keyNeeded, setKeyNeeded] = useState(false);

  const { busy, trace, answer, failure, ask } = useAsk(() => setKeyNeeded(true));

  function run(text: string) {
    save('question', text);
    save('apiKey', apiKey);
    void ask({ question: text, apiKey: apiKey || undefined });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    run(question);
  }

  return (
    <div className="min-h-screen">
      <div
        role="note"
        className="bg-claret px-6 py-2.5 text-center text-sm font-semibold text-white"
      >
        Demo med påhittade dokument. Skicka inga riktiga personuppgifter.
      </div>

      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-5">
          <div className="grid">
            <span className="font-mono text-xs tracking-tight text-muted">Brf Exempelgården</span>
            <h1 className="text-xl font-semibold tracking-tight">Brf Exempelgården, frågor och svar</h1>
          </div>
          <a
            href="https://veresk.se"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-2 text-sm text-muted hover:text-ink"
          >
            <img src="/veresk-logo.svg" alt="" width={24} height={24} />
            <span>Veresk</span>
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24">
        <AskForm
          question={question}
          onQuestion={setQuestion}
          apiKey={apiKey}
          onApiKey={setApiKey}
          showKey={keyNeeded || Boolean(apiKey)}
          busy={busy}
          onSubmit={onSubmit}
          onExample={(text) => {
            setQuestion(text);
            run(text);
          }}
        />

        <div className="grid gap-10 py-8 lg:grid-cols-[15rem_1fr]">
          <aside className="lg:pt-1">
            <WorkingNotes lines={trace} busy={busy} />
          </aside>

          <section>
            {!answer && !failure && !busy && <EmptyState />}
            {failure && <Failure {...failure} />}
            {answer && <Answer data={answer} />}
          </section>
        </div>
      </main>
    </div>
  );
}
