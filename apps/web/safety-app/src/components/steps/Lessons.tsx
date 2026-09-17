/**
 * Five bugs from one week, and they are two lessons rather than five.
 *
 * ── WHY THIS IS A SECTION AND NOT A FOOTNOTE ───────────────────────────────
 *
 * A page describing a pipeline that went smoothly is a page describing a demo.
 * None of these is interesting alone — each is a small fact about a library, a
 * locale, a default — and together they are the thing this engagement was built
 * to find: what happens when machinery that works on a corpus we wrote meets
 * one nobody wrote for us.
 *
 * ── THEY ARE NOT ALL THE SAME LESSON, AND SAYING SO IS THE POINT ───────────
 *
 * Three are "the tool and the thing it measures were configured differently".
 * Two are not, and forcing them in would be the tidier and worse choice — they
 * are ESTIMATES, and they even failed differently from each other: one had a
 * wrong input, the other had a right input that had aged out from under it. A
 * page that collapsed five findings into one slogan would be doing the thing
 * this whole site argues against.
 *
 * ── EVERY ROW IS A REAL FAILURE WITH A REAL COST ───────────────────────────
 *
 * Nothing here is illustrative. Each one has a commit behind it, and three of
 * the five passed a check before anybody noticed — which is why they are worth
 * a reader's time and a tidier list would not be.
 *
 * THE COUNT IN THE HEADING IS TYPED IN TWO PLACES AND WILL GO STALE. It is a
 * count of things that happened rather than of anything in this file, so it
 * cannot be derived; when a sixth arrives, the `<h2>`, the sentence under it
 * and this comment all need it.
 */
import { Mono } from '@fde/uikit';
import { Data } from '@veresk/surface';

interface Lesson {
  where: string;
  what: string;
  /** What was configured one way here and another way there. */
  differed: string;
  /** What it cost, and it is not always time. */
  cost: string;
  body: React.ReactNode;
}

/**
 * THE ORDER IS BY HOW HARD THEY WERE TO SEE, not by when they happened.
 *
 * The locale one leads because it is the only one where the code was right, the
 * check was right, and the ENVIRONMENT was the thing that differed — so running
 * it locally, which is the fix for the other two, would not have caught it.
 */
const CONFIGURED: Lesson[] = [
  {
    where: 'the deploy',
    what: "printf's thousands grouping is locale-dependent",
    differed: 'the shell defined a separator the CI runner does not',
    cost: 'a red pipeline on a working deployment',
    body: (
      <>
        The smoke test asserted the page contains{' '}
        <Mono>70,194</Mono>. <Mono>printf "%'d"</Mono> groups thousands only if
        the active locale defines a separator: <Mono>en_US.UTF-8</Mono> prints{' '}
        <Mono>70,194</Mono> and <Mono>C.UTF-8</Mono> prints{' '}
        <Mono>70194</Mono>. The app was up, returning 200 in 0.6 seconds with the
        right number in the page, and the job spent twelve attempts looking for a
        string that could not be there before reporting that it{' '}
        <em>never served its estate data</em>.
      </>
    ),
  },
  {
    where: 'the corpus survey',
    what: "Python's csv.reader defaults to quote handling",
    differed: 'the parser was configured for a format the file does not use',
    cost: 'two invented findings, written into a document as properties of the data',
    body: (
      <>
        NHTSA's files are tab-delimited and name no quote character, but 708
        lines carry an odd <Mono>"</Mono> because people write{' '}
        <Mono>THE "SERVICE ENGINE" LIGHT CAME ON</Mono>. At an unbalanced quote
        the reader consumes newlines, so 100,980 rows became 100,928 and a
        2,048-character narrative became one of 18,257. Both were reported as
        defects in the corpus. The corpus was clean; the reader was configured
        for a format the file does not use.
      </>
    ),
  },
  {
    where: 'the parse step',
    what: 'a CLI read process.env but never .env',
    differed: 'the tool read the environment while the app read a file',
    cost: 'every check passed, against the wrong corpus',
    body: (
      <>
        The snapshot moved and <Mono>SAFETY_CORPUS_DIR</Mono> changed, and
        nothing happened — <Mono>pnpm --filter</Mono> runs with the package as
        its working directory, so <Mono>dotenv</Mono>'s default lookup found no{' '}
        <Mono>.env</Mono>. It did not error.{' '}
        <span className="text-ui-fg">
          It read the old corpus and passed every check against it.
        </span>
      </>
    ),
  },
];

