/**
 * Inside `count_complaints` — stage 4.4, the tool that returns a number.
 *
 * ── THE ANCHOR IS THREE ROUTES TO THE SAME NUMBER ─────────────────────────
 *
 * The tool, a shell pipeline over the raw file, and a person reading by hand,
 * all agreeing three times. That is the strongest form this engagement's
 * check-it-against-something-else rule has taken, and it is the reason a number
 * from this tool can be put in front of somebody.
 *
 * ── THE ZERO GUARD IS A FEATURE, NOT AN ANECDOTE ──────────────────────────
 *
 * Spaces in a search phrase mean AND, so a phrase of five words can be
 * impossible to satisfy — and the zero it returns is identical to the zero that
 * means "nothing here describes this". Same number, opposite meanings, and on a
 * corpus about vehicles that roll away the wrong reading is a false all-clear.
 * So the tool checks its own zero and says which kind it is. That is described
 * here as what it does, because that is what it is.
 *
 * ── AND THE HONEST GAP IS THE BEST THING ON THE PANEL ─────────────────────
 *
 * Three predicates for "describes the recalled defect" exist and none of them
 * agree — 103, 93, 89. The number depends entirely on a predicate nobody wrote
 * down. So the check asserts the ARITHMETIC and asserts no total at all, and
 * the panel says why rather than quietly printing one of the three.
 *
 * ── CORRECTED 2026-09-27, AFTER STAGES 6 AND 7 HAD RUN ────────────────────
 *
 * The last section said the measurement was hand-routed "because there is no
 * model yet", and that this tool "is not in that number at all: none of the
 * three retrieval cases wants a count". The first is history now (stage 6 put a
 * model in the loop), and the second was wrong twice over: REC-001 and REC-004
 * are both counting questions, and with a model routing, REC-004's retrieval
 * fell to zero in two runs of three because it answered from this tool alone
 * (INGESTION.md, "MEASURED 2026-09-18"). Two of stage 7's four fixes live in
 * this tool — the "narrowed nothing" guard (REC-007) and the "a count is not a
 * quotation" note (REC-004) — and the panel now shows the first and names the
 * second. The returned object gained `describes` in stage 6; shown. The checks
 * listing is `pnpm safety:count`'s own output, re-run on 2026-09-27.
 *
 * THE 89 PHRASE KEEPS "rollaway", DELIBERATELY. The tool's doc comment
 * (`count-complaints.tool.ts`, the "GOOGLE SYNTAX" block) shows the OR phrase
 * without it; the self-test that actually produces the 89 (`cli/count.ts`,
 * the partition check) and the schema fixture both use
 * `park or prndl or rollaway or "shift cable"`. Re-run 2026-09-27: 89. The
 * comment is the one that drifted, and this panel quotes what ran.
 *
 * Restyled the same day for the `/steps` redesign: the shared trigger,
 * sentence-case labels, 1rem body text, the kit's `Table`.
 */
import { useCallback, useState } from 'react';
import { OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import { Data } from '@veresk/surface';
import type { ReactNode } from 'react';
import { HoodButton, HoodSection, HoodText } from '@veresk/learn/steps';
import { Table } from '@veresk/learn/steps';

/** Each figure, by three routes that share no code with each other. */
const AGREEMENTS = [
  { q: 'REC-004', what: 'Tesla Model 3, involving a death', n: 5 },
  { q: 'REC-005', what: 'Odyssey, forward-collision', n: 400 },
  { q: 'REC-001', what: 'F-150 power train, after the recall', n: 1057 },
] as const;

/** The three predicates for "describes the recalled defect", and they disagree. */
const PREDICATES = [
  { whose: "The answer key's", n: 103 },
  { whose: 'An earlier attempt', n: 93 },
  { whose: 'This phrase', n: 89 },
] as const;

const n = (x: number) => x.toLocaleString('en-GB');

export function CountModal() {
  const [from, setFrom] = useState<Origin | null>(null);
  const open = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => setFrom(originOf(e.currentTarget)),
    [],
  );

  return (
    <>
      <HoodButton
        blurb="Why counting is its own tool, checked three ways, and why a zero has to say which kind of zero it is."
        onClick={open}
      />

      {from && <CountPanel from={from} onClose={() => setFrom(null)} />}
    </>
  );
}

