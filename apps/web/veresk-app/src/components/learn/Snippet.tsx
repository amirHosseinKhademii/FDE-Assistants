/**
 * Code, coloured the way the reader's editor colours it.
 *
 * WHY A REAL HIGHLIGHTER AND NOT A REGEX. The first version of these pages
 * painted one line and left the rest grey, on the argument that highlighting
 * everything is decoration with no argument behind it. That argument is right
 * about ARBITRARY colour and wrong about this: a reader who has TypeScript open
 * in VS Code all day reads `const`-blue and string-orange without deciding to,
 * and a snippet that does not use those colours costs them that reflex. Matching
 * the editor is not decoration — it is not making them re-learn a code block.
 *
 * SO IT IS VS CODE'S OWN COLOURS, NOT AN IMITATION. `shiki` runs the same
 * TextMate grammars and the same `dark-plus` theme the editor ships. Nothing
 * here is a hand-tuned approximation that drifts from it.
 *
 * IT RUNS SYNCHRONOUSLY, WHICH IS THE WHOLE REASON THIS SHAPE WORKS. Shiki's
 * usual entry point is async, and an async highlighter inside a React component
 * means either a loading state on a static page or a mismatch between what the
 * server rendered and what the client hydrates. `createHighlighterCoreSync`
 * with the JavaScript regex engine has neither problem: no WASM to await, no
 * effect, no flash of unhighlighted code.
 *
 * ── THE ONE THING THAT SURVIVED FROM THE HAND-ROLLED VERSION ────────────────
 *
 * `mark`. Syntax colour says what a token IS; it cannot say which line the
 * paragraph above is talking about. That is the page's own claim about the code
 * and no grammar knows it, so it stays — drawn as a tinted row plus a rule in
 * the gutter, UNDER the syntax colours rather than over them, so it never
 * changes what a token looks like.
 */
import { createHighlighterCoreSync, type HighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import darkPlus from '@shikijs/themes/dark-plus';
import typescript from '@shikijs/langs/typescript';
import sql from '@shikijs/langs/sql';
import bash from '@shikijs/langs/bash';
/*
 * PYTHON, ADDED FOR ONE PAGE, AND THAT IS A DECISION RATHER THAN A DEFAULT.
 *
 * `/learn/finetuning` quotes `peft` and `transformers`. Those libraries are
 * Python; a TypeScript LoRA example would be a fiction, and an unhighlighted
 * block inside a frame that says "VS Code's own colours" is worse than either.
 *
 * The cost is one grammar in the shared learn chunk — no new dependency, the
 * package was already installed for the other four. Measured at the point of
 * adding, by reading the file rather than by estimating it:
 *
 *   node_modules/@shikijs/langs/dist/python.mjs   77,130 bytes raw
 *                                                  9,407 bytes gzipped
 *
 * against a learn chunk that was 85 KB gzipped before it. That is the largest
 * single grammar here and it buys one page; if a second language is ever wanted
 * for one page, this is the comment to argue with.
 */
import python from '@shikijs/langs/python';
import json from '@shikijs/langs/json';

/** What the snippets on these pages are actually written in. */
export type Lang = 'typescript' | 'sql' | 'bash' | 'json' | 'python' | 'text';

/**
 * ONE HIGHLIGHTER FOR THE WHOLE APP, built once at module scope.
 *
 * Four grammars and one theme, named individually rather than pulled from the
 * bundle that carries every language shiki supports. That list is the cost
 * control: a `@shikijs/langs` import is a grammar in the bundle, so adding a
 * language to a page is a decision somebody makes here rather than a default.
 */
const highlighter: HighlighterCore = createHighlighterCoreSync({
  themes: [darkPlus],
  langs: [typescript, sql, bash, json, python],
  engine: createJavaScriptRegexEngine(),
});

/*
 * THE BACKGROUND IS A VARIABLE, NOT THE THEME'S OWN VALUE, AND THAT IS A
 * READABILITY FIX RATHER THAN A PREFERENCE.
 *
 * Dark+ ships `#1e1e1e`. On a page whose surface is `#0d0f15` that is close
 * enough that the block's edge disappears — it reads as a slightly different
 * shade of the same darkness rather than as an editor. Inside the walkthrough
 * dialog it is worse, because the panel is darker still and the code is the
 * thing the reader opened the dialog for.
 *
 * So `--snip-bg` is lifted on the page and lifted further in the dialog. The
 * TOKEN COLOURS ARE UNTOUCHED: the whole promise of using shiki is that these
 * are VS Code's own values, and hand-adjusting them would make that false.
 * Foreground `#d4d4d4` sits at about 9:1 on the lifted background, so the lift
 * costs contrast it can afford and buys an edge the block did not have.
 */

export function Snippet({
  lines,
  lang = 'typescript',
  mark = [],
  startLine,
}: {
  lines: string[];
  lang?: Lang;
  /** Indices into `lines` the prose above is pointing at. */
  mark?: number[];
  /**
   * The real first line number in the real file, when the header names a range.
   * Absent where the snippet is assembled from more than one place — a gutter
   * that counts 1, 2, 3 beside a header saying `:195–197` is a small lie in the
   * one component whose entire job is being checkable.
   */
  startLine?: number;
}) {
  const code = lines.join('\n');

  /* `text` is not a grammar — it is the deliberate absence of one, for output
     that is not code: a distance scale, a diagnostic, a run's console output.
     Colouring those would be inventing syntax they do not have. */
  const tokenised =
    lang === 'text'
      ? lines.map((l) => [{ content: l, color: '#d4d4d4' }])
      : highlighter.codeToTokens(code, { lang, theme: 'dark-plus' }).tokens;

  /*
   * NO GUTTER AT ALL WHEN THERE IS NO REAL FIRST LINE, rather than an empty one.
   *
   * It rendered as a blank column the width of the line count, which pushed the
   * code right for no reason and looked like a gutter that had failed to load.
   * The alternative — numbering from 1 — is worse and is the thing this
   * component exists not to do: almost every snippet here is an excerpt whose
   * header names a real range, so `1, 2, 3` beside `classification.ts:196–285`
   * is a small lie in the one component whose entire job is being checkable.
   *
   * The code being quoted says it better than this comment does: provenance
   * that is approximately right is the kind of wrong that survives review,
   * because it looks exactly like provenance that is right.
   */
  const gutterWidth = startLine === undefined ? 0 : String(startLine + lines.length).length;

  return (
    <div className="snip">
      <pre>
        <code>
          {tokenised.map((line, i) => (
            <span key={i} className="snip-line" data-mark={mark.includes(i) || undefined}>
              {startLine !== undefined && (
                <span className="snip-n" style={{ width: `${gutterWidth}ch` }} aria-hidden>
                  {startLine + i}
                </span>
              )}
              <span className="snip-code">
                {line.length === 0 ? (
                  ' '
                ) : (
                  line.map((t, j) => (
                    <span key={j} style={{ color: t.color }}>
                      {t.content}
                    </span>
                  ))
                )}
              </span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
