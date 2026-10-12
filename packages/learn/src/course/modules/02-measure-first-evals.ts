import type { Lesson, Module } from '../types';

const goldenSet: Lesson = {
  slug: 'golden-set',
  number: '2.1',
  title: 'The golden set',
  oneLiner: 'A golden set is a fixed list of questions, each with the fact a correct answer must contain.',
  problem: {
    without: 'Changes are tested by trying a few questions by hand. Each run tests different questions, so results cannot be compared.',
    with: 'The same questions run after every change. A drop in the score shows that the change made answers worse.',
  },
  steps: [
    {
      title: 'Start with questions users asked',
      detail: 'A golden set starts with questions that real users asked, such as "How long does a refund take?" Each question is written down once and then kept fixed. A first set of 50 questions is a good start for a small help center.',
      visual: {
        kind: 'table',
        caption: 'The two cases in this lesson. Each has an id and a question.',
        columns: ['Id', 'Question'],
        rows: [
          ['r1', 'How long does a refund take?'],
          ['p1', 'How do I reset it?'],
        ],
      },
      snippet: {
        source: `type GoldenCase = { id: string; q: string; fact: string };
const goldenSet: GoldenCase[] = [
  { id: "r1", q: "How long does a refund take?", fact: "5 to 7" },
  { id: "p1", q: "How do I reset it?", fact: "Forgot password" },
];
console.log("Cases ->", goldenSet.length);
`,
        output: 'Cases -> 2',
      },
    },
    {
      title: 'Each case has a required fact',
      detail: 'For each question, the set stores the fact a correct answer must contain. The refund answer must contain "5 to 7". Each case also names its source, such as "refund-guide, section 2", which lesson 2.2 uses to score search.',
      visual: {
        kind: 'compare',
        caption: 'Each case pairs a question with one required fact.',
        left: { title: 'Question', items: ['How long does a refund take?'] },
        right: { title: 'Required fact', items: ['5 to 7', 'Source: refund-guide, section 2'] },
      },
      snippet: {
        source: `const fact = "5 to 7";
const answer = "Refunds take 5 to 7 business days.";
// The check is a plain text search, so the wording can vary.
console.log("Fact found ->", answer.includes(fact));
`,
        output: 'Fact found -> true',
      },
    },
    {
      title: 'The set lives in a file the team shares',
      detail: 'Keep the set in a file under version control, such as "golden.json". Each case has an id, a question, and its required fact. The team agrees on the set before any change, so everyone uses the same meaning of a correct answer.',
      visual: {
        kind: 'flow',
        caption: 'The set is written once, saved, and reused for every change.',
        nodes: ['Write the cases', 'Save golden.json', 'Run after each change', 'Compare scores'],
      },
    },
    {
      title: 'Each run scores the set',
      detail: 'The run gives each question to the assistant and checks its answer for the required fact. A case passes when the fact appears. In this set, the refund answer passes and the password answer fails, so the score is 1 of 2.',
      visual: {
        kind: 'chips',
        caption: 'The two cases after one run.',
        items: [
          { text: 'r1: refund time', note: 'PASS', highlight: true },
          { text: 'p1: password reset', note: 'FAIL' },
        ],
      },
      snippet: {
        source: `const refundAnswer = "Refunds take 5 to 7 business days.";
const passwordAnswer = "Contact support for help.";
const passes = [
  refundAnswer.includes("5 to 7"),
  passwordAnswer.includes("Forgot password"),
];
console.log("Pass flags ->", passes.join(", "));
const score = passes.filter(Boolean).length;
console.log("Score ->", score + " of " + passes.length);
`,
        output: `Pass flags -> true, false
Score -> 1 of 2`,
      },
    },
    {
      title: 'Compare the score before and after a change',
      detail: 'Run every case after each change and count the passes. A score of 42 out of 50 before a change and 45 after it shows the change helped. The cases stay the same, so the two scores can be compared directly.',
      visual: {
        kind: 'bars',
        caption: 'Passing cases out of 50, before and after one change.',
        unit: 'of 50',
        rows: [
          { label: 'Before change', value: 42 },
          { label: 'After change', value: 45, highlight: true },
        ],
      },
    },
  ],
  diagram: ['Real questions', 'Required facts', 'Run after each change', 'Score'],
  code: {
    source: `// A golden set: fixed questions and the fact each answer needs.
type GoldenCase = { id: string; q: string; fact: string };

const goldenSet: GoldenCase[] = [
  { id: "r1", q: "How long does a refund take?", fact: "5 to 7" },
  { id: "p1", q: "How do I reset it?", fact: "Forgot password" },
];

// A fake assistant. A real one searches docs and calls a model.
function fakeAssistant(question: string): string {
  if (question.includes("refund")) {
    return "Refunds take 5 to 7 business days.";
  }
  return "Contact support for help.";
}

// Run every case and check whether its fact appears in the answer.
let passed = 0;
for (const testCase of goldenSet) {
  const answer = fakeAssistant(testCase.q);
  const ok = answer.includes(testCase.fact);
  if (ok) passed++;
  console.log(testCase.id, ok ? "PASS" : "FAIL");
}

// The score is the number of passing cases out of the total.
console.log("Score ->", passed + " of " + goldenSet.length);
`,
    output: `r1 PASS
p1 FAIL
Score -> 1 of 2`,
  },
  mistakes: [
    'Writing the cases after seeing the answers. The set then measures the old system, not what users need.',
    'Keeping the set too small. Five cases cannot show a small change in quality.',
    'Changing a case when its run fails. Fix the system first, then keep the case unchanged for comparison.',
  ],
  useWhen: [
    'You change prompts, search settings, or documents and need to know the effect.',
    'Your team needs one shared definition of a correct answer.',
  ],
  skipWhen: [
    'The assistant is a throwaway demo that nobody will change.',
    'Each answer is judged only once by a person. A fixed list cannot cover that work.',
  ],
  words: [
    { term: 'Golden set', meaning: 'A fixed list of cases used to test every change the same way.' },
    { term: 'Case', meaning: 'One question in the set, with the fact a correct answer must contain.' },
    { term: 'Required fact', meaning: 'A piece of information that a correct answer must include.' },
    { term: 'Score', meaning: 'The number of passing cases, or their share of the total.' },
  ],
};

