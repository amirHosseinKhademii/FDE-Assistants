/**
 * The app's binding of `@veresk/learn`'s rail to `lib/learn/lessons.ts`.
 *
 * The package draws the rail from the rows it is given; this file builds those
 * rows from the lesson record, so the rail and the lesson pages cannot disagree
 * about a title, a number or a hue. `routes/learn.tsx` imports it unchanged.
 */
import { LessonNav as RailNav, type RailTrack } from '@veresk/learn';
import { hueOf, lessonsIn, MAP, TOTALS, TRACKS } from '../../lib/learn/lessons';

export function LessonNav() {
  const tracks: RailTrack[] = TRACKS.map((t) => ({
    id: t.id,
    title: t.title,
    lessons: lessonsIn(t.id).map((l) => ({
      href: `/learn/${l.slug}`,
      n: l.n,
      short: l.short,
      hue: hueOf(l),
    })),
  }));

  return (
    <RailNav
      indexHref="/learn"
      totals={TOTALS}
      map={{ href: `/learn/${MAP.slug}`, short: MAP.short }}
      tracks={tracks}
    />
  );
}
