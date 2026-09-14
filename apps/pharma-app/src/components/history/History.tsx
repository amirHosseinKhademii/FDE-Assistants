/**
 * Earlier questions, and the answers they got.
 *
 * WHY THIS IS IN THE APP AND NOT `@fde/uikit`. Every row makes a domain
 * judgement — a blocker is worse than a concern, an escalation outranks both,
 * and a failure is not a finding. That is severity's MEANING, and the package
 * rule is that it owns how severity looks and never what is severe.
 *
 * THE ROW LABEL IS COUNTED, NEVER QUOTED — the same rule `Answer.tsx` applies
 * to its verdict line. A row that echoed the model's own summary prose could
 * describe a batch as clear while the blockers panel below it lists three, and
 * the reviewer would be left choosing which one to believe. Counting the
 * structured fields makes that impossible.
 *
 * AND NO ROW IS EVER GREEN. "No blocker found" is a statement about the checks
 * that ran, not a clearance — a column of reassuring green ticks is exactly the
 * claim this product is built never to make, and a list is a tempting place to
 * make it by accident.
 *
 * THE HUE ON EACH ROW IS A CYCLE, NOT A RANKING. It is the same six-colour
 * sequence the front page walks, so the two surfaces read as one product — but
 * the list is newest-first, so the colour tracks position in the list and means
 * nothing about the answer. Everything that DOES carry meaning is in the chip,
 * which comes from the structured fields. Colour that means something lives in
 * `@fde/uikit`; this is colour that is free to be colour, and saying so here is
 * what stops someone later reading "the amber ones" as a severity.
 *
 * THREE ROWS UNTIL ASKED FOR MORE. The column also carries the working notes,
 * and those are what a person watches while a question is in flight — a history
 * that grows to fifty rows would push them off the screen on the one screen
 * where something is actually happening. Three is what fits beside a question
 * being answered. The count in the heading is always the FULL count, so the
 * list never hides how much it is holding.
 *
 * THERE IS NO CLEAR BUTTON, and that is a decision rather than an omission.
 * These rows are the customer's record of what was asked about their batches;
 * a one-click delete of somebody else's audit trail is not a thing to add
 * before anyone has asked for it, and there is no DELETE route to back it.
 */
import { useState } from 'react';
import { Chip, ChevronIcon, Mono, type Tone } from '@fde/uikit';
import { ago, type HistoryEntry } from '../../lib/history';

