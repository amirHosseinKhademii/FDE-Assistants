import { useEffect, useState, type ReactNode } from 'react';
import { COURSE_COUNTS, findLesson, prevNext } from '../index';
import type { Lesson } from '../types';
import { markVisited } from '../progress';
import { CodeBlock, OutputPanel } from './CodeBlock';
import { CourseLink } from './CourseLink';
import { Modal } from './Modal';
import { StepSnippet, StepVisual } from './StepVisual';
import './course.css';

/** Words in every prose field of a lesson, for the reading-time estimate. */
function countWords(lesson: Lesson): number {
  const parts: string[] = [
    lesson.oneLiner,
    lesson.problem.without,
    lesson.problem.with,
    ...lesson.steps.flatMap((s) => [s.title, s.detail]),
    ...(lesson.hood?.paragraphs ?? []),
    ...(lesson.hood?.example ?? []).flatMap((e) => [e.label, e.value]),
    ...lesson.mistakes,
    ...lesson.useWhen,
    ...lesson.skipWhen,
    ...lesson.words.flatMap((w) => [w.term, w.meaning]),
  ];
  return parts.join(' ').split(/\s+/).filter(Boolean).length;
}

function Section({ n, label, title, bare, children }: { n: number; label: string; title: string; bare?: boolean; children: ReactNode }) {
  return (
    <section className={'course-section' + (bare ? ' is-bare' : '')}>
      <header className="course-sec-head">
        <span className="course-sec-num" aria-hidden="true">
          {n}
        </span>
        <div>
          <p className="course-sec-label">{label}</p>
          <h2 className="course-sec-title">{title}</h2>
        </div>
      </header>
      {children}
    </section>
  );
}

