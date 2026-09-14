/**
 * The question, the batch, the market, and the engine.
 *
 * THE ALIGNMENT RULE. Every control in the bottom row is the SAME element:
 * `<Field>` draws the label, the leading icon and the frame, and the control
 * inside it is always `.control` — one height, one padding scale, one focus
 * ring. The previous version set those per input, and the row stair-stepped:
 * the selects sat below the inputs, the native select arrow landed at a
 * different inset from the browser's, and the icons floated off the text
 * baseline. Icons are centred with `top: 50%; translate: 0 -50%` against the
 * control's own box rather than nudged with padding, which is why they stay put
 * when a label wraps.
 *
 * The batch dropdown is a STAND-IN FOR THE MES. In a real deployment the
 * reviewer is already looking at a batch and the host passes the lot id as
 * context — nobody picks from a list. The model never sees this list either: a
 * person picks, and the pick goes into the question, so a near-match can never
 * become an answer. That matters more here than it sounds: `LOT-IBU200-2609-B`
 * and `-D` differ by one character and ship to different markets under
 * different limits.
 *
 * WHY THE PICKERS REWRITE THE QUESTION instead of being separate parameters.
 * `askRelease()` takes one thing — a question — and finds the lot in it. So the
 * selects compose the sentence and leave it editable, and WHAT YOU SEE IN THE
 * BOX IS EXACTLY WHAT IS SENT. A hidden parameter that disagrees with the
 * visible text is how you get an answer about a different batch than the one on
 * screen. Edit the sentence freely; the selects stop rewriting it once you do.
 */
import {
  Mono, Field, Select, SubmitButton,
  BoxIcon, GlobeIcon, ChipIcon, KeyIcon, SearchIcon,
} from '@fde/uikit';

export interface AskFormProps {
  question: string;
  onQuestion: (v: string) => void;
  lot: string;
  onLot: (v: string) => void;
  market: string;
  onMarket: (v: string) => void;
  loop: string;
  onLoop: (v: string) => void;
  apiKey: string;
  onApiKey: (v: string) => void;
  showKey: boolean;
  lots: { data?: any[]; isLoading: boolean };
  busy: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function AskForm(p: AskFormProps) {
  const chosen = p.lots.data?.find((x: any) => x.lotId === p.lot);

  return (
    <form onSubmit={p.onSubmit} className="ui-rise card-aura lift-in mt-6 grid gap-5 p-4 sm:mt-8 sm:p-6">
      <Field label="Question" labelIcon={<SearchIcon />}>
        <textarea
          value={p.question}
          onChange={(e) => p.onQuestion(e.target.value)}
          rows={2}
          placeholder="Can LOT-… be released to …?"
          /* 15px on a phone, 17px from `sm`. The question is the one thing
             here somebody types rather than picks, so it stays the largest
             text in the form — but at 17px a two-line question became three
             and the box started clipping its own placeholder. */
          className="ui-control text-[0.9375rem] sm:text-[1.0625rem]"
        />
      </Field>

      {/* ── WHAT GOES BESIDE WHAT, AND WHY IT CHANGED ─────────────────────
          On a phone this used to be four full-width boxes in a column —
          question, batch, market, engine — each with a small label above it
          and all four at exactly the same visual weight. Nothing said which
          two of them ARE the question and which one is a setting, and the form
          ran past the fold before the button.

          So the short controls pair up. `Batch` is a long identifier and keeps
          the full width; `Market` and `Engine` are two words each and sit side
          by side, which reads as one row of settings rather than two more
          questions. Three rows instead of four, and the button is visible
          without scrolling on a 390px screen.

          NOTHING MOVED ON THE DESKTOP LAYOUT. The `lg:` track list is the same
          four columns it always was — this is a phone fix, and a phone fix that
          rearranged the desk would be a different change wearing this one's
          clothes. */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-4 lg:grid-cols-[minmax(16rem,1fr)_9rem_11rem_auto]">
        <Field
          className="col-span-2 lg:col-span-1"
          label="Batch"
          hint={p.lots.isLoading ? 'loading…' : `${p.lots.data?.length ?? 0} on file`}
        >
          <Select value={p.lot} onChange={p.onLot} icon={<BoxIcon />}>
            <option value="">Ask without naming a batch</option>
            {(p.lots.data ?? []).map((x: any) => (
              <option key={x.lotId} value={x.lotId}>
                {x.lotId} · {x.status}
              </option>
            ))}
          </Select>
        </Field>

        <Field className="field-tight" label="Market">
          <Select value={p.market} onChange={p.onMarket} icon={<GlobeIcon />}>
            <option value="EU">EU</option>
            <option value="US">US</option>
            <option value="GB">GB</option>
          </Select>
        </Field>

        <Field className="field-tight" label="Engine">
          <Select value={p.loop} onChange={p.onLoop} icon={<ChipIcon />}>
            <option value="sdk">Agents SDK</option>
            <option value="mastra">Mastra</option>
          </Select>
        </Field>

        {/* The class goes on the wrapper but the animation lands on the BUTTON
            inside it — `SubmitButton` is a two-row grid whose first row is a
            blank label spacer, so a glow on the wrapper paints a slab above the
            button. And it runs only when the button can actually be pressed: a
            disabled control that pulses is promising something it will not do. */}
        <div
          className={`col-span-2 lg:col-span-1 ${p.busy || !p.question.trim() ? '' : 'glow-btn'}`}
        >
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

      <p className="max-w-3xl border-t border-ui-line pt-4 text-xs leading-relaxed text-ui-dim sm:text-sm">
        {chosen ? (
          <>
            <Mono className="text-ui-fg">{chosen.lotId}</Mono> was made for{' '}
            <Mono className="text-ui-fg">{chosen.market}</Mono> and is{' '}
            <Mono className="text-ui-fg">{chosen.status}</Mono>.
            {chosen.market !== p.market && (
              <>
                {' '}You are asking about <Mono className="text-ui-warn">{p.market}</Mono> — a
                different market, which is the interesting case: the limits that apply are the
                destination's, not the ones it was built to.
              </>
            )}
          </>
        ) : (
          <>
            With no batch named, the assistant will ask which one rather than guess. That is
            deliberate: two lots one character apart go to different markets under different limits.
          </>
        )}
      </p>
    </form>
  );
}
