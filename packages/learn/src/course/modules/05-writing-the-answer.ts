import type { Lesson, Module } from '../types';

const buildingTheContext: Lesson = {
  slug: 'building-the-context',
  number: '5.1',
  title: 'Building the context',
  oneLiner: 'The context is the text the model reads: the labeled sources, the rules, and the question.',
  problem: {
    without: 'Every retrieved chunk is pasted in, in no order and with no size limit. The text can grow past what the model accepts.',
    with: 'The best chunks come first and each has an id. The total stays under a limit, so the model reads the sources it needs.',
  },
  steps: [
    {
      title: 'Each source gets a label',
      detail: 'Each retrieved chunk gets an id in square brackets, such as [faq-12]. The model copies that id when it names a source. Lesson 4.1 covers the search that finds these chunks.',
      visual: {
        kind: 'table',
        caption: 'Three labeled lines. Length counts every character, the id included.',
        columns: ['Labeled line', 'Length'],
        rows: [
          ['[faq-12] Refunds take 5 to 7 days.', '34'],
          ['[faq-40] Gift cards never expire.', '33'],
          ['[manual-3] Refunds need the order number.', '41'],
        ],
      },
      snippet: {
        source: `// One chunk, labeled with its id.
const chunk = { id: "faq-12", text: "Refunds take 5 to 7 days." };
const line = "[" + chunk.id + "] " + chunk.text;
console.log(line);
console.log("Length: " + line.length);
`,
        output: `[faq-12] Refunds take 5 to 7 days.
Length: 34`,
      },
    },
    {
      title: 'Lengths add up to a running total',
      detail: 'The context builder adds each line length to a running total. Before a line is kept, the new total must stay at or under 100 characters. The first two lines reach 67, and the third would bring the total to 108.',
      visual: {
        kind: 'bars',
        caption: 'Running total after each line, against a limit of 100 characters.',
        unit: 'chars',
        rows: [
          { label: 'After faq-12', value: 34 },
          { label: 'After faq-40', value: 67 },
          { label: 'After manual-3', value: 108, highlight: true },
        ],
      },
    },
    {
      title: 'The loop stops at the first line that does not fit',
      detail: 'The loop keeps a line only when the total stays within the limit. It stops at the first line that would pass the limit, so every later line is skipped. Here faq-12 and faq-40 are kept, and manual-3 is left out.',
      visual: {
        kind: 'chips',
        caption: 'Each line, its length, and whether the limit kept it.',
        items: [
          { text: '[faq-12]', note: '34, kept' },
          { text: '[faq-40]', note: '33, kept' },
          { text: '[manual-3]', note: '41, left out', highlight: true },
        ],
      },
      snippet: {
        source: `const maxCharacters = 100;
const lengths = [34, 33, 41];
let total = 0;
let kept = 0;
for (const length of lengths) {
  if (total + length > maxCharacters) break;
  total += length;
  kept++;
}
console.log("Kept " + kept + " lines, " + total + " characters");
`,
        output: `Kept 2 lines, 67 characters`,
      },
    },
    {
      title: 'The order decides which lines survive',
      detail: 'The search ranks lines with the best match at the top, so the limit keeps the best ones. A different order keeps a different set of lines. Ranking must therefore happen before the limit is applied.',
      visual: {
        kind: 'compare',
        caption: 'The same three lines in two orders, with a limit of 100 characters.',
        left: { title: 'Best match first', items: ['faq-12, 34: kept', 'faq-40, 33: kept', 'manual-3, 41: left out'] },
        right: { title: 'Longest first', items: ['manual-3, 41: kept', 'faq-12, 34: kept', 'faq-40, 33: left out'] },
      },
    },
  ],
  code: {
    source: `// Retrieved chunks, best match first. Each has an id and its text.
const chunks = [
  { id: "faq-12", text: "Refunds take 5 to 7 days." },
  { id: "faq-40", text: "Gift cards never expire." },
  { id: "manual-3", text: "Refunds need the order number." },
];

// The most characters the sources may use. Real limits use tokens.
const maxCharacters = 100;

// Label each chunk. Add chunks until the next one passes the limit.
function buildContext(list: typeof chunks): string {
  const lines: string[] = [];
  let total = 0;
  for (const chunk of list) {
    const line = "[" + chunk.id + "] " + chunk.text;
    if (total + line.length > maxCharacters) break;
    lines.push(line);
    total += line.length;
  }
  return lines.join("\\n");
}

// Build the context and print it with the number of chunks kept.
const context = buildContext(chunks);
console.log(context);
console.log("Chunks kept: " + context.split("\\n").length);
`,
    output: `[faq-12] Refunds take 5 to 7 days.
[faq-40] Gift cards never expire.
Chunks kept: 2`,
  },
  mistakes: [
    'Sending every chunk for safety. More text costs more and can push the best chunk out of the limit.',
    'Counting lines instead of size. Chunks differ in length, so measure the characters or tokens.',
    'Dropping the ids. Without an id, the model cannot name the source of a fact.',
  ],
  useWhen: [
    'The answer must come from retrieved passages, and the passages do not fit in one request.',
    'You need the model to name the source of each fact.',
  ],
  skipWhen: [
    'The whole source text is short enough to send in full.',
    'The question has one exact answer that a lookup can return.',
  ],
  words: [
    { term: 'Context', meaning: 'All the text sent to the model for one request.' },
    { term: 'Chunk', meaning: 'A small part of a document, stored and searched on its own.' },
    { term: 'Id', meaning: 'A short label that names one chunk, such as faq-12.' },
    { term: 'Token', meaning: 'A small piece of text, the unit that a model counts and bills.' },
  ],
};

