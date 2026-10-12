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
      title: 'Prepare the documents',
      detail: 'Split each document into small parts, called chunks. A 2,000-word manual can become 10 chunks of about 200 words.',
    },
    {
      title: 'Find the matching chunks',
      detail: 'Compare the question with every chunk and keep the best matches. "My password does not work" matches the password chunk.',
    },
    {
      title: 'Ask the model',
      detail: 'Send the question and the matching chunks to a model. Ask it to answer only from those chunks and to name each source.',
    },
    {
      title: 'Check the answers',
      detail: 'Run the assistant on a fixed list of questions after each change. Fewer correct answers means the change made things worse.',
    },
    {
      title: 'Watch it in use',
      detail: 'Record each request, its answer, and its cost. Real questions show problems that the fixed list did not cover.',
    },
  ],
  diagram: ['Documents', 'Chunks', 'Find', 'Model', 'Answer with sources'],
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
  hood: {
    paragraphs: [
      'The sample program does not call a model. It shows the shape of the find step only.',
      'Each question is compared with each FAQ question. The entry with the most shared words wins.',
      'Later lessons replace this word counting with a better way to measure meaning.',
    ],
    example: [
      { label: 'Question', value: '"My password does not work"' },
      { label: 'Shared words with the password entry', value: '"my", "password"' },
      { label: 'Score for the password entry', value: '2' },
      { label: 'Answer returned', value: '"Use Forgot password on sign-in."' },
    ],
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
      title: 'Read the summary',
      detail: 'The one-line summary sits under the title. In lesson 0.1 it says you will build a document assistant.',
    },
    {
      title: 'Read the problem',
      detail: 'Lesson 0.1 shows a manual search without the assistant, then with it. Compare the two boxes.',
    },
    {
      title: 'Read how it works',
      detail: 'Each step gives an example value. In lesson 1.4, the sentence "How do I get a refund?" becomes three numbers.',
    },
    {
      title: 'Open the code and under the hood',
      detail: 'Open the code to read the program. Its Output block shows what the program prints, such as "No answer found".',
    },
    {
      title: 'Finish with the lists',
      detail: 'Read the common mistakes, then the use and skip lists. In lesson 0.1, skip the assistant when you need one exact record.',
    },
  ],
  code: {
    source: `// The sections after the one-line summary, in reading order.
const sections = [
  "The problem",
  "How it works",
  "The code and under the hood",
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
3. The code and under the hood
4. Common mistakes
5. Use it when and skip it when
6. Words to know
Sections: 6`,
  },
  hood: {
    paragraphs: [
      'The layout is fixed on purpose. A reader who knows where a section is can go to it in one move.',
      'The code section holds two things. The code is the program. The Output is what the program prints when it runs.',
    ],
    example: [
      { label: 'Section 3 holds', value: 'the code, its Output, and the real data shapes' },
      { label: 'Sections 1 and 2 hold', value: 'the problem and the steps' },
    ],
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
