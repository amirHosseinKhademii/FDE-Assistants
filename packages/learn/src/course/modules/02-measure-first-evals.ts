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
      title: 'Pick real questions',
      detail: 'Collect questions that real users asked, such as "How long does a refund take?" A first set of 50 questions is a good start.',
    },
    {
      title: 'Write the required fact',
      detail: 'For each question, write the fact a correct answer must contain. The refund question needs the text "5 to 7".',
    },
    {
      title: 'Name the source',
      detail: 'Record which document holds the answer, such as "refund-guide, section 2". Lesson 2.2 uses this record to score search.',
    },
    {
      title: 'Store the set as data',
      detail: 'Keep the set in a file under version control, such as "golden.json". Each case has an id, a question, and its required fact.',
    },
    {
      title: 'Run the set after each change',
      detail: 'Run every case and count the passes. A score of 42 out of 50 before a change and 45 after it shows the change helped.',
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
  hood: {
    paragraphs: [
      'Each case stores the question and the required fact, not a full model answer. Many correct answers use different words for the same fact.',
      'The check in the code is a plain text search. It misses correct answers that are worded differently, and lesson 2.3 covers better checks.',
      'The set is a contract for the team. Everyone agrees on what a correct answer must contain before any change is made.',
    ],
    example: [
      { label: 'Case id', value: 'r1' },
      { label: 'Question', value: '"How long does a refund take?"' },
      { label: 'Required fact', value: '"5 to 7"' },
      { label: 'Answer found', value: '"Refunds take 5 to 7 business days."' },
    ],
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
      title: 'Mark the right chunks',
      detail: 'For each question, list the chunk ids that hold the answer. The refund question might point to the chunk "refund-2".',
    },
    {
      title: 'Take the top results',
      detail: 'Run the search and keep the top k results. The letter k is the number of results you check, such as the top 2 chunks.',
    },
    {
      title: 'Hit rate: was one found?',
      detail: 'Hit rate at k is the share of questions with at least one right chunk in the top k. Two hits out of three questions give 0.67.',
    },
    {
      title: 'Recall: how many were found?',
      detail: 'Recall at k is the share of the right chunks found in the top k. A question with 2 right chunks and 1 found has recall 0.5.',
    },
    {
      title: 'MRR: how high was the first hit?',
      detail: 'Mean reciprocal rank (MRR) gives 1 for a first-place hit, 0.5 for second place, and 0.33 for third. It is averaged over all questions.',
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
  hood: {
    paragraphs: [
      'Each metric is a share between 0 and 1. The average over all questions gives the score for the whole set.',
      'MRR rewards a right chunk at the top most. It suits systems where the model reads only the first few chunks.',
      'Metrics measure search only. An answer can still be wrong when the right chunks were found.',
    ],
    example: [
      { label: 'Question 2 right chunks', value: 'c5, c9' },
      { label: 'Found in the top 2', value: 'c9' },
      { label: 'Recall at 2 for question 2', value: '0.5' },
      { label: 'Reciprocal rank for question 2', value: '0.5 (c9 is in second place)' },
    ],
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
      title: 'Start with a rule',
      detail: 'A rule checks for a fact, such as the text "5 to 7". It is fast, costs nothing to run, and is easy to explain.',
    },
    {
      title: 'Accept more than one wording',
      detail: 'Give each fact a list of accepted forms, such as "5 to 7" and "five to seven". An answer passes when it contains any one form.',
    },
    {
      title: 'Ask a judge when wording varies',
      detail: 'Send the question, the required fact, and the answer to a judge model. Ask for one word, "yes" or "no", which is easy to read in code.',
    },
    {
      title: 'Test the judge',
      detail: 'Run the judge on 20 answers that a person already graded. If the judge disagrees often, fix its instructions before you trust it.',
    },
    {
      title: 'Record the reason',
      detail: 'Store each pass or fail with a reason, such as "missing fact: 5 to 7". The reason shows what to fix.',
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
  hood: {
    paragraphs: [
      'A judge is also a model, so it can be wrong. Its instructions must name the fact that counts and the wording to accept.',
      'Rules are cheap and exact. A judge costs one model call for each answer, so use rules first and the judge only where needed.',
      'Ask the judge a narrow question. A question such as "Does the answer state the required fact?" is easier to test than "Is this good?"',
    ],
    example: [
      { label: 'Answer "Refunds take 5 to 7 business days."', value: 'rule pass, judge fail' },
      { label: 'Answer "Refunds take about a week."', value: 'rule fail, judge pass' },
      { label: 'Required fact', value: '"5 to 7 days" or "about a week"' },
    ],
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
      title: 'Run each case several times',
      detail: 'Run the same case five times with the same settings. The model may give five different replies to "How long does a refund take?"',
    },
    {
      title: 'Count the passes',
      detail: 'A case that passes 5 times out of 5 is stable. A case that passes 3 times out of 5 is flaky.',
    },
    {
      title: 'Set a pass rule first',
      detail: 'Decide before the run: a case passes if at least 4 of its 5 runs pass. Keep the same rule for later comparisons.',
    },
    {
      title: 'Mark flaky cases',
      detail: 'A case that passes 3 of 5 runs and fails 2 is flaky. Report it on its own line, so it is not hidden in a plain fail.',
    },
    {
      title: 'Compare totals over runs',
      detail: 'Compare the total pass count of two versions. A change of one case out of 50 can be noise, so repeat before you decide.',
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
  hood: {
    paragraphs: [
      'Repeated runs cost more model calls. Five runs of 50 cases means 250 calls, so set the budget before you start.',
      'The pass rule is a choice. At least 4 of 5 is strict, and at least 3 of 5 is lenient. Write the choice down.',
      'Save every run, not only the summary. The raw outcomes show which runs failed and why.',
    ],
    example: [
      { label: 'Runs per case', value: '5' },
      { label: 'Model calls for 50 cases', value: '250' },
      { label: 'Pass rule', value: 'at least 4 of 5' },
      { label: 'password-1 result', value: '3 of 5, so fail' },
    ],
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
      title: 'Save the baseline',
      detail: 'After a run you trust, save the result of each case under its version name, such as "v1.3". That file is the baseline.',
    },
    {
      title: 'Run the new version',
      detail: 'Run the same cases with the same settings. Save the new result under a new version name, such as "v1.4".',
    },
    {
      title: 'Compare case by case',
      detail: 'For each case, note whether it moved from pass to fail, from fail to pass, or stayed the same. "password" stayed a pass, so it is labeled same.',
    },
    {
      title: 'Name the regressions',
      detail: 'A regression is a case that passed in the baseline and fails now. For example, "refund" passed in v1.3 and fails in v1.4.',
    },
    {
      title: 'Fix or explain each one',
      detail: 'A regression blocks the change until it is fixed or explained. For example, "refund" needs a fix or a written reason before v1.4 ships.',
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
  hood: {
    paragraphs: [
      'A diff is only as good as its baseline. Save the baseline from a run you trust, with the same cases and settings.',
      'A total can rise while one case regresses. Check each case, not only the total.',
      'The version name links a result to the code and settings that made it, so a regression can be traced.',
    ],
    example: [
      { label: 'Baseline v1.3', value: '2 of 3 pass' },
      { label: 'New run v1.4', value: '2 of 3 pass' },
      { label: 'Regression', value: 'refund-1' },
      { label: 'Fixed', value: 'ship-1' },
    ],
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
      title: 'Define the buckets',
      detail: 'Use three buckets: critical, major, and minor. Critical means a wrong fact a reader would act on, such as "refund in 2 days".',
    },
    {
      title: 'Assign each failure',
      detail: 'A wrong refund time, such as "2 days", is critical. A reply with no source is major. Awkward wording with the right fact is minor.',
    },
    {
      title: 'Add control cases',
      detail: 'A control case asks about something the documents do not cover, such as "Do you sell gift cards for kids?" The right reply says the answer is not in the documents.',
    },
    {
      title: 'Score the controls',
      detail: 'A control case passes only when the assistant refuses or escalates. An invented answer, such as "Gift cards cost 25 dollars.", is a critical failure.',
    },
    {
      title: 'Set a release rule',
      detail: 'A change ships only when it has zero critical failures and all 2 control cases pass. One critical failure blocks the release.',
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
  hood: {
    paragraphs: [
      'A bucket is a rule, so write the definitions before the run. Otherwise the labels drift toward the result you hoped for.',
      'Control cases test refusal. A plain score does not reward refusal by default, so the control cases must be counted on purpose.',
      'Keep control cases in the same set as the other cases, so every run checks both kinds of behavior.',
    ],
    example: [
      { label: 'Control question', value: 'gift cards, not in the documents' },
      { label: 'Right reply', value: '"The answer is not in the documents."' },
      { label: 'Wrong reply', value: 'an invented price' },
      { label: 'Release rule', value: 'zero critical failures and every control passes' },
    ],
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
