/**
 * “How this works” — a press that opens the real code with a plain-English
 * reading of it.
 *
 * WHY A DIALOG AND NOT MORE PAGE. Every lesson has two readers and they want
 * opposite things. One is here for the idea and will bounce off a screen of
 * TypeScript; the other does not believe a word of it until they have seen the
 * function. Inlining the code serves the second and loses the first; leaving it
 * out does the reverse. A press puts the second reader one click away and costs
 * the first reader one line.
 *
 * IT IS `OriginDialog`, WHICH ALREADY EXISTS. `@fde/uikit` has the dialog that
 * grows out of the thing that opened it, with all three ways out already wired
 * — outside, Escape, the close button — plus the scroll lock and the measured
 * transform origin. Writing a second modal for this section would have been a
 * second set of those bugs.
 *
 * THE SHAPE OF THE CONTENT IS FIXED AND THAT IS THE POINT:
 *
 *   in plain words   what the code does, with no jargon and no identifiers.
 *   the code         real, from a real file, with the path to open.
 *   line by line     each marked line, said again in English.
 *   the trap         what went wrong here once. OPTIONAL, and almost every one
 *                    of these has one, because a rule with no scar is usually a
 *                    rule nobody has tested.
 *
 * A caller cannot reorder those or drop the first, so no walkthrough can turn
 * into "here is some code, work it out".
 */
import { useState } from 'react';
import { OriginDialog, originOf, type Origin } from '@fde/uikit';
import { Snippet, type Lang } from './Snippet';

export interface Walkthrough {
  /** A claim, not a noun phrase. "How two lists become one" beats "Fusion". */
  title: string;
  /** Where it lives, so a reader can open it. `path:lines`. */
  path: string;
  /** What it does, in sentences a non-engineer finishes. Two to four. */
  plain: string[];
  /** The real code. One string per line. */
  lines: string[];
  /** Defaults to TypeScript, which is what most of this repo is. */
  lang?: Lang;
  /** Indices into `lines` the explanation is about. */
  mark?: number[];
  /** Each marked line, said again in English. */
  says?: Array<{ at: string; is: string }>;
  /** What went wrong here once, and what the code now does about it. */
  trap?: string;
}

export function HowItWorks(w: Walkthrough) {
  const [from, setFrom] = useState<Origin | null>(null);
  /*
   * THE HUE IS READ OFF THE TRIGGER AT PRESS TIME, AND IT HAS TO BE.
   *
   * `OriginDialog` portals to `<body>` — deliberately, because an ancestor with
   * a transform would otherwise become the containing block for its `fixed`
   * overlay, and this repo has already measured that bug. The consequence is
   * that the panel is NOT a descendant of the `<article className="lesson">`
   * that sets `--lesson`, so inheritance cannot reach it: every dialog on every
   * lesson would fall back to `:root` and come out lesson one's sky blue.
   *
   * Reading the computed value off the button is the one place the correct hue
   * is guaranteed to be in scope, and it keeps the hue out of this component's
   * props — a caller cannot pass the wrong one because a caller cannot pass one.
   */
  const [hue, setHue] = useState('var(--color-learn-1)');

  return (
    <>
      <button
        type="button"
        className="learn-open"
        onClick={(e) => {
          setHue(getComputedStyle(e.currentTarget).getPropertyValue('--lesson').trim() || hue);
          setFrom(originOf(e.currentTarget));
        }}
        aria-haspopup="dialog"
      >
        <span className="learn-open-mark" aria-hidden>
          {'</>'}
        </span>
        <span className="learn-open-text">
          <span className="learn-open-title">How this works</span>
          <span className="learn-open-path">{w.path}</span>
        </span>
        <span className="learn-open-go" aria-hidden>
          open
        </span>
      </button>

      {from && (
        <OriginDialog
          from={from}
          label={w.title}
          header={
            <div style={{ ['--lesson' as string]: hue }}>
              <p className="font-mono text-[0.6875rem] tracking-[0.08em] uppercase" style={{ color: 'var(--lesson)' }}>
                how this works
              </p>
              <p className="mt-1.5 font-mono text-base leading-snug font-medium text-ui-fg">{w.title}</p>
            </div>
          }
          onClose={() => setFrom(null)}
        >
          <div className="learn-walk" style={{ ['--lesson' as string]: hue }}>
            <section>
              <h4 className="learn-walk-h">In plain words</h4>
              <ol className="mt-3 space-y-2.5">
                {w.plain.map((line, i) => (
                  <li key={i} className="grid grid-cols-[1.25rem_1fr] gap-3">
                    <span className="font-mono text-[0.6875rem] leading-6" style={{ color: 'var(--lesson)' }}>
                      {i + 1}
                    </span>
                    <span className="max-w-[58ch] text-[0.9375rem] leading-relaxed text-ui-dim">{line}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="mt-7">
              <h4 className="learn-walk-h">The code, as it is on disk</h4>
              <div className="snip-frame mt-3">
                <div className="snip-head">
                  <span className="snip-kind">code</span>
                  <span className="snip-path">{w.path}</span>
                </div>
                <Snippet lines={w.lines} lang={w.lang ?? 'typescript'} mark={w.mark} />
              </div>
            </section>

            {w.says && w.says.length > 0 && (
              <section className="mt-7">
                <h4 className="learn-walk-h">Line by line</h4>
                <dl className="mt-3 space-y-3">
                  {w.says.map((s) => (
                    <div key={s.at} className="grid gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,15rem)_1fr]">
                      <dt className="font-mono text-[0.78125rem] leading-relaxed break-words text-ui-fg">{s.at}</dt>
                      <dd className="max-w-[54ch] text-[0.875rem] leading-relaxed text-ui-dim">{s.is}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {w.trap && (
              <section className="mt-7">
                <h4 className="learn-walk-h">What went wrong here once</h4>
                {/* DASHED AND UNCOLOURED, like the caveat boxes. This is not a
                    live warning about the system — it is a bug that is already
                    fixed, and the fix is the code above. Amber would say
                    something is wrong now. */}
                <p className="learn-caveat mt-3 max-w-[62ch] text-[0.875rem] leading-relaxed text-ui-dim">
                  {w.trap}
                </p>
              </section>
            )}
          </div>
        </OriginDialog>
      )}
    </>
  );
}
