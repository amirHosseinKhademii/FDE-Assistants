/**
 * WHERE THE WHOLE BID STANDS — the panel above the one requirement in hand.
 *
 * ── THE COUNTS ARE FREE AND THE PARAGRAPH IS NOT, AND THE PANEL SAYS SO ──
 *
 * Everything with a number in it — how many of the 24 are assessed, the finding
 * mix, the total and what it rests on, every refusal and its stated reason — is
 * arithmetic over answers already filed. It is on screen before anybody presses
 * anything.
 *
 * The button buys two things a tally cannot do: what the refusals have in
 * common, and which questions repeat. That is the whole of what the model is
 * asked for, and the button names the cost rather than implying it is free.
 *
 * ── THE TOTAL NEVER APPEARS WITHOUT THE TWO THINGS THAT QUALIFY IT ───────
 *
 * Its evidence count, and the sentence saying it is not a quote. This is the
 * page where somebody screenshots a figure — one requirement's dossier makes
 * the same refusal, and it matters more here, because a sum looks more like a
 * price than a line item does.
 *
 * ── A REFUSAL IS RENDERED AS A RESULT, NOT AS A GAP ──────────────────────
 *
 * The unpriced list is drawn at the same weight as the priced one and carries
 * the reason verbatim. Greying it out would say the system fell short; it did
 * not, it declined to invent a number, which is the behaviour this whole
 * exercise is built to demonstrate.
 */
import { useState } from 'react';
import { Mono } from '@fde/uikit';
import { useSummary } from '../hooks/use-summary';
import { FINDING } from '../lib/findings';

const eur = (n: number): string => `EUR ${Math.round(n).toLocaleString('en-GB')}`;

/**
 * The state of the bid in one sentence, and it says each number ONCE.
 *
 * The panel used to print "4 of 24 assessed", then a tile reading "4 · it
 * exists and it has to change", then "4 unpriced" — three headlines for one
 * fact. A reader cannot tell whether those fours are the same four, and
 * checking costs more attention than the summary saves.
 *
 * So: the mix is stated only where it differs from the total, and the pricing
 * half is stated as a proportion of what was assessed rather than as its own
 * count. "All seven need work and none could be priced" is one reading; three
 * sevens is arithmetic homework.
 */
/**
 * A refusal reason, as a person would say it.
 *
 * ── THE STORED TEXT IS WRITTEN FOR THE ENGINEER WHO ARGUES WITH IT ───────
 *
 * And it should stay that way: `change_class = "validation_only", element_kind
 * = "mechanical" … 146 on its own, 0 without it` is exactly what somebody needs
 * when they want to know whether dropping a filter is defensible. It is a bad
 * FIRST line, though — eight of them stacked is a wall of filter arithmetic,
 * and a reader scanning for "what is actually blocking this" finds nothing to
 * hold on to.
 *
 * So the list shows one plain sentence and keeps the original underneath,
 * verbatim, one click away. NOTHING IS REWRITTEN AWAY: the summary is derived
 * from the numbers already in the text, and the text itself is still there to
 * be checked against. A paraphrase that REPLACED the original would be this
 * page quietly editing the system's own reasoning.
 */
function plainly(why: string): string {
  // "Only N past job(s) match …" — the common case, and the number is the point.
  const matched = why.match(/Only (\d+) past job\(s\) match/i);
  if (matched) {
    const n = Number(matched[1]);
    return n === 0
      ? 'No past job is close enough to price from.'
      : `Only ${n} past job${n === 1 ? '' : 's'} ${n === 1 ? 'is' : 'are'} close enough to price from — three is the minimum for a median to mean anything.`;
  }

  // The tool was called and came back empty, phrased in the model's own words.
  if (/returned 0 past jobs|fewer than three comparable|fewer than 3 comparable/i.test(why)) {
    return 'History was searched and nothing comparable came back.';
  }

  // It never got as far as asking, because it could not say what kind of work
  // this is — a different failure, and the more useful one to see as different.
  if (/insufficient information|not yet defined|must be given|requires a clear/i.test(why)) {
    return 'The work is not defined well enough to look for anything comparable yet.';
  }

  // Anything else: its own first sentence, which is written to stand alone.
  const first = why.split(/(?<=\.)\s/)[0] ?? why;
  return first.length > 160 ? `${first.slice(0, 157)}…` : first;
}

