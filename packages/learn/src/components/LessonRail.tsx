/**
 * The lesson rail, drawn from the records.
 *
 * THIS IS THE DATA BINDING OF `LessonNav`. The rail draws the rows it is given;
 * this builds them from `data/lessons.ts` and `data/path.ts`, so the rail and
 * the lesson pages cannot disagree about a title, a number or a hue.
 *
 * WHICH VIEW, AND WHAT OPENS. The view is kept here, in the layout's state, so
 * it survives moving between lessons. The phase the current page sits in opens
 * by default; a phase the reader opens or closes stays that way until the page
 * moves into a different phase, which is the only time the rail chooses for them.
 */
import { useEffect, useState } from 'react';
import { useLocation } from '@tanstack/react-router';
import { LessonNav, type RailPhase, type RailProgress, type RailStop, type RailView } from './LessonNav';
import { hueOf, lessonBySlug, lessonsIn, LESSONS, MAP, TOTALS, TRACKS, type LessonSlug } from '../data/lessons';
import { PATH, pathOrder, phaseOf, stopHref, stopIndexOf, stopKey, stopLabel, type PhaseId } from '../data/path';
import { useLearnBase } from '../context';

/** The lesson or phase the URL names, read off the mount point's path. */
function locate(pathname: string, base: string): { lesson?: LessonSlug; phase?: PhaseId } {
  const rest = pathname.startsWith(`${base}/`) ? pathname.slice(base.length + 1).replace(/\/+$/, '') : '';
  if (LESSONS.some((l) => l.slug === rest)) return { lesson: rest as LessonSlug };
  const m = /^phase\/(p\d)$/.exec(rest);
  if (m) return { phase: m[1] as PhaseId };
  return {};
}

export function LessonRail() {
  const base = useLearnBase();
  const { pathname, hash } = useLocation();
  // A build or planned stop lives on its phase page at `#step-X.Y`; that hash is
  // what makes its row the current one once it is clicked.
  const stepHere = (hash ?? '').replace(/^#?step-/, '');
  const [view, setView] = useState<RailView>('path');

  const here = locate(pathname, base);
  const currentPhase: PhaseId | undefined = here.lesson ? phaseOf(here.lesson)?.id : here.phase;

  // Open the phase the page is in, and open it again whenever the page moves
  // into a different one. A phase the reader closed stays closed otherwise.
  const [open, setOpen] = useState<Set<PhaseId>>(() => new Set<PhaseId>([currentPhase ?? 'p0']));
  useEffect(() => {
    if (!currentPhase) return;
    setOpen((s) => (s.has(currentPhase) ? s : new Set(s).add(currentPhase)));
  }, [currentPhase]);

  const togglePhase = (id: PhaseId) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const tracks = TRACKS.map((t) => ({
    id: t.id,
    title: t.title,
    lessons: lessonsIn(t.id).map((l) => ({
      href: `${base}/${l.slug}`,
      n: l.n,
      short: l.short,
      hue: hueOf(l),
    })),
  }));

  const phases: RailPhase[] = PATH.map((p) => {
    const stops: RailStop[] = p.stops.map((s) => {
      const lesson = s.kind === 'lesson' ? lessonBySlug(s.slug) : undefined;
      return {
        key: stopKey(s),
        href: stopHref(s, base),
        kind: s.kind,
        name: s.kind === 'lesson' ? lesson!.short : `${s.step} ${stopLabel(s).replace(/^(Build|Planned) · [\d.]+ /, '')}`,
        srLabel: stopLabel(s),
        hue: lesson ? hueOf(lesson) : undefined,
        current:
          s.kind === 'lesson'
            ? here.lesson === s.slug
            : here.phase !== undefined && here.phase === phaseOf(s.step)?.id && stepHere === s.step,
      };
    });
    return {
      id: p.id,
      n: p.n,
      title: p.title,
      count: p.stops.length,
      open: open.has(p.id),
      current: currentPhase === p.id,
      stops,
    };
  });

  // The slim progress line: where the reader is, in path order. A page outside
  // the path (the index, the repo map) reports the overview instead.
  const all = pathOrder();
  const at = here.lesson ? stopIndexOf(here.lesson) : -1;
  const through = all.slice(0, at + 1);
  const progress: RailProgress = {
    phase: currentPhase !== undefined && here.lesson ? `Phase ${phaseOf(here.lesson)!.n} of ${PATH.length}` : 'Path overview',
    lessonsDone: through.filter((s) => s.kind === 'lesson').length,
    lessonsTotal: LESSONS.length,
    builds: all.filter((s) => s.kind === 'build').length,
    fraction: all.length ? Math.max(0, at + 1) / all.length : 0,
  };

  return (
    <LessonNav
      indexHref={base}
      totals={TOTALS}
      map={{ href: `${base}/${MAP.slug}`, short: MAP.short }}
      view={view}
      onView={setView}
      tracks={tracks}
      phases={phases}
      progress={progress}
      onTogglePhase={togglePhase}
    />
  );
}
