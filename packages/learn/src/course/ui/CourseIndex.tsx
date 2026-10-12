import { COURSE, COURSE_COUNTS, allLessons } from '../index';
import { CourseLink } from './CourseLink';
import { useVisited } from './useVisited';
import './course.css';

/** The index at /learn: a hero with a start button, then one card per module. */
export function CourseIndex() {
  const visited = useVisited();
  const first = COURSE[0].lessons[0];
  const firstPath = `/${COURSE[0].slug}/${first.slug}`;
  const lastSeen = [...visited].reverse().map((id) => allLessons.find((f) => `${f.module.slug}/${f.lesson.slug}` === id)).find(Boolean);
  const seenCount = allLessons.filter((f) => visited.includes(`${f.module.slug}/${f.lesson.slug}`)).length;

  return (
    <div className="course-index">
      <section className="course-hero">
        <h1 className="course-hero-title">Build an AI assistant, step by step</h1>
        <p className="course-hero-sub">
          By the end you can build an assistant that answers questions from your own documents. It finds the right
          passage, writes an answer, and names its sources.
        </p>
        <p className="course-hero-note">
          You will also test it, so you can tell when a change makes it worse. {COURSE_COUNTS.modules} modules,{' '}
          {COURSE_COUNTS.lessons} lessons. {seenCount} visited.
        </p>
        <div className="course-hero-actions">
          <CourseLink path={firstPath} className="course-button">
            Start with lesson {first.number} →
          </CourseLink>
          {lastSeen ? (
            <CourseLink
              path={`/${lastSeen.module.slug}/${lastSeen.lesson.slug}`}
              className="course-button is-secondary"
            >
              Continue: {lastSeen.lesson.number} {lastSeen.lesson.title}
            </CourseLink>
          ) : null}
        </div>
      </section>

      <div className="course-mod-grid">
        {COURSE.map((m) => {
          const done = m.lessons.filter((l) => visited.includes(`${m.slug}/${l.slug}`)).length;
          const pct = (done / m.lessons.length) * 100;
          return (
            <section key={m.slug} className="course-mod">
              <span className="course-mod-big" aria-hidden="true">
                {m.number}
              </span>
              <p className="course-mod-kicker">Module {m.number}</p>
              <h2 className="course-mod-title">{m.title}</h2>
              <p className="course-mod-summary">{m.summary}</p>
              <ul className="course-mod-list">
                {m.lessons.map((l) => {
                  const seen = visited.includes(`${m.slug}/${l.slug}`);
                  return (
                    <li key={l.slug}>
                      <CourseLink path={`/${m.slug}/${l.slug}`}>
                        <span className="course-mod-lnum">{l.number}</span>
                        <span className="course-mod-ltitle">{l.title}</span>
                        {seen ? <span className="course-mod-seen" aria-label="Visited">✓</span> : null}
                        {l.draft ? <span className="course-soon">being written</span> : null}
                      </CourseLink>
                    </li>
                  );
                })}
              </ul>
              <div className="course-mod-progress">
                <div className="course-bar" role="img" aria-label={`${done} of ${m.lessons.length} visited`}>
                  <span style={{ width: `${pct}%` }} />
                </div>
                <span>
                  {done} of {m.lessons.length} visited
                </span>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
