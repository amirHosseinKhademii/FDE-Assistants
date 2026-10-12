import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { COURSE, COURSE_COUNTS, allLessons } from '../index';
import { CourseLink } from './CourseLink';
import { useVisited } from './useVisited';
import './course.css';

/**
 * Every module, the current lesson marked and visited lessons ticked. Above
 * 900px it is a sticky column. Below that it is a "Contents" drawer.
 */
export function CourseSidebar() {
  const params = useParams({ strict: false }) as { module?: string; lesson?: string };
  const visited = useVisited();
  const [open, setOpen] = useState(false);
  const seenCount = allLessons.filter((f) => visited.includes(`${f.module.slug}/${f.lesson.slug}`)).length;
  const pct = (seenCount / COURSE_COUNTS.lessons) * 100;

  return (
    <aside className={'course-side' + (open ? ' is-open' : '')} aria-label="Course contents">
      <div className="course-side-bar">
        <button type="button" className="course-contents-btn" aria-expanded={open} onClick={() => setOpen(true)}>
          ☰ Contents
        </button>
        <span className="course-side-mini">
          {seenCount} of {COURSE_COUNTS.lessons} visited
        </span>
      </div>
      {open ? <button type="button" className="course-scrim" aria-label="Close contents" onClick={() => setOpen(false)} /> : null}
      <div className="course-side-panel">
        <div className="course-side-head">
          <p className="course-side-title">Learn to build a document assistant</p>
          <button type="button" className="course-side-close" onClick={() => setOpen(false)} aria-label="Close contents">
            ✕
          </button>
          <div className="course-bar" role="img" aria-label={`${seenCount} of ${COURSE_COUNTS.lessons} lessons visited`}>
            <span style={{ width: `${pct}%` }} />
          </div>
          <p className="course-side-count">
            {seenCount} of {COURSE_COUNTS.lessons} visited
          </p>
        </div>
        <nav className="course-side-nav" aria-label="Lessons">
          {COURSE.map((m) => {
            const isCurrentModule = m.slug === params.module;
            return (
              <details key={`${m.slug}-${isCurrentModule}`} open={isCurrentModule} className="course-side-module">
                <summary>
                  <span className="course-mod-num">{m.number}</span>
                  <span>{m.title}</span>
                </summary>
                <ul>
                  {m.lessons.map((l) => {
                    const current = isCurrentModule && l.slug === params.lesson;
                    const seen = visited.includes(`${m.slug}/${l.slug}`);
                    return (
                      <li key={l.slug}>
                        <CourseLink
                          path={`/${m.slug}/${l.slug}`}
                          ariaCurrent={current ? 'page' : undefined}
                          onClick={() => setOpen(false)}
                          className={current ? 'is-current' : l.draft ? 'is-draft' : undefined}
                        >
                          <span className="course-side-lnum">{l.number}</span>
                          <span className="course-side-ltitle">{l.title}</span>
                          {seen ? (
                            <span className="course-tick" aria-label="Visited">
                              ✓
                            </span>
                          ) : null}
                        </CourseLink>
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
