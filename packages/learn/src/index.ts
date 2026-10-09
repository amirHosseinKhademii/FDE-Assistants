/**
 * @veresk/learn: the lesson kit that `/learn` is drawn with.
 *
 * WHY IT IS A PACKAGE AND NOT A FOLDER OF THE APP. The lesson shell, the rail
 * and the figures are the same for every track, and the second track of lessons
 * is about to need them in a second deployment. Nothing in here knows what a
 * lesson says: the app passes the lesson's facts in as props, and the lessons
 * themselves (`lib/learn/lessons.ts`) stay with the app. So the package holds no
 * domain words and needs no route tree of its own.
 *
 * IT USES TAILWIND UTILITIES, so a consumer must name it as a source and import
 * its stylesheet. See `styles.css` for the lines and the variables it reads.
 */

// The shell and its rail. Both take their data as props.
export { LessonPage, type LessonFacts, type LessonLink } from './components/LessonPage';
export { LessonNav, type LessonNavProps, type RailLesson, type RailTrack } from './components/LessonNav';

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
