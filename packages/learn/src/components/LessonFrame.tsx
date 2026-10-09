/**
 * A lesson page, looked up by slug.
 *
 * THIS IS THE DATA BINDING OF `LessonPage`. The shell (`./LessonPage`) takes a
 * lesson's facts as props so that it knows nothing about any lesson; this file
 * is the one place that resolves a slug to those facts, the hue, the track and
 * the neighbours, and links them through the mount point. Every lesson page
 * renders through it.
 */
import type { ReactNode } from 'react';
import { LessonPage as LessonShell, type NeighbourLink } from './LessonPage';
import { hueOf, lessonBySlug, lessonsIn, TRACKS, type LessonSlug } from '../data/lessons';
import {
  linkableNeighbours,
  phaseOf,
  stopHref,
  stopLabel,
  stopPosition,
  stopTitle,
  type Stop,
} from '../data/path';
import { useLearnBase } from '../context';

/**
 * A lesson page, looked up by slug.
 *
 * THE PREV AND NEXT FOLLOW THE PATH, not the topic. "Next" is the next lesson
 * or build in path order; a planned step has no page, so it is skipped rather
 * than linked to. A build links to its anchor on its phase page. The card says
 * "starts “Phase 3 · The RAG ladder”" only when it crosses into another phase.
 */
export function LessonFrame({ slug, children }: { slug: LessonSlug; children: ReactNode }) {
  const base = useLearnBase();
  const lesson = lessonBySlug(slug);
  const { prev, next } = linkableNeighbours(slug);
  const trackTitle = TRACKS.find((t) => t.id === lesson.track)!.title;
  const total = lessonsIn(lesson.track).length;
  const here = stopPosition(slug);
  const herePhase = phaseOf(slug);

  const link = (s: Stop): NeighbourLink => {
    const there = phaseOf(s.kind === 'lesson' ? s.slug : s.step);
    return {
      href: stopHref(s, base),
      label: stopLabel(s),
      title: stopTitle(s),
      crossesTo:
        there && herePhase && there.id !== herePhase.id ? `Phase ${there.n} · ${there.title}` : undefined,
    };
  };

  return (
    <LessonShell
      lesson={{
        hue: hueOf(lesson),
        n: lesson.n,
        total,
        trackTitle,
        title: lesson.title,
        lede: lesson.lede,
        minutes: lesson.minutes,
        source: lesson.source,
        needs: lesson.needs,
        path: here ? { phase: here.phase.n, stop: here.stop, of: here.of } : undefined,
      }}
      prev={prev && link(prev)}
      next={next && link(next)}
    >
      {children}
    </LessonShell>
  );
}
