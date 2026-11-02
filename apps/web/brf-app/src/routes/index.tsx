/**
 * The page. Composition only: the header, the hero, the question box, the answer, and the
 * step trace in a side panel. useAsk owns the stream state.
 */
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Header } from '../components/Header';
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
      <Header />

      <main className="mx-auto max-w-6xl px-5 pb-24 sm:px-6">
        <section className="ui-rise pt-10 sm:pt-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-ui-warn/40 bg-ui-warn/10 px-3 py-1 text-xs text-ui-warn">
            <span className="h-1.5 w-1.5 rounded-full bg-ui-warn" aria-hidden />
            Demo med påhittade dokument. Skicka inga riktiga personuppgifter.
          </span>
          <h1 className="mt-5 font-mono text-3xl font-semibold tracking-tight sm:text-5xl">
            Låt föreningens AI-kollega ta frågorna.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ui-dim sm:text-lg">
            Boende och styrelse frågar när de vill, dygnet runt. AI-kollegan svarar ur föreningens egna
            stadgar och ordningsregler och visar vilken paragraf svaret kommer från, så förvaltaren slipper
            samma samtal om och om igen. När något kräver ett beslut skickar den vidare till styrelsen.
            Föreningens dokument stannar hos er och används aldrig för att träna någons AI.
          </p>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="grid gap-8">
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

            <section>
              {!answer && !failure && !busy && <EmptyState />}
              {failure && <Failure {...failure} />}
              {answer && <Answer data={answer} />}
            </section>
          </div>

          <aside className="lg:sticky lg:top-24">
            <WorkingNotes lines={trace} busy={busy} />
          </aside>
        </div>
      </main>
    </div>
  );
}
