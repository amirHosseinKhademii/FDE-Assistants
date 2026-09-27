/**
 * The words `/steps` uses, in plain English.
 *
 * ── WHO THIS IS FOR ────────────────────────────────────────────────────────
 *
 * Somebody who arrived from a link about search, agents or evals and has not
 * read `docs/safety/`. Every step lists the terms it leans on, and each one
 * links down to its entry here, so nobody has to leave the page to find out
 * what "recall@6" means.
 *
 * ── THE RULE FOR AN ENTRY ──────────────────────────────────────────────────
 *
 * Say what it IS first, in one sentence with no other jargon in it, then what
 * it is HERE — on this corpus, for this customer. A definition that only works
 * if you already know two other terms is not a definition. (The same rule as
 * Thornbury's glossary, `apps/web/commerce-app/src/lib/glossary.ts`.)
 *
 * Sources: `docs/safety/PLAN.md`, `INGESTION.md`, `STAGE4.md`–`STAGE7.md`.
 */

export interface Term {
  /** The word as it appears on the page. */
  word: string;
  /** What it is, in general. */
  is: string;
  /** What it is on this corpus. Optional — some terms need no local gloss. */
  here?: string;
}

export const GLOSSARY = {
  nhtsa: {
    word: 'NHTSA',
    is: 'The US National Highway Traffic Safety Administration — the government body that collects vehicle safety complaints and oversees recalls.',
    here: 'It publishes every complaint, recall and investigation as free, public-domain files. That is the whole corpus.',
  },
  odi: {
    word: 'ODI number',
    is: 'The identifier NHTSA gives each complaint a member of the public files. Anybody can look one up on nhtsa.gov.',
    here: 'ODI 11353867 — a 2020 Ford F-150 whose gear display disagreed with its gearbox — is the complaint this page follows through every step.',
  },
  campaign: {
    word: 'recall campaign',
    is: 'A manufacturer’s formal admission that a defect exists, with a remedy. Each has a number like 20V197000.',
    here: 'The thing an analyst most wants to know about: is there one for this problem, and is its fix holding?',
  },
  corpus: {
    word: 'corpus',
    is: 'The whole collection of documents a system can search.',
    here: 'Model years 2019 and 2020: about seventy thousand complaints, three thousand recalls and a hundred investigations.',
  },
  answerKey: {
    word: 'answer key',
    is: 'A set of test questions whose right answers were worked out by a person, before any code, so the system can be graded against something it did not write.',
    here: 'Eight questions, answered by reading the raw files by hand — docs/safety/WALKTHROUGH.md.',
  },
  rag: {
    word: 'RAG',
    is: 'Retrieval-augmented generation: search your own documents first, then give the best passages to the model so it answers from them rather than from memory.',
  },
  parse: {
    word: 'parsing',
    is: 'Reading a raw file and deciding what each piece of it means — which part is a record, which part is text, which part is a label.',
    here: 'NHTSA’s files have no header row, so a column means something only because of its position.',
  },
  chunk: {
    word: 'chunking',
    is: 'Cutting long documents into passages, because search returns pieces rather than whole files.',
    here: 'Almost nothing is cut: a complaint is one person’s account of one incident, and splitting it separates the symptom from the circumstance.',
  },
  embedding: {
    word: 'embedding',
    is: 'A list of numbers that stands for the meaning of a piece of text, so that passages about the same thing end up close together.',
    here: '384 numbers per passage, from a small model (bge-small) that runs on our own machine — so no complaint is sent anywhere to be embedded.',
  },
  cosine: {
    word: 'cosine similarity',
    is: 'How close two embeddings point, from −1 (opposite) to 1 (the same meaning).',
  },
  pgvector: {
    word: 'pgvector',
    is: 'An add-on that lets the Postgres database store embeddings and find the nearest ones quickly.',
  },
  keyword: {
    word: 'keyword search',
    is: 'Search that matches the actual words, the way a search box in a document does. Postgres calls its version full-text search.',
    here: 'The arm that finds a campaign number or a fault code, which meaning-based search is worst at.',
  },
  hybrid: {
    word: 'hybrid search',
    is: 'Running a meaning search and a keyword search side by side and combining what they find.',
  },
  rrf: {
    word: 'reciprocal rank fusion',
    is: 'A way to merge two ranked lists that use different scores: throw the scores away and add up 1 / (60 + position) from each list.',
  },
  reranker: {
    word: 'reranker',
    is: 'A slower, sharper model that reads the question and each candidate passage together and re-orders them. It can only reorder what it is handed — it cannot find anything new.',
  },
  recallAtK: {
    word: 'recall@6',
    is: 'Of the documents we already know are the right answer, how many came back in the top six results.',
    here: 'Counted over documents, not passages, so one investigation cut in two cannot take two of the six slots.',
  },
  filter: {
    word: 'filter',
    is: 'A condition on a structured field — make, model, year, number of deaths — that narrows the results exactly, rather than matching words.',
    here: 'The finding of stage 3.7: “2020 F-150” is a filter wearing the clothes of a question.',
  },
  agent: {
    word: 'agent',
    is: 'A language model that can ask for things to be done — “count the complaints for this vehicle” — instead of only writing text. Your code does the thing and hands the result back.',
  },
  loop: {
    word: 'the loop',
    is: 'The back-and-forth between the model and your code: the model asks for a tool, your code runs it, the result goes back, and it repeats until the model answers.',
    here: 'The model decides what it needs; our code decides what it gets. The model never touches the database.',
  },
  tool: {
    word: 'tool',
    is: 'A function the model is allowed to ask for, described by a name, a sentence and the inputs it takes.',
    here: 'Five of them: get_recall, find_recalls, search_complaints, count_complaints and complaints_citing.',
  },
  ceiling: {
    word: 'ceiling',
    is: 'The best score possible with a perfect decision-maker — here, with a person choosing which tool to call rather than the model.',
    here: 'Stage 4’s 1.00 is a ceiling, not a score. The model reaches less, and stage 6 measures how much less.',
  },
  contract: {
    word: 'answer contract',
    is: 'A written-down shape an answer must have — which fields, what goes in each — that code can check automatically before anybody reads it.',
    here: 'Every answer must cite its sources, declare every number it states, and escalate rather than pick a side when two records disagree.',
  },
  schema: {
    word: 'schema',
    is: 'A description of the shape data must have, which a program can check automatically.',
  },
  coherence: {
    word: 'coherence rule',
    is: 'A check that an answer which has the right shape also makes sense — for example, that a number it states actually came from a tool.',
  },
  control: {
    word: 'control case',
    is: 'A test fed an input whose right verdict is already known — a good one that must pass, or a bad one that must fail. It catches a check that rejects everything, or one that accepts everything.',
  },
  escalation: {
    word: 'escalation',
    is: 'Handing a question to a person instead of answering it — because the records disagree, or because the answer is not in them.',
    here: 'An answer that finds two records in conflict must escalate rather than quietly pick one; a clean fact must not.',
  },
  fixture: {
    word: 'fixture',
    is: 'A saved, hand-written input used by a test, so the test does not depend on anything live.',
    here: 'Hand-written good and bad answers, fed to the contract before any model had written one.',
  },
  provenance: {
    word: 'provenance',
    is: 'Where a piece of information came from — which tool call, which document.',
    here: 'Every number in an answer has to say which tool result it came from. The tools write their own captions, because a model asked to restate a filter paraphrases it — and a paraphrase can make 6 read like 351.',
  },
  hostedModel: {
    word: 'hosted model',
    is: 'A language model run by another company, reached over the internet. What you send it leaves your control.',
    here: 'Google’s Gemini. The question, the tool menu and what the tools return are sent to it; the database never is.',
  },
  judge: {
    word: 'judge',
    is: 'A second model asked to grade an answer against a written rubric, for the properties no mechanical check can decide — “does it say what it could not establish?”',
    here: 'Before its verdicts count, each rubric must reject an answer written to fail and accept one written to pass. Its results are shown beside the mechanical ones and never added to them.',
  },
  eval: {
    word: 'eval',
    is: 'An automated test of an AI system’s answers against questions whose right answers are already known.',
  },
  baseline: {
    word: 'baseline',
    is: 'A full eval run saved to disk with its settings, so a later run can be compared against it — or refused, if the settings differ.',
  },
  flaky: {
    word: 'flaky',
    is: 'A check that passes on some runs and fails on others, for the same question. Asked three times, a model does not always answer the same way.',
  },
  fde: {
    word: 'forward-deployed engineer (FDE)',
    is: 'An engineer placed with one customer to turn their specific, messy problem into something they can trust — fast, and with proof that it works.',
    here: 'The fictional firm here, Veresk, sends one to Calder Safety.',
  },
} satisfies Record<string, Term>;

export type TermKey = keyof typeof GLOSSARY;

/** The order the glossary is printed in: roughly the order a reader meets them. */
export const GLOSSARY_ORDER: TermKey[] = [
  'fde', 'nhtsa', 'odi', 'campaign', 'corpus', 'answerKey', 'rag', 'parse', 'chunk',
  'embedding', 'cosine', 'pgvector', 'keyword', 'hybrid', 'rrf', 'reranker', 'recallAtK',
  'filter', 'agent', 'loop', 'tool', 'ceiling', 'contract', 'schema', 'coherence', 'control',
  'fixture', 'escalation', 'provenance', 'hostedModel', 'eval', 'baseline', 'flaky', 'judge',
];

export const termId = (key: TermKey) => `term-${key}`;
