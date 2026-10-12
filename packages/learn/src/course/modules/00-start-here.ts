import type { Lesson, Module } from '../types';

const whatYouWillBuild: Lesson = {
  slug: 'what-you-will-build',
  number: '0.1',
  title: 'What you will build',
  oneLiner: 'You will build an assistant that answers questions from documents and names the source of each answer.',
  problem: {
    without: 'A person searches a long manual by hand. Finding one answer can take many minutes.',
    with: 'The assistant finds the right passage, writes an answer, and names the source. The reader checks the source in seconds.',
  },
  steps: [
    {
      title: 'The five parts of the assistant',
      detail: 'Five parts work together: the documents, the chunks, the find part, the model, and the answer with its sources. The sample program in this lesson does not call a model. It shows only the shape of the find part.',
      visual: {
        kind: 'flow',
        caption: 'The five parts, left to right. Each answer comes from the documents, not from memory alone.',
        nodes: ['Documents', 'Chunks', 'Find', 'Model', 'Answer with sources'],
      },
    },
    {
      title: 'Chunks: small parts of a document',
      detail: 'A 2,000-word manual becomes 10 chunks of about 200 words each. Each chunk is stored on its own, so the find part can return only the relevant part. The sample program uses three short FAQ entries instead.',
      visual: {
        kind: 'chips',
        caption: 'One 2,000-word manual, cut into 10 chunks of about 200 words each.',
        items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({ text: `Chunk ${n}`, note: '200 words' })),
      },
    },
    {
      title: 'Keyword count scores each FAQ entry',
      detail: 'The find part splits the question and each FAQ question into lowercase words. It counts the shared words, and that count is the score. "My password does not work" shares "my" and "password" with the reset entry. That entry scores 2, so its answer is returned. Later lessons replace this word count with a better measure of meaning.',
      visual: {
        kind: 'chips',
        caption: 'The three FAQ entries from the sample program, ranked for "My password does not work".',
        items: [
          { text: 'How do I reset my password', note: 'score 2, best match', highlight: true },
          { text: 'When will my order ship', note: 'score 1' },
          { text: 'How do I get a refund', note: 'score 0' },
        ],
      },
      snippet: {
        source: `// The question and one FAQ question, split into words.
const asked = new Set("my password does not work".split(" "));
const faq = "how do i reset my password".split(" ");
const shared = faq.filter((w) => asked.has(w));
console.log("Shared ->", shared.join(", "));
console.log("Score ->", shared.length);
`,
        output: `Shared -> my, password
Score -> 2`,
      },
    },
    {
      title: 'The model writes from the matching chunks',
      detail: 'The model gets the question and the matching chunks. It is told to answer only from those chunks and to name the source of each statement. Without the source, a reader cannot check the answer.',
      visual: {
        kind: 'compare',
        caption: 'The same answer, with and without a named source.',
        left: { title: 'Answer alone', items: ['Refunds take 5 to 7 days.'] },
        right: { title: 'Answer with source', items: ['Refunds take 5 to 7 days.', 'Source: refund guide, section 2'] },
      },
    },
    {
      title: 'Checks with a fixed list of questions',
      detail: 'Run the assistant on the same 20 questions after each change. The count of correct answers is the score. Fewer correct answers than before means the change made things worse.',
      visual: {
        kind: 'bars',
        caption: 'Correct answers out of 20 fixed questions, after each of three changes.',
        unit: 'of 20',
        rows: [
          { label: 'First version', value: 13 },
          { label: 'Smaller chunks', value: 16 },
          { label: 'Clearer source rule', value: 19, highlight: true },
        ],
      },
    },
    {
      title: 'A log of real use',
      detail: 'Each request is logged with its question, its sources, and its cost. A request with no source, like the gift card question, shows a gap in the documents.',
      visual: {
        kind: 'table',
        caption: 'Three logged requests. The highlighted one found no source, so the documents do not cover it.',
        columns: ['Time', 'Question', 'Sources', 'Cost'],
        rows: [
          ['09:14', 'Can I get a refund?', '1', '$0.002'],
          ['09:20', 'Gift cards for kids', '0', '$0.002'],
          ['09:25', 'How do I reset my password?', '1', '$0.002'],
        ],
        highlightRow: 1,
      },
    },
  ],
  code: {
    source: `// A help-center FAQ. Each entry is a question and its answer.
const faq: [string, string][] = [
  ["How do I get a refund", "Refunds take 5 to 7 days."],
  ["How do I reset my password", "Use Forgot password on sign-in."],
  ["When will my order ship", "Orders ship in 2 business days."],
];

// Split a text into lowercase words, with punctuation removed.
function toWords(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z ]/g, "").split(" ");
}

// Return the answer to the question that shares the most words.
function findAnswer(question: string): string {
  const askedWords = new Set(toWords(question));
  let best = { answer: "No answer found", score: 0 };
  for (const [faqQuestion, answer] of faq) {
    const words = toWords(faqQuestion);
    const score = words.filter((w) => askedWords.has(w)).length;
    if (score > best.score) best = { answer, score };
  }
  return best.answer;
}

// Ask three questions and print each answer.
console.log(findAnswer("Can I get a refund?"));
console.log(findAnswer("My password does not work"));
console.log(findAnswer("Gift cards for kids"));
`,
    output: `Refunds take 5 to 7 days.
Use Forgot password on sign-in.
No answer found`,
  },
  mistakes: [
    'Expecting word counting to understand meaning. It only counts shared words.',
    'Skipping the check step. Without tests, a change can make answers worse and nobody notices.',
    'Showing an answer without its source. A reader cannot verify an answer that has no source.',
  ],
  useWhen: [
    'You want answers from your own documents, with sources.',
    'You need to explain how a document assistant is built.',
  ],
  skipWhen: [
    'You only need a fixed list of answers. A plain list is simpler.',
    'You need one exact record, such as an order status. Use a direct lookup.',
  ],
  words: [
    { term: 'Chunk', meaning: 'A small part of a document, stored on its own.' },
    { term: 'Model', meaning: 'A program that reads text and writes text back.' },
    { term: 'Tool', meaning: 'A function the assistant can call, such as a record lookup.' },
    { term: 'Eval', meaning: 'A test that checks answers against a fixed list of questions.' },
  ],
};

