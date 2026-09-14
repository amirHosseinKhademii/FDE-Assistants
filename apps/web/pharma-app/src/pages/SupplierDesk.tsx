/**
 * The supplier-impact desk — composition only, same as the release desk.
 *
 * THE SECOND QUESTION, AND THE REASON IT IS A SECOND PAGE. A recall coordinator
 * has just been told a supplier was disqualified. What they need is not a
 * decision — it is the list: what did we make with their material, and where is
 * every one of those lots now. Today that means joining the supplier register,
 * the material receipts, the batch records and the shipping log by hand, which
 * is the job that takes an afternoon and gets one lot missed.
 *
 * WHAT IT WILL NOT DO, stated here because it is the shape of the whole page:
 * it does not call a recall. The assessment tool's header puts it plainly — a
 * recall is a regulatory decision with a legal clock, made by people with names
 * — and the answer contract has no field that could carry one. Every row ends
 * with a routing step and a person, never with a verdict.
 *
 * STRUCTURALLY IDENTICAL TO `ReleaseDesk` on purpose: same header, same form
 * position, same sticky history column, same working notes under it. The two
 * questions are different; the desk they are asked at should not be, or a
 * reviewer has to learn the page twice.
 */
import { useState } from 'react';
import { WorkingNotes } from '@fde/uikit';

import { Aurora } from '@veresk/surface';
import { AURORA } from '../lib/aurora';
import { DeskHeader } from '../components/desk/DeskHeader';
import { SupplierForm } from '../components/supplier/SupplierForm';
import { WorkListPane } from '../components/supplier/WorkListPane';
import { History } from '../components/history/History';

import { useAsk } from '../hooks/use-ask';
import { useSupplierForm } from '../hooks/use-supplier-form';
import { useHistory } from '../hooks/use-history';
import { useSuppliers } from '../hooks/use-suppliers';

import { toTraceLines } from '../lib/trace-lines';
import type { HistoryEntry } from '../lib/history';

export function SupplierDesk() {
  const [keyNeeded, setKeyNeeded] = useState(false);
  const needKey = () => setKeyNeeded(true);

  const form = useSupplierForm();
  // The only line that differs from the release desk: a different endpoint.
  // Everything the hook produces — busy, the trace, an answer, a failure — has
  // the same shape either way, because the stream does.
  const { busy, trace, answer, failure, fanout, debate, ask } = useAsk(needKey, '/api/supplier');
  const suppliers = useSuppliers({ apiKey: form.apiKey, onAuthRequired: needKey });
  const history = useHistory({
    apiKey: form.apiKey,
    // Filtered in SQL. A release dossier can never reach this page's renderer.
    kind: 'supplier',
    busy,
    onAuthRequired: needKey,
  });

  const [earlier, setEarlier] = useState<HistoryEntry | null>(null);

  const view = earlier
    ? {
        answer: earlier.answer as any,
        failure: earlier.failure,
        trace: toTraceLines(earlier.trace),
        run: earlier.run ?? undefined,
      }
    : { answer, failure, trace, run: (answer as any)?.run ?? failure?.run };

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    form.remember();
    // A new question always shows its own answer — leaving an earlier work list
    // on screen while a fresh one streams in is how the wrong supplier's lots
    // get worked.
    setEarlier(null);
    void ask({
      question: form.question,
      loop: form.loop,
      topology: form.topology,
      apiKey: form.apiKey || undefined,
    });
  }

  return (
    <div className="relative min-h-screen">
      <Aurora tones={AURORA} muted />
      <DeskHeader busy={busy} title="Supplier impact" here="/supplier" />

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-24 sm:px-6 sm:pb-28">
        <SupplierForm
          question={form.question}
          onQuestion={form.editQuestion}
          supplier={form.supplier}
          onSupplier={form.pick}
          loop={form.loop}
          onLoop={form.setLoop}
          topology={form.topology}
          onTopology={form.setTopology}
          apiKey={form.apiKey}
          onApiKey={form.setApiKey}
          showKey={keyNeeded || Boolean(form.apiKey)}
          suppliers={suppliers}
          busy={busy}
          onSubmit={onSubmit}
        />

        <div className="grid gap-8 py-8 sm:gap-10 sm:py-10 lg:grid-cols-[17rem_1fr]">
          <aside className="lift-in lg:sticky lg:top-24 lg:self-start lg:pt-1" style={{ animationDelay: '120ms' }}>
            <History
              entries={history.data ?? []}
              selectedId={earlier?.id ?? null}
              onSelect={setEarlier}
              loading={history.isPending}
              error={history.error ? (history.error as Error).message : undefined}
            />

            <div className="mt-8 border-t border-ui-line pt-5">
              <WorkingNotes lines={view.trace} busy={busy && !earlier} />
            </div>
          </aside>

          <WorkListPane
            className="lift-in"
            view={view}
            busy={busy}
            fanout={fanout}
            debate={debate}
            earlier={earlier}
            onDismissEarlier={() => setEarlier(null)}
          />
        </div>
      </main>
    </div>
  );
}
