/** `/learn/<module>/<lesson>`: one lesson of the course. */
import { createFileRoute } from '@tanstack/react-router';
import { CourseLessonPage, findLesson } from '@veresk/learn';

export const Route = createFileRoute('/learn/$module/$lesson')({
  head: ({ params }) => {
    const found = findLesson(params.module, params.lesson);
    const title = found ? `${found.lesson.number} ${found.lesson.title} · Learn` : 'Lesson not found · Learn';
    return { meta: [{ title }] };
  },
  component: LessonRoute,
});

function LessonRoute() {
  const { module, lesson } = Route.useParams();
  return <CourseLessonPage moduleSlug={module} lessonSlug={lesson} />;
}