const howToReadALesson: Lesson = {
  slug: 'how-to-read-a-lesson',
  number: '0.2',
  title: 'How to read a lesson',
  oneLiner: 'Every lesson has the same sections in the same order, so you always know where to look.',
  problem: {
    without: 'When each lesson has its own layout, the reader must hunt for the code, the words, and the examples.',
    with: 'The same layout every time. Read the summary, then the steps, then only the details you need.',
  },
  steps: [
    {
      title: 'The order of the sections',
      detail: 'The one-line summary sits under the title, followed by six sections in the same order in every lesson. The layout is fixed on purpose, so a reader can go to any section in one move.',
      visual: {
        kind: 'flow',
        caption: 'The order of a lesson, from the summary to the words to know.',
        nodes: ['Summary', 'The problem', 'How it works', 'Code', 'Common mistakes', 'Use and skip', 'Words to know'],
      },
      snippet: {
        source: `const sections = [
  "The problem", "How it works", "The code and its output",
  "Common mistakes", "Use it when and skip it when",
  "Words to know",
];
console.log("Sections ->", sections.length);
`,
        output: 'Sections -> 6',
      },
    },
    {
      title: 'Example values you can check by hand',
      detail: 'Each block of a lesson gives an example value that you can check by hand. This table scores three FAQ entries for "My password does not work", the same example as lesson 0.1. The password entry scores highest.',
      visual: {
        kind: 'table',
        caption: 'Shared words and scores for the FAQ entries in lesson 0.1. The password entry scores highest.',
        columns: ['FAQ question', 'Shared words', 'Score'],
        rows: [
          ['How do I get a refund', 'none', '0'],
          ['How do I reset my password', 'my, password', '2'],
          ['When will my order ship', 'my', '1'],
        ],
        highlightRow: 1,
      },
    },
    {
      title: 'The code and its output',
      detail: 'The code section holds two things. The code is a program you can copy and run. The output is the exact text the program prints, so compare your run with it to check your copy.',
      visual: {
        kind: 'compare',
        caption: 'What each part of the code section is for.',
        left: { title: 'Code', items: ['A program you can copy and run', 'Comments above each block explain it'] },
        right: { title: 'Output', items: ['The exact text the program prints', 'Compare your run with it to check your copy'] },
      },
      snippet: {
        source: `const score = 2;
console.log("Score ->", score);
`,
        output: 'Score -> 2',
      },
    },
    {
      title: 'The lists at the end',
      detail: 'The common mistakes come before the use and skip lists. In lesson 0.1, the skip list says to use a direct lookup for one exact record.',
    },
  ],
  code: {
    source: `// The sections after the one-line summary, in reading order.
const sections = [
  "The problem",
  "How it works",
  "The code and its output",
  "Common mistakes",
  "Use it when and skip it when",
  "Words to know",
];

// Print each section with its number, starting at 1.
sections.forEach((name, index) => {
  console.log(index + 1 + ". " + name);
});

// Count the sections and print the total.
console.log("Sections: " + sections.length);
`,
    output: `1. The problem
2. How it works
3. The code and its output
4. Common mistakes
5. Use it when and skip it when
6. Words to know
Sections: 6`,
  },
  mistakes: [
    'Skipping the Output block. Compare your run with it, so you know the code works.',
    'Copying the code without reading its comments. The comments explain each block.',
    'Opening the code first. Read the summary and the steps before the details.',
  ],
  useWhen: [
    'You are new to AI systems and want a clear path through the course.',
    'You want to find one section quickly in any lesson.',
  ],
  skipWhen: [
    'You already know the topic and want only the code. Open the code section directly.',
  ],
  words: [
    { term: 'Module', meaning: 'A group of lessons on one topic.' },
    { term: 'Lesson', meaning: 'One page with a fixed layout.' },
    { term: 'Snippet', meaning: 'A short piece of code that stands on its own.' },
    { term: 'Output', meaning: 'The exact text a program prints when it runs.' },
  ],
};

export const startHere: Module = {
  slug: 'start-here',
  number: 0,
  title: 'Start here',
  summary: 'What the course builds, and how each lesson is laid out.',
  lessons: [whatYouWillBuild, howToReadALesson],
};