const retrievalMetrics: Lesson = {
  slug: 'retrieval-metrics',
  number: '2.2',
  title: 'Retrieval metrics',
  oneLiner: 'Retrieval metrics check whether search finds the right chunks before the model writes anything.',
  problem: {
    without: 'A bad answer could come from search or from the model. With no score for search, the cause stays unclear.',
    with: 'Search has its own score. A poor answer can be traced to missing chunks or to the model.',
  },
  steps: [
    {
      title: 'Each question lists its right chunks',
      detail: 'Each question gets the ids of the chunks that hold its answer. The refund answer sits in chunk "c2". The address question needs two chunks, "c5" and "c9", so a question can have more than one right chunk.',
      visual: {
        kind: 'table',
        caption: 'The right chunk ids for three questions from the help center.',
        columns: ['Question', 'Right chunks'],
        rows: [
          ['How long does a refund take?', 'c2'],
          ['How do I change my address?', 'c5, c9'],
          ['When will my order ship?', 'c8'],
        ],
      },
      snippet: {
        source: `const relevant: Record<string, string[]> = {
  refund: ["c2"],
  address: ["c5", "c9"],
};
const list = relevant.address.join(", ");
console.log("Address ->", list);
`,
        output: 'Address -> c5, c9',
      },
    },
    {
      title: 'Search returns a ranked list',
      detail: 'Search returns chunks in order, with the best match first. The letter k is how many results you check. For the address question, the ranked list is c3, c9, c4, so the top 2 are c3 and c9.',
      visual: {
        kind: 'chips',
        caption: 'The ranked search results for the address question. The top 2 are checked.',
        items: [
          { text: 'c3', note: 'rank 1' },
          { text: 'c9', note: 'rank 2, right chunk', highlight: true },
          { text: 'c4', note: 'rank 3, not checked' },
        ],
      },
      snippet: {
        source: `const ranked = ["c3", "c9", "c4"];
const k = 2;
const top = ranked.slice(0, k);
console.log("Top", k, "->", top.join(", "));
`,
        output: 'Top 2 -> c3, c9',
      },
    },
    {
      title: 'Hit rate counts questions with a right chunk',
      detail: 'Hit rate at k is the share of questions with at least one right chunk in the top k. The refund and address questions both hit. The shipping question misses, because c8 is not in its top 2. Two hits out of three questions give 0.67.',
      visual: {
        kind: 'table',
        caption: 'Hit or miss for each question, with the top 2 results checked.',
        columns: ['Question', 'Right chunk in top 2', 'Hit'],
        rows: [
          ['Refund', 'c2', '1'],
          ['Address', 'c9', '1'],
          ['Shipping', 'none', '0'],
        ],
        highlightRow: 2,
      },
      snippet: {
        source: `const hits = [1, 1, 0];
const hitRate = hits.reduce((s, h) => s + h, 0) / hits.length;
console.log("Hit rate at 2 ->", hitRate.toFixed(2));
`,
        output: 'Hit rate at 2 -> 0.67',
      },
    },
    {
      title: 'Recall counts the right chunks found',
      detail: 'Recall at k is the share of the right chunks found in the top k. The address question has 2 right chunks, and only c9 is in its top 2, so its recall is 0.5. Averaged over the three questions, recall at 2 is 0.5.',
      visual: {
        kind: 'bars',
        caption: 'Recall at 2 for each question. The average is 0.5.',
        rows: [
          { label: 'Refund', value: 1 },
          { label: 'Address', value: 0.5, highlight: true },
          { label: 'Shipping', value: 0 },
        ],
      },
      snippet: {
        source: `const relevant = ["c5", "c9"];
const top = ["c3", "c9"];
const found = relevant.filter((id) => top.includes(id)).length;
console.log("Recall at 2 ->", (found / relevant.length).toFixed(1));
`,
        output: 'Recall at 2 -> 0.5',
      },
    },
    {
      title: 'Reciprocal rank rewards an early hit',
      detail: 'Reciprocal rank is one divided by the position of the first right chunk. The refund answer is in first place, so it scores 1. The address answer is in second place, so it scores 0.5, and the shipping question scores 0. The mean over the three questions is 0.5.',
      visual: {
        kind: 'chips',
        caption: 'Reciprocal rank for the first right chunk at each position.',
        items: [
          { text: 'Position 1', note: '1' },
          { text: 'Position 2', note: '0.5' },
          { text: 'Position 3', note: '0.33' },
          { text: 'Not found', note: '0' },
        ],
      },
      snippet: {
        source: `const ranked = ["c3", "c9", "c4"];
const relevant = ["c5", "c9"];
const position = ranked.findIndex((id) => relevant.includes(id));
console.log("Position ->", position + 1);
console.log("Reciprocal rank ->", 1 / (position + 1));
`,
        output: `Position -> 2
Reciprocal rank -> 0.5`,
      },
    },
  ],
  diagram: ['Question', 'Search', 'Top k chunks', 'Compare with right ids'],
  code: {
    source: `// Each question lists its right chunk ids and the search results.
const results = [
  { relevant: ["c2"], ranked: ["c2", "c7", "c1"] },
  { relevant: ["c5", "c9"], ranked: ["c3", "c9", "c4"] },
  { relevant: ["c8"], ranked: ["c1", "c6", "c4"] },
];

// Score one question at k: hit, recall, and reciprocal rank.
function score(ranked: string[], relevant: string[], k: number) {
  const top = ranked.slice(0, k);
  const found = relevant.filter((id) => top.includes(id)).length;
  const position = ranked.findIndex((id) => relevant.includes(id));
  return {
    hit: found > 0 ? 1 : 0,
    recall: found / relevant.length,
    rr: position === -1 ? 0 : 1 / (position + 1),
  };
}

// Average one kind of score over all questions.
const scores = results.map((r) => score(r.ranked, r.relevant, 2));
const average = (key: "hit" | "recall" | "rr") =>
  scores.reduce((sum, s) => sum + s[key], 0) / scores.length;

console.log("Hit rate at 2 ->", average("hit").toFixed(2));
console.log("Recall at 2 ->", average("recall").toFixed(2));
console.log("MRR ->", average("rr").toFixed(2));
`,
    output: `Hit rate at 2 -> 0.67
Recall at 2 -> 0.50
MRR -> 0.50`,
  },
  mistakes: [
    'Scoring search by comparing answer wording. The check then depends on wording, not on whether search worked.',
    'Choosing k after seeing the scores. Pick k first, then compare settings at the same k.',
    'Averaging over too few questions. Two questions can move the score by a large amount.',
  ],
  useWhen: [
    'You change search settings, such as the chunk size or the number of results.',
    'Answers are wrong, and you need to know whether search or the model caused it.',
  ],
  skipWhen: [
    'Your set has no chunk ids for the answers. Add them first, or use the answer checks in lesson 2.3.',
    'The system has no search step, such as a single lookup by id.',
  ],
  words: [
    { term: 'Chunk id', meaning: 'A label that names one stored chunk, such as "c2".' },
    { term: 'Top k', meaning: 'The first k results returned by search, where k is a number you choose.' },
    { term: 'Recall', meaning: 'The share of the right items that search returned.' },
    { term: 'Reciprocal rank', meaning: 'One divided by the position of the first right item.' },
  ],
};

