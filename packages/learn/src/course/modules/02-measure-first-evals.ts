import type { Module } from '../types';
import { draftLesson } from '../draft';

export const measureFirst: Module = {
  slug: 'measure-first-evals',
  number: 2,
  title: 'Measure first: evals',
  summary: 'How to test an assistant against fixed questions, so changes can be judged.',
  lessons: [
    draftLesson('golden-set', '2.1', 'The golden set'),
    draftLesson('retrieval-metrics', '2.2', 'Retrieval metrics'),
    draftLesson('checking-answers', '2.3', 'Checking answers and LLM-as-judge', 'Checking answers, judges'),
    draftLesson('repeat-runs', '2.4', 'Repeat runs and flaky results', 'Repeat runs'),
    draftLesson('baselines-and-diffs', '2.5', 'Baselines, diffs, and regressions', 'Baselines and diffs'),
    draftLesson('severity-and-control-cases', '2.6', 'Severity buckets and control cases', 'Severity and controls'),
  ],
};
