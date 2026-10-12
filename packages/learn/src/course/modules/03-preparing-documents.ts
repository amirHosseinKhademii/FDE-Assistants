import type { Module } from '../types';
import { draftLesson } from '../draft';

export const preparingDocuments: Module = {
  slug: 'preparing-documents',
  number: 3,
  title: 'Preparing documents',
  summary: 'How raw files become small, clean, searchable parts.',
  lessons: [
    draftLesson('format-detection', '3.1', 'Format detection'),
    draftLesson('deduplication', '3.2', 'Deduplication'),
    draftLesson('pii-scrubbing', '3.3', 'PII scrubbing'),
    draftLesson('chunking', '3.4', 'Chunking'),
    draftLesson('metadata', '3.5', 'Metadata'),
    draftLesson('embed-and-store', '3.6', 'Embed and store'),
  ],
};
