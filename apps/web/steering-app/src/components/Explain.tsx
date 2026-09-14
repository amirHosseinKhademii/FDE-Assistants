/**
 * The dossier on screen, said in thirty seconds — on top of it, in a dialog.
 *
 * ── WHY A DIALOG AND NOT A PANEL ─────────────────────────────────────────
 *
 * A brief that sat above the finding would be read INSTEAD of it, and that is
 * the wrong way round: the dossier is the record and this is a reading aid. In
 * a dialog it is plainly a second view of the same thing, it closes, and the
 * evidence is still underneath exactly where it was.
 *
 * ── IT APPEARS AFTER THE ANSWER, NEVER BEFORE ────────────────────────────
 *
 * There is nothing to summarise until there is a dossier, and a button that
 * spends money before an answer exists is an invitation to a bill for nothing.
 *
 * ── IT ADDS NO FACT, AND THE SHAPE IS WHAT ENFORCES THAT ─────────────────
 *
 * No price, no citation, no finding — those are measured and printed below.
 * `explanation-schema.ts` has the argument; this component simply has nowhere
 * to render a number even if one arrived.
 */
import { useState } from 'react';
import { OriginDialog, originOf, type Origin } from '@fde/uikit';

/**
 * EVERY LIST IS OPTIONAL HERE, AND THE SCHEMA SAYING OTHERWISE IS NOT ENOUGH.
 *
 * The contract requires all four, and the validator rejects an answer missing
 * one — so within a single run this shape is guaranteed. What is not guaranteed
 * is that the JSON on screen came from THIS version of the contract: a dev
 * server holding a cached build of the package, a response that started before
 * a field existed, or (later) a filed brief read back from a row written last
 * month all produce an object with one key absent.
 *
 * `explanation.disagreements.length` on that object throws, and the whole
 * dialog becomes "Something went wrong" — a rendering layer taking down the
 * answer it exists to display, over a field that is allowed to be empty anyway.
 */
interface Explanation {
  in_one_line: string;
  what_it_means?: string[];
  what_happens_next?: string[];
  disagreements?: Array<{ about: string; why_it_matters: string }>;
  questions_for_people?: Array<{ question: string; owner: string }>;
}

export function Explain({ assessment, apiKey }: { assessment: any; apiKey: string }) {
  const [from, setFrom] = useState<Origin | null>(null);
  const [busy, setBusy] = useState(false);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<{ engine: string; ms: number } | null>(null);

  const open = async (el: HTMLElement) => {
    setFrom(originOf(el));
    // Asked once and kept. A second reading of one dossier is a second bill for
    // an answer that cannot have changed — nothing under it moved.
    if (explanation || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(apiKey ? { 'x-api-key': apiKey } : {}) },
        body: JSON.stringify({ assessment }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? `request failed (${res.status})`);
      setExplanation(body.explanation);
      setRun(body.run);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* THE COST LINE CAME OFF THE FACE, and it is the one edit in this file
          that argues against a rule this site otherwise keeps: a control that
          spends money says so. It is kept, one layer in — the dialog's own
          footer reports the engine and the time it took. What made the label
          wrong here is that "a fraction of a cent" is not a warning, it is
          noise dressed as one: it doubled the button's width, buried the verb,
          and trained a reader to skip exactly the kind of line that matters on
          the controls that DO cost something. The assess button, which spends
          real money, still says so on its face. */}
      <button type="button" className="x-explain-btn" onClick={(e) => void open(e.currentTarget)}>
        Summarise this in plain words
      </button>

      {from && (
        <OriginDialog
          from={from}
          tone="var(--color-ui-accent)"
          label="In plain words"
          onClose={() => setFrom(null)}
          header={
            <div className="min-w-0">
              <p className="font-mono text-base font-medium text-ui-fg">In plain words</p>
              <p className="text-sm text-ui-dim">
                {assessment.requirement_ref} · a reading of the dossier below, not a replacement for it
              </p>
            </div>
          }
        >
          {/* ── WHAT WAITING LOOKS LIKE ──────────────────────────────────
              A single grey line saying "Reading the assessment…" gives a
              reader nothing to judge: it looks identical at one second and at
              twenty, so the only question it raises — is this stuck? — is the
              one it cannot answer. Three lines that pulse are honestly
              indeterminate AND visibly alive, and they occupy the shape the
              answer will take, so nothing jumps when it arrives. */}
          {busy && (
            <div className="x-explain" aria-live="polite" aria-busy="true">
              <p className="x-explain-wait">Reading the assessment — no documents, just the answer below.</p>
              <div className="x-skeleton x-skeleton--lead" />
              <div className="x-skeleton" />
              <div className="x-skeleton x-skeleton--short" />
            </div>
          )}

          {error && (
            <div className="x-fail">
              <p className="x-fail-head">No summary</p>
              <p className="x-fail-body">{error}</p>
              <p className="x-fail-why">
                The assessment underneath is unaffected — it was never this call's to produce.
              </p>
            </div>
          )}

          {explanation && (
            <div className="x-explain">
              <p className="x-explain-line">{explanation.in_one_line}</p>

              <div className="x-explain-block">
                <p className="x-explain-head">What it means</p>
                {(explanation.what_it_means ?? []).map((line, i) => (
                  <p key={i} className="x-explain-body">
                    {line}
                  </p>
                ))}
              </div>

              {/* WHAT IS DISPUTED, WITHOUT RE-QUOTING IT. The dossier renders
                  each side with its own file and line, verbatim; a paraphrase
                  beside the original is the one place a reader would reasonably
                  conclude the system disagreed with itself. */}
              {(explanation.disagreements ?? []).length > 0 && (
                <div className="x-explain-block">
                  <p className="x-explain-head">Where the documents disagree</p>
                  <ul className="x-explain-clash">
                    {(explanation.disagreements ?? []).map((d, i) => (
                      <li key={i}>
                        <p className="x-explain-clash-about">{d.about}</p>
                        <p className="x-explain-clash-why">{d.why_it_matters}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ── THE QUESTIONS, WHICH ARE THE POINT ────────────────────
                  The dossier's whole design is that it asks rather than
                  decides, and the first version of this brief summarised the
                  finding, the evidence and the price and then dropped them —
                  everything except the deliverable. They are carried over
                  shortened, still phrased as questions, with the role each was
                  addressed to; the schema rejects one that stopped ending in a
                  question mark. */}
              {(explanation.questions_for_people ?? []).length > 0 && (
                <div className="x-explain-block">
                  <p className="x-explain-head">For a person to decide</p>
                  <ul className="x-explain-asks">
                    {(explanation.questions_for_people ?? []).map((q, i) => (
                      <li key={i}>
                        <p className="x-explain-ask">{q.question}</p>
                        <p className="x-explain-who">{q.owner}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(explanation.what_happens_next ?? []).length > 0 && (
                <div className="x-explain-block">
                  <p className="x-explain-head">What happens next</p>
                  <ul className="x-explain-next">
                    {(explanation.what_happens_next ?? []).map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}

              {run && (
                <p className="x-explain-run">
                  {run.engine} · {(run.ms / 1000).toFixed(1)}s · no documents were read, only the
                  answer below
                </p>
              )}
            </div>
          )}
        </OriginDialog>
      )}
    </>
  );
}
