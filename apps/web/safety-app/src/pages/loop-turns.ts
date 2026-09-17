/**
 * One question through the loop, hop by hop — what actually moved.
 *
 * A SIBLING OF `flow-turns.ts`, NOT A REPLACEMENT. That walk is the pipeline:
 * fetching public files, indexing them, and a third turn that was written while
 * the asking step did not exist. This one is that third turn, opened up — the
 * same drawing, because a reader should not have to learn two.
 *
 * ── IT IS THE LOOP AND NOTHING ELSE ───────────────────────────────────────
 *
 * Three turns, and a turn is one request to the model. The question arriving and
 * the tool menu being assembled are NOT in here: they happen once, before the
 * loop starts, and including them made the walk read as the whole pipeline
 * again — which `flow-turns.ts` already draws.
 *
 * THREE TURNS MEANS THREE REQUESTS, which is countable and therefore checkable.
 *
 * ── THE RUN IS REAL AND THE PAYLOADS ARE ITS OWN ──────────────────────────
 *
 * Question, tool calls, arguments, the five ODI numbers and the answer are from
 * a recorded run against `gemini-3.5-flash-lite`. A diagram with invented field
 * names is one a reviewer disproves in a single grep, and then nothing else on
 * the page survives either.
 *
 * ── THE SENTENCE THIS PAGE REFUSES TO WRITE ───────────────────────────────
 *
 * "The complaints never reach the model." They do. That is how the question
 * gets answered. On turn 3 five people's accounts of fatal crashes cross to a
 * third party, and the whole reason this walk exists is to say exactly which
 * five and exactly what was in them.
 *
 * ── WHAT STAYS IS CHECKABLE, AND WAS CHECKED ──────────────────────────────
 *
 * An earlier draft of turn 3 said "no name, address or VIN is in the slice".
 * THAT WAS WRONG. `withheld` in the estate table means withheld from the SAMPLE
 * SHOWN ON THE PAGE, not absent from the data — the VIN's first 11 characters,
 * the state and the mileage are all parsed and stored.
 *
 * What is true, and is the stronger claim, is that none of them is in what the
 * tool RETURNS: `buildText` embeds the vehicle, the components, the filed date
 * and the narrative, and `ComplaintHit` carries no vin, state or miles field.
 * They are in the database and they are filtered on. They do not cross.
 *
 * ── AND THE TWO CROSSINGS ARE NOT THE SAME SIZE ───────────────────────────
 *
 * Turn 2 sends back one integer. Turn 3 sends back five narratives. Drawing
 * them identically would hide the only distinction that matters to somebody
 * asking what leaves the building — so the counting tool's result is shown as
 * the small thing it is, beside the search's as the large thing it is.
 */
import type { Turn } from '@veresk/surface';