const thePrompt: Lesson = {
  slug: 'the-prompt',
  number: '5.2',
  title: 'The prompt',
  oneLiner: 'The prompt is the fixed rules, the sources, and the question, sent together as one text.',
  problem: {
    without: 'The model gets the question alone. It answers from memory and cannot name a source.',
    with: 'The model gets rules, labeled sources, and the question. It answers from the sources and names them.',
  },
  steps: [
    {
      title: 'The rules never change',
      detail: 'A prompt has three parts: fixed rules, labeled sources, and the question. The rules stay the same for every request. Only the sources and the question change.',
      visual: {
        kind: 'compare',
        caption: 'What stays the same between requests, and what changes.',
        left: { title: 'Same for every request', items: ['The rules', 'The rule numbers'] },
        right: { title: 'Changes per request', items: ['The labeled sources', 'The question'] },
      },
    },
    {
      title: 'Each rule is a numbered line',
      detail: 'The code writes each rule as a numbered line. A new rule is one more string in the list. The numbers let a reader point to one rule by its number.',
      snippet: {
        source: `const rules = [
  "Answer only from the sources below.",
  "Name the source id for every fact you use.",
];
const numbered = rules.map((rule, i) => i + 1 + ". " + rule);
console.log(numbered.join("\\n"));
`,
        output: `1. Answer only from the sources below.
2. Name the source id for every fact you use.`,
      },
    },
    {
      title: 'The parts join into one text',
      detail: 'The parts are joined with headings and blank lines. The model reads this one text from top to bottom, so the order matters. The question comes last, after the sources it must use.',
      visual: {
        kind: 'flow',
        caption: 'The three parts, joined top to bottom into one prompt.',
        nodes: ['Rules', 'Sources', 'Question', 'One prompt text'],
      },
      snippet: {
        source: `const sources = "[faq-12] Refunds take 5 to 7 days.";
const question = "How long do refunds take?";
const prompt = [
  "Sources:",
  sources,
  "",
  "Question: " + question,
].join("\\n");
console.log(prompt);
`,
        output: `Sources:
[faq-12] Refunds take 5 to 7 days.

Question: How long do refunds take?`,
      },
    },
    {
      title: 'Where each part sits',
      detail: 'The rules sit at the top, so every source is read under them. The sources follow, and the question is last. Only the last two rows change from one request to the next.',
      visual: {
        kind: 'table',
        caption: 'The order the model reads the parts in, and what changes.',
        columns: ['Order', 'Part', 'Changes per request?'],
        rows: [
          ['1', 'Rules', 'no'],
          ['2', 'Sources', 'yes'],
          ['3', 'Question', 'yes'],
        ],
        highlightRow: 2,
      },
    },
  ],
  code: {
    source: `// The rules the model must follow. They never change per question.
const rules = [
  "Answer only from the sources below.",
  "Name the source id for every fact you use.",
  "If the sources do not answer, say so.",
];

// Join the rules, the sources, and the question into one prompt.
function buildPrompt(question: string, sources: string): string {
  const numbered = rules.map((rule, i) => i + 1 + ". " + rule);
  return [
    "Rules:",
    ...numbered,
    "",
    "Sources:",
    sources,
    "",
    "Question: " + question,
  ].join("\\n");
}

// Sources from the previous lesson, shortened to one chunk.
const sources = "[faq-12] Refunds take 5 to 7 days.";

// Print the full prompt that the model will read.
console.log(buildPrompt("How long do refunds take?", sources));
`,
    output: `Rules:
1. Answer only from the sources below.
2. Name the source id for every fact you use.
3. If the sources do not answer, say so.

Sources:
[faq-12] Refunds take 5 to 7 days.

Question: How long do refunds take?`,
  },
  mistakes: [
    'Mixing the question into the rules. Keep each part under its own heading, so the model can tell them apart.',
    'Writing a rule the sources cannot meet. If no source covers a case, the rules must say what to do.',
    'Changing the rules without a test. A new rule can change many answers, so run the eval set after each change.',
  ],
  useWhen: [
    'Answers must come only from your documents.',
    'You want the same answer format and the same rules for every question.',
  ],
  skipWhen: [
    'The model only answers general questions and no sources are involved.',
    'A plain lookup already returns the exact answer.',
  ],
  words: [
    { term: 'Prompt', meaning: 'The full text sent to the model for one request.' },
    { term: 'Rule', meaning: 'A fixed instruction that the model must follow.' },
    { term: 'Source', meaning: 'A chunk of text that the answer must rely on.' },
  ],
};

