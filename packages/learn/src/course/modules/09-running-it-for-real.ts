import type { Module } from '../types';
import { draftLesson } from '../draft';

export const runningItForReal: Module = {
  slug: 'running-it-for-real',
  number: 9,
  title: 'Running it for real',
  summary: 'What changes when real users arrive: streaming, logs, cost, caching, drift, and debugging.',
  lessons: [
    draftLesson('streaming-with-citations', '9.1', 'Streaming answers with citations', 'Streaming with citations'),
    draftLesson('tracing-and-logs', '9.2', 'Tracing and logs'),
    draftLesson('tracking-cost', '9.3', 'Tracking cost'),
    draftLesson('caching', '9.4', 'Caching'),
    draftLesson('drift', '9.5', 'Drift'),
    draftLesson('debugging-a-bad-answer', '9.6', 'Debugging a bad answer'),
  ],
};
