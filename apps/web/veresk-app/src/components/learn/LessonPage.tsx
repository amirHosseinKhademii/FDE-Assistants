/**
 * The app's binding of `@veresk/learn`'s lesson shell to `lib/learn/lessons.ts`.
 *
 * THIS FILE IS THE SEAM. The package takes a lesson's facts as props so it can
 * be used by a second deployment with its own lessons. Here, the app looks the
 * lesson up by slug and resolves the hue, the track, the neighbours and the
 * "starts <track>" label, then hands the package the finished values. Pages
 * keep importing `LessonPage` from here with `slug`, exactly as before.
 */
import type { ReactNode } from 'react';
import { LessonPage as LessonShell, type LessonLink } from '@veresk/learn';
import { hueOf, lessonBySlug, lessonsIn, neighbours, TRACKS, type Lesson, type LessonSlug } from '../../lib/learn/lessons';

export function LessonPage({ slug, children }: { slug: LessonSlug; children: ReactNode }) {
  const lesson = lessonBySlug(slug);
  const { prev, next } = neighbours(slug);
  const trackTitle = TRACKS.find((t) => t.id === lesson.track)!.title;
  const total = lessonsIn(lesson.track).length;

  // Named only when the link crosses into the other track, so the common case
  // stays quiet and the handover between tracks is the thing that stands out.
  const link = (l: Lesson): LessonLink => ({
    href: `/learn/${l.slug}`,
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