const structuredOutput: Lesson = {
  slug: 'structured-output',
  number: '5.3',
  title: 'Structured output with a schema',
  navTitle: 'Structured output',
  oneLiner: 'A schema is a written shape for the reply, so code can read the answer without guessing.',
  problem: {
    without: 'The model replies in free text. Code cannot tell where the answer ends or whether the source list is present.',
    with: 'The model replies in a fixed shape with named fields. Code checks each field before it uses the reply.',
  },
  steps: [
    {
      title: 'The schema names each field and its type',
      detail: 'A schema lists each field, its type, and its meaning. Here answer is text, sourceIds is a list, and escalate is true or false. The model is asked to reply with exactly these fields.',
      visual: {
        kind: 'table',
        caption: 'The three fields of one reply. The example reply breaks the escalate type.',
        columns: ['Field', 'Type', 'Example value'],
        rows: [
          ['answer', 'text', '5 to 7 days'],
          ['sourceIds', 'list of text', 'faq-12'],
          ['escalate', 'true or false', 'no, as text'],
        ],
        highlightRow: 2,
      },
    },
    {
      title: 'JSON.parse turns text into an object',
      detail: 'The model replies with text. JSON.parse reads that text and returns an object, so code can read each field by name. If the text is not valid JSON, the call throws an error.',
      visual: {
        kind: 'flow',
        caption: 'From the reply text to the field checks.',
        nodes: ['Reply text', 'JSON.parse', 'Object', 'Field checks'],
      },
      snippet: {
        source: `const reply = '{"answer":"5 to 7 days","escalate":"no"}';
const data = JSON.parse(reply);
console.log(data.answer);
console.log(typeof data.escalate);
`,
        output: `5 to 7 days
string`,
      },
    },
    {
      title: 'Each field gets a type check',
      detail: 'The check uses typeof for text and booleans, and Array.isArray for lists. The escalate value is text, so it fails the boolean check. The function returns the names of the wrong fields.',
      visual: {
        kind: 'chips',
        caption: 'Each field of the example reply and its result.',
        items: [
          { text: 'answer', note: 'text, ok' },
          { text: 'sourceIds', note: 'list, ok' },
          { text: 'escalate', note: 'text, not boolean', highlight: true },
        ],
      },
      snippet: {
        source: `function findWrongFields(data: Record<string, unknown>) {
  const wrong: string[] = [];
  if (typeof data.answer !== "string") wrong.push("answer");
  if (!Array.isArray(data.sourceIds)) wrong.push("sourceIds");
  if (typeof data.escalate !== "boolean") wrong.push("escalate");
  return wrong;
}
const reply = { answer: "5", sourceIds: [], escalate: "no" };
console.log(findWrongFields(reply));
`,
        output: `[ 'escalate' ]`,
      },
    },
    {
      title: 'A fixed reply passes the check',
      detail: 'Changing escalate to false gives a boolean, so the check passes. Zero wrong fields means the reply has the right shape. It does not prove the content is right, so the sources must still be checked.',
      visual: {
        kind: 'compare',
        caption: 'The example reply before and after the fix.',
        left: { title: 'Reply as sent', items: ['escalate: no, as text', '1 wrong field'] },
        right: { title: 'Reply after the fix', items: ['escalate: false', '0 wrong fields'] },
      },
    },
  ],
  code: {
    source: `// A fake model reply. The escalate field must be true or false.
const reply = JSON.stringify({
  answer: "5 to 7 days",
  sourceIds: ["faq-12"],
  escalate: "no",
});

// Return the names of the fields that have the wrong type.
function findWrongFields(data: Record<string, unknown>): string[] {
  const wrong: string[] = [];
  if (typeof data.answer !== "string") wrong.push("answer");
  if (!Array.isArray(data.sourceIds)) wrong.push("sourceIds");
  if (typeof data.escalate !== "boolean") wrong.push("escalate");
  return wrong;
}

// Parse the reply, then print the answer or the wrong fields.
const data = JSON.parse(reply);
const wrongFields = findWrongFields(data);
if (wrongFields.length === 0) {
  console.log("Valid answer: " + data.answer);
} else {
  console.log("Rejected, wrong fields: " + wrongFields.join(", "));
}

// The same reply with a boolean escalate passes the check.
const fixed = { ...data, escalate: false };
const remaining = findWrongFields(fixed).length;
console.log("Wrong fields after fix: " + remaining);
`,
    output: `Rejected, wrong fields: escalate
Wrong fields after fix: 0`,
  },
  mistakes: [
    'Trusting the reply without a check. A model can return a wrong type or leave a field out.',
    'Using a deep shape. Each extra level gives the model another chance to get a field wrong.',
    'Retrying with no change. Send the list of wrong fields back to the model before a second try.',
  ],
  useWhen: [
    'Code uses the reply, for example to show a source list or to route the case.',
    'Every reply needs the same fields.',
  ],
  skipWhen: [
    'The reply is only shown to a reader as plain text.',
  ],
  words: [
    { term: 'Schema', meaning: 'A written description of the fields a reply must have, and their types.' },
    { term: 'JSON', meaning: 'A text format for objects, lists, and simple values.' },
    { term: 'Parse', meaning: 'Turn text into a value that code can read.' },
    { term: 'Type', meaning: 'The kind of value a field holds, such as text, a number, or true or false.' },
  ],
};

