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
import { hueOf, lessonBySlug, lessonsIn, neighbours, TRACKS, type Lesson, type LessonSlug } from '../data/lessons';
import { useLearnBase } from '../context';

export function LessonFrame({ slug, children }: { slug: LessonSlug; children: ReactNode }) {
  const base = useLearnBase();
  const lesson = lessonBySlug(slug);
  const { prev, next } = neighbours(slug);
  const trackTitle = TRACKS.find((t) => t.id === lesson.track)!.title;
  const total = lessonsIn(lesson.track).length;

  // Named only when the link crosses into the other track, so the common case
  // stays quiet and the handover between tracks is the thing that stands out.
  const link = (l: Lesson): NeighbourLink => ({
    href: `${base}/${l.slug}`,
    n: l.n,
    short: l.short,
    title: l.title,
    crossesTo: l.track === lesson.track ? undefined : TRACKS.find((t) => t.id === l.track)?.title,
  });

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
      }}
      prev={prev && link(prev)}
      next={next && link(next)}
    >
      {children}
    </LessonShell>
  );
}