export const LOOP_TURNS: Turn[] = [
  {
    label: 'turn 1 — what should I ask for?',
    n: '1',
    note: 'The first crossing, and nothing from the corpus is in it.',
    plain: 'The question and the menu go to the model. It replies asking for a tool, not with an answer.',
    example: 'out: a question and five tool descriptions · back: one request',
    crosses: true,
    hops: [
      {
        where: 'crosses',
        title: 'the prompt, the question and the menu',
        payload:
          'system   who you are, and the rules you answer under\n' +
          'user     "are there complaints about deaths on the Tesla Model 3?"\n' +
          'tools    five names, five descriptions, five argument shapes',
        plain: 'The question and the list of tools cross to the model. No complaint does.',
        detail:
          'This is the smallest crossing in the walk. Not one document from the corpus is in it — at this point the model has been told what it may ask for and nothing about what the answer might be.',
      },
      {
        where: 'back',
        title: 'a request, not an answer',
        payload: 'count_complaints({"make":"TESLA","model":"MODEL 3","min_deaths":1})',
        plain: 'The model replies by asking for a tool to be run.',
        detail:
          'It chose the counting tool rather than the search, which is the behaviour the counting tool’s own description asks for. It also put the vehicle in the filter fields and not in a text query — the same description says a vehicle name in the query gets matched as prose against 70,194 documents.',
      },
      {
        where: 'yours',
        title: 'our code runs it — the model waits',
        payload: 'select count(distinct ...) from documents where ... and deaths >= 1',
        plain: 'The tool runs on our own machine, against our own database.',
        detail:
          'The model has no connection, no credentials and no way to run anything. It produced text asking for this; our code decided whether to honour it, and ran it. It never sees the database, only what comes back.',
      },
    ],
  },

  {
    label: 'turn 2 — one number goes back',
    n: '2',
    note: 'The smallest possible result, and it buys a second question.',
    plain: 'We send back the number the tool returned. The model asks for one more thing.',
    example: 'out: 5, and the filter that produced it',
    crosses: true,
    hops: [
      {
        where: 'crosses',
        title: 'the count, and what it counted',
        payload:
          '{ "count": 5,\n' +
          '  "filter": { "make": "TESLA", "model": "MODEL 3", "min_deaths": 1 } }',
        plain: 'One integer crosses, with the question it answers. No narrative yet.',
        detail:
          'A number without the question it answers cannot be checked, and the contract will later refuse any number in the prose that is not carried like this. So the filter travels with the count rather than being remembered.',
      },
      {
        where: 'back',
        title: 'and a second request',
        payload:
          'search_complaints({"make":"TESLA","model":"MODEL 3","min_deaths":1,\n' +
          '                   "query":"death or fatal or fatality"})',
        plain: 'The model asks to read the complaints it has just been told exist.',
        detail:
          'The count told it how many. It cannot cite five complaints it has not read, so it asks for them — the vehicle staying in the filter and only the symptom going in the query.',
      },
      {
        where: 'yours',
        title: 'the filter leaves exactly five',
        payload: 'candidates: 5 · hits: 5',
        plain: 'The search runs here too. The filter alone has already isolated the answer.',
        detail:
          'This is the case stage 4 found was never a search question: the filter on its own leaves exactly the five, and the ranking has nothing left to do. The query text barely matters.',
      },
    ],
  },

  {
    label: 'turn 3 — and here the narratives cross',
    n: '3',
    note: 'THE CROSSING THAT MATTERS. Five people describing fatal crashes, sent to somebody else’s model.',
    plain: 'The complaints themselves — what people wrote about crashes that killed someone — go to the model.',
    example: 'five narratives · public filings · a third party reads them',
    crosses: true,
    hops: [
      {
        where: 'crosses',
        title: 'five complaint narratives',
        payload:
          'ODI 11302656   ...autopilot and/or lane-assist features failed\n' +
          'ODI 11533202   ...fatal accident and fire\n' +
          'ODI 11364724   ...an upper ball joint failure\n' +
          'ODI 11524321   ...two deaths, unintended acceleration\n' +
          'ODI 11473666   ...veered across lanes',
        plain: 'Five people’s accounts of fatal crashes cross to a model we do not run.',
        detail:
          'This is the hop the page exists to be honest about. Saying the corpus never reaches the model would be false, and a reviewer establishes that in their first question. They are public filings — anybody can read them at nhtsa.gov — but they are still somebody’s account of the worst day of their life, and they are now in a third party’s request log. What crosses is the vehicle, the components, the date and the narrative. The VIN, the state and the mileage are parsed and stored, are filtered on, and are NOT in what the tool hands back.',
      },
      {
        where: 'back',
        title: 'the answer, in boxes rather than prose',
        payload:
          'answer    "Yes, there are 5 complaints involving deaths filed with\n' +
          '           NHTSA for the Tesla Model 3."\n' +
          'counts    5 — with the filter that produced it\n' +
          'cites     11302656 · 11533202 · 11364724 · 11524321 · 11473666',
        plain: 'The model writes an answer as separate fields, not as a paragraph.',
        detail:
          'Each claim arrives tied to the document behind it and the number arrives tied to the tool call that produced it. The words it chose matter too: ALLEGEDLY, ALLEGES, SUSPECTED. A complaint is an allegation by a member of the public, not a finding, and stating cause is the one thing the rules forbid outright.',
      },
      {
        where: 'yours',
        title: 'the contract checks it before anybody sees it',
        payload:
          'parses · right shape · trips none of the six rules  →  shown\n' +
          'otherwise  →  the errors go back, and it tries again',
        plain: 'We check the answer against the rules before showing it to anyone.',
        detail:
          'Nothing is ever quietly repaired. A repaired answer is a failure you stopped counting — and the failure rate is the only thing that says whether the schema is too hard, the prompt unclear, or the model wrong for the job.',
      },
    ],
  },
];
