/**
 * The course, in order. One linear list: modules, then lessons. Every count is
 * derived from this list, so nothing here hard-codes a number.
 */
import type { Lesson, Module } from './types';
import { startHere } from './modules/00-start-here';
import { talkingToAModel } from './modules/01-talking-to-a-model';
import { measureFirst } from './modules/02-measure-first-evals';
import { preparingDocuments } from './modules/03-preparing-documents';
import { retrieval } from './modules/04-retrieval';
import { writingTheAnswer } from './modules/05-writing-the-answer';
import { toolsAndAgents } from './modules/06-tools-and-agents';
import { mcp } from './modules/07-mcp';
import { safety } from './modules/08-safety';
import { runningItForReal } from './modules/09-running-it-for-real';
import { beyondRetrieval } from './modules/10-beyond-retrieval';

export type { Lesson, Module } from './types';

export const COURSE: Module[] = [
  startHere,
  talkingToAModel,
  measureFirst,
  preparingDocuments,
  retrieval,
  writingTheAnswer,
  toolsAndAgents,
  mcp,
  safety,
  runningItForReal,
  beyondRetrieval,
];

/** One lesson with its module and its place in the whole course (1-based). */
export type FlatLesson = { module: Module; lesson: Lesson; position: number };

/** Every lesson in course order. */
export const allLessons: FlatLesson[] = COURSE.flatMap((module) => module.lessons).map((lesson, i) => {
  const module = COURSE.find((m) => m.lessons.includes(lesson)) as Module;
  return { module, lesson, position: i + 1 };
});

/** The lesson at a module slug and a lesson slug, or undefined when there is none. */
export function findLesson(moduleSlug: string, lessonSlug: string): FlatLesson | undefined {
  return allLessons.find((f) => f.module.slug === moduleSlug && f.lesson.slug === lessonSlug);
}

/** The lessons before and after a given lesson. Either is undefined at the ends. */
export function prevNext(moduleSlug: string, lessonSlug: string): { prev?: FlatLesson; next?: FlatLesson } {
  const index = allLessons.findIndex((f) => f.module.slug === moduleSlug && f.lesson.slug === lessonSlug);
  if (index < 0) return {};
  return { prev: allLessons[index - 1], next: allLessons[index + 1] };
}

/** Counts derived from the data. Never type a number here. */
export const COURSE_COUNTS = {
  modules: COURSE.length,
  lessons: allLessons.length,
  written: allLessons.filter((f) => !f.lesson.draft).length,
};

export { CourseIndex } from './ui/CourseIndex';
export { CourseLessonPage } from './ui/LessonPage';
export { CourseSidebar } from './ui/Sidebar';
export { CodeBlock } from './ui/CodeBlock';
