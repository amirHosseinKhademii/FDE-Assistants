/**
 * The lesson rail, drawn from the lesson records.
 *
 * THIS IS THE DATA BINDING OF `LessonNav`. The rail draws the rows it is given;
 * this builds them from `data/lessons.ts`, so the rail and the lesson pages
 * cannot disagree about a title, a number or a hue.
 */
import { LessonNav, type RailTrack } from './LessonNav';
import { hueOf, lessonsIn, MAP, TOTALS, TRACKS } from '../data/lessons';
import { useLearnBase } from '../context';

export function LessonRail() {
  const base = useLearnBase();
  const tracks: RailTrack[] = TRACKS.map((t) => ({
    id: t.id,
    title: t.title,
    lessons: lessonsIn(t.id).map((l) => ({
      href: `${base}/${l.slug}`,
      n: l.n,
      short: l.short,
      hue: hueOf(l),
    })),
  }));

  return (
    <LessonNav
      indexHref={base}
      totals={TOTALS}
      map={{ href: `${base}/${MAP.slug}`, short: MAP.short }}
      tracks={tracks}
    />
  );
}
