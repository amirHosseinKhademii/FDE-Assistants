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
    'Prepare the documents. Split each one into small parts, called chunks, and store them.',
    'Find the chunks that match a question.',
    'Answer. Give the model the question and the matching chunks, and ask for an answer with sources.',
    'Check. Run the assistant on a fixed set of questions, so you can see when a change makes answers worse.',
    'Run it for real. Log each request, track its cost, and watch answer quality over time.',
  ],
  diagram: ['Documents', 'Chunks', 'Find', 'Model', 'Answer with sources'],
  code: {
    source: `// A small help-center FAQ. Each entry has a question and an answer.
const faq = [
  // The first entry is about refunds.
  { question: "How do I get a refund", answer: "Refunds take 5 to 7 days after the item arrives back." },
  // The second entry is about passwords.
  { question: "How do I reset my password", answer: "Choose Forgot password on the sign-in page." },
  // The third entry is about shipping.
  { question: "When will my order ship", answer: "Orders ship within 2 business days." },
]; // End of the FAQ list.
// Split a text into lowercase words. Punctuation is removed.
function words(text: string): string[] {
  // Keep only letters and spaces, then split on the spaces.
  return text.toLowerCase().replace(/[^a-z ]/g, "").split(" ");
} // End of words.
// Count how many words two texts have in common.
function overlap(a: string, b: string): number {
  // Put the words of the first text in a set for fast checks.
  const set = new Set(words(a));
  // Count the words of the second text that are in the set.
  return words(b).filter((w) => set.has(w)).length;
} // End of overlap.
// Find the FAQ answer with the most words in common with the question.
function answer(question: string): string | undefined {
  // Score every FAQ entry against the question.
  const scored = faq.map((entry) => ({ entry, score: overlap(question, entry.question) }));
  // Sort the scores from highest to lowest.
  scored.sort((x, y) => y.score - x.score);
  // Take the best match.
  const best = scored[0];
  // Return nothing when no word matched.
  if (best.score === 0) return undefined;
  // Return the answer of the best match.
  return best.entry.answer;
} // End of answer.
// Ask a question about refunds.
console.log(answer("How do I get my money back as a refund?") ?? "No answer found");
// Ask a question about passwords.
console.log(answer("My password does not work") ?? "No answer found");
// Ask a question that no entry covers.
console.log(answer("Gift cards for kids") ?? "No answer found");
`,
    output: `Refunds take 5 to 7 days after the item arrives back.
Choose Forgot password on the sign-in page.
No answer found`,
  },
  hood: {
    paragraphs: [
      'The sample program does not call a model. It shows the shape of the find step only.',
      'Each question is compared with each FAQ question. The entry with the most shared words wins.',
      'Later modules replace this word counting with a better way to measure meaning.',
    ],
    example: [
      { label: 'Question', value: '"My password does not work"' },
      { label: 'Shared words with the password entry', value: '"my", "password"' },
      { label: 'Score for the password entry', value: '2' },
      { label: 'Answer returned', value: '"Choose Forgot password on the sign-in page."' },
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
  check: [
    { q: 'What does the assistant return with each answer?', a: 'The answer and the source it came from.' },
    { q: 'Why is word counting only a starting point?', a: 'It misses questions that use different words for the same idea.' },
    { q: 'Which step shows whether a change made answers worse?', a: 'The check step, run against a fixed set of questions.' },
  ],
};

const howToReadALesson: Lesson = {
  slug: 'how-to-read-a-lesson',
  number: '0.2',
  title: 'How to read a lesson',
  oneLiner: 'Every lesson has the same ten sections in the same order, so you always know where to look.',
  problem: {
    without: 'When each lesson has its own layout, the reader must hunt for the code, the words, and the examples.',
    with: 'The same layout every time. Read the summary, then the code, then only the details you need.',
  },
  steps: [
    'Read the one-line summary first. It says what the lesson is about.',
    'Read the problem. The first box shows the situation without the idea. The second box shows it with the idea.',
    'Read how it works. The numbered steps give the order of the work.',
    'Read the code. Run it if you want, and compare its output with the block labeled What it prints.',
    'Open Under the hood only when you want the real data shapes.',
    'Finish with the mistakes, the use and skip lists, the words, and the check questions.',
  ],
  code: {
    source: `// The ten sections of a lesson, in the order a reader meets them.
const sections = [
  // Section 1 says what the lesson is in one sentence.
  "In one sentence",
  // Section 2 shows the problem with and without the idea.
  "The problem",
  // Section 3 lists the steps of the work.
  "How it works",
  // Section 4 holds the code and its printed output.
  "The code",
  // Section 5 holds the real data shapes, hidden until opened.
  "Under the hood",
  // Section 6 lists the common mistakes.
  "Common mistakes",
  // Section 7 says when to use the idea and when to skip it.
  "Use it when and skip it when",
  // Section 8 defines the words used in the lesson.
  "Words to know",
  // Section 9 holds questions with answers hidden until clicked.
  "Check yourself",
  // Section 10 links to the previous and next lessons.
  "Previous and next lessons",
]; // End of the list of sections.
// Print each section with its number.
sections.forEach((name, i) => console.log(\`\${i + 1}. \${name}\`));
// Print how many sections a lesson has.
console.log(\`Sections: \${sections.length}\`);
`,
    output: `1. In one sentence
2. The problem
3. How it works
4. The code
5. Under the hood
6. Common mistakes
7. Use it when and skip it when
8. Words to know
9. Check yourself
10. Previous and next lessons
Sections: 10`,
  },
  hood: {
    paragraphs: [
      'The layout is fixed on purpose. A reader who knows where a section is can skip to it in one move.',
      'The code section has two parts. The code is the program. The printed output is what the program shows when it runs.',
    ],
    example: [
      { label: 'Section 4 holds', value: 'the code and What it prints' },
      { label: 'Section 5 holds', value: 'the real data shapes, hidden until opened' },
    ],
  },
  mistakes: [
    'Skipping the What it prints block. Compare your run with it, so you know the code works.',
    'Copying the code without reading its comments. The comments explain each line.',
    'Opening Under the hood first. Read the summary and the steps before the details.',
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
  check: [
    { q: 'Where does the one-line summary appear?', a: 'At the top of every lesson, under the title.' },
    { q: 'Can you skip Under the hood?', a: 'Yes. The rest of the lesson stands without it.' },
    { q: 'What does the What it prints block show?', a: 'The exact output of the code, so you can compare your run with it.' },
  ],
};

export const startHere: Module = {
  slug: 'start-here',
  number: 0,
  title: 'Start here',
  summary: 'What the course builds, and how each lesson is laid out.',
  lessons: [whatYouWillBuild, howToReadALesson],
};
