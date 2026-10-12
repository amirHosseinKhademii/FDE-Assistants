import type { Module } from '../types';
import { draftLesson } from '../draft';

export const writingTheAnswer: Module = {
  slug: 'writing-the-answer',
  number: 5,
  title: 'Writing the answer',
  summary: 'How retrieved passages become a checked, cited answer.',
  lessons: [
    draftLesson('building-the-context', '5.1', 'Building the context'),
    draftLesson('the-prompt', '5.2', 'The prompt'),
    draftLesson('structured-output', '5.3', 'Structured output with a schema', 'Structured output'),
    draftLesson('coherence-rules', '5.4', 'Coherence rules'),
    draftLesson('citations-refusing-escalating', '5.5', 'Citations, refusing, and escalating', 'Citations and escalation'),
    draftLesson('long-context-and-attention', '5.6', 'Long context and attention'),
  ],
};
