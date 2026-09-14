/**
 * How one report becomes rows — written for somebody who has never done this.
 *
 * IT FOLLOWS ONE REAL DOCUMENT ALL THE WAY THROUGH. The first version of this
 * was six abstract steps with a key/value table under each, and it was
 * unreadable: "strict schema", "additionalProperties", "enum", and figures
 * jammed against their captions. Nobody outside the team could follow it, which
 * makes it worse than nothing on a page whose whole purpose is to be checkable
 * by an outsider.
 *
 * So it is one closure report — EFF-2021-0443, a real file in the corpus —
 * handed over, asked about, answered, checked, stored. Every quote below is
 * from that file or from the run against it.
 *
 * NO JARGON IS A HARD RULE HERE. If a sentence needs a definition, it is wrong
 * and should be rewritten rather than footnoted. The engineering version is
 * `docs/steering/WHAT-WE-ASK-THE-MODEL.md`, and it is allowed to say "schema".
 */

export interface SortStep {
  n: number;
  /** A heading a person would recognise as a question they had. */
  title: string;
  /** ONE short line on the face of the card, and it must NOT restate the
   *  title. The first version did — "Every answer has to come with the sentence
   *  it was read from" over "Every answer has to point at the words it came
   *  from" — which is two lines doing one line's work and makes seven cards
   *  look like fourteen. Each one now carries the fact that makes the step
   *  worth opening. */
  face: string;
  /** Plain English, behind the card. No terms of art. */
  body: string[];
  /** One piece of real evidence, clearly framed. */
  shows?: {
    caption: string;
    kind: 'document' | 'answer' | 'plain';
    /** For 'answer': pairs of what it said and where it read it. */
    pairs?: Array<{ question: string; answer: string; from: string }>;
    text?: string;
  };
  /** True only where a model is doing something. */
  model?: boolean;
}

/** The document everything below follows. */
export const DOC = 'pmo/closure-reports/EFF-2021-0443.md';

/**
 * The seven steps are three parts of one argument, not seven equal items.
 *
 * THEY WERE A FLAT LIST AND THAT WAS THE BUG. Read one after another they look
 * like seven things of the same weight, and the shape of the reasoning — we ask
 * for evidence SO THAT we can check it, the check is blind to one failure SO
 * THAT a second signal exists — was carried by nothing but the reading order.
 * Grouped, the page says it: a contract, a check, and the thing the check
 * cannot see.
 */
export interface SortPhase {
  label: string;
  /** One line on why this part of the chain exists at all. */
  why: string;
  /** Step numbers, in order. */
  steps: number[];
}

export const SORT_PHASES: SortPhase[] = [
  {
    label: 'What we ask for',
    why: 'The contract with the model. Each line is here so that the next part is possible at all.',
    steps: [1, 2, 3],
  },
  {
    label: 'The check',
    why: 'One plain search of the file. No second model, no answer key, nothing to buy.',
    steps: [4],
  },
  {
    label: 'What the check cannot see',
    why: 'A real sentence can still be the wrong answer. This is the part that caught one.',
    steps: [5, 6, 7],
  },
];