function sentence(r: any): string {
  const n = r.assessedRefs.length;
  if (n === 0) return 'Nothing assessed yet.';

  const mix = Object.entries(r.mix).filter(([, c]) => (c as number) > 0) as Array<[string, number]>;
  const finding =
    mix.length === 1
      ? `${n === 1 ? 'It' : `All ${n}`} came back "${(FINDING[mix[0][0]]?.label ?? mix[0][0]).toLowerCase()}"`
      : mix.map(([f, c]) => `${c} ${(FINDING[f]?.label ?? f).toLowerCase()}`).join(', ');

  const priced =
    r.priced.length === 0
      ? 'none of them could be priced from history'
      : r.priced.length === n
        ? 'every one carries a figure'
        : `${r.priced.length} of them ${r.priced.length === 1 ? 'carries' : 'carry'} a figure and ${r.unpriced.length} ${r.unpriced.length === 1 ? 'does' : 'do'} not`;

  return `${finding}, and ${priced}.`;
}

export function BidState({
  busy,
  apiKey,
  onRefused,
}: {
  busy: boolean;
  apiKey: string;
  onRefused: (status: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const s = useSummary(busy, apiKey, onRefused);
  const r = s.rollUp;

  if (s.error) {
    return (
      <section className="x-hist mt-10">
        <h3 className="x-sec">Where the bid stands</h3>
        <p className="x-hist-error">
          The filed assessments could not be read from <Mono>vst_derived</Mono>: {s.error}
        </p>
      </section>
    );
  }

  // Nothing filed yet is not an error and not worth a panel. The desk is for
  // assessing something; this appears once there is something to summarise.
  if (!r || r.assessedRefs.length === 0) return null;

  return (
    <section className="x-bid mt-10">
      {/* ── ALWAYS ON SCREEN, AND TWO LINES OF IT ──────────────────────
          It was shut by default and that was the wrong fix for the right
          complaint. Where the bid stands is the one thing a bid engineer wants
          without asking — 7 of 24 done is the state of their week. What
          polluted the view was not its presence, it was its SHAPE: a stack of
          panels each restating the same number.

          FOUR, FOUR AND FOUR WERE THE SAME FOUR. "4 of 24 assessed", then a
          tile reading "4 · it exists and it has to change", then "4 unpriced" —
          three headlines for one fact, which is why it read as noise rather
          than as a summary. It is now one progress line and one sentence, and
          the sentence only says a thing once. */}
      <div className="x-bid-head">
        <h3 className="x-sec">Where the bid stands</h3>
        <p className="x-bid-progress-n">
          <strong>{r.assessedRefs.length}</strong> of {r.requirementCount} assessed
        </p>
      </div>

      <div
        className="x-bid-bar"
        role="img"
        aria-label={`${r.assessedRefs.length} of ${r.requirementCount} requirements assessed`}
      >
        <span
          className="x-bid-bar-fill"
          style={{ width: `${(r.assessedRefs.length / Math.max(1, r.requirementCount)) * 100}%` }}
        />
      </div>

      <p className="x-bid-line">{sentence(r)}</p>

      {r.priced.length > 0 && (
        <div className="x-bid-money">
          <p className="x-bid-figure">{eur(r.eurTotal)}</p>
          <p className="x-bid-basis">
            {r.priced.length} priced item(s) · {r.hoursTotal.toLocaleString('en-GB')} h · from{' '}
            {r.jobsBehindTotal} past job(s)
          </p>
          <p className="x-bid-not-quote">{s.notTheQuote}</p>
        </div>
      )}

      {/* THE DETAIL IS BEHIND THE HANDLE, NOT THE STATE. Four refusal reasons
          and a written summary are a page; the two lines above are a glance.
          Collapsing the glance hid the useful half and left the button. */}
      <button
        type="button"
        className="x-bid-more"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden className={`x-hist-caret${open ? ' x-hist-caret--open' : ''}`}>
          ›
        </span>
        {open
          ? 'Hide the detail'
          : r.unpriced.length === 0
            ? 'The breakdown, requirement by requirement'
            : `Why ${r.unpriced.length === r.assessedRefs.length ? 'nothing' : `${r.unpriced.length}`} ${r.unpriced.length === 1 && r.unpriced.length !== r.assessedRefs.length ? 'is' : r.unpriced.length === r.assessedRefs.length ? 'is' : 'are'} unpriced, and what it is waiting on`}
      </button>

      {!open ? null : (
      <>
      <p className="x-sec-why mt-2">
        From the answers as they were filed. Nothing here is re-decided: a finding counts as
        whatever it was concluded to be, and a requirement assessed twice counts once.
      </p>

      <ul className="x-bid-mix">
        {Object.entries(r.mix)
          .filter(([, n]) => n > 0)
          .map(([finding, n]) => (
            <li key={finding} style={{ '--ui-tone': FINDING[finding]?.tone } as React.CSSProperties}>
              <span className="x-bid-n">{n}</span>
              <span className="x-bid-label">{FINDING[finding]?.label ?? finding}</span>
            </li>
          ))}
      </ul>

      {r.unpriced.length > 0 && (
        <div className="x-bid-unpriced">
          <p className="x-sec">What the {r.unpriced.length} unpriced are waiting on</p>
          <p className="x-sec-why">
            A refusal is a result, not a gap: none of these is counted as zero in the total. Each
            line is the short version — open one for the assessment's own words.
            {r.neverAsked > 0 && (
              <>
                {' '}
                {r.neverAsked} of them never got as far as asking history, because the work was not
                defined well enough to look for anything comparable.
              </>
            )}
          </p>
          {/* ONE LINE EACH, OPENED ONE AT A TIME. A refusal reason is a
              paragraph of filter arithmetic — four of them stacked is the
              longest thing on the page and it buries everything under it. The
              first line says which requirement and roughly why; the rest is
              there for the one somebody argues with. `<details>` rather than
              state, because the browser already does this correctly. */}
          <ul className="x-bid-list">
            {r.unpriced.map((u) => (
              <li key={u.ref}>
                <details className="x-bid-refusal">
                  <summary>
                    <span className="x-bid-ref">{u.ref}</span>
                    <span className="x-bid-why-1">{plainly(u.why)}</span>
                  </summary>
                  <p className="x-bid-why-label">as the assessment put it</p>
                  <p className="x-bid-why">{u.why}</p>
                </details>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── the paid half ─────────────────────────────────────────────── */}
      <div className="x-bid-written">
        {!s.summary && !s.writing && (
          <>
            <button type="button" className="x-bid-run" onClick={() => void s.write()}>
              Write the summary
            </button>
            <p className="x-sec-why">
              One model call, a fraction of a cent. It reads the {r.assessedRefs.length} filed
              assessment(s) — never the documents — and answers two things the counts above cannot:
              what the refusals have in common, and which questions were asked more than once.
            </p>
          </>
        )}

        {s.writing && <p className="x-bid-busy">Reading the filed assessments…</p>}

        {s.failure && (
          <div className="x-fail mt-4">
            <p className="x-fail-head">No summary</p>
            <p className="x-fail-body">{s.failure}</p>
            <p className="x-fail-why">
              The counts above are unaffected — they were never the model's to produce.
            </p>
          </div>
        )}

        {s.summary && (
          <>
            <p className="x-bid-headline">{s.summary.headline}</p>

            {s.summary.refusal_themes.length > 0 && (
              <div className="x-bid-themes">
                <p className="x-sec">What the unpriced requirements are waiting on</p>
                <p className="x-sec-why">
                  Six requirements refusing for want of the same document is one finding, not six.
                </p>
                {s.summary.refusal_themes.map((t) => (
                  <div key={t.theme} className="x-bid-theme">
                    <p className="x-bid-theme-name">{t.theme}</p>
                    <p className="x-bid-theme-refs">
                      {t.requirement_refs.map((ref) => (
                        <span key={ref}>{ref}</span>
                      ))}
                    </p>
                    <p className="x-bid-theme-fix">
                      <span className="x-bid-theme-fix-label">would be settled by</span>{' '}
                      {t.what_would_settle_it}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {s.summary.repeated_questions.length > 0 && (
              <div className="x-bid-themes">
                <p className="x-sec">Asked on more than one requirement</p>
                <p className="x-sec-why">
                  The same question across five requirements is a meeting, not five tickets.
                </p>
                {s.summary.repeated_questions.map((q) => (
                  <div key={q.question} className="x-bid-theme">
                    <p className="x-bid-theme-name">{q.question}</p>
                    <p className="x-bid-theme-refs">
                      <span className="x-bid-owner">{q.suggested_owner}</span>
                      {q.requirement_refs.map((ref) => (
                        <span key={ref}>{ref}</span>
                      ))}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {s.run && (
              <p className="x-bid-run-line">
                {s.run.engine} · {s.run.turns} turn(s) · {s.run.ms}ms ·{' '}
                {Math.round(s.run.compression.lines / r.assessedRefs.length).toLocaleString('en-GB')}{' '}
                characters per requirement summarised, against{' '}
                {Math.round(s.run.compression.dossiers / r.assessedRefs.length).toLocaleString('en-GB')}{' '}
                per full dossier
              </p>
            )}
          </>
        )}
      </div>
      </>
      )}
    </section>
  );
}
