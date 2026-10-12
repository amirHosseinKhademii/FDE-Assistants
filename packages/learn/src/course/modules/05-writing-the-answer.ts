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
      title: 'Order the chunks',
      detail: 'Put the best match first. A question about refunds puts the refund chunk before the gift card chunk.',
    },
    {
      title: 'Label each chunk',
      detail: 'Give each chunk an id in square brackets, such as [faq-12]. The model copies that id when it names a source.',
    },
    {
      title: 'Stop at the size limit',
      detail: 'Add chunks until the next one would pass the limit. This lesson counts characters. Real systems count tokens, the small pieces of text a model reads.',
    },
    {
      title: 'Join the chunks into text',
      detail: 'Put one labeled chunk on each line. The result is the sources part of the context. Lesson 5.2 adds the rules and the question.',
    },
  ],
  diagram: ['Best chunks', 'Label each', 'Stop at limit', 'Context text'],
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
  hood: {
    paragraphs: [
      'The search that finds the chunks is covered in lesson 4.1. This lesson starts from a list that is already sorted.',
      'The loop stops at the first chunk that does not fit. Chunks after it are not added, so the order of the list decides what is kept.',
      'Each line starts with the id in square brackets. The model copies that id when it cites a source.',
    ],
    example: [
      { label: 'Limit in characters', value: '100' },
      { label: 'First chunk, length', value: '34 characters' },
      { label: 'Second chunk, length', value: '33 characters' },
      { label: 'Third chunk, length', value: '41 characters' },
      { label: 'Total if the third chunk is added', value: '108, over the limit' },
    ],
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
      title: 'Write the rules once',
      detail: 'Rules say what the model must do. Example: "Answer only from the sources below." The same rules go with every question.',
    },
    {
      title: 'Add the sources',
      detail: 'Paste the labeled text from lesson 5.1 under a Sources heading. The model reads the sources before it reads the question.',
    },
    {
      title: 'Add the question last',
      detail: 'End with the question the user typed. Example: "How long do refunds take?" Each request has its own question, so only that part changes.',
    },
    {
      title: 'Join the parts into one text',
      detail: 'Put each part under its own heading, with a blank line between parts. The model reads the whole text from top to bottom.',
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
  hood: {
    paragraphs: [
      'Many model interfaces accept a list of messages. A common layout puts the rules in one message and the sources and question in another.',
      'The sample builds one text and does not call a model. Its output is the text that the model would receive.',
      'The rules are a list, so a new rule is one more line. The code numbers each rule so a reader can refer to it.',
    ],
    example: [
      { label: 'Rules in the prompt', value: '3' },
      { label: 'Sources in the prompt', value: '1 chunk' },
      { label: 'Question', value: '"How long do refunds take?"' },
    ],
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
      title: 'Name the fields',
      detail: 'Pick the fields the code needs, such as answer, sourceIds, and escalate. Each field has one type, such as text, a list, or true or false.',
    },
    {
      title: 'Ask for that shape',
      detail: 'The prompt asks for one JSON object with those fields. JSON is a text format for objects, lists, and simple values.',
    },
    {
      title: 'Parse the reply',
      detail: 'Code turns the text into an object. If the text is not valid JSON, the reply is rejected at once.',
    },
    {
      title: 'Check each field type',
      detail: 'The escalate field must be a boolean. The reply escalate: "no" is text, so the check rejects it and names the field.',
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
  hood: {
    paragraphs: [
      'A model does not guarantee the shape of its reply. The check in code is still required.',
      'Parsing turns the text into a value. JSON.parse returns an object, and its fields are plain values.',
      'The check uses typeof for text and booleans, and Array.isArray for lists. Both are standard JavaScript.',
    ],
    example: [
      { label: 'Reply text', value: '{"answer": "5 to 7 days", "sourceIds": ["faq-12"], "escalate": "no"}' },
      { label: 'Type of escalate', value: 'text, but a boolean is expected' },
      { label: 'Result', value: 'rejected, wrong field: escalate' },
    ],
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
      title: 'Keep shape and coherence apart',
      detail: 'Shape checks the types. Coherence checks the meaning against the sources, such as the list of ids that the search returned.',
    },
    {
      title: 'Check every cited id',
      detail: 'Each id in sourceIds must be in the set of ids the search returned. An id that was never retrieved is an error.',
    },
    {
      title: 'Require escalation for conflicts',
      detail: 'If two sources disagree, the conflicts list is not empty. The reply must set escalate to true, so a person decides.',
    },
    {
      title: 'Return every error',
      detail: 'The function returns every broken rule, not only the first. An empty list means the reply passes.',
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
  hood: {
    paragraphs: [
      'A rule is a small check that returns a message or nothing. Many small rules are easier to test than one large check.',
      'A Set is a container for unique values. Its has method answers yes or no for one value, quickly.',
      'The sample returns every message at once. A reader or a retry step can then see all the problems in one pass.',
    ],
    example: [
      { label: 'Known ids', value: 'faq-12, faq-40' },
      { label: 'Cited id in the broken reply', value: 'manual-99, not known' },
      { label: 'Conflicts in the broken reply', value: '1, with escalate set to false' },
    ],
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
      title: 'Cite when the sources answer',
      detail: 'The answer names the source ids it used, such as faq-12. The reader can open that source and check the answer.',
    },
    {
      title: 'Refuse when the sources are silent',
      detail: 'If no source answers the question, sourceIds is empty. The system says the sources do not cover it, instead of guessing.',
    },
    {
      title: 'Escalate when the sources conflict',
      detail: 'Two sources that disagree set escalate to true. A person reads both sources and decides which one applies.',
    },
    {
      title: 'Route each reply',
      detail: 'Code checks escalate first, then the source list. Each reply takes exactly one route, and the route is recorded.',
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
  hood: {
    paragraphs: [
      'The order of the checks matters. Escalation is checked first, so a conflict is never shown as a plain answer.',
      'A refusal is a normal result, not an error. It is correct when the sources truly do not cover the question.',
      'The sample returns text for each route. A real system would hand the reply to the next step of its pipeline instead.',
    ],
    example: [
      { label: 'Reply with a source', value: 'show the answer, with faq-12' },
      { label: 'Reply with no source', value: 'refuse' },
      { label: 'Reply with a conflict', value: 'escalate to a person' },
    ],
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
      title: 'Measure the size',
      detail: 'Count the tokens in the context before each request. In plain English, about four characters make one token.',
    },
    {
      title: 'Keep the strongest sources',
      detail: 'Send the first few chunks from the search. In the example, three chunks make 25 tokens instead of 81.',
    },
    {
      title: 'Put the best source first',
      detail: 'Research reports that models often miss facts placed in the middle of a long input. The best chunk goes first.',
    },
    {
      title: 'Check that the answer is still included',
      detail: 'Run the eval set after each change to the size or the order. A smaller context that drops the answer is worse, even if it is cheaper.',
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
  hood: {
    paragraphs: [
      'Four characters per token is a rough rule for English. The model tokenizer gives the real count, which may differ.',
      'The reordered result moves the best chunk to the front. The answer then stays inside the first three chunks.',
      'Attention is the part of a model that decides which parts of the input to weigh. Long inputs spread that weight across more text.',
    ],
    example: [
      { label: 'Chunks available', value: '10' },
      { label: 'Tokens for all ten', value: '81' },
      { label: 'Tokens for the first three', value: '25, answer missing' },
      { label: 'Tokens for the reordered first three', value: '23, answer included' },
    ],
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
