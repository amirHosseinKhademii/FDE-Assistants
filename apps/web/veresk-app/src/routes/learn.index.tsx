/** `/learn`: the course map, one card per module. */
import { createFileRoute } from '@tanstack/react-router';
import { CourseIndex } from '@veresk/learn';

export const Route = createFileRoute('/learn/')({
  head: () => ({ meta: [{ title: 'Learn · Veresk' }] }),
  component: CourseIndex,
});
