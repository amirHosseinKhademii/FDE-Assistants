/**
 * The release desk — composition only.
 *
 * NOT A ROUTE. `routes/index.tsx` is the route and does nothing but name this
 * component. The split is worth the extra file because a route file is the one
 * place a framework's conventions leak in — loaders, search params, error
 * boundaries, server handlers — and none of that is a decision about the desk.
 * Keeping them apart means the page can be rendered anywhere, including from a
 * second route, without dragging a URL along with it.
 *
 * A QA reviewer has a batch waiting and a question: can this go to this market?
 * Today that means opening six systems by hand and joining them in their head.
 * This answers in about a minute from those same systems, naming what would
 * block it — and never saying it may ship.
 *
 * EVERYTHING WITH AN OPINION LIVES ELSEWHERE, and after the breakdown that is
 * literally true rather than aspirational: `hooks/` own state and fetching,
 * `components/` own how it looks, `lib/explain.ts` owns the plain-English
 * notes. This file decides only what appears where — the same separation the
 * domain makes one level down, where `askRelease()` owns the assembly and the
 * surfaces only render.
 *
 * THE ONE DECISION IT DOES MAKE is which answer the right-hand column is
 * showing: the live one, or an earlier one picked out of the history. That is
 * composition — it chooses a source and hands it on unchanged.
 */
import { useState } from 'react';
import { WorkingNotes } from '@fde/uikit';

import { Aurora } from '@veresk/surface';
import { AURORA } from '../lib/aurora';
import { DeskHeader } from '../components/desk/DeskHeader';
import { AskForm } from '../components/desk/AskForm';
import { AnswerPane } from '../components/answer/AnswerPane';
import { History } from '../components/history/History';

import { useAsk } from '../hooks/use-ask';
import { useDeskForm } from '../hooks/use-desk-form';
import { useHistory } from '../hooks/use-history';
import { useLots } from '../hooks/use-lots';

import { toTraceLines } from '../lib/trace-lines';
import type { HistoryEntry } from '../lib/history';

export function ReleaseDesk() {
  // Hidden until the server actually refuses a request: an unconfigured guard
  // should not make every user wonder what credential they are missing.
  const [keyNeeded, setKeyNeeded] = useState(false);
  const needKey = () => setKeyNeeded(true);

  const form = useDeskForm();
  const { busy, trace, answer, failure, ask } = useAsk(needKey);
  const lots = useLots({ apiKey: form.apiKey, onAuthRequired: needKey });
  const history = useHistory({ apiKey: form.apiKey, kind: 'release', busy, onAuthRequired: needKey });

  /** Which earlier answer is being read instead of the current one. */
  const [earlier, setEarlier] = useState<HistoryEntry | null>(null);

  const view = earlier
    ? {
        answer: earlier.answer as any,
        failure: earlier.failure,
        // Stored as raw events and worded at display time, so an old run's
        // notes read in today's language rather than the language of the day
        // it ran. See `lib/trace-lines.ts`.
        trace: toTraceLines(earlier.trace),
        run: earlier.run ?? undefined,
      }
    : { answer, failure, trace, run: (answer as any)?.run ?? failure?.run };

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    form.remember();
    // A new question always shows its own answer. Leaving an earlier one on
    // screen while a fresh one streams in behind it is how the wrong batch gets
    // read.
    setEarlier(null);
    void ask({ question: form.question, loop: form.loop, apiKey: form.apiKey || undefined });
  }

  return (
    <div className="relative min-h-screen">
      {/* Muted: the front door gets seconds of attention, this gets minutes, and
          content has to stay readable the whole time. */}
      <Aurora tones={AURORA} muted />
      <DeskHeader busy={busy} title="Release desk" here="/desk" />

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-24 sm:px-6 sm:pb-28">
        <AskForm
          question={form.question}
          onQuestion={form.editQuestion}
          lot={form.lot}
          onLot={(v) => form.pick(v, form.market)}
          market={form.market}
          onMarket={(v) => form.pick(form.lot, v)}
          loop={form.loop}
          onLoop={form.setLoop}
          apiKey={form.apiKey}
          onApiKey={form.setApiKey}
          showKey={keyNeeded || Boolean(form.apiKey)}
          lots={lots}
          busy={busy}
          onSubmit={onSubmit}
        />

        <div className="grid gap-8 py-8 sm:gap-10 sm:py-10 lg:grid-cols-[17rem_1fr]">
          {/* STICKY, AND THE HISTORY IS FIRST. Both for the same reason: the
              list is how a reviewer gets back to an answer they already paid
              for, and it used to sit under a panel that grows with every tool
              call — so it drifted off screen exactly when there was something
              worth going back to. Now it holds the top of the column and the
              column holds its place while the dossier scrolls. */}
          <aside className="lift-in lg:sticky lg:top-24 lg:self-start lg:pt-1" style={{ animationDelay: '120ms' }}>
            <History
              entries={history.data ?? []}
              selectedId={earlier?.id ?? null}
              onSelect={setEarlier}
              loading={history.isPending}
              error={history.error ? (history.error as Error).message : undefined}
            />

            {/* The notes belong to the run in view. An earlier answer shows the
                steps that produced IT, and is never "busy" however hard the
                page is working on something else. */}
            <div className="mt-8 border-t border-ui-line pt-5">
              <WorkingNotes lines={view.trace} busy={busy && !earlier} />
            </div>
          </aside>

          <AnswerPane
            className="lift-in"
            view={view}
            busy={busy}
            earlier={earlier}
            onDismissEarlier={() => setEarlier(null)}
          />
        </div>
      </main>
    </div>
  );
}
