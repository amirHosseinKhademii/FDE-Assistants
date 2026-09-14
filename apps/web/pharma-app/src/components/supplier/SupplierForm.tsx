/**
 * The supplier question, composed from one picker.
 *
 * THE NOTE UNDER THE FORM IS THE POINT OF THE FORM. A supplier that was never
 * disqualified is deliberately still in the list — "we checked, and they are
 * still qualified" is an answer a reviewer is entitled to get rather than be
 * prevented from asking for. But asking the impact question about one is asking
 * what followed from an event that never happened, and saying so before the
 * minute is spent is cheaper than saying it after.
 *
 * THE ROUTE PICKER IS THE ONE CONTROL THIS DESK HAS AND THE OTHER DOES NOT, and
 * it spends money, so it says so where the thumb is rather than in prose further
 * down. One loop is three requests and about $0.008; the fan-out is one
 * sub-agent per lot plus an assembler — 24 calls and $0.0398 measured. Five
 * times dearer is not a detail to discover afterwards on the cost line.
 *
 * IT IS A CHOICE RATHER THAN A DEFAULT, which is the whole reason the route is
 * allowed to exist on a page at all: `api.supplier.tsx` refuses to start
 * twenty-four model calls from a click that did not ask for them.
 *
 * The controls are `@fde/uikit`'s, unchanged, so the two desks cannot drift
 * into looking like two products.
 */
import {
  Field, Select, SubmitButton, Mono,
  BoxIcon, ChipIcon, KeyIcon, SearchIcon, StepsIcon,
} from '@fde/uikit';

