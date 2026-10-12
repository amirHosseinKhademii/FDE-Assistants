import type { Module } from '../types';
import { draftLesson } from '../draft';

export const retrieval: Module = {
  slug: 'retrieval',
  number: 4,
  title: 'Retrieval',
  summary: 'How the assistant finds the passages that answer a question.',
  lessons: [
    draftLesson('vector-search', '4.1', 'Vector search'),
    draftLesson('metadata-filters', '4.2', 'Metadata filters'),
    draftLesson('keyword-search', '4.3', 'Keyword search'),
    draftLesson('hybrid-search', '4.4', 'Hybrid search and RRF'),
    draftLesson('reranking', '4.5', 'Reranking'),
    draftLesson('query-rewriting', '4.6', 'Query rewriting'),
    draftLesson('parent-child-and-compression', '4.7', 'Parent-child and compression', 'Parent-child, compression'),
    draftLesson('corrective-retrieval', '4.8', 'Corrective retrieval'),
    draftLesson('text-to-sql', '4.9', 'Text to SQL'),
    draftLesson('graph-retrieval', '4.10', 'Graph retrieval'),
    draftLesson('multimodal-retrieval', '4.11', 'Multimodal retrieval'),
    draftLesson('what-retrieval-cannot-fix', '4.12', 'What retrieval cannot fix'),
  ],
};
