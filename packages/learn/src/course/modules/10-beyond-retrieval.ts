import type { Module } from '../types';
import { draftLesson } from '../draft';

export const beyondRetrieval: Module = {
  slug: 'beyond-retrieval',
  number: 10,
  title: 'Beyond retrieval',
  summary: 'When to change the model itself, and how to choose between the options.',
  lessons: [
    draftLesson('context-retrieval-or-fine-tuning', '10.1', 'Context, retrieval, or fine-tuning', 'Context or fine-tuning'),
    draftLesson('fine-tuning', '10.2', 'Fine-tuning'),
    draftLesson('switching-providers', '10.3', 'Switching model providers'),
  ],
};