export const SORT_STEPS: SortStep[] = [
  {
    n: 1,
    title: 'We hand over one report and ask six questions',
    face: 'Six questions. Nothing else goes with the document.',
    model: true,
    body: [
      'One document at a time. Nothing else goes with it — no other reports, no history, no summary of what we already think the answer is.',
      'The six questions are the ones a person asks when pricing a new job against an old one: what kind of change was this, what part did it touch, at what safety level, how many interfaces were affected, did the safety case have to be reopened, and was tooling needed.',
    ],
    shows: {
      kind: 'document',
      caption: 'from the report itself — this is what it is given',
      text: `A change to the existing mechanical design. The work was on the
gearbox. This report also covers the transfer of production to the
new line, which was booked here for want of a separate code. The
existing safety case remained valid and was not reopened. Tooling
was modified and re-qualified. 1 interface(s) were affected.`,
    },
  },
  {
    n: 2,
    title: 'Every answer has to come with the sentence it was read from',
    face: 'An answer on its own is a claim. With a sentence it is checkable.',
    model: true,
    body: [
      'It is not allowed to simply say “gearbox”. It has to point at the words in the document that made it say so.',
      'That one requirement is what the rest of this depends on. An answer on its own is a claim. An answer with the sentence beside it is something anybody can go and check in about ten seconds.',
    ],
    shows: {
      kind: 'answer',
      caption: 'three of the six answers it gave for this report',
      pairs: [
        {
          question: 'What kind of change?',
          answer: 'modify hardware',
          from: 'A change to the existing mechanical design.',
        },
        {
          question: 'What part?',
          answer: 'gearbox',
          from: 'The work was on the gearbox.',
        },
        {
          question: 'Was the safety case reopened?',
          answer: 'no',
          from: 'The existing safety case remained valid and was not reopened.',
        },
      ],
    },
  },
  {
    n: 3,
    title: 'If the document does not say, that is a real answer',
    face: 'About a quarter come back that way, correctly.',
    model: true,
    body: [
      'Roughly a quarter of the answers come back as “the document does not say”. That is not the system failing — those documents genuinely do not say.',
      'And it is not the same as “no”. If a report never mentions tooling, recording that as “no tooling needed” would state, with total confidence, that 196 jobs needed no tooling when nobody ever wrote about it either way. The two are kept apart on purpose.',
    ],
  },
  {
    n: 4,
    title: 'Then we go and look for that sentence in the file',
    face: 'Plain text search. No second model, no answer key.',
    body: [
      'We take the sentence it quoted and search the document for it, word for word. If it is not there, the answer is thrown away.',
      'That is all it is — text search. No second AI, no person reading it afterwards, no list of right answers to compare against. Which means it works exactly the same way at your company on day one, with documents nobody has ever seen.',
      'It is also how we can point at a file and a line when somebody argues with a number, rather than at a row nobody can account for.',
    ],
    shows: {
      kind: 'plain',
      caption: 'across all 220 reports',
      text: `1,320 answers checked
0 sentences that were not in the file
2 thrown away — both the same fault, the model repeating
  a phrase the document states once`,
    },
  },
  {
    n: 5,
    title: 'But a real sentence can still be the wrong answer',
    face: 'Genuine quote, wrong field — the search is blind to it.',
    body: [
      'Checking the quote proves the sentence exists. It does not prove the sentence was about the thing we asked.',
      'That happened. Asked how much of the design already existed, it answered “new” and quoted a genuine sentence — but the sentence was about something else. The quote check was blind to it, because there was nothing wrong with the quote.',
    ],
    shows: {
      kind: 'answer',
      caption: 'a real sentence, the wrong question',
      pairs: [
        {
          question: 'How much already existed?',
          answer: 'new — and wrong',
          from: 'New software, no predecessor to carry over.',
        },
      ],
    },
  },
  {
    n: 6,
    title: 'So we watch how often it answers at all',
    face: 'Three questions split perfectly. One did not.',
    body: [
      'For each question, we count how often it gave an answer when the document mentions the subject, and how often it gave one when the document does not.',
      'Three of the questions split perfectly — answered every time the document says, never when it does not. That is a system that knows what it can read. The fourth answered nearly four times in ten on documents that never mention the subject at all.',
      'Nobody needed a list of right answers to see that. It is visible from the answers on their own, which is what makes it usable at a customer who has no answer key either.',
    ],
    shows: {
      kind: 'plain',
      caption: 'how often each question got an answer',
      text: `                        document says    document does not
safety level                    100%                  0%
interfaces affected             100%                  0%
tooling needed                  100%                  0%
how much already existed    never says                38%   ←`,
    },
  },
  {
    n: 7,
    title: 'And then we stopped asking that question',
    face: 'Answered a third of the time, on three possible values.',
    body: [
      'None of the 220 reports states how much of a design already existed. It was answered 83 times anyway, and right about a third of the time — which is what you would get by guessing between three options.',
      'The instruction already told it not to do that, in those words. It made no difference. Rewording an instruction to move a number that is already at chance is money spent on nothing.',
      'So the question is not asked any more, and what replaces it is worth more than the column would have been: your closure reports do not record this, so nobody can tell you what carryover work costs. A pipeline that asks for something the documents do not contain still gets an answer — and that answer is noise with a citation attached, which is the most expensive kind of wrong, because it looks exactly like all the others.',
    ],
  },
];

/* `LANDED` AND `RUN` LIVED HERE and went with the table and the figure row they
   fed. Both were the same facts a second time: step 2 already shows answers with
   the sentence each came from, and "1,320 answers" is on the stage card at the
   top of the section. `pnpm steering:derived-grade-facts` prints all of it. */

/**
 * WHAT CAME OUT, IN THE SAME SHAPE STEP 1 USES FOR ITS OUTPUT — a before on the
 * left and the rows on the right. The reading is only interesting if you can
 * see what it turned into, and the two halves of the page should answer that
 * question the same way.
 */
export const RESULT = {
  before: {
    file: 'pmo/closure-reports/EFF-2021-0443.md',
    caption: 'before · one paragraph of a report',
    text: `A change to the existing mechanical design. The work was on the
gearbox. The existing safety case remained valid and was not
reopened. Tooling was modified and re-qualified. 1 interface(s)
were affected.`,
    notice: 'Five facts, written as English, in nobody\u2019s column.',
  },
  after: {
    caption: 'after · what is stored, one row per answer',
    fields: [
      { name: 'kind of change', value: 'modify hardware', note: 'line 14' },
      { name: 'part touched', value: 'gearbox', note: 'line 14' },
      { name: 'safety case reopened', value: 'no', note: 'line 17' },
      { name: 'tooling needed', value: 'yes', note: 'line 18' },
      { name: 'interfaces affected', value: '1', note: 'line 19' },
      { name: 'safety level', value: 'does not say', note: 'and that is recorded, not guessed' },
    ],
  },
};

/**
 * HOW THE EXTRACTION IS ACTUALLY DONE — `docs/steering/UI-COPY.md`, panel 3.
 *
 * IT REPLACED A CLOSING SENTENCE that restated the figures already on the stage
 * card and in the cards above. A customer's next question after seeing a
 * paragraph become rows is *how do you know it did not make that up*, and these
 * three answer it.
 */
export const EXTRACT_NOTES = [
  {
    label: 'how',
    text: 'One request per document. It must give back the value and the sentence it read it from — it cannot answer without showing where.',
  },
  {
    label: 'then we check it',
    text: 'That sentence is searched for in the file. Not there, and the answer is thrown away. Inventing a value is easy; inventing a value and a sentence that exists word-for-word is not.',
  },
  {
    label: 'why you can trust it',
    text: 'Two checks, neither needing a right answer to compare with: every stored fact is re-verified against its own file, and a question that gets answered on documents which never mention it is being guessed at.',
  },
];
