import type { ReactNode } from 'react';
import { Link, type LinkProps } from '@tanstack/react-router';
import { useLearnBase } from '../../context';

/** A link to a lesson or index page under the mount point. */
export function CourseLink({
  path,
  className,
  onClick,
  ariaCurrent,
  title,
  children,
}: {
  path: string; // '/talking-to-a-model/embeddings' or '' for the index
  className?: string;
  onClick?: () => void;
  ariaCurrent?: 'page';
  title?: string;
  children: ReactNode;
}) {
  const base = useLearnBase();
  return (
    // The host mounts the course at `base`, so the path is true even though the
    // package cannot see the host's route union.
    <Link
      to={`${base}${path}` as LinkProps['to']}
      className={className}
      onClick={onClick}
      aria-current={ariaCurrent}
      title={title}
    >
      {children}
    </Link>
  );
}