const checkingAnswers: Lesson = {
  slug: 'checking-answers',
  number: '2.3',
  title: 'Checking answers and LLM-as-judge',
  navTitle: 'Checking answers, judges',
  oneLiner: 'An answer check decides whether a reply is correct, using rules or a second model as a judge.',
  problem: {
    without: 'An exact match fails a correct answer with other words, such as "about a week" for "5 to 7 days".',
    with: 'A rule catches the plain cases. A judge model grades the answers that use different words.',
  },
  steps: [
    {
      title: 'A rule looks for an accepted form',
      detail: 'The refund fact has two accepted forms: "5 to 7" and "five to seven". The rule lowercases the answer, then checks whether any accepted form appears in it. The check runs in microseconds and costs nothing per answer.',
      visual: {
        kind: 'table',
        caption: 'The rule result for three answers to the refund question.',
        columns: ['Answer', 'Rule result'],
        rows: [
          ['Refunds take 5 to 7 business days.', 'pass'],
          ['Refunds take about a week.', 'fail'],
          ['Refunds take 2 days.', 'fail'],
        ],
        highlightRow: 0,
      },
      snippet: {
        source: `const accepted = ["5 to 7", "five to seven"];
const answer = "Refunds take 5 to 7 business days.";
const lower = answer.toLowerCase();
const pass = accepted.some((f) => lower.includes(f));
console.log("Rule ->", pass ? "pass" : "fail");
`,
        output: 'Rule -> pass',
      },
    },
    {
      title: 'A rule misses other wording',
      detail: 'The rule fails "Refunds take about a week." because no accepted form appears in it. That answer is correct, so the rule is too strict for it. Rules are cheap, so they run before the judge. A judge model checks only the answers the rule fails.',
      visual: {
        kind: 'flow',
        caption: 'Rules run first. The judge checks the answers that the rule fails.',
        nodes: ['Answer', 'Rule check', 'Judge check, if the rule fails', 'Pass or fail'],
      },
    },
    {
      title: 'A judge model reads the answer',
      detail: 'A judge is a second model call. It receives the question, the required fact, and the answer, then replies yes or no. The code uses a fake judge that says yes for "about a week". A real judge reads the answer and decides.',
      visual: {
        kind: 'chips',
        caption: 'What the judge receives, and what it returns.',
        items: [
          { text: 'Question', note: 'input' },
          { text: 'Required fact', note: 'input' },
          { text: 'Answer', note: 'input' },
          { text: 'yes or no', note: 'output', highlight: true },
        ],
      },
      snippet: {
        source: `// A fake judge. A real one is a second model call.
function fakeJudge(answer: string): string {
  return answer.includes("about a week") ? "yes" : "no";
}
console.log("Judge ->", fakeJudge("Refunds take about a week."));
`,
        output: 'Judge -> yes',
      },
    },
    {
      title: 'Test the judge before trusting it',
      detail: 'A judge can be wrong, so test it first. A person grades about 20 answers, then the same answers go to the judge. If the two disagree often, fix the judge instructions before using them. The instructions must name the fact and the accepted wording.',
      visual: {
        kind: 'compare',
        caption: 'The same answers are graded twice, then the results are compared.',
        left: { title: 'Person grades', items: ['About 20 answers', 'Pass or fail for each'] },
        right: { title: 'Judge grades', items: ['The same 20 answers', 'Count the matches'] },
      },
      snippet: {
        source: `const person = [true, true, false, true];
const judge = [true, false, false, true];
const same = person.filter((p, i) => p === judge[i]).length;
console.log("Agreement ->", same + " of " + person.length);
`,
        output: 'Agreement -> 3 of 4',
      },
    },
    {
      title: 'Record a reason with each result',
      detail: 'Store each pass or fail with a reason, such as "missing fact: 5 to 7". The reason shows what to fix, so a failure is not only a count. Ask the judge a narrow question, such as "Does the answer state the required fact?"',
      visual: {
        kind: 'table',
        caption: 'Each result keeps its reason, so the fix is clear.',
        columns: ['Answer', 'Result', 'Reason'],
        rows: [
          ['Refunds take 5 to 7 business days.', 'pass', 'fact found'],
          ['Refunds take 2 days.', 'fail', 'missing fact: 5 to 7'],
        ],
        highlightRow: 1,
      },
      snippet: {
        source: `const answer = "Refunds take 2 days.";
const ok = answer.includes("5 to 7");
const reason = ok ? "fact found" : "missing fact: 5 to 7";
console.log(ok ? "pass" : "fail", "-", reason);
`,
        output: 'fail - missing fact: 5 to 7',
      },
    },
  ],
  diagram: ['Answer', 'Rule', 'Judge if needed', 'Pass or fail'],
  code: {
    source: `// A fact passes when the answer contains any one accepted form.
const accepted = ["5 to 7", "five to seven"];

function ruleCheck(answer: string): boolean {
  const lower = answer.toLowerCase();
  return accepted.some((form) => lower.includes(form));
}

// A fake judge that says "yes" for "about a week".
// A real judge is a second model call with the same inputs.
function fakeJudge(answer: string): string {
  return answer.includes("about a week") ? "yes" : "no";
}

const answers = [
  "Refunds take 5 to 7 business days.",
  "Refunds take about a week.",
  "Refunds take 2 days.",
];

// Show the rule result, then the judge result, for each answer.
for (const answer of answers) {
  const rule = ruleCheck(answer) ? "pass" : "fail";
  const judge = fakeJudge(answer) === "yes" ? "pass" : "fail";
  console.log("Rule", rule, "| Judge", judge, "|", answer);
}
`,
    output: `Rule pass | Judge fail | Refunds take 5 to 7 business days.
Rule fail | Judge pass | Refunds take about a week.
Rule fail | Judge fail | Refunds take 2 days.`,
  },
  mistakes: [
    'Trusting a judge without testing it. A judge can pass wrong answers, so grade a sample by hand first.',
    'Asking a vague question, such as "Is this good?" Name the fact to check instead.',
    'Using the same model as both assistant and judge with no check. Its errors can hide its own mistakes.',
  ],
  useWhen: [
    'Answers must contain a fact, but the wording varies from answer to answer.',
    'You need a check on meaning that a keyword cannot give.',
  ],
  skipWhen: [
    'The answer is one exact value, such as an order number. A plain equality check is enough.',
    'You have no hand-graded answers to test the judge against.',
  ],
  words: [
    { term: 'Rule check', meaning: 'A check written in code, such as a search for an accepted form.' },
    { term: 'Judge model', meaning: 'A model that grades another answer, usually with yes or no.' },
    { term: 'Accepted form', meaning: 'One wording of a fact that counts as correct.' },
    { term: 'Hand-graded', meaning: 'Checked by a person, and used as the reference for tests.' },
  ],
};

