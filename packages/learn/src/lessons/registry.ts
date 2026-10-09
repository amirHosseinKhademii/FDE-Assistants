/**
 * Every lesson page, keyed by slug. The app's route files look their page up
 * here, so a route and a page can only disagree by a missing key, which the
 * `Record` type refuses at compile time.
 */
import type { JSX } from 'react';
import type { LessonSlug } from '../data/lessons';
import { Agentic } from './Agentic';
import { AnswerKey } from './AnswerKey';
import { Architecture } from './Architecture';
import { Attention } from './Attention';
import { Caching } from './Caching';
import { Ceiling } from './Ceiling';
import { Context } from './Context';
import { Corrective } from './Corrective';
import { Cost } from './Cost';
import { Credentials } from './Credentials';
import { Drift } from './Drift';
import { Evals } from './Evals';
import { Finetuning } from './Finetuning';
import { Forensics } from './Forensics';
import { Generation } from './Generation';
import { Graph } from './Graph';
import { Guessing } from './Guessing';
import { Hybrid } from './Hybrid';
import { Injection } from './Injection';
import { Loop } from './Loop';
import { Multimodal } from './Multimodal';
import { Orchestration } from './Orchestration';
import { Pipelines } from './Pipelines';
import { Regressions } from './Regressions';
import { Residency } from './Residency';
import { Retrieval } from './Retrieval';
import { Tools } from './Tools';
import { Vectors } from './Vectors';

export const LESSON_PAGES: Record<LessonSlug | 'architecture', () => JSX.Element> = {
  'agentic': Agentic,
  'answer-key': AnswerKey,
  'architecture': Architecture,
  'attention': Attention,
  'caching': Caching,
  'ceiling': Ceiling,
  'context': Context,
  'corrective': Corrective,
  'cost': Cost,
  'credentials': Credentials,
  'drift': Drift,
  'evals': Evals,
  'finetuning': Finetuning,
  'forensics': Forensics,
  'generation': Generation,
  'graph': Graph,
  'guessing': Guessing,
  'hybrid': Hybrid,
  'injection': Injection,
  'loop': Loop,
  'multimodal': Multimodal,
  'orchestration': Orchestration,
  'pipelines': Pipelines,
  'regressions': Regressions,
  'residency': Residency,
  'retrieval': Retrieval,
  'tools': Tools,
  'vectors': Vectors,
};
