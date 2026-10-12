import { COURSE, COURSE_COUNTS } from '../index';
import { CourseLink } from './CourseLink';
import './course.css';

/** The index at /learn: the purpose, a start button, and every module with its lessons. */
export function CourseIndex() {
  const first = COURSE[0].lessons[0];
  return (
    <div className="course-index">
      <h1>Learn to build a document assistant</h1>
      <h2>What you will be able to build</h2>
      <p>
        By the end you can build an assistant that answers questions from your own documents. It finds the right
        passage, writes an answer, and names its sources. You will also test it, so you can tell when a change
        makes it worse.
      </p>
      <p>
        <CourseLink path={`/${COURSE[0].slug}/${first.slug}`} className="course-button">
          Start lesson {first.number}
        </CourseLink>
      </p>
      <p className="course-muted">
        {COURSE_COUNTS.modules} modules, {COURSE_COUNTS.lessons} lessons.
      </p>
      {COURSE.map((m) => (
        <section key={m.slug} className="course-card">
          <p className="course-card-num">Module {m.number}</p>
          <h2>{m.title}</h2>
          <p>{m.summary}</p>
          <ul className="course-card-list">
            {m.lessons.map((l) => (
              <li key={l.slug}>
                <CourseLink path={`/${m.slug}/${l.slug}`}>
                  {l.number} {l.title}
                </CourseLink>
                {l.draft ? <span className="course-soon"> being written</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