const coherenceRules: Lesson = {
  slug: 'coherence-rules',
  number: '5.4',
  title: 'Coherence rules',
  oneLiner: 'Coherence rules check that a valid reply also makes sense against the sources.',
  problem: {
    without: 'A reply with the right shape can still cite a source that was never found, or hide a conflict.',
    with: 'Each reply passes the shape check and the coherence rules. A reply that fails is sent back, not shown.',
  },
  steps: [
    {
      title: 'Shape and meaning are checked apart',
      detail: 'Shape checks the type of each field. Coherence checks the meaning, by comparing the reply with the sources that search returned. A reply can pass the shape check and still fail coherence.',
      visual: {
        kind: 'compare',
        caption: 'The two layers of checks on one reply.',
        left: { title: 'Shape', items: ['Each field has the right type', 'Checked with typeof'] },
        right: { title: 'Coherence', items: ['Each cited id is a real source', 'A conflict is escalated'] },
      },
    },
    {
      title: 'Each cited id must be a known source',
      detail: 'knownIds holds the ids that search returned for this question. Each id in sourceIds must be in that set. The id manual-99 is not in the set, so the reply is reported.',
      visual: {
        kind: 'chips',
        caption: 'Cited ids, checked against the ids that search returned.',
        items: [
          { text: 'faq-12', note: 'known' },
          { text: 'manual-99', note: 'unknown, reported', highlight: true },
        ],
      },
      snippet: {
        source: `const knownIds = new Set(["faq-12", "faq-40"]);
for (const id of ["faq-12", "manual-99"]) {
  const ok = knownIds.has(id);
  console.log(id + (ok ? " known" : " unknown"));
}
`,
        output: `faq-12 known
manual-99 unknown`,
      },
    },
    {
      title: 'A conflict needs escalation',
      detail: 'A non-empty conflicts list means two sources disagree. In that case escalate must be true, so a person makes the decision. The broken reply has a conflict and escalate set to false, so it is reported.',
      visual: {
        kind: 'table',
        caption: 'Three replies checked against the conflict rule.',
        columns: ['Reply', 'Conflicts', 'Escalate', 'Result'],
        rows: [
          ['Good', '0', 'false', 'passes'],
          ['Broken', '1', 'false', 'reported'],
          ['Escalated', '1', 'true', 'passes'],
        ],
        highlightRow: 1,
      },
      snippet: {
        source: `const conflicts = ["faq-12 says 5 to 7 days"];
const escalate = false;
if (conflicts.length > 0 && !escalate) {
  console.log("conflict without escalation");
}
`,
        output: `conflict without escalation`,
      },
    },
    {
      title: 'Every error is collected',
      detail: 'The function gathers every error into one list instead of stopping at the first. A good reply gives an empty list. The broken reply gives two errors, so one check shows every problem at once.',
      visual: {
        kind: 'bars',
        caption: 'Errors found for each reply.',
        unit: 'errors',
        rows: [
          { label: 'Good reply', value: 0 },
          { label: 'Broken reply', value: 2, highlight: true },
        ],
      },
    },
  ],
  code: {
    source: `// The source ids that the search really returned.
const knownIds = new Set(["faq-12", "faq-40"]);

// Return the rule violations. An empty list means no violations.
function coherenceErrors(
  sourceIds: string[],
  conflicts: string[],
  escalate: boolean,
): string[] {
  const errors: string[] = [];
  for (const id of sourceIds) {
    if (!knownIds.has(id)) errors.push("unknown source " + id);
  }
  if (conflicts.length > 0 && !escalate) {
    errors.push("conflict without escalation");
  }
  return errors;
}

// A good answer has no errors.
console.log("Good:", coherenceErrors(["faq-12"], [], false));

// This answer cites an unknown source and hides a conflict.
const brokenErrors = coherenceErrors(
  ["manual-99"],
  ["faq-12 says 5 to 7 days"],
  false,
);
console.log("Broken:", brokenErrors);
`,
    output: `Good: []
Broken: [ 'unknown source manual-99', 'conflict without escalation' ]`,
  },
  mistakes: [
    'Treating a passed shape check as proof. A valid shape can still carry a wrong answer.',
    'Testing only good replies. Also test broken replies, so you know each rule fires.',
    'Returning a single yes or no. A list of named errors tells the next step what to fix.',
  ],
  useWhen: [
    'The reply must match the sources, not only the shape.',
    'A wrong answer would cost more than a rejected reply.',
  ],
  skipWhen: [
    'The reply is free text with no sources or fields to check.',
  ],
  words: [
    { term: 'Coherence', meaning: 'Whether a reply makes sense with the facts that were retrieved.' },
    { term: 'Conflict', meaning: 'Two sources that give different answers to the same question.' },
    { term: 'Escalate', meaning: 'Hand the case to a person instead of answering it.' },
    { term: 'Set', meaning: 'A container that stores each value once and answers membership questions fast.' },
  ],
};