export interface SupplierFormProps {
  question: string;
  onQuestion: (v: string) => void;
  supplier: string;
  onSupplier: (v: string) => void;
  loop: string;
  onLoop: (v: string) => void;
  topology: string;
  onTopology: (v: string) => void;
  apiKey: string;
  onApiKey: (v: string) => void;
  showKey: boolean;
  suppliers: { data?: any[]; isLoading: boolean };
  busy: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

/** The audit reason is a sentence already; appending a full stop gives it two. */
const trimStop = (s: string) => s.replace(/\.\s*$/, '');

export function SupplierForm(p: SupplierFormProps) {
  const chosen = p.suppliers.data?.find((x: any) => x.supplierId === p.supplier);

  return (
    <form onSubmit={p.onSubmit} className="ui-rise card-aura lift-in mt-6 grid gap-5 p-4 sm:mt-8 sm:p-6">
      <Field label="Question" labelIcon={<SearchIcon />}>
        <textarea
          value={p.question}
          onChange={(e) => p.onQuestion(e.target.value)}
          /* THREE ROWS, NOT TWO, AND IT IS THE DEFAULT TEXT THAT DECIDES IT.
             This desk's opening question is half again as long as the release
             desk's, and at 390px two rows clipped it through the middle of the
             third line — the box looked broken before anybody had typed
             anything. The release desk keeps two because its own default fits
             in two. */
          rows={3}
          placeholder="SUP-… was disqualified — what did we make with their material?"
          /* 15px on a phone, 17px from `sm`. The question is the one thing
             here somebody types rather than picks, so it stays the largest
             text in the form — but at 17px a two-line question became three
             and the box started clipping its own placeholder. */
          className="ui-control text-[0.9375rem] sm:text-[1.0625rem]"
        />
      </Field>

      {/* Same phone fix as `AskForm`, with one difference that follows from
          the content: `Route`'s options are sentences ("Fan-out · one agent per
          lot"), so it keeps the full width where `Market` did not. What pairs
          up here is `Engine` and the button — the setting and the action,
          neither of which is part of the question being asked. */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-4 lg:grid-cols-[minmax(14rem,1fr)_13rem_11rem_auto]">
        <Field
          className="col-span-2 lg:col-span-1"
          label="Supplier"
          hint={p.suppliers.isLoading ? 'loading…' : `${p.suppliers.data?.length ?? 0} on file`}
        >
          <Select value={p.supplier} onChange={p.onSupplier} icon={<BoxIcon />}>
            <option value="">Ask without naming a supplier</option>
            {(p.suppliers.data ?? []).map((x: any) => (
              <option key={x.supplierId} value={x.supplierId}>
                {x.supplierId} · {x.name}
                {x.disqualifiedOn ? ` · disqualified ${x.disqualifiedOn}` : ' · qualified'}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          className="col-span-2 lg:col-span-1"
          label="Route"
          hint={
            p.topology === 'fanout'
              ? '24 calls · ~$0.04'
              : p.topology === 'debate'
                ? '5 calls · ~$0.011'
                : '3 calls · ~$0.008'
          }
        >
          <Select value={p.topology} onChange={p.onTopology} icon={<StepsIcon />}>
            <option value="loop">One loop</option>
            <option value="fanout">Fan-out · one agent per lot</option>
            <option value="debate">Debate · two agents argue one lot</option>
          </Select>
        </Field>

        <Field className="field-tight" label="Engine">
          <Select value={p.loop} onChange={p.onLoop} icon={<ChipIcon />}>
            <option value="sdk">Agents SDK</option>
            <option value="mastra">Mastra</option>
          </Select>
        </Field>

        {/* See `AskForm`: the class goes on the wrapper, the animation lands on
            the button, and only while the button can actually be pressed. */}
        <div className={p.busy || !p.question.trim() ? '' : 'glow-btn'}>
          <SubmitButton busy={p.busy} disabled={p.busy || !p.question.trim()} busyLabel="Walking…">
            Ask
          </SubmitButton>
        </div>
      </div>

      {p.showKey && (
        <Field label="API key" hint="required here" icon={<KeyIcon />} className="max-w-sm">
          <input
            type="password"
            value={p.apiKey}
            onChange={(e) => p.onApiKey(e.target.value)}
            className="ui-control ui-control--icon font-mono text-sm"
          />
        </Field>
      )}

      {/* SAID ONLY WHEN IT APPLIES. A permanent warning about a route nobody
          picked is noise that trains people to skip the whole line. */}
      {p.topology === 'debate' && (
        <p className="max-w-3xl rounded-lg border border-flow-model/30 bg-flow-model/5 px-4 py-3 text-sm leading-relaxed text-ui-dim">
          <span className="text-flow-model">Two advocates and an adjudicator, on one lot.</span>{' '}
          The walk picks the worst contested lot — one that left our control carrying a finding,
          where the procedure deliberately does not say what to do. The two agents open
          independently, then answer each other; a third writes the disagreement up for a Qualified
          Person. It decides nothing, and returns a memo rather than a work list.
        </p>
      )}

      {p.topology === 'fanout' && (
        <p className="max-w-3xl rounded-lg border border-ui-warn/30 bg-ui-warn/5 px-4 py-3 text-sm leading-relaxed text-ui-dim">
          <span className="text-ui-warn">One sub-agent per lot, four at a time.</span> Each is
          handed a single lot and cannot reach another, so no one request exposes more than one lot
          — and the rows come back more thorough. It is also faster (50s against 82s, measured) and
          five times dearer, and no eval case guards it yet. The question must name an exact
          supplier id: this route calls no model to interpret the sentence.
        </p>
      )}

      <p className="max-w-3xl border-t border-ui-line pt-4 text-xs leading-relaxed text-ui-dim sm:text-sm">
        {chosen ? (
          chosen.disqualifiedOn ? (
            <>
              <Mono className="text-ui-fg">{chosen.supplierId}</Mono> was disqualified on{' '}
              <Mono className="text-ui-fg">{chosen.disqualifiedOn}</Mono>
              {chosen.disqualifiedReason ? <> — {trimStop(chosen.disqualifiedReason)}.</> : '.'} The
              walk finds what was made with their material and how far each lot got.
            </>
          ) : (
            <>
              <Mono className="text-ui-fg">{chosen.supplierId}</Mono> is still qualified. The
              question is still answerable, and the answer will say so — but nothing followed from a
              disqualification that has not happened.
            </>
          )
        ) : (
          <>
            With no supplier named, the assistant will ask which one rather than guess. Supplier ids
            look like <Mono className="text-ui-fg">SUP-04</Mono>.
          </>
        )}
      </p>
    </form>
  );
}
