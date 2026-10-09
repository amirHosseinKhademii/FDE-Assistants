/**
 * A link to another lesson, built from the mount point rather than typed out.
 *
 * Lessons write `<LessonLink slug="loop">` and never a path, so moving the whole
 * section under another prefix changes one provider and no lesson.
 */
import type { CSSProperties, ReactNode } from 'react';
import { Link, type LinkProps } from '@tanstack/react-router';
import { useLearnBase } from '../context';

export function LessonLink({
  slug,
  className,
  style,
  children,
}: {
  slug: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const base = useLearnBase();
  return (
    // The host registers its routes, so `to` is typed as the app's route union.
    // The package cannot see that union; the host mounts LESSON_PAGES at `base`,
    // which is what makes this cast true.
    <Link to={`${base}/${slug}` as LinkProps['to']} className={className} style={style}>
      {children}
    </Link>
  );
}