function CountPanel({ from, onClose }: { from: Origin; onClose: () => void }) {
  return (
    <OriginDialog
      from={from}
      label="Inside count_complaints"
      tone="var(--color-cal-sky)"
      onClose={onClose}
      header={
        <>
          <p className="text-[1rem] font-semibold text-ui-fg">
            Inside <span className="font-mono">count_complaints</span>
          </p>
          <p className="mt-0.5 text-[0.875rem] text-ui-faint">
            Step 4.4 · built, and checked three ways
          </p>
        </>
      }
    >
      <div className="sticky -top-3.5 z-20 -mx-5 -mt-3.5 mb-7 border-b border-ui-line bg-ui-bg px-5 pt-3.5 pb-4">
        <p className="cal-label pb-2.5" data-tone="quiet">
          Every number, by three routes that share no code
        </p>
        <Table
          head={['Question', 'The tool', 'A shell pipeline', 'Read by hand']}
          numeric={[1, 2, 3]}
          rows={AGREEMENTS.map((a) => [a.what, n(a.n), n(a.n), n(a.n)])}
        />
      </div>

      <div className="pb-2 [&_.snip-frame]:my-1">
        <HoodSection title="What it does">
          <HoodText>
            It returns a number — never a passage. You describe which complaints
            you mean (the vehicle, the part, the dates) and it tells you how many
            there are, together with exactly what it counted.
          </HoodText>
          <Data
            path="One filter in, one number out"
            mark={[4, 5]}
            lines={[
              'count_complaints({ make: "FORD", model: "F-150",',
              '                   component: "POWER TRAIN",',
              '                   filed_after: "2020-04-27" })',
              '',
              '  →  { count: 1057,',
              '       describes: "complaints: FORD, F-150, component POWER TRAIN, filed on or after 2020-04-27",',
              '       filter: { ...the question it answered }, note: "..." }',
            ]}
          />
          <Why>
            Three of the eight questions in the answer key want a number. No six
            passages contain a count — retrieval returns <em>examples</em>, and
            counting is an aggregate. They are different operations, and a model
            asked to count from examples produces a number that sounds right.
          </Why>
          <Key>
            Two numbers can both be true and only one answer what was asked.
            1,057 complaints name the component; far fewer describe the defect.
            A system reporting 1,057 has done the arithmetic correctly and
            answered a different question.
          </Key>
        </HoodSection>

        <HoodSection title="Why the number comes back carrying its filter">
          <Data
            path="A number is not a fact until it says what it counted"
            mark={[1]}
            lines={[
              '"1,057"                                                        not a fact',
              '"1,057 F-150 power-train complaints filed after 2020-04-27"     a fact',
            ]}
          />
          <Why>
            The answer contract (stage 5) has a rule that any number appearing
            in the prose must also appear in the list of counts — which is only
            checkable if a count carries the question it answered.
          </Why>
          <Why>
            Since stage 6 it carries its own caption too, in{' '}
            <code>describes</code>. A model asked to restate what it had counted
            put “power-train complaints” over 6 transmission complaints — the
            power-train figure is 351. The number, the tool and the filter were
            all right, and the sentence a person reads was wrong by a factor of
            sixty. So the tool writes the caption, and the contract compares it
            word for word.
          </Why>
        </HoodSection>

        <HoodSection title="And a zero has to say which kind of zero it is">
          <HoodText>
            Search phrases treat spaces as{' '}
            <strong className="font-semibold text-ui-fg">and</strong>, so a phrase
            of several words can be impossible to satisfy at once.
          </HoodText>
          <Data
            path="The same five words, two ways"
            note="The two phrases pnpm safety:count runs"
            mark={[1, 4]}
            lines={[
              '"park prndl rollaway shift cable"',
              "   →  'park' & 'prndl' & 'rollaway' & 'shift' & 'cabl'       0 complaints",
              '',
              '"park or prndl or rollaway or \\"shift cable\\""',
              "   →  'park' | 'prndl' | 'rollaway' | 'shift' <-> 'cabl'    89 complaints",
            ]}
          />
          <Key>
            An over-constrained query returns exactly the same number as a
            genuinely empty answer. Same zero, opposite meanings — and on a
            corpus about vehicles that roll away, reading the first as the second
            is a false all-clear.
          </Key>
          <HoodText>
            So when a phrase narrows a non-empty set to nothing, the tool says
            so in the result rather than returning a bare number.
          </HoodText>
          <Data
            path="What it returns instead of 0"
            lines={[
              'NO complaints matched "park prndl rollaway shift cable", but 1,057 match',
              'the filter alone. Spaces in a phrase mean AND, so several terms together',
              'may be impossible to satisfy at once — join them with `or`. DO NOT report',
              'this zero as evidence that no complaint describes the defect.',
            ]}
          />
          <Why>
            The impossible phrase is kept as a permanent check rather than
            replaced with a working one, so the guard is exercised on every run.
            A guard nobody has watched fail is a guard taken on faith.
          </Why>
        </HoodSection>

        <HoodSection title="And, later, a narrowing that narrowed nothing">
          <HoodText>
            The zero was the failure this step predicted. A model found the
            opposite one during stage 7's baselines: it counted the transmission
            component, then “narrowed” it with a phrase that included the word{' '}
            <em>transmission</em>.
          </HoodText>
          <Data
            path="What a real run did"
            note="As recorded in count-complaints.tool.ts"
            mark={[1, 2]}
            lines={[
              'filter    F-150 · POWER TRAIN:AUTOMATIC TRANSMISSION · after the recall      6',
              'matching  "shift or linkage or cable or prndl or gear or park or transmission"   6',
              'answer    "6 complaints, all of which matched the defect-related terms"',
            ]}
          />
          <Key>
            Both counts were right, and the sentence built on them was a
            tautology dressed as an analysis — a component count wearing a
            defect's clothes, which is the exact trap this tool exists to avoid.
          </Key>
          <Why>
            So whenever a phrase is given, the tool now fetches the un-narrowed
            count as well, and says so plainly when the two are equal. It was one
            of stage 7's four fixes, none of them a change to the prompt, and the
            question it was aimed at (REC-007) went from reporting both numbers
            in 0 of 3 runs to 3 of 3. Another of the four lives here too: a count
            now says it is not a quotation, and points at the tool that fetches
            examples.
          </Why>
        </HoodSection>

        <HoodSection title="The partition, and the gap in it">
          <Data
            path="F-150 power-train complaints filed after the recall"
            mark={[2]}
            lines={[
              '1,057   name the component',
              '   89   describe the defect',
              '  968   share a component but not a defect',
            ]}
          />
          <Why>
            The 968 is not a leftover. Nothing covers those complaints, which is
            itself a finding — and it is the shape of the real answer to the
            F-150 question.
          </Why>
          <HoodText>
            But the middle number is not settled.{' '}
            <strong className="font-semibold text-ui-fg">
              Three predicates for “describes the recalled defect” exist and none
              of them agree.
            </strong>
          </HoodText>
          <Table
            head={['Whose predicate', 'Complaints']}
            numeric={[1]}
            rows={PREDICATES.map((p) => [p.whose, String(p.n)])}
          />
          <Key>
            An answer key must record the predicate, not only the answer. A
            number without the question that produced it cannot be reproduced,
            and three careful people will get three numbers.
          </Key>
          <Why>
            Which is why the check asserts the <em>arithmetic</em> — that
            narrowing by defect gives a strictly smaller number, and that the
            component total equals the defect count plus the remainder — and
            asserts no total at all. Asserting a number nobody can reproduce
            would make the check a fiction.
          </Why>
        </HoodSection>

        <HoodSection title="One builder, one meaning of “the complaints matching this filter”">
          <HoodText>
            The predicate is not written twice. This tool imports the same
            builder the search uses, so the count and the examples are guaranteed
            to describe the same set because they are the same query.
          </HoodText>
          <Why>
            Two tools building the same predicate separately could drift, and the
            drift would be invisible in the worst way: an answer stating a total
            and then quoting examples drawn from a different set.
          </Why>
          <Why>
            It also matters that the component test asks whether a matching
            component <em>exists</em> rather than joining against the list. A
            join multiplies rows — 21,747 of the 70,194 complaints name more than
            one component — and this is the tool whose entire output is a number.
          </Why>
        </HoodSection>

        <HoodSection title="The checks">
          <Data
            path="pnpm safety:count"
            note="7 of 7, run 2026-09-27 · every number also checked by awk over the raw file"
            mark={[7]}
            lines={[
              'ok  REC-004 · Tesla Model 3 complaints involving a death',
              '      tool 5 · awk 5 · answer key 5',
              'ok  REC-005 · Odyssey forward-collision complaints',
              '      tool 400 · awk 400 · answer key 400',
              'ok  REC-001 · F-150 power-train complaints filed after the recall',
              '      tool 1,057 · awk 1,057 · answer key 1,057',
              'ok  REC-001 · narrowing by defect gives a strictly smaller number than the component',
              'ok  a zero produced by an impossible phrase says so, instead of reading as an all-clear',
              'ok  the count is returned WITH the filter that produced it',
              'ok  a filter matching nothing counts zero',
            ]}
          />
          <Why>
            The shell pipeline shares no code, no parser, no database and no
            schema with the tool, and its column numbers are written out by hand
            rather than imported — importing them would make the check agree by
            construction, which is the thing it exists to test.
          </Why>
        </HoodSection>

        <HoodSection title="Where this tool shows up in the measurements">
          <Key>
            recall@6 scores which <em>documents</em> came back, so a count never
            appears in it directly — even though two of its three cases, REC-001
            and REC-004, are counting questions. This tool is checked by its own
            arithmetic, three ways.
          </Key>
          <Why>
            With the tools called by hand (step 4.5), recall@6 went from 0.40 to
            1.00 over those three cases — a ceiling on what is reachable, not a
            score, and one of the three (REC-005) was already at 1.00 because its
            right answer is an empty result. At that stage no model had been
            asked anything.
          </Why>
          <Why>
            With a model choosing the tools (stage 6), three runs gave 0.17 to
            0.50 — a range, because the runs disagree — and this tool is behind
            most of the spread: in two runs of three the model answered REC-004
            from the count alone and fetched no complaint to quote. That is the
            reason for the “a count is not a quotation” note above.
          </Why>
          <Why>
            Stage 7 scores the answers rather than the documents: 28 of 28
            decided checks, reported beside 0 of 3 judged ones and never added to
            them. The judged zero is not a broken judge — every control passed.
          </Why>
        </HoodSection>
      </div>
    </OriginDialog>
  );
}

/** The point — restyled on `/steps` by the `cal-key` rule in app.css. */
function Key({ children }: { children: ReactNode }) {
  return <p className="cal-key">{children}</p>;
}

/** A reason, set in the margin — the `cal-why` rule. */
function Why({ children }: { children: ReactNode }) {
  return <p className="cal-why">{children}</p>;
}
