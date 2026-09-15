/**
 * Operations lesson 5 — every number in a document can go stale.
 *
 * A READING OF `docs/steering/OPERATIONS.md` §5.
 *
 * ── THIS PAGE HAS A LIVE EXAMPLE FROM ITS OWN TRACK ────────────────────────
 *
 * The cost lesson three pages back shipped with 74% and a $0.0177 median, both
 * computed by hand from a log. Turning that table into a command found a whole
 * surface missing from the first figure and a wrong grouping in the second. The
 * numbers moved to 68.5% and $0.0151 before anybody read the page.
 *
 * It happened twice. The second time, `pnpm arch:graph` — written for the
 * architecture page an hour later — showed that `docs/ARCHITECTURE.md` §1 was
 * stale by 5,227 lines in the surface layer, and that 7,911 of the difference
 * is THIS LEARNING TRACK. A document describing the repo became wrong because
 * somebody added pages to the repo, and the pages were these ones.
 *
 * Both are on the page for that reason and not as a flourish. They are also
 * better evidence than the three historical incidents, because a reader can
 * re-run the command that caught them.
 */
import { LessonPage } from '../../components/learn/LessonPage';
import { HowItWorks } from '../../components/learn/HowItWorks';
import { Caveat, Data, Figure, Glossary, Key, P, RunIt, SaidOutLoud, Step, Term } from '../../components/learn/kit';
import { Stages } from '../../components/learn/charts/Stages';

