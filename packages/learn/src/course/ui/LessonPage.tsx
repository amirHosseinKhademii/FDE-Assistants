import { Fragment, useEffect } from 'react';
import { COURSE_COUNTS, findLesson, prevNext } from '../index';
import { markVisited } from '../progress';
import { CodeBlock } from './CodeBlock';
import { CourseLink } from './CourseLink';
import './course.css';

/** One lesson, in the fixed section order from the redesign plan. */
export function CourseLessonPage({ moduleSlug, lessonSlug }: { moduleSlug: string; lessonSlug: string }) {
  const found = findLesson(moduleSlug, lessonSlug);
  const isFound = found !== undefined;

  useEffect(() => {
    if (isFound) markVisited(`${moduleSlug}/${lessonSlug}`);
  }, [moduleSlug, lessonSlug, isFound]);

  if (!found) {
    return (
      <article className="course-lesson">
        <h1>Lesson not found</h1>
        <p>There is no lesson at this address.</p>
        <p>
          <CourseLink path="" className="course-button">
            Back to the course
          </CourseLink>
        </p>
      </article>
    );
  }

  const { module, lesson, position } = found;
  const { prev, next } = prevNext(moduleSlug, lessonSlug);

  return (
    <article className="course-lesson">
      <div className="course-topline">
        <nav aria-label="Breadcrumb" className="course-crumbs">
          Module {module.number} · {module.title} › {lesson.number} {lesson.title}
        </nav>
        <p className="course-position">
          Lesson {position} of {COURSE_COUNTS.lessons}
        </p>
      </div>

      <h1>
        {lesson.number} {lesson.title}
      </h1>

      {lesson.draft ? (
        <p className="course-draft">This lesson is being written. Its title and place in the course are final.</p>
      ) : (
        <>
          <h2>1. In one sentence</h2>
          <p className="course-oneliner">{lesson.oneLiner}</p>

          <h2>2. The problem</h2>
          <div className="course-pair">
            <div className="course-box">
              <div className="course-box-label">Without it</div>
              <p>{lesson.problem.without}</p>
            </div>
            <div className="course-box">
              <div className="course-box-label">With it</div>
              <p>{lesson.problem.with}</p>
            </div>
          </div>

          <h2>3. How it works</h2>
          <ol className="course-steps">
            {lesson.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          {lesson.diagram ? (
            <div className="course-flow" role="img" aria-label={lesson.diagram.join(' to ')}>
              {lesson.diagram.map((label, i) => (
                <Fragment key={label}>
                  <span className="course-flow-box">{label}</span>
                  {i < lesson.diagram!.length - 1 ? (
                    <span className="course-flow-arrow" aria-hidden="true">
                      →
                    </span>
                  ) : null}
                </Fragment>
              ))}
            </div>
          ) : null}

          <h2>4. The code</h2>
          <CodeBlock code={lesson.code.source} label="TypeScript" />
          <div className="course-output">
            <div className="course-output-label">What it prints</div>
            <pre>{lesson.code.output}</pre>
          </div>

          <h2>5. Under the hood</h2>
          <details className="course-details">
            <summary>Show the real data shapes</summary>
            {lesson.hood.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
            {lesson.hood.example?.length ? (
              <dl className="course-example">
                {lesson.hood.example.map((e) => (
                  <div key={e.label}>
                    <dt>{e.label}</dt>
                    <dd>
                      <code>{e.value}</code>
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </details>

          <h2>6. Common mistakes</h2>
          <ul>
            {lesson.mistakes.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>

          <h2>7. Use it when and skip it when</h2>
          <div className="course-pair">
            <div className="course-box">
              <div className="course-box-label">Use it when</div>
              <ul>
                {lesson.useWhen.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </div>
            <div className="course-box">
              <div className="course-box-label">Skip it when</div>
              <ul>
                {lesson.skipWhen.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </div>

          <h2>8. Words to know</h2>
          <dl className="course-words">
            {lesson.words.map((w) => (
              <div key={w.term}>
                <dt>{w.term}</dt>
                <dd>{w.meaning}</dd>
              </div>
            ))}
          </dl>

          <h2>9. Check yourself</h2>
          {lesson.check.map((c) => (
            <details key={c.q} className="course-check">
              <summary>{c.q}</summary>
              <p>{c.a}</p>
            </details>
          ))}
        </>
      )}

      <nav className="course-pager" aria-label="Previous and next lessons">
        {prev ? (
          <CourseLink path={`/${prev.module.slug}/${prev.lesson.slug}`} className="course-pager-link">
            <span className="course-pager-dir">Previous</span>
            <span>
              {prev.lesson.number} {prev.lesson.title}
            </span>
          </CourseLink>
        ) : (
          <span />
        )}
        {next ? (
          <CourseLink path={`/${next.module.slug}/${next.lesson.slug}`} className="course-pager-link is-next">
            <span className="course-pager-dir">Next</span>
            <span>
              {next.lesson.number} {next.lesson.title}
            </span>
          </CourseLink>
        ) : null}
      </nav>
    </article>
  );
}