export function History({
  entries,
  selectedId,
  onSelect,
  loading,
  error,
}: {
  entries: HistoryEntry[];
  selectedId: string | null;
  onSelect: (entry: HistoryEntry | null) => void;
  loading: boolean;
  error?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  /**
   * SHUT ON A PHONE, OPEN ON A DESK, AND IT IS NOT THE SAME CONTROL AS
   * `expanded`.
   *
   * `expanded` is "show more than three of them" and applies everywhere.
   * This is "show the list at all", and it exists only below `lg` — where the
   * list is not a sidebar but a slab of secondary content sitting BETWEEN the
   * form and the answer. Three cards and a "show 17 more" button is 350px of
   * things somebody already asked, in the middle of the page they came to ask
   * something new on.
   *
   * It defaults to shut because that is the common case: you arrive to ask,
   * not to re-read. The count is on the button, so nothing is hidden — the
   * page still says there are twenty of them.
   */
  const [openOnPhone, setOpenOnPhone] = useState(false);
  const shown = expanded ? entries : entries.slice(0, COLLAPSED);
  const hidden = entries.length - shown.length;

  return (
    // NO TOP MARGIN OR RULE: this sits at the TOP of the column now, above the
    // working notes rather than below them. It was underneath, which put it
    // below a panel that GROWS — every tool call pushed the list further down,
    // so the one thing a reviewer returns to was the one thing they had to
    // scroll for, and only after a long answer.
    <section>
      {/* The heading proper, from `lg` up, where the list is a sidebar and
          there is nothing to get out of the way of. */}
      <div className="mb-3 hidden items-center gap-2 lg:flex">
        <h2 className="text-[0.6875rem] tracking-widest text-ui-faint uppercase">
          Earlier questions
        </h2>
        {entries.length > 0 && (
          <Mono className="ml-auto text-xs text-ui-faint">{entries.length}</Mono>
        )}
      </div>

      {/* The same heading as a control, below `lg`. It carries the count so
          the page never pretends the history is empty, and it says which way
          it is about to move. */}
      <button
        type="button"
        onClick={() => setOpenOnPhone((v) => !v)}
        aria-expanded={openOnPhone}
        className="mb-3 flex w-full items-center gap-2 rounded-lg border border-ui-line px-3 py-2 text-left transition-colors hover:border-ui-line-lit lg:hidden"
      >
        <span className="text-[0.6875rem] tracking-widest text-ui-faint uppercase">
          Earlier questions
        </span>
        {entries.length > 0 && (
          <Mono className="ml-auto text-xs text-ui-faint">{entries.length}</Mono>
        )}
        <span aria-hidden className={`text-ui-faint transition-transform ${openOnPhone ? 'rotate-180' : ''}`}>
          <ChevronIcon />
        </span>
      </button>

      <div className={openOnPhone ? '' : 'hidden lg:block'}>

      {error ? (
        /* Said out loud. A blank list here would read as "nothing has ever been
           asked", and that reading is what makes somebody pay for a question
           twice. */
        <p className="text-sm leading-relaxed text-ui-warn">
          The history could not be read — {error}
        </p>
      ) : loading ? (
        <p className="text-sm text-ui-faint">Reading…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm leading-relaxed text-ui-faint">
          Nothing yet. Every question asked on this page is kept, with the answer it got — and
          questions asked before this existed are not here, because only their cost was ever
          recorded.
        </p>
      ) : (
        // Capped and scrollable so a long history cannot push the working
        // notes off the screen — the list grows without bound, the column does
        // not.
        <>
        <ol className={`grid gap-1.5 ${expanded ? 'max-h-[26rem] overflow-y-auto pr-1' : ''}`}>
          {shown.map((e, i) => (
            <li
              key={e.id}
              // `ui-note-in`, not `lift-in`: the blur in `lift-in` left these
              // rows invisible when they mounted late, which they always do —
              // the list arrives from the server after the page has rendered.
              className="ui-note-in"
              style={{ animationDelay: `${Math.min(i, 8) * 55}ms` }}
            >
              <Row entry={e} index={i} selected={e.id === selectedId} onSelect={onSelect} />
            </li>
          ))}
        </ol>

        {/* Only when there is something to show. A permanently visible control
            that sometimes does nothing teaches people to stop pressing it. */}
        {(hidden > 0 || expanded) && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 w-full rounded-lg border border-ui-line/70 py-2 text-xs text-ui-dim transition-colors hover:border-ui-line-lit hover:bg-ui-raised/40 hover:text-ui-fg"
          >
            {expanded ? 'Show fewer' : `Show ${hidden} more`}
          </button>
        )}
        </>
      )}
      </div>
    </section>
  );
}

/** How many rows stand beside a question in flight. See the header. */
const COLLAPSED = 3;

/** The six, in the front page's order. See the header: a cycle, not a ranking. */
const RAILS = [
  'var(--color-hop-1)', 'var(--color-hop-2)', 'var(--color-hop-3)',
  'var(--color-hop-4)', 'var(--color-hop-5)', 'var(--color-hop-6)',
];

function Row({
  entry,
  index,
  selected,
  onSelect,
}: {
  entry: HistoryEntry;
  index: number;
  selected: boolean;
  onSelect: (entry: HistoryEntry | null) => void;
}) {
  const s = summarise(entry);
  return (
    <button
      type="button"
      aria-current={selected ? 'true' : undefined}
      onClick={() => onSelect(selected ? null : entry)}
      style={{ ['--rail' as any]: RAILS[index % RAILS.length] }}
      className={`hop-rail w-full rounded-lg border py-2.5 pr-3 pl-4 text-left transition-all duration-200 ${
        selected
          ? 'border-ui-accent/45 bg-ui-accent/8 shadow-[0_0_28px_-12px] shadow-ui-accent/70'
          : 'border-ui-line bg-ui-raised/30 hover:-translate-y-px hover:border-ui-line-lit hover:bg-ui-raised/70'
      }`}
    >
      <p className="line-clamp-2 text-sm leading-snug text-ui-fg/90">{entry.question}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <Chip tone={s.tone}>{s.label}</Chip>
        <Mono className="text-[0.6875rem] text-ui-faint">{ago(entry.ts)}</Mono>
      </div>
    </button>
  );
}