/** One lesson, in the fixed section order from the redesign plan. */
export function CourseLessonPage({ moduleSlug, lessonSlug }: { moduleSlug: string; lessonSlug: string }) {
  const found = findLesson(moduleSlug, lessonSlug);
  const isFound = found !== undefined;
  const [codeOpen, setCodeOpen] = useState(false);

  useEffect(() => {
    if (isFound) markVisited(`${moduleSlug}/${lessonSlug}`);
  }, [moduleSlug, lessonSlug, isFound]);

  useEffect(() => {
    setCodeOpen(false);
  }, [moduleSlug, lessonSlug]);

  if (!found) {
    return (
      <article className="course-lesson">
        <h1 className="course-title">Lesson not found</h1>
        <p className="course-lead">There is no lesson at this address.</p>
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
  const moduleIndex = module.lessons.indexOf(lesson);
  const moduleProgress = ((moduleIndex + 1) / module.lessons.length) * 100;
  const minutes = Math.max(1, Math.round(countWords(lesson) / 200));

  return (
    <article className="course-lesson">
      <p className="course-pill">
        Module {module.number} · {module.title}
      </p>
      <p className="course-num">Lesson {lesson.number}</p>
      <h1 className="course-title">{lesson.title}</h1>

      {lesson.draft ? (
        <p className="course-draft">This lesson is being written. Its title and place in the course are final.</p>
      ) : (
        <p className="course-lead">{lesson.oneLiner}</p>
      )}

      <div className="course-meta">
        <span>
          Lesson {position} of {COURSE_COUNTS.lessons}
        </span>
        <span aria-hidden="true">·</span>
        <span>{minutes} min read</span>
      </div>
      <div className="course-progress" role="img" aria-label={`Module progress: lesson ${moduleIndex + 1} of ${module.lessons.length}`}>
        <span style={{ width: `${moduleProgress}%` }} />
      </div>

      {lesson.draft ? null : (
        <>
          <Section n={1} label="The problem" title="Why this step exists">
            <div className="course-pair">
              <div className="course-box is-without">
                <p className="course-box-label">
                  <span aria-hidden="true">✕</span> Without it
                </p>
                <p>{lesson.problem.without}</p>
              </div>
              <div className="course-box is-with">
                <p className="course-box-label">
                  <span aria-hidden="true">✓</span> With it
                </p>
                <p>{lesson.problem.with}</p>
              </div>
            </div>
          </Section>

          <Section n={2} label="The idea" title="How it works">
            <ul className="course-steps">
              {lesson.steps.map((s, i) => (
                <li key={s.title} className="course-step">
                  <h3 className="course-step-title">{s.title}</h3>
                  <p className="course-step-detail">{s.detail}</p>
                  {s.visual ? <StepVisual visual={s.visual} /> : null}
                  {s.snippet ? <StepSnippet snippet={s.snippet} /> : null}
                </li>
              ))}
            </ul>
            {lesson.diagram ? (
              <div className="course-flow" role="img" aria-label={lesson.diagram.join(' to ')}>
                {lesson.diagram.map((label, i) => (
                  <span key={label} className="course-flow-item">
                    <span className="course-flow-box">{label}</span>
                    {i < lesson.diagram!.length - 1 ? (
                      <span className="course-flow-arrow" aria-hidden="true">
                        →
                      </span>
                    ) : null}
                  </span>
                ))}
              </div>
            ) : null}
          </Section>

          <Section n={3} label="Full code" title="Read the program" bare>
            <div className="course-row">
              <svg className="course-row-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
              </svg>
              <span className="course-row-text">See the full code</span>
              <button type="button" className="course-button is-secondary is-small" onClick={() => setCodeOpen(true)}>
                Open →
              </button>
            </div>
          </Section>

          <Section n={4} label="Common mistakes" title="What goes wrong">
            <ul className="course-mistakes">
              {lesson.mistakes.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </Section>

          <Section n={5} label="Use it when and skip it when" title="Is it the right tool?">
            <div className="course-pair">
              <div className="course-box is-plain">
                <p className="course-box-label is-use">Use it when</p>
                <ul className="course-check-list is-use">
                  {lesson.useWhen.map((u) => (
                    <li key={u}>{u}</li>
                  ))}
                </ul>
              </div>
              <div className="course-box is-plain">
                <p className="course-box-label is-skip">Skip it when</p>
                <ul className="course-check-list is-skip">
                  {lesson.skipWhen.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>

          <Section n={6} label="Words to know" title="Terms in this lesson">
            <dl className="course-words">
              {lesson.words.map((w) => (
                <div key={w.term} className="course-word">
                  <dt>{w.term}</dt>
                  <dd>{w.meaning}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Modal open={codeOpen} onClose={() => setCodeOpen(false)} label="Full code" title="Full code">
            <CodeBlock code={lesson.code.source} />
            <OutputPanel output={lesson.code.output} />

            {/* Older "Under the hood" content, kept here until it is merged into How it works. */}
            {lesson.hood ? (
              <>
                <h3 className="course-modal-h">Under the hood</h3>
                {lesson.hood.paragraphs.map((p) => (
                  <p key={p} className="course-hood-p">
                    {p}
                  </p>
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
                {lesson.hood.code ? (
                  <>
                    <div className="course-modal-gap" />
                    <CodeBlock code={lesson.hood.code.source} />
                    {lesson.hood.code.output ? <OutputPanel output={lesson.hood.code.output} /> : null}
                  </>
                ) : null}
              </>
            ) : null}
          </Modal>
        </>
      )}

      <nav className="course-pager" aria-label="Previous and next lessons">
        {prev ? (
          <CourseLink path={`/${prev.module.slug}/${prev.lesson.slug}`} className="course-pager-link">
            <span className="course-pager-dir">← Previous</span>
            <span className="course-pager-title">
              {prev.lesson.number} {prev.lesson.title}
            </span>
          </CourseLink>
        ) : (
          <span />
        )}
        {next ? (
          <CourseLink path={`/${next.module.slug}/${next.lesson.slug}`} className="course-pager-link is-next">
            <span className="course-pager-dir">Next →</span>
            <span className="course-pager-title">
              {next.lesson.number} {next.lesson.title}
            </span>
          </CourseLink>
        ) : null}
      </nav>
    </article>
  );
}