const repeatRuns: Lesson = {
  slug: 'repeat-runs',
  number: '2.4',
  title: 'Repeat runs and flaky results',
  navTitle: 'Repeat runs',
  oneLiner: 'A flaky result passes on some runs and fails on others, so each case runs more than once.',
  problem: {
    without: 'Each case runs once. A pass or fail may be luck, and a real change can look like noise.',
    with: 'Each case runs five times. The pass count shows how stable the answer is.',
  },
  steps: [
    {
      title: 'One run can mislead',
      detail: 'The model may give a different reply to the same question, because of the sampling described in lesson 1.3. One run can pass by luck or fail by bad luck. Running the case five times shows how often it passes.',
      visual: {
        kind: 'chips',
        caption: 'Five runs of the password question. Two runs fail.',
        items: [
          { text: 'Run 1', note: 'pass' },
          { text: 'Run 2', note: 'fail', highlight: true },
          { text: 'Run 3', note: 'pass' },
          { text: 'Run 4', note: 'pass' },
          { text: 'Run 5', note: 'fail', highlight: true },
        ],
      },
      snippet: {
        source: `const runs = [true, false, true, true, false];
const passes = runs.filter((ok) => ok).length;
console.log("Passes ->", passes + " of " + runs.length);
`,
        output: 'Passes -> 3 of 5',
      },
    },
    {
      title: 'Stable and flaky cases',
      detail: 'A case that gives the same outcome on every run is stable. The refund question passes 5 times out of 5, so it is stable. The password question passes 3 times out of 5, so it is flaky.',
      visual: {
        kind: 'bars',
        caption: 'Passes out of 5 runs for three cases.',
        unit: 'of 5',
        rows: [
          { label: 'refund-1', value: 5 },
          { label: 'password-1', value: 3, highlight: true },
          { label: 'ship-1', value: 0 },
        ],
      },
      snippet: {
        source: `const runs = [true, false, true, true, false];
const stable = runs.every((ok) => ok === runs[0]);
console.log("Stable ->", stable);
`,
        output: 'Stable -> false',
      },
    },
    {
      title: 'Choose the pass rule before the run',
      detail: 'A case passes when at least 4 of its 5 runs pass. Decide this rule before the run and keep it for later comparisons. At least 4 of 5 is strict, and at least 3 of 5 is lenient, so write the choice down.',
      visual: {
        kind: 'table',
        caption: 'The verdict for each count of passes under the rule of 4 of 5.',
        columns: ['Runs passed', 'Verdict'],
        rows: [
          ['5', 'pass'],
          ['4', 'pass'],
          ['3', 'fail'],
          ['0', 'fail'],
        ],
        highlightRow: 2,
      },
      snippet: {
        source: `const PASS_RULE = 4;
const passes = 3;
console.log("Verdict ->", passes >= PASS_RULE ? "pass" : "fail");
`,
        output: 'Verdict -> fail',
      },
    },
    {
      title: 'Report flaky cases on their own line',
      detail: 'A flaky case gets its own line in the report, so it does not hide inside a plain fail. The count, such as 3/5, appears next to the label. Save every run, not only the summary, so you can see which runs failed.',
      visual: {
        kind: 'chips',
        caption: 'The report lines for three cases.',
        items: [
          { text: 'refund-1', note: '5/5 stable, pass' },
          { text: 'password-1', note: '3/5 flaky, fail', highlight: true },
          { text: 'ship-1', note: '0/5 stable, fail' },
        ],
      },
      snippet: {
        source: `const runs = [true, false, true, true, false];
const passes = runs.filter((ok) => ok).length;
const allSame = passes === 0 || passes === runs.length;
const kind = allSame ? "stable" : "flaky";
console.log("password-1", passes + "/" + runs.length, kind);
`,
        output: 'password-1 3/5 flaky',
      },
    },
    {
      title: 'Compare totals with care',
      detail: 'Compare the total pass count of two versions, not one run. A change of one case out of 50 can be noise, so repeat the run before deciding. Five runs of 50 cases means 250 model calls, so set that budget first.',
      visual: {
        kind: 'table',
        caption: 'The size of one full run with five repeats.',
        columns: ['Setting', 'Value'],
        rows: [
          ['Runs per case', '5'],
          ['Cases', '50'],
          ['Model calls', '250'],
        ],
      },
      snippet: {
        source: `const runsPerCase = 5;
const cases = 50;
console.log("Model calls ->", runsPerCase * cases);
`,
        output: 'Model calls -> 250',
      },
    },
  ],
  diagram: ['One case', 'Five runs', 'Count passes', 'Verdict'],
  code: {
    source: `// Recorded outcomes of five runs per case. true means a pass.
const runs: Record<string, boolean[]> = {
  "refund-1": [true, true, true, true, true],
  "password-1": [true, false, true, true, false],
  "ship-1": [false, false, false, false, false],
};

// A case passes overall when at least 4 of its 5 runs pass.
const PASS_RULE = 4;

// Label a case as stable or flaky, and give its verdict.
function verdict(outcomes: boolean[]): string {
  const passes = outcomes.filter((ok) => ok).length;
  const allSame = passes === 0 || passes === outcomes.length;
  const kind = allSame ? "stable" : "flaky";
  const result = passes >= PASS_RULE ? "pass" : "fail";
  return kind + " " + result;
}

// Print the pass count and verdict for each case.
for (const [id, outcomes] of Object.entries(runs)) {
  const passes = outcomes.filter((ok) => ok).length;
  const count = passes + "/" + outcomes.length;
  console.log(id, count, verdict(outcomes));
}
`,
    output: `refund-1 5/5 stable pass
password-1 3/5 flaky fail
ship-1 0/5 stable fail`,
  },
  mistakes: [
    'Running each case once and calling it stable. One pass says little about the next run.',
    'Changing the pass rule after seeing the results. Set the rule first, then keep it.',
    'Hiding flaky cases inside the average. Report them on their own line.',
  ],
  useWhen: [
    'The model gives different replies to the same question.',
    'You compare two versions, and the difference is only a few cases.',
  ],
  skipWhen: [
    'The system always returns the same result, such as a lookup table.',
    'Each run is very costly, and you accept the risk of a single run.',
  ],
  words: [
    { term: 'Flaky', meaning: 'A case that passes some runs and fails others.' },
    { term: 'Repeat run', meaning: 'One more run of the same case with the same settings.' },
    { term: 'Pass rule', meaning: 'The number of passing runs a case needs to count as a pass.' },
    { term: 'Stable', meaning: 'A case that gives the same outcome on every run.' },
  ],
};