const citationsRefusingEscalating: Lesson = {
  slug: 'citations-refusing-escalating',
  number: '5.5',
  title: 'Citations, refusing, and escalating',
  navTitle: 'Citations and escalation',
  oneLiner: 'An answer cites its sources, is refused when they are silent, or is escalated when they conflict.',
  problem: {
    without: 'The model guesses when the sources are silent. The reader gets a confident answer with no source to check.',
    with: 'Three routes. An answer with sources is shown. A silent source list is refused. A conflict goes to a person.',
  },
  steps: [
    {
      title: 'Escalation is checked first',
      detail: 'The route function checks escalate before anything else. A conflict is never shown as a plain answer, even when it has sources. Two sources with escalate set to true go to a person.',
      snippet: {
        source: `function route(sourceIds: string[], escalate: boolean): string {
  if (escalate) return "escalate to a person";
  if (sourceIds.length === 0) return "refuse: no source answers it";
  return "show the answer with " + sourceIds.join(", ");
}
console.log(route(["faq-12", "manual-3"], true));
`,
        output: `escalate to a person`,
      },
    },
    {
      title: 'No source means refusal',
      detail: 'An empty sourceIds list means no source answers the question. The route refuses instead of guessing, so an unsupported answer never reaches the reader. A refusal is a normal result, not an error.',
      visual: {
        kind: 'chips',
        caption: 'Three cases and the route each one takes.',
        items: [
          { text: 'Two sources, no conflict', note: 'show' },
          { text: 'No sources', note: 'refuse', highlight: true },
          { text: 'Two conflicting sources', note: 'escalate' },
        ],
      },
    },
    {
      title: 'A normal answer names its sources',
      detail: 'When sources exist and do not conflict, the route shows the answer with their ids. The reader can open faq-12 to check the text. The ids come from the search, not from the model memory.',
      visual: {
        kind: 'flow',
        caption: 'The checks that lead to a shown answer.',
        nodes: ['Escalate flag', 'Source list', 'Answer with ids'],
      },
    },
  ],
  code: {
    source: `// Decide what the system does with an answer, based on its sources.
function route(sourceIds: string[], escalate: boolean): string {
  if (escalate) return "escalate to a person";
  if (sourceIds.length === 0) return "refuse: no source answers it";
  return "show the answer with " + sourceIds.join(", ");
}

// An answer with one source is shown with that source named.
console.log(route(["faq-12"], false));

// No source supports the question, so the system refuses.
console.log(route([], false));

// Two sources disagree, so a person must decide.
console.log(route(["faq-12", "manual-3"], true));
`,
    output: `show the answer with faq-12
refuse: no source answers it
escalate to a person`,
  },
  mistakes: [
    'Asking the model to refuse, then not checking the source list. Check sourceIds in code as well.',
    'Counting every refusal as a failure. A correct refusal is right when no source answers the question.',
    'Escalating every hard question. Escalate true conflicts only, or the reviewers receive too many cases.',
  ],
  useWhen: [
    'A wrong answer would cost more than a refusal.',
    'Your documents sometimes disagree with each other.',
  ],
  skipWhen: [
    'Every question has one clear source, and readers do not need the source named.',
  ],
  words: [
    { term: 'Citation', meaning: 'A named source that supports a fact in the answer.' },
    { term: 'Refusal', meaning: 'An answer that says the sources do not cover the question.' },
    { term: 'Escalation', meaning: 'Passing a case to a person for a decision.' },
    { term: 'Route', meaning: 'The path one reply takes, such as show, refuse, or escalate.' },
  ],
};

