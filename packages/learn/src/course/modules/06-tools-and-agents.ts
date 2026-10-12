import type { Module } from '../types';
import { draftLesson } from '../draft';

export const toolsAndAgents: Module = {
  slug: 'tools-and-agents',
  number: 6,
  title: 'Tools and agents',
  summary: 'How a model calls functions in a loop, and how to organize many of them.',
  lessons: [
    draftLesson('what-a-tool-is', '6.1', 'What a tool is'),
    draftLesson('tool-calling-loop', '6.2', 'The tool-calling loop'),
    draftLesson('lookup-vs-search-tools', '6.3', 'Lookup tools and search tools'),
    draftLesson('wrapping-a-messy-api', '6.4', 'Wrapping a messy API'),
    draftLesson('routing-questions', '6.5', 'Routing questions'),
    draftLesson('frameworks-vs-hand-written-loops', '6.6', 'Frameworks or a hand-written loop'),
    draftLesson('many-agents-and-fan-out', '6.7', 'Many agents and fan-out'),
  ],
};