const baselinesAndDiffs: Lesson = {
  slug: 'baselines-and-diffs',
  number: '2.5',
  title: 'Baselines, diffs, and regressions',
  navTitle: 'Baselines and diffs',
  oneLiner: 'A baseline is a saved result from a known version, and a diff compares a new result with it.',
  problem: {
    without: 'Each run is compared with memory. Small drops go unnoticed, and nobody knows which version scored best.',
    with: 'The saved baseline shows each case that changed. A case that passed before and fails now is a regression.',
  },
  steps: [
    {
      title: 'Save a baseline from a trusted run',
      detail: 'After a run you trust, save the result of each case under a version name, such as "v1.3". That saved file is the baseline. A diff is only as good as its baseline, so use a run you trust.',
      visual: {
        kind: 'table',
        caption: 'The saved baseline for version v1.3.',
        columns: ['Case', 'v1.3 result'],
        rows: [
          ['refund', 'pass'],
          ['password', 'pass'],
          ['ship', 'fail'],
        ],
      },
      snippet: {
        source: `const baseline: Record<string, boolean> = {
  refund: true, password: true, ship: false,
};
console.log("Saved cases ->", Object.keys(baseline).length);
`,
        output: 'Saved cases -> 3',
      },
    },
    {
      title: 'A new run uses the same cases',
      detail: 'Run the same cases with the same settings and save the result as "v1.4". If the cases differ, the diff mixes two kinds of change. The version name also links each result to the code and settings that made it.',
      visual: {
        kind: 'compare',
        caption: 'The two saved versions, case by case.',
        left: { title: 'v1.3 baseline', items: ['refund: pass', 'password: pass', 'ship: fail'] },
        right: { title: 'v1.4 new run', items: ['refund: fail', 'password: pass', 'ship: pass'] },
      },
    },
    {
      title: 'Each case gets one label',
      detail: 'Each case gets one label: same, fixed, or regression. The password case passed in both versions, so it is labeled same. The ship case failed before and passes now, so it is fixed.',
      visual: {
        kind: 'chips',
        caption: 'The label for each case in the diff.',
        items: [
          { text: 'refund', note: 'regression', highlight: true },
          { text: 'password', note: 'same' },
          { text: 'ship', note: 'fixed' },
        ],
      },
      snippet: {
        source: `const before = { refund: true, password: true, ship: false };
const after = { refund: false, password: true, ship: true };
for (const id of Object.keys(before)) {
  let label = "same";
  if (before[id] && !after[id]) label = "regression";
  if (!before[id] && after[id]) label = "fixed";
  console.log(id, label);
}
`,
        output: `refund regression
password same
ship fixed`,
      },
    },
    {
      title: 'A total can hide a regression',
      detail: 'A regression is a case that passed in the baseline and fails now. The refund case passed in v1.3 and fails in v1.4. The ship fix offsets it, so both totals are 2 of 3. Only the case list shows the regression.',
      visual: {
        kind: 'bars',
        caption: 'The passes in each version. The totals match, so the case labels matter.',
        unit: 'of 3',
        rows: [
          { label: 'v1.3 passes', value: 2 },
          { label: 'v1.4 passes', value: 2, highlight: true },
        ],
      },
      snippet: {
        source: `const baselineTotal = [true, true, false].filter(Boolean).length;
const newTotal = [false, true, true].filter(Boolean).length;
console.log("Totals ->", baselineTotal, newTotal);
`,
        output: 'Totals -> 2 2',
      },
    },
    {
      title: 'Fix or explain a regression before shipping',
      detail: 'A regression blocks the change until it is fixed or explained in writing. The refund case needs a fix or a written reason before v1.4 ships. Never update the baseline to match the new result, because that hides the regression.',
      visual: {
        kind: 'flow',
        caption: 'The path for a regression, from detection to release.',
        nodes: ['Regression found', 'Fix or written reason', 'Run again', 'Ship v1.4'],
      },
    },
  ],
  diagram: ['Baseline v1.3', 'New run v1.4', 'Diff', 'Regressions'],
  code: {
    source: `// Saved results from the baseline version and the new version.
const baseline: Record<string, boolean> = {
  refund: true, password: true, ship: false,
};
const current: Record<string, boolean> = {
  refund: false, password: true, ship: true,
};

// Compare each case and label what changed.
for (const id of Object.keys(baseline)) {
  const before = baseline[id];
  const after = current[id];
  let change = "same";
  if (before && !after) change = "REGRESSION";
  if (!before && after) change = "fixed";
  const was = before ? "pass" : "fail";
  const now = after ? "pass" : "fail";
  console.log(id, was, "->", now, change);
}

// List the regressions. Any regression needs a review.
const regressions = Object.keys(baseline).filter(
  (id) => baseline[id] && !current[id],
);
console.log("Regressions ->", regressions.join(", "));
`,
    output: `refund pass -> fail REGRESSION
password pass -> pass same
ship fail -> pass fixed
Regressions -> refund`,
  },
  mistakes: [
    'Comparing against a baseline with different cases. The diff then mixes two kinds of change.',
    'Updating the baseline to match the new result. That hides the regression instead of fixing it.',
    'Reading only the totals. A flat total can hide one regression and one fix.',
  ],
  useWhen: [
    'You change prompts, settings, or documents and want to see what changed.',
    'You need a record of which version scored best.',
  ],
  skipWhen: [
    'The set is so small that you can read every answer by hand.',
    'No version history is kept, so a baseline has no clear meaning.',
  ],
  words: [
    { term: 'Baseline', meaning: 'A saved result from a known version, used as the reference.' },
    { term: 'Diff', meaning: 'A comparison of two results, case by case.' },
    { term: 'Regression', meaning: 'A case that passed before and fails now.' },
    { term: 'Version name', meaning: 'A label, such as "v1.3", that identifies a saved result.' },
  ],
};