const longContextAndAttention: Lesson = {
  slug: 'long-context-and-attention',
  number: '5.6',
  title: 'Long context and attention',
  oneLiner: 'A longer context costs more and can hide the answer, so send only the chunks that help.',
  problem: {
    without: 'Every chunk is sent to be safe. The request costs more, and the best passage can sit in the middle of the text.',
    with: 'A short, ordered set of sources is sent. The best passage sits first, and the request stays small.',
  },
  steps: [
    {
      title: 'Tokens measure the size',
      detail: 'A token is a small piece of text, roughly four characters of English. This sample estimates tokens as characters divided by four, rounded up. A 25 character sentence is about 7 tokens.',
      snippet: {
        source: `function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
console.log(estimateTokens("Refunds take 5 to 7 days."));
`,
        output: `7`,
      },
    },
    {
      title: 'Fewer chunks can drop the answer',
      detail: 'The sample has ten chunks, and the answer sits in position 8. Sending only the first three chunks is smaller, but the answer is not in them. The size falls from 81 to 25 tokens, and the answer goes with it.',
      visual: {
        kind: 'table',
        caption: 'Ten chunks in search order, and three ways to send them.',
        columns: ['Sent', 'Tokens', 'Answer found'],
        rows: [
          ['All ten', '81', 'yes'],
          ['First three', '25', 'no'],
          ['First three, best moved first', '23', 'yes'],
        ],
        highlightRow: 1,
      },
    },
    {
      title: 'Order can keep the answer',
      detail: 'Moving the best chunk to the front puts it inside the first three. The same three slots now hold the answer, at 23 tokens. Order can matter as much as size, so both need a check.',
      snippet: {
        source: `const chunks = [
  "Filler one.",
  "Filler two.",
  "Refunds take 5 to 7 days.",
];
const best = chunks[2];
const others = chunks.filter((chunk) => chunk !== best);
const reordered = [best, ...others];
console.log(reordered.slice(0, 2).join(" | "));
`,
        output: `Refunds take 5 to 7 days. | Filler one.`,
      },
    },
    {
      title: 'Attention weighs the input',
      detail: 'Attention is the part of a model that decides which parts of the input to weigh. A very long input spreads that weight over more text. The eval set shows whether a fact placed in the middle is still used.',
      visual: {
        kind: 'compare',
        caption: 'Where a fact sits in a long input.',
        left: { title: 'Near the start', items: ['Usually read with a strong weight', 'Answer found in the tests'] },
        right: { title: 'Deep in the middle', items: ['May get less weight', 'May be missed more often'] },
      },
    },
  ],
  code: {
    source: `// Ten chunks in search order. The answer sits in position 8.
const chunks = Array.from({ length: 10 }, (_, i) => {
  return "Filler note " + (i + 1) + " about store hours.";
});
chunks[7] = "Refunds take 5 to 7 days.";

// Rough size: about four characters per token in English text.
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Report the size and whether the answer is inside the selection.
function report(label: string, selected: string[]): void {
  const text = selected.join("\\n");
  const size = estimateTokens(text);
  const found = text.includes("Refunds take");
  const status = found ? "included" : "missing";
  console.log(label + ": " + size + " tokens, answer " + status);
}

// Send all ten chunks, then only the first three.
report("All ten", chunks);
report("First three", chunks.slice(0, 3));

// Move the best chunk to the front, then send the first three.
const others = chunks.filter((_, i) => i !== 7);
const reordered = [chunks[7], ...others];
report("Reordered, first three", reordered.slice(0, 3));
`,
    output: `All ten: 81 tokens, answer included
First three: 25 tokens, answer missing
Reordered, first three: 23 tokens, answer included`,
  },
  mistakes: [
    'Sending everything for safety. More text costs more and can bury the answer.',
    'Cutting by chunk count only. Chunks differ in length, so count tokens.',
    'Changing the order without a test. Run the eval set after each change to the order.',
  ],
  useWhen: [
    'Requests are slow or costly because the context is large.',
    'The answer exists in the sources, but the model misses it.',
  ],
  skipWhen: [
    'The whole source text is short enough to send safely.',
  ],
  words: [
    { term: 'Context window', meaning: 'The limit on how much text one request can hold.' },
    { term: 'Token', meaning: 'A small piece of text, the unit that a model counts and bills.' },
    { term: 'Attention', meaning: 'The model mechanism that weighs parts of the input against each other.' },
  ],
};

export const writingTheAnswer: Module = {
  slug: 'writing-the-answer',
  number: 5,
  title: 'Writing the answer',
  summary: 'How retrieved passages become a checked, cited answer.',
  lessons: [
    buildingTheContext,
    thePrompt,
    structuredOutput,
    coherenceRules,
    citationsRefusingEscalating,
    longContextAndAttention,
  ],
};
