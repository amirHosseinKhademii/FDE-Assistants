/**
 * @veresk/learn: the lessons, the lesson kit and the figures that `/learn` is
 * drawn with.
 *
 * TWO LAYERS, and the split is the point. The SHELL (`LessonPage`, `LessonNav`)
 * takes its facts as props and knows no lesson. The BOUND pieces (`LessonFrame`,
 * `LessonRail`) read the lesson records in `data/lessons.ts` and hand the shell
 * finished values. A host that wants a different set of lessons uses the shell
 * with its own records; a host that wants these lessons mounts `LESSON_PAGES`.
 *
 * THE MOUNT POINT is set by `LearnProvider` (default `/learn`). Lessons link to
 * each other through it, so the section can sit under any prefix.
 *
 * IT USES TAILWIND UTILITIES, so a consumer must name it as a source and import
 * its stylesheet. See `styles.css` for the lines and the variables it reads.
 */

// The mount point.
export { LearnProvider, useLearnBase } from './context';

// The shell and its rail. Both take their data as props.
export { LessonPage, type LessonFacts, type NeighbourLink } from './components/LessonPage';
export { LessonNav, type LessonNavProps, type RailLesson, type RailTrack } from './components/LessonNav';

// The bound pieces: a lesson by slug, and the rail drawn from the records.
export { LessonFrame } from './components/LessonFrame';
export { LessonRail } from './components/LessonRail';
export { LessonLink } from './components/LessonLink';

// The pieces every lesson body is written from.
export { HowItWorks, type Walkthrough } from './components/HowItWorks';
export {
  Caveat,
  Code,
  Data,
  Figure,
  Glossary,
  Key,
  P,
  RunIt,
  SaidOutLoud,
  Step,
  Term,
  type Cost,
} from './components/kit';

// The figures. Hand-rolled SVG, each taking its rows as data.
export { BarRows, type BarRow } from './charts/BarRows';
export { Funnel } from './charts/Funnel';
export { Matrix, CAPABILITY, EITHER_OR, type Mark, type RowExplain, type State } from './charts/Matrix';
export { Path, type PathEdge, type PathNode } from './charts/Path';
export { RunGrid } from './charts/RunGrid';
export { Slope } from './charts/Slope';
export { Stack } from './charts/Stack';
export { Stages } from './charts/Stages';
export { Trifecta, type TrifectaSet } from './charts/Trifecta';
export { VectorLab } from './charts/VectorLab';

// The lessons: their records, and every page by slug.
export {
  TRACKS,
  LESSONS,
  MAP,
  TOTALS,
  hueOf,
  lessonBySlug,
  lessonsIn,
  neighbours,
  type Lesson,
  type LessonSlug,
  type Track,
  type TrackId,
} from './data/lessons';
export { GENERATED_AT, PACKAGES, type ArchPackage } from './data/architecture.generated';
export { LESSON_PAGES } from './lessons/registry';
export { LearnIndex } from './lessons/LearnIndex';