const severityAndControls: Lesson = {
  slug: 'severity-and-control-cases',
  number: '2.6',
  title: 'Severity buckets and control cases',
  navTitle: 'Severity and controls',
  oneLiner: 'Severity buckets sort failures by harm, and control cases check that the assistant refuses what it cannot answer.',
  problem: {
    without: 'Every failure counts the same. A wrong refund time and an awkward sentence look equally bad in the score.',
    with: 'Failures sit in buckets. A critical wrong fact blocks a release, while a minor wording issue does not.',
  },
  steps: [
    {
      title: 'Three buckets sort failures by harm',
      detail: 'Each failure goes in one bucket: critical, major, or minor. Critical means a wrong fact that a reader would act on, such as "refund in 2 days". Define the buckets before the run, so the labels do not drift toward the result you hoped for.',
      visual: {
        kind: 'table',
        caption: 'The three buckets, with an example and its effect on the release.',
        columns: ['Bucket', 'Example', 'Effect on release'],
        rows: [
          ['Critical', 'Refund in 2 days', 'Blocks the release'],
          ['Major', 'Reply with no source', 'Reviewed before release'],
          ['Minor', 'Awkward wording, right fact', 'Does not block'],
        ],
        highlightRow: 0,
      },
      snippet: {
        source: `type Failure = { id: string; bucket: string };
const failures: Failure[] = [
  { id: "refund", bucket: "critical" },
  { id: "ship", bucket: "minor" },
];
console.log("Buckets ->", failures.map((f) => f.bucket).join(", "));
`,
        output: 'Buckets -> critical, minor',
      },
    },
    {
      title: 'Sorting the failures',
      detail: 'A wrong refund time, such as "2 days", is critical. A reply with no source is major, because the reader cannot check it. Awkward wording with the right fact is minor.',
      visual: {
        kind: 'chips',
        caption: 'Three failures, each in its bucket.',
        items: [
          { text: 'Refund in 2 days', note: 'critical', highlight: true },
          { text: 'No source given', note: 'major' },
          { text: 'Awkward wording', note: 'minor' },
        ],
      },
      snippet: {
        source: `const failures = [
  { id: "refund", bucket: "critical" },
  { id: "password", bucket: "major" },
  { id: "ship", bucket: "minor" },
];
const count = (b: string) =>
  failures.filter((f) => f.bucket === b).length;
console.log("Critical ->", count("critical"));
`,
        output: 'Critical -> 1',
      },
    },
    {
      title: 'Control cases check for refusal',
      detail: 'A control case asks about something the documents do not cover, such as "Do you sell gift cards for kids?" The right reply says the answer is not in the documents. A plain score does not reward that reply, so the control must be counted on purpose.',
      visual: {
        kind: 'compare',
        caption: 'A right reply and a wrong reply to the same control question.',
        left: { title: 'Right reply', items: ['The answer is not in the documents.'] },
        right: { title: 'Wrong reply', items: ['Gift cards cost 25 dollars.'] },
      },
      snippet: {
        source: `const refuses = (reply: string) =>
  reply.includes("not in the documents");
console.log(refuses("The answer is not in the documents."));
console.log(refuses("Gift cards cost 25 dollars."));
`,
        output: `true
false`,
      },
    },
    {
      title: 'Scoring the controls',
      detail: 'A control passes only when the assistant refuses or escalates. An invented answer, such as "Gift cards cost 25 dollars.", is a critical failure. Keep control cases in the same set as the other cases, so every run checks both kinds of behavior.',
      visual: {
        kind: 'chips',
        caption: 'The two control replies after one run.',
        items: [
          { text: 'Refusal', note: 'pass', highlight: true },
          { text: 'Invented price', note: 'critical failure' },
        ],
      },
      snippet: {
        source: `const controlReplies = [
  "The answer is not in the documents.",
  "Gift cards cost 25 dollars.",
];
const phrase = "not in the documents";
const passes = controlReplies.filter((r) => r.includes(phrase));
const total = controlReplies.length;
console.log("Control passes ->", passes.length, "of", total);
`,
        output: 'Control passes -> 1 of 2',
      },
    },
    {
      title: 'The release rule',
      detail: 'A change ships only when it has zero critical failures and every control case passes. One critical failure blocks the release. Here the refund failure and the invented price both block it.',
      visual: {
        kind: 'flow',
        caption: 'Both conditions must hold before a release is allowed.',
        nodes: ['Zero critical failures', 'Every control passes', 'Release allowed'],
      },
      snippet: {
        source: `const critical = 1;
const controlsPassed = 1;
const controlsTotal = 2;
const ok = critical === 0 && controlsPassed === controlsTotal;
console.log("Release ->", ok ? "allowed" : "blocked");
`,
        output: 'Release -> blocked',
      },
    },
  ],
  diagram: ['Failure', 'Bucket', 'Control cases', 'Release rule'],
  code: {
    source: `// Each failure has one bucket: critical, major, or minor.
type Failure = { id: string; bucket: string };
const failures: Failure[] = [
  { id: "refund", bucket: "critical" },
  { id: "ship", bucket: "minor" },
  { id: "password", bucket: "major" },
];

// Replies to a control question that the documents do not cover.
const controlReplies = [
  "The answer is not in the documents.",
  "Gift cards cost 25 dollars.",
];

// A reply passes when it says the answer is not in the documents.
const refuses = (reply: string) =>
  reply.includes("not in the documents");

// Count the critical failures and the control passes.
const bad = failures.filter((f) => f.bucket === "critical");
const critical = bad.length;
const passes = controlReplies.filter(refuses).length;
const total = controlReplies.length;
console.log("Critical failures ->", critical);
console.log("Control passes ->", passes + " of " + total);

// The release rule: no critical failures and every control passes.
const releaseOk = critical === 0 && passes === total;
console.log("Release ->", releaseOk ? "allowed" : "blocked");
`,
    output: `Critical failures -> 1
Control passes -> 1 of 2
Release -> blocked`,
  },
  mistakes: [
    'Putting every failure in the major bucket. The buckets then stop separating harm from annoyance.',
    'Writing only questions that have answers. A system that always answers then looks perfect.',
    'Deciding the bucket after the run. Set the bucket definitions first, then label the failures.',
  ],
  useWhen: [
    'Some wrong answers cause more harm than others, such as a wrong price.',
    'The assistant must say it does not know when the documents do not cover a question.',
  ],
  skipWhen: [
    'Every wrong answer has the same cost, such as a demo for one small team.',
    'The assistant only picks from a fixed list and never writes a free-form answer.',
  ],
  words: [
    { term: 'Severity', meaning: 'How much harm a failure can cause.' },
    { term: 'Bucket', meaning: 'A named group of failures, such as critical, major, or minor.' },
    { term: 'Critical failure', meaning: 'A wrong fact that a reader could act on.' },
    { term: 'Control case', meaning: 'A question with no answer in the documents, where the right reply is a refusal.' },
  ],
};

export const measureFirst: Module = {
  slug: 'measure-first-evals',
  number: 2,
  title: 'Measure first: evals',
  summary: 'How to test an assistant against fixed questions, so changes can be judged.',
  lessons: [goldenSet, retrievalMetrics, checkingAnswers, repeatRuns, baselinesAndDiffs, severityAndControls],
};