/**
 * One row's worth of judgement, derived from the structured answer only.
 *
 * The precedence mirrors `Answer.tsx`: a person having to decide outranks the
 * findings, blockers outrank concerns, and an unchecked thing is reported
 * rather than folded into "nothing found". Kept as ONE function so that order
 * is readable in one place instead of spread across JSX branches.
 *
 * TWO ANSWER SHAPES, TWO BRANCHES, AND THE SECOND IS NOT OPTIONAL. A supplier
 * work list has no `blockers` and no `concerns`, so the release branch below
 * read it as an answer with nothing in it and labelled a 23-lot exposure
 * "no blocker found" — the precise failure the `kind` column was added to
 * prevent, reappearing in a 12px badge. A row is read faster than it is
 * clicked, so a wrong badge is worse here than almost anywhere else on the
 * page. The discriminator is the shape itself (`rows`), not the stored `kind`,
 * so a row written before that column existed still reads correctly.
 */
function summarise(entry: HistoryEntry): { tone: Tone; label: string } {
  if (entry.failure) return { tone: 'neutral', label: "didn't finish" };

  const a = entry.answer as any;
  if (!a) return { tone: 'neutral', label: 'no answer' };

  if (Array.isArray(a.rows)) return summariseWorkList(a);

  const blockers: unknown[] = a.blockers ?? [];
  const concerns: unknown[] = a.concerns ?? [];
  const missing: unknown[] = a.missing ?? [];

  if (blockers.length > 0)
    return {
      tone: 'danger',
      label: `${blockers.length} blocker${blockers.length === 1 ? '' : 's'}`,
    };
  if (a.escalate) return { tone: 'warn', label: 'a person decides' };
  if (missing.length > 0) return { tone: 'warn', label: `${missing.length} unchecked` };
  if (concerns.length > 0)
    return {
      tone: 'info',
      label: `${concerns.length} concern${concerns.length === 1 ? '' : 's'}`,
    };
  // Note the tone: NOT `ok`. See the header.
  return { tone: 'neutral', label: 'no blocker found' };
}

/**
 * A supplier work list, in one chip.
 *
 * REACH OUTRANKS COUNT. "23 lots" and "5 with patients" are different facts and
 * the second one sets the clock, so it wins the badge whenever it is non-zero.
 * A row saying "23 affected lots" next to one saying "5 reached patients" would
 * invite reading the larger number as the worse one.
 *
 * AND AN EMPTY LIST IS NOT A CLEARANCE. Zero affected lots is a statement about
 * the records that were read, which is why its label says "none found" rather
 * than anything resembling "clear", and its tone is neutral rather than ok.
 */
function summariseWorkList(a: any): { tone: Tone; label: string } {
  const rows: any[] = a.rows ?? [];
  const patientFacing = rows.filter((r) => r?.exposure === 'patient_facing').length;

  if (patientFacing > 0)
    return { tone: 'danger', label: `${patientFacing} with patients` };
  if (rows.length > 0)
    return { tone: 'warn', label: `${rows.length} affected lot${rows.length === 1 ? '' : 's'}` };
  if ((a.preventable ?? []).length > 0)
    return { tone: 'warn', label: 'preventable material' };
  return { tone: 'neutral', label: 'none found' };
}

/**
 * The banner over an answer that is not the current one.
 *
 * It exists because the page has no other way to say so: a stored dossier
 * renders identically to a fresh one, and a reviewer who scrolled straight to a
 * blocker would have no clue they were reading Tuesday's batch.
 */
export function ViewingEarlier({
  entry,
  onDismiss,
}: {
  entry: HistoryEntry;
  onDismiss: () => void;
}) {
  return (
    <div className="ui-rise mb-6 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-ui-accent/30 bg-ui-accent/5 px-4 py-2.5 text-sm">
      <span className="text-ui-accent">Showing an earlier answer</span>
      <Mono className="text-xs text-ui-dim">
        asked {ago(entry.ts)} · {entry.loop}
      </Mono>
      <button
        type="button"
        onClick={onDismiss}
        className="ml-auto text-xs text-ui-dim transition-colors hover:text-ui-fg"
      >
        back to the latest
      </button>
    </div>
  );
}