export function Lessons() {
  return (
    <section className="lift-in mt-16 border-t border-ui-line pt-10">
      <h2 className="font-mono text-lg leading-snug font-medium tracking-tight text-ui-fg md:text-xl">
        Five things that went wrong, and three of them are the same thing
      </h2>
      <p className="mt-3 max-w-[64ch] leading-relaxed text-ui-dim">
        None of these is interesting alone. Together they are what this
        engagement was built to find: not whether the machinery works, but where
        it bends when the data is not ours.{' '}
        <span className="text-ui-fg">
          Three of the five passed a check before anybody noticed.
        </span>
      </p>

      <h3 className="mt-10 font-mono text-[0.6875rem] tracking-[0.08em] text-cal-1 uppercase">
        the tool and the thing it measures were configured differently
      </h3>

      <ul className="mt-5 grid gap-7">
        {CONFIGURED.map((l) => (
          <li key={l.what} className="border-t border-ui-line pt-4">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="font-mono text-[0.6875rem] tracking-[0.06em] text-ui-faint uppercase">
                {l.where}
              </span>
              <span className="font-mono text-[0.9375rem] text-ui-fg">{l.what}</span>
            </div>
            <p className="mt-1 font-mono text-[0.75rem] text-cal-2">{l.differed}</p>
            <p className="mt-3 max-w-[66ch] text-[0.875rem] leading-relaxed text-ui-dim">
              {l.body}
            </p>
            <p className="mt-2.5 font-mono text-[0.6875rem] text-ui-faint">cost · {l.cost}</p>
          </li>
        ))}
      </ul>

      <p className="mt-8 max-w-[66ch] leading-relaxed text-ui-dim">
        The fix for all three is the same and it is not a rule about libraries:{' '}
        <span className="text-ui-fg">
          check a thing against something that shares no code with it
        </span>
        . The parser is checked against <Mono>awk</Mono> over the raw file. The
        loader is checked against <Mono>wc -l</Mono> rather than its own tally.
        A tool confirming its own output proves nothing.
      </p>

      <p className="mt-4 max-w-[66ch] leading-relaxed text-ui-dim">
        And the deploy bug is the hard one, which is why it leads. The code was
        right, the assertion was right, and it was verified by building the image
        and running it — the fix that catches the other two.{' '}
        <span className="text-ui-fg">
          The environment itself was the thing that differed
        </span>
        , so running it in the wrong environment proved the wrong thing.
      </p>

      {/* ── AND TWO THAT ARE NOT THAT AT ALL ───────────────────────────────
          Both are estimates rather than configurations, and they failed in
          different ways: one had a wrong input, the other had a right input
          that had aged. Filing them under the trio's heading would have been
          tidier and would have taught the wrong thing. */}
      <h3 className="mt-14 font-mono text-[0.6875rem] tracking-[0.08em] text-cal-2 uppercase">
        and two that are not that at all — both estimates
      </h3>

      <div className="mt-5 border-t border-ui-line pt-4">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="font-mono text-[0.6875rem] tracking-[0.06em] text-ui-faint uppercase">
            the embed step
          </span>
          <span className="font-mono text-[0.9375rem] text-ui-fg">
            an estimate that was wrong by less than a factor of two
          </span>
        </div>
        <p className="mt-1 font-mono text-[0.75rem] text-cal-2">
          the synthetic record had a 10-character float; the real one has 20
        </p>

        <p className="mt-3 max-w-[66ch] text-[0.875rem] leading-relaxed text-ui-dim">
          Writing 73,442 records with <Mono>JSON.stringify</Mono> builds one
          string, and V8 caps a string at 512 MB. The estimate beforehand said
          346 MB and the file is 637 MB, because a float serialises as{' '}
          <Mono>0.019854292273521423</Mono> — twenty characters of double
          precision out of a model that computed a float32.
        </p>

        <Data
          path="what it cost"
          mark={[1]}
          lines={[
            '73,442 vectors of 384 dimensions in 37.9 min',
            'RangeError: Invalid string length',
          ]}
        />

        <p className="mt-3.5 max-w-[66ch] text-[0.875rem] leading-relaxed text-ui-dim">
          Nothing about the arithmetic was careless. The wrong number went into
          it, and the result was wrong by a factor of 1.8 —{' '}
          <span className="text-ui-fg">
            which is exactly the size of error a plausibility check does not
            catch
          </span>
          . A 10× error gets questioned by whoever reads it. A 1.8× one gets
          nodded at.
        </p>

        <p className="mt-3.5 max-w-[66ch] text-[0.875rem] leading-relaxed text-ui-dim">
          The second lesson is in the shape of the failure rather than its cause.
          The work had <em>finished</em> — every vector computed — and the write
          destroyed it. The fix is NDJSON flushed as it goes and resumable from
          whatever is on disk, and the format is the smaller half:{' '}
          <span className="text-ui-fg">
            write expensive work down as you produce it
          </span>
          . Thirty-eight minutes of finished work should never be one unhandled
          call away from nothing.
        </p>

        <p className="mt-2.5 font-mono text-[0.6875rem] text-ui-faint">
          cost · 37.9 minutes, and the only real time lost
        </p>
      </div>

      <div className="mt-8 border-t border-ui-line pt-4">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="font-mono text-[0.6875rem] tracking-[0.06em] text-ui-faint uppercase">
            the index step
          </span>
          <span className="font-mono text-[0.9375rem] text-ui-fg">
            an extrapolation from a measurement that had aged
          </span>
        </div>
        <p className="mt-1 font-mono text-[0.75rem] text-cal-2">
          the input was right when it was taken, and the schema moved
        </p>

        <p className="mt-3 max-w-[66ch] text-[0.875rem] leading-relaxed text-ui-dim">
          Storage was predicted at 140 MB from the sibling engagement's 2,002
          bytes a row — measured, not guessed, which is why it was trusted. The
          real table is 295 MB, because that figure{' '}
          <span className="text-ui-fg">predates the full-text column</span>.{' '}
          <Mono>content_ts</Mono> and its GIN index are 69 MB, a quarter of the
          table, and nobody had counted them because at 3,854 rows they did not
          exist.
        </p>

        <Data
          path="predicted against actual"
          mark={[3]}
          lines={[
            '                       predicted        actual',
            'per row              2,002 bytes    ~4,100 bytes',
            'total                   140 MB          295 MB',
            '% of the free tier         27%             58%',
          ]}
        />

        <p className="mt-3.5 max-w-[66ch] text-[0.875rem] leading-relaxed text-ui-dim">
          This is the second extrapolation from the sibling engagement in a week.
          The other one — 47 minutes projected against 36.6 actual — missed in
          the safe direction.{' '}
          <span className="text-ui-fg">This one did not</span>, and there is no
          rule that says which way they go. An extrapolation is a measurement
          plus an assumption that nothing else changed, and the assumption is the
          part nobody writes down.
        </p>

        <p className="mt-3.5 max-w-[66ch] text-[0.875rem] leading-relaxed text-ui-dim">
          It also corrects something this site had implied: that the two indexes
          over the same words cost nothing extra.{' '}
          <span className="text-ui-fg">The keyword arm has a price</span> — 24%
          of the table — and it took the first corpus big enough to show it.
        </p>

        <p className="mt-2.5 font-mono text-[0.6875rem] text-ui-faint">
          cost · no time, and half the free tier
        </p>
      </div>
    </section>
  );
}
