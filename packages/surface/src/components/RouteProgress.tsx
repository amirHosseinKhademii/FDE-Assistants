/**
 * The bar that says a navigation is happening.
 *
 * WHY IT EXISTS. Clicking through to the desk loads that route's code and then
 * mounts a page that immediately queries two endpoints. On a warm connection
 * that is fast; on a cold serverless database, or the first time a route's
 * chunk is fetched, it is long enough that a page which does nothing at all
 * reads as a dead link — and the reliable reaction to a dead link is to click
 * it again.
 *
 * IT IS DRIVEN BY ROUTER STATE, NOT A TIMER. `status === 'pending'` is true for
 * exactly as long as the navigation is actually in flight, so the bar cannot
 * keep animating after a route has failed to load — the same rule the desk's
 * header follows for its own scan line, and the same reason: a progress
 * indicator that outlives its work is worse than none, because it teaches you
 * to ignore it.
 *
 * THE DELAY IS THE POINT OF `PENDING_MS`. Most navigations here are instant
 * once a chunk is warm, and a bar that flashes on every click is visual noise
 * that makes a fast app feel busy. Nothing appears unless the navigation is
 * slow enough to be worth mentioning.
 */
import { useEffect, useState } from 'react';
import { useRouterState } from '@tanstack/react-router';

/** Below this, a navigation is fast enough that saying so would be the only delay. */
const PENDING_MS = 140;

export function RouteProgress() {
  const pending = useRouterState({ select: (s) => s.status === 'pending' });
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!pending) {
      setShow(false);
      return;
    }
    const t = setTimeout(() => setShow(true), PENDING_MS);
    return () => clearTimeout(t);
  }, [pending]);

  if (!show) return null;

  return (
    <div
      role="status"
      aria-label="Loading the page"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden"
      /* THE BAR TAKES THE ENGAGEMENT'S COLOURS, WHICH IT CANNOT KNOW. Pharma's
         bar is the six hops and steering's is its own four; both are set as
         `--ui-progress` in the app's stylesheet. The fallback is the accent
         rather than a hard-coded spectrum, so an app that forgets gets a
         correct one-colour bar instead of a bar in another customer's palette. */
      style={{ backgroundImage: 'var(--ui-progress, linear-gradient(90deg, var(--color-ui-accent), var(--color-ui-accent)))' }}
    >
      <span className="ui-scan absolute inset-y-0 w-1/3 bg-linear-to-r from-transparent via-white to-transparent" />
    </div>
  );
}
