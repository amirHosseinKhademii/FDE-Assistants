import { useEffect, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { COURSE } from '../index';
import { readVisited, subscribeVisited } from '../progress';
import { CourseLink } from './CourseLink';
import './course.css';

/**
 * Every module, collapsible, with the current lesson marked and visited lessons
 * ticked. Below 900px the list sits behind a "Contents" button.
 */
export function CourseSidebar() {
  const params = useParams({ strict: false }) as { module?: string; lesson?: string };
  const [visited, setVisited] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sync = () => setVisited(readVisited());
    sync();
    return subscribeVisited(sync);
  }, []);

  return (
    <aside className={'course-side' + (open ? ' is-open' : '')} aria-label="Course contents">
      <button type="button" className="course-contents-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Contents
      </button>
      <div className="course-side-list">
        {COURSE.map((m) => {
          const isCurrentModule = m.slug === params.module;
          return (
            <details key={`${m.slug}-${isCurrentModule}`} open={isCurrentModule} className="course-side-module">
              <summary>
                Module {m.number} · {m.title}
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
                        <span>
                          {l.number} {l.title}
                        </span>
                        {seen ? <span className="course-tick" aria-label="Visited">✓</span> : null}
                      </CourseLink>
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}
      </div>
    </aside>
  );
}
