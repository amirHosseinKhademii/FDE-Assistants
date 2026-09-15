/**
 * Lesson 3 — what reaches the model, and what must come back.
 *
 * A READING OF `docs/AUGMENTED-GENERATION.md`, with one addition: the token and
 * tool-call figures in §3 are computed from a baseline file on disk rather than
 * quoted, because that document's own numbers came from a single traced
 * question and the raw runs for a whole suite are sitting in `docs/evals/
 * results/`. The file is named on the figure. `pnpm eval:history` lists every
 * baseline there is.
 *
 * THE ANSWER IN §6 IS A REAL ANSWER, copied out of that same directory. Nothing
 * on this page is a plausible-looking example — a schema page illustrated with
 * an invented payload is the one thing a reader can disprove with a single
 * grep, and then nothing else on the page survives either.
 */
import { LessonPage } from '../../components/learn/LessonPage';
import { HowItWorks } from '../../components/learn/HowItWorks';
import { Caveat, Code, Data, Figure, Glossary, Key, P, RunIt, Step, Term } from '../../components/learn/kit';
import { BarRows } from '../../components/learn/charts/BarRows';
import { Stack } from '../../components/learn/charts/Stack';

export function Generation() {
  return (
    <LessonPage slug="generation">
      <Step n={1} title="There is no hidden layer. One turn is one request, and this is its body.">
        <P>
          Everything below is text the model reads. Nothing in the assembly summarises, compresses, or
          re-ranks on the model's behalf — so if the answer is wrong, the material it was wrong from is
          readable in full.
        </P>

        <Figure
          title="One request, block by block"
          sub="Four blocks are re-sent unchanged every turn. One grows."
          source="docs/AUGMENTED-GENERATION.md §1. The turn cap is DEFAULT_MAX_TURNS in packages/agent/src/core/loop.types.ts:36."
        >
          <Stack
            blocks={[
              {
                label: 'system',
                meta: '148 lines · sent every turn, unchanged',
                lines: [
                  'the one rule',
                  'a 6-step ordered procedure',
                  'what kind of document you are reading',
                  'similarity is not relevance',
                  'when documents disagree / when to escalate / citation format',
                ],
              },
              {
                label: 'tools',
                meta: 'three schemas + their descriptions',
                lines: ['get_policyholder', 'search_policy', 'search_guidance'],
              },
              {
                label: 'response format',
                meta: 'strict JSON Schema',
                lines: ['CoverageAnswerSchema — see §4'],
              },
              {
                label: 'user',
                lines: ['"Policy AUT-4471. how much rental car is covered?"'],
              },
              {
                label: 'history — grows every turn',
                meta: 'up to 12 turns',
                grows: true,
                lines: [
                  'assistant:  tool_call search_policy {query, policy_form, k}',
                  'tool:       {"results":[{document_id, section, text, similarity}…],',
                  '             "note":"Ranked by topical similarity only. …"}',
                  'assistant:  tool_call …',
                  'tool:       …',
                ],
              },
            ]}
          />
        </Figure>

        <P>
          The tool result carries a <code className="font-mono text-ui-fg">note</code> saying the passages are
          ranked by topical similarity only. That sentence is there because lesson 2 ends where this one
          starts: nothing was filtered out for scoring low, so the model is told not to read rank as
          relevance.
        </P>
      </Step>

      <Step n={2} title="Not everything augmented in was retrieved">
        <P>
          <code className="font-mono text-ui-fg">get_policyholder</code> returns the record{' '}
          <strong className="font-medium text-ui-fg">whole — unchunked, unranked, untruncated</strong>. It is
          a lookup by exact id and it never searches.
        </P>

        <Key>
          If the question has one exact answer, it is a lookup, not a search. Routing “what is Maria Santos's
          collision deductible” through similarity search returns the five most Maria-shaped chunks and hopes
          one of them is hers — which fails silently and plausibly, the worst failure shape there is.
        </Key>

        <HowItWorks
          title="How a lookup answers when the record is not there"
          path="apps/ai/insurance/src/tools/get-policyholder.tool.ts:95–120"
          plain={[
            'The easy version of this tool returns nothing when the id is unknown. That is the version that causes the damage: a model handed an empty result concludes the customer does not exist, or worse, reaches for the nearest record it already has.',
            'So a miss returns THREE things: that it was not found, the ids that do exist, and a sentence saying what to do about it.',
            'The two misses are different and are answered differently. A malformed id is the adjuster\u2019s typo, and the instruction is to ask for the right one \u2014 explicitly NOT to pick a plausible id off the list. A well-formed id that is simply absent is a missing record, and the instruction is to escalate.',
            'The note is prose written for the model to read. It is part of the prompt, delivered at the moment it is relevant, which is the only moment it is sure to be read.',
          ]}
          lines={[
            'if (!ID_PATTERN.test(id)) {',
            '  return {',
            '    policy_id: id,',
            '    found: false,',
            '    known_policy_ids: known,',
            '    note:',
            '      `"${id}" is not a valid policy id. The format is AUT- followed by ` +',
            '      `four digits. Ask the adjuster for the correct id rather than ` +',
            '      `guessing one from the list.`,',
            '  };',
            '}',
            '',
            'if (!known.includes(id)) {',
            '  return {',
            '    policy_id: id,',
            '    found: false,',
            '    known_policy_ids: known,',
            '    note:',
            '      `No policyholder record exists for ${id}. Do not infer this ` +',
            '      `customer\u2019s coverage from another record or from the policy ` +',
            '      `wordings — say the record was not found and escalate.`,',
            '  };',
            '}',
          ]}
          mark={[8, 20]}
          says={[
            { at: 'known_policy_ids: known', is: 'The list is returned so a mistyped id can be corrected — and the note immediately says not to choose from it, because handing a model a list of valid ids is also handing it a way to guess.' },
            { at: 'rather than guessing one from the list', is: 'The instruction that closes the door the line above it opened.' },
            { at: 'say the record was not found and escalate', is: 'The dangerous move here is inferring one customer\u2019s coverage from another\u2019s record. It is named and forbidden at the exact point it becomes tempting.' },
          ]}
          trap="Both notes exist because the alternative is silent and plausible: a model that quietly answers from the wrong record produces a confident, well-cited, completely wrong answer, and nothing downstream can tell."
        />

        <P>
          And a <em className="not-italic text-ui-fg">miss</em> is context too. When the id is not found the
          tool returns <code className="font-mono text-ui-fg">found: false</code> plus a list of ids that do
          exist, so a model that mistyped one can correct itself rather than concluding the customer does not
          exist.
        </P>
      </Step>

      <Step n={3} title="The context accumulates, and that is the bill">
        <P>
          The system prompt and the tool schemas are re-sent unchanged every turn. Assembly is cheap; how many
          times you assemble is the cost. The clearest way to see it is one question asked five times.
        </P>

        <Figure
          title="The same question, five runs — “is the driver covered while driving for a rideshare platform with passengers?”"
          sub="Nothing changed between these runs. Every difference below is the model taking a different route through the same three tools."
          source={
            <>
              Computed from{' '}
              <span className="text-ui-dim">docs/evals/results/baseline-2026-09-11T15-55-29-682Z.json</span>,
              case <span className="text-ui-dim">cov-002</span> — gpt-5-mini, repeat 5, fixtures off. List
              every baseline on disk with <span className="text-ui-dim">pnpm eval:history</span> (free, reads
              disk only).
            </>
          }
        >
          <BarRows
            rows={[
              { label: 'run 4', value: 36288, display: '36,288', note: '5 tool calls · 6 turns' },
              { label: 'run 1', value: 47229, display: '47,229', note: '6 tool calls · 7 turns — and this is the run that failed, see lesson 5' },
              { label: 'run 3', value: 73827, display: '73,827', note: '8 tool calls · 9 turns' },
              { label: 'run 2', value: 110130, display: '110,130', note: '10 tool calls · 11 turns' },
              { label: 'run 5', value: 110177, display: '110,177', note: '10 tool calls · 11 turns' },
            ]}
            unit="input tokens"
            labelWidth={110}
            axis="0 → 110,177 input tokens"
          />
        </Figure>

        <Key>
          Three times the bill for the same question, from the same corpus, on the same day. The variable is
          routing, not retrieval — which is why the cap is 12 turns rather than 8, and why a turn-cap stop is
          filed as infrastructure rather than as a wrong answer.
        </Key>

        <P>
          A turn cap that bites is an infrastructure failure wearing a model failure's clothes. Unused
          headroom costs nothing — the loop stops the moment the model answers.
        </P>
      </Step>

      <Step n={4} title="The shape IS the rule">
        <P>
          The answer is not prose that gets checked afterwards. It is a{' '}
          <Term def="A Zod strictObject compiled to JSON Schema and handed to the model as its response format. Unknown keys are rejected, so there is no free-text hiding place.">
            contract
          </Term>{' '}
          the model decodes against: <code className="font-mono text-ui-fg">answer</code>,{' '}
          <code className="font-mono text-ui-fg">policy_id</code>,{' '}
          <code className="font-mono text-ui-fg">policy_form</code>,{' '}
          <code className="font-mono text-ui-fg">citations</code>,{' '}
          <code className="font-mono text-ui-fg">unverified_claims</code>,{' '}
          <code className="font-mono text-ui-fg">conflicts</code>,{' '}
          <code className="font-mono text-ui-fg">escalate</code>. Splitting claims into two arrays is what
          makes “asserted without checking” a thing the format cannot express silently.
        </P>

        <Code
          path="apps/ai/insurance/src/schema/coverage-schema.ts:160–176"
          note="every .describe() is prompt, not documentation"
          lines={[
            'conflicts: z',
            '  .array(Conflict)',
            '  .describe(',
            "    'Where two or more retrieved documents disagree on the same point. Do ' +",
            "      'NOT resolve a conflict by picking the newer document, the more ' +",
            "      'specific one, or the one that seems more likely. Report it here, cite ' +",
            "      'both sides, and escalate unless a policyholder record settles which ' +",
            "      'document governs.',",
            '  ),',
            '',
            'escalate: Escalation.nullable().describe(',
            "  'Non-null when a human must decide. Escalate when: the documents do ' +",
            "    'not address the situation at all; a conflict has no resolved_by; a ' +",
            "    'record is missing or its endorsements are unconfirmed; or the answer ' +",
            "    'would require reasoning beyond what the documents state. Escalating ' +",
            "    'is cheap and visible. A wrong confident answer is neither.',",
            '),',
          ]}
          mark={[15]}
        />

        <P>
          Those strings go into the request as part of the schema. That is why{' '}
          <code className="font-mono text-ui-fg">pnpm schema:check</code> fails if a field loses its
          description: removing one is not a documentation change, it is a prompt change.
        </P>
      </Step>

      <Step n={5} title="Two layers, because shape and sense are different questions">
        <P>
          JSON Schema checks <em className="not-italic text-ui-fg">shape</em>. A second pass checks{' '}
          <em className="not-italic text-ui-fg">coherence</em> — combinations that are structurally valid and
          still wrong. It is not a Zod refinement, because a refinement failure would reject the whole object
          and lose the several other things it got right.
        </P>

        <Code
          path="apps/ai/insurance/src/schema/coverage-schema.ts:229–236"
          note="the most important rule in the file, and its comment says so"
          lines={[
            '// An unresolved conflict that did not escalate is the dangerous case: it',
            '// means the model silently picked a side. This is the single most important',
            '// rule in this file.',
            'const unresolved = v.conflicts.filter((c) => c.resolved_by === null);',
            'if (unresolved.length > 0 && v.escalate === null) {',
            '  errs.push(',
            '    `conflict(s) [${unresolved.map((c) => c.topic).join(\', \')}] have no ` +',
            '      `resolved_by but escalate is null — an unresolved conflict must be ` +',
            '      `escalated, never decided`,',
            '  );',
            '}',
          ]}
          mark={[4]}
        />

        <Key>
          Two documents contradict each other, the model notices, and nothing in the corpus settles it. The
          only safe output is “here are both, a human decides”. A schema that accepted a confident answer
          there would be a schema that permits the dangerous case.
        </Key>
      </Step>

      <Step n={6} title="A real answer, in full">
        <P>
          This is one run of <code className="font-mono text-ui-fg">cov-001</code>, copied out of a baseline
          file. The base form says $40 per day for 30 days; an endorsement attached to this policy says $50
          for 21. The model reported the conflict, cited both sides, and named the record that settles it —
          so <code className="font-mono text-ui-fg">escalate</code> is correctly null.
        </P>

        <Data
          path="docs/evals/results/baseline-2026-09-05T20-14-55-134Z.json — cov-001, run 1"
          note="verbatim, abbreviated only where marked"
          lines={[
            '{',
            '  "answer": "$50 per day, up to 21 days per occurrence (the PA-END-2024-03',
            '             endorsement is attached to this policy and controls).",',
            '  "policy_id": "AUT-4471",',
            '  "policy_form": "PA-2023-01",',
            '  "citations": [',
            '    { "source": "policy:PA-END-2024-03#… > Temporary Transportation > Daily Limit",',
            '      "claim":  "The endorsement sets the rental reimbursement amount and maximum days.",',
            '      "detail": "We pay **$50 per day**, up to **21 days** for each occurrence." },',
            '    { "source": "record:AUT-4471",',
            '      "claim":  "This policy has endorsement PA-END-2024-03 attached.",',
            '      "detail": "## Endorsements Attached\\n\\n- PA-END-2024-03" }',
            '  ],',
            '  "unverified_claims": [],',
            '  "conflicts": [',
            '    { "topic": "rental reimbursement per-day amount and maximum number of days",',
            '      "positions": [',
            '        { "source": "policy:PA-2023-01#Part IV … > 4.4 Rental Reimbursement",',
            '          "says": "We will pay **$40 per day, for a maximum of 30 days** per occurrence." },',
            '        { "source": "policy:PA-END-2024-03#… > Daily Limit",',
            '          "says": "We pay **$50 per day**, up to **21 days** for each occurrence." }',
            '      ],',
            '      "resolved_by": "record:AUT-4471" }',
            '  ],',
            '  "escalate": null',
            '}',
          ]}
          mark={[21]}
        />

        <P>
          <code className="font-mono text-ui-fg">resolved_by</code> is the field that lets{' '}
          <code className="font-mono text-ui-fg">escalate</code> be null. Remove it and the coherence rule in
          §5 rejects this answer — which is the contract doing exactly what it is for.
        </P>
      </Step>

      <Step n={7} title="A failed answer is never repaired">
        <P>
          When validation fails, the errors are handed back to the model and it tries again. Nothing patches
          the object, fills a missing field, or downgrades a rule to a warning. A repaired answer is an answer
          nobody can attribute: you no longer know whether the model or the repair produced the sentence a
          human is about to act on.
        </P>
        <P>
          Retries are also <em className="not-italic text-ui-fg">counted</em>. An answer that needed three
          attempts and an answer that was right first time are not the same event, and a suite that reported
          them identically would hide the whole signal.
        </P>
      </Step>

      <RunIt
        items={[
          {
            cmd: 'pnpm schema:check',
            does: 'Does the answer contract hold? Includes the check that every field still carries its description.',
            cost: 'free',
          },
          {
            cmd: 'pnpm eval:history',
            does: 'Every baseline on disk, one row each — where the numbers in §3 came from.',
            cost: 'free',
          },
          {
            cmd: 'pnpm ask',
            does: 'One full question end to end: tools called, validated answer out.',
            cost: 'money',
          },
        ]}
      />

      <Caveat
        items={[
          {
            claim: 'The token figures are one baseline, not a rate card.',
            body: 'Five runs of one case on one day against one model. They show the spread is real; they do not predict what your question will cost.',
          },
          {
            claim: 'A validated answer is not a correct answer.',
            body: 'The contract makes the dangerous shape inexpressible — an unresolved conflict cannot ship without an escalation. It has nothing to say about whether the cited clause actually applies. That is lesson 5.',
          },
          {
            claim: 'Coherence rules are written by hand, one at a time.',
            body: 'Each one exists because a specific wrong answer got through. There is no reason to think the list is complete, and the honest position is that it is the set of mistakes already made.',
          },
        ]}
      />

      <Glossary
        terms={[
          { word: 'context window', def: 'Everything the model is shown in one request: system prompt, tool schemas, response format, the question, and the history so far.' },
          { word: 'turn', def: 'One model request and its reply. A tool call and its result add a turn; the cap is 12.' },
          { word: 'structured output', def: 'Handing the model a JSON Schema as its response format, so the reply decodes against a contract rather than being parsed out of prose.' },
          { word: 'coherence', def: 'Rules about combinations of valid fields — "an unresolved conflict with no escalation" — that a shape check cannot express.' },
          { word: 'escalation', def: 'A structured output meaning a human must decide. Not an error, and counted separately from a wrong answer.' },
        ]}
      />
    </LessonPage>
  );
}
