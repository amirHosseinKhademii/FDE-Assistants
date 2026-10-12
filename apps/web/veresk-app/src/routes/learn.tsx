/**
 * `/learn`: the layout every course page renders inside. The sidebar is the same
 * on every page, so it lives here and does not remount when the lesson changes.
 * The old single-segment lesson routes still render inside this layout until
 * they are removed in the cleanup batch.
 */
import { createFileRoute, Link, Outlet } from '@tanstack/react-router';
import { CourseSidebar, LearnProvider } from '@veresk/learn';

export const Route = createFileRoute('/learn')({
  component: LearnLayout,
});

function LearnLayout() {
  return (
    <LearnProvider basePath="/learn">
      <div className="course-shell">
        <header className="course-topbar">
          <Link to="/" className="course-home">
            Veresk
          </Link>
          <Link to="/learn">Learn</Link>
        </header>
        <div className="course-frame">
          <CourseSidebar />
          <main className="course-main">
            <Outlet />
          </main>
        </div>
      </div>
    </LearnProvider>
  );
}