export function Drift() {
  return (
    <LessonPage slug="drift">
      <Step n={1} title="Only a claim with a producer can be checked">
        <P>
          This repo's documentation is full of numbers — 3,854 passages, 98% extraction accuracy, recall@6
          0.813, 15/15 green. Every one was true when written, and every one can become false when code
          changes, with nothing to say so.
        </P>

        <Figure
          title="The distinction the whole design rests on"
          sub="Get it wrong in either direction and the tool is worthless."
          source="docs/steering/OPERATIONS.md §5."
        >
          <div className="space-y-3">
            <div className="rounded-lg border px-4 py-3" style={{ borderColor: 'color-mix(in oklab, var(--lesson) 40%, var(--color-ui-line))' }}>
              <p className="font-mono text-[0.6875rem] tracking-[0.08em] uppercase" style={{ color: 'var(--lesson)' }}>
                a claim with a producer — checkable
              </p>
              <p className="mt-2 font-mono text-[0.875rem] text-ui-fg">“3,854 passages”</p>
              <p className="mt-1.5 max-w-[60ch] text-[0.875rem] leading-relaxed text-ui-dim">
                A command emits that number: <code className="font-mono">pnpm steering:corpus-check</code>. It
                can be compared, and on mismatch it can fail or be rewritten.
              </p>
            </div>
            <div className="learn-caveat">
              <p className="font-mono text-[0.6875rem] tracking-[0.08em] text-ui-faint uppercase">
                prose — deliberately out of scope
              </p>
              <p className="mt-2 text-[0.875rem] text-ui-fg">
                “the refusal should say we have never done this kind of work”
              </p>
              <p className="mt-1.5 max-w-[60ch] text-[0.875rem] leading-relaxed text-ui-dim">
                A judgement. No checker can verify it, and one that tried would fire on opinions — at which
                point somebody turns it off, and it stops catching the numbers too.
              </p>
            </div>
          </div>
        </Figure>

        <Key>
          Check too much and it fires on opinions. Check too little and it misses the numbers that get quoted.
          The line between a claim and a judgement is the design, and everything else is plumbing.
        </Key>
      </Step>

      <Step n={2} title="“Healing” is not a model rewriting your documents">
        <P>
          It is a comparison and a substitution, with no model anywhere in it.
        </P>

        <Figure
          title="What a docs check would actually do"
          kind="proposed"
          sub="Deterministic, model-free, and reviewable as a diff. Nothing here is built."
          source={
            <>
              docs/steering/OPERATIONS.md §5. <strong className="text-ui-dim">Not built</strong> — no marker
              convention is settled and no checker exists. Every <span className="text-ui-dim">*:check</span>{' '}
              in this repo checks code; none checks prose.
            </>
          }
        >
          <Stages
            stages={[
              { verb: 'mark', out: 'a claim, tagged with its producer', does: 'The number in the document says which command emits it.' },
              { verb: 'emit', out: 'the producer runs with --json', does: 'The same command that already prints it for a human, printing it for a machine.' },
              { verb: 'compare', out: 'marked value against emitted value', does: 'String comparison. No model, no judgement, no reading.' },
              {
                verb: 'fail or heal',
                out: 'a red check, or a dated substitution',
                does: 'In CI it fails. With --heal it writes the new value and stamps the date.',
                rule: 'The value is the FAILING CHECK, not the rewrite. A model rewriting prose produces a diff nobody can review and can quietly launder a wrong number into confident-sounding text.',
              },
            ]}
          />
        </Figure>
      </Step>

      <Step n={3} title="Why this beats “remember to update the docs”">
        <P>
          Because nobody does, and this repo can prove it from its own git history. Three real incidents:
        </P>

        <Figure
          title="Three drift incidents, from this repository"
          sub="Not hypotheticals. Each one is a commit."
          source="docs/steering/OPERATIONS.md §5, citing this repo's own git log."
        >
          <div className="space-y-3">
            {[
              {
                ref: '6c2faf4',
                t: 'A page claimed only 220 files were left to embed.',
                b: 'The whole corpus was embedded. The commit message is literally “Say that the whole corpus is embedded, because the page claimed only 220 files left.” A count in the UI, stale, and nothing flagged it.',
              },
              {
                ref: '053a7b0 correcting 2809171',
                t: '“Four of nine card kinds” overflowed — corrected one commit later.',
                b: 'The real figure was “7 of 13 cards — 4 of its 7 card kinds”. A count measured once, written down, and wrong by the very next commit.',
              },
              {
                ref: "NEXT.md's own preamble",
                t: 'Two claims false within hours of being written.',
                b: '“The 2026-09-13 version of this file said the eval had never run and that nothing was committed. Both were false within hours of being written.” That is the argument in a sentence.',
              },
              {
                ref: 'this track, 2026-09-15',
                t: 'The cost lesson shipped with two wrong figures, three pages back.',
                b: '74% and a $0.0177 median, both hand-computed from a log. Making the table a command found a whole surface missing from one and a wrong grouping in the other. 68.5% and $0.0151 are what the command prints — and the page says so rather than quietly carrying the better numbers.',
              },
              {
                ref: 'the rail on this very page, until an hour ago',
                t: 'The navigation said “twelve lessons, two tracks”. There are seventeen, in three.',
                b: 'Three surfaces carried the hardcoded count — the sidebar, the section index and the firm\u2019s front page — and all three stayed at twelve after a whole track of five landed. A number that went stale the moment the thing it counts changed, in the navigation of the site whose last lesson is this one. Nothing caught it: a person read the page and asked why the count looked wrong. All three now derive from the list they describe.',
              },
              {
                ref: 'docs/ARCHITECTURE.md §1, right now',
                t: 'These very pages made the repo\u2019s own architecture document wrong.',
                b: 'Its §1 table gives the surface layer as 24,073 lines. It is 29,300 — and 7,911 of the difference is the learning track you are reading. The document was true when written; writing a page about drift caused the drift. Its §2 also says @fde/guard has three consumers and the generated graph says four. Re-run pnpm arch:graph and see for yourself.',
              },
            ].map((x) => (
              <div key={x.ref} className="rounded-lg border border-ui-line bg-ui-surface px-4 py-3">
                <p className="font-mono text-[0.6875rem]" style={{ color: 'var(--lesson)' }}>
                  {x.ref}
                </p>
                <p className="mt-1.5 max-w-[62ch] font-medium text-ui-fg">{x.t}</p>
                <p className="mt-1.5 max-w-[62ch] text-[0.875rem] leading-relaxed text-ui-dim">{x.b}</p>
              </div>
            ))}
          </div>
        </Figure>

        <Key>
          The last two happened <em className="not-italic">while this section was being written</em>, and the
          fifth is the sharpest thing on this page: a document describing the repo became wrong because
          somebody added pages to the repo — and the pages they added were these ones, about drift.
        </Key>

        <P>
          <strong className="font-medium text-ui-fg">The fourth one is the one to sit with</strong>, because
          it breaks the pattern: it was caught by a person looking at the page, not by any command. It had no
          producer — somebody had typed “twelve” into three files — so there was nothing for a checker to
          compare it against. That is what this lesson's first section is about: the fix was not to check the
          number, it was to stop the number from being a number and make it a derivation.
        </P>

        <P>
          The other two were caught the way this lesson argues for: a number that had a producer was compared
          against its producer.{' '}
          <code className="font-mono text-ui-fg">pnpm steering:spend</code> caught the first,{' '}
          <code className="font-mono text-ui-fg">pnpm arch:graph</code> caught the second, and neither needed
          anybody to remember anything. The three historical incidents above were all caught by a person
          noticing, while writing something else.
        </P>
      </Step>

      <Step n={4} title="The pattern to copy, including its paranoia">
        <P>
          The repo already has the two pieces. It generates documentation artifacts —{' '}
          <code className="font-mono text-ui-fg">corpus.generated.ts</code>,{' '}
          <code className="font-mono text-ui-fg">estate.generated.ts</code>,{' '}
          <code className="font-mono text-ui-fg">worked-example.generated.ts</code> — which is the
          derived-artifact pattern already in use. And it has a checker shaped exactly right.
        </P>

        <HowItWorks
          title="How a checker proves it can still fail"
          shape="assembled"
          path="scripts/leak-check.mjs"
          lang="bash"
          plain={[
            'The leak checker scans every executable line of the shared packages for one customer’s vocabulary, and fails the build if any leaked in.',
            'Before it reports anything, it plants a SYNTHETIC LEAK in its own input and asserts that it catches its own plant.',
            'It does that because it once passed clean while silently stripping a real leaked credential URL — it mistook `postgresql://...` for a trailing comment, parsed almost nothing, and reported success.',
            'A checker that has never been shown to fail is not evidence of anything. That is the single most transferable idea on this page, and it applies to a docs checker exactly as much as to this one.',
          ]}
          lines={[
            '$ pnpm leak:check',
            '',
            '  ok    no domain vocabulary in packages/*/src outside @claims/insurance',
            '        comments are exempt on purpose — that is where the reasoning lives',
            '  ok    control: planted leaks ARE caught, and comments are NOT',
            '        caught the planted default AND the credential in a URL, and',
            '        ignored every comment line — the scan can fail',
            '',
            'leak: PASS',
          ]}
          mark={[4, 5, 6]}
          says={[
            { at: 'control: planted leaks ARE caught', is: 'The negative control. Without this line, a PASS is indistinguishable from a checker that scanned nothing.' },
            { at: 'the credential in a URL', is: 'The specific bug that made this necessary — it is named in the output, so the control cannot drift away from the thing it was built for.' },
          ]}
          trap="It passed clean for a while. The scan was stripping what it thought were comments and throwing away most of the file, so there was nothing left to find a leak in. Green, fast, and measuring nothing."
        />

        <P>
          <code className="font-mono text-ui-fg">@fde/scanner</code> is the other half — “read a source tree
          and prove a rule about it”, with the machinery shared and{' '}
          <strong className="font-medium text-ui-fg">the rule supplied by the caller</strong>. It exists
          because three checks each wrote their own comment-stripper, the three disagreed, and a documented,
          already-fixed bug was still live in one of them.
        </P>
      </Step>

      <Step n={5} title="What is missing">
        <P>
          Nothing verifies a documented number against its producer. Every{' '}
          <code className="font-mono text-ui-fg">*:check</code> in this repo checks{' '}
          <strong className="font-medium text-ui-fg">code</strong>; none checks{' '}
          <strong className="font-medium text-ui-fg">prose</strong>. No marker convention is settled, no
          producer takes a <code className="font-mono text-ui-fg">--json</code> flag, and no{' '}
          <code className="font-mono text-ui-fg">docs:check</code> exists.
        </P>
        <P>
          The learning pages you are reading apply the discipline by hand instead: every lesson names the
          document it is a reading of and says the document wins, every figure carries the command that
          reprints it, and the dated ones say their date. That is a{' '}
          <Term def="A rule everybody agrees to follow, with nothing enforcing it. Works until somebody is in a hurry, and fails silently rather than loudly.">convention</Term>
          , not a check — which is precisely the gap this lesson is about.
        </P>
      </Step>

      <SaidOutLoud
        then={
          <>
            “Why not have an LLM keep the docs up to date?” — because the value is the{' '}
            <em className="not-italic text-ui-fg">failing check</em>, not the rewrite. A model rewriting prose
            produces a diff nobody can review, and can quietly launder a wrong number into confident-sounding
            text. Deterministic comparison, model-free, reviewable.
          </>
        }
      >
        Documentation drifts silently and this repo could prove it — a page claimed{' '}
        <strong>220 files</strong> when the whole corpus was embedded, and a plan file opened by saying its own
        previous version had two claims that were false <em>within hours</em> of being written. So the move is
        to mark the claims that have a machine producer, give every producer a <strong>--json</strong> flag,
        and make a check compare them. Only marked claims get checked — judgements and proposals are
        deliberately out of scope, because a checker that fires on opinions gets turned off. And the checker
        plants its own drift and asserts it catches it, because the one already in this repo once passed clean
        while silently parsing nothing.
      </SaidOutLoud>

      <RunIt
        items={[
          { cmd: 'pnpm leak:check', does: 'The pattern above, including the control that proves it can still fail.', cost: 'free' },
          { cmd: 'pnpm steering:corpus-check', does: 'The producer behind “3,854 passages” — the kind of command a docs check would compare against.', cost: 'free' },
          { cmd: 'pnpm steering:spend', does: 'The producer behind the cost lesson’s figures. It is what corrected them.', cost: 'free' },
          { cmd: 'pnpm steering:estate-check', does: 'Another producer: what the derived database actually contains.', cost: 'free' },
        ]}
      />

      <Caveat
        items={[
          {
            claim: 'None of this is built.',
            body: 'No marker convention, no --json flags, no docs:check. What exists is the culture — dated sections, named sources, commands beside figures — and the argument that a convention is not a check.',
          },
          {
            claim: 'The four incidents are the ones that were caught.',
            body: 'Every one was noticed by a person, usually while writing something else. There is no way to know how many stale numbers are in this repo right now, and that is the actual state of it.',
          },
          {
            claim: 'A checker cannot tell you a number is wrong, only that it moved.',
            body: 'If the producer itself is wrong, the check agrees with it enthusiastically. That is why the leak checker plants its own failure, and why a docs checker would need to as well.',
          },
        ]}
      />

      <Glossary
        terms={[
          { word: 'producer', def: 'The command that emits a number. A claim with one can be checked; a claim without one is a judgement.' },
          { word: 'derived artifact', def: 'A file generated from a source of truth rather than written by hand. The strongest form of this idea: the number in the doc should not be checked, it should be generated.' },
          { word: 'negative control', def: 'A planted failure a checker must catch. Without one, a green check is indistinguishable from a check that scanned nothing.' },
          { word: 'convention', def: 'A rule everybody agrees to follow with nothing enforcing it. Works until somebody is in a hurry.' },
          { word: 'staleness scoring', def: 'Comparing modification times of code against its docs to flag divergence. Cheap, noisy, and a reasonable second signal.' },
        ]}
      />
    </LessonPage>
  );
}
