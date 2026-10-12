import type { Module } from '../types';
import { draftLesson } from '../draft';

export const safety: Module = {
  slug: 'safety',
  number: 8,
  title: 'Safety',
  summary: 'How to keep untrusted text and risky actions from doing harm.',
  lessons: [
    draftLesson('prompt-injection', '8.1', 'Prompt injection'),
    draftLesson('guardrails-and-confirm-before-write', '8.2', 'Guardrails and confirm before write', 'Guardrails, confirm writes'),
    draftLesson('credentials', '8.3', 'Credentials'),
    draftLesson('what-data-leaves-your-servers', '8.4', 'What data leaves your servers', 'What data leaves'),
  ],
};
