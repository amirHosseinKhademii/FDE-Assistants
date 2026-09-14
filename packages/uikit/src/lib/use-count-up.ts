import { useEffect, useRef, useState } from 'react';

/**
 * A 0→1 progress ramp, for figures that should land rather than appear.
 *
 * ONE CLOCK, NOT ONE PER FIGURE. It returns a FRACTION and each caller
 * multiplies it by its own total, so a panel of a dozen numbers arrives
 * together. A dozen independent timers drift apart, and the whole effect of a
 * set of figures settling depends on them settling at the same moment.
 *
 * IT FAILS TO THE TRUE VALUE, WHICH IS THE POINT OF THE TIMER. Every frame
 * displays a number that is not the real one, and the only thing making that
 * acceptable is that the sequence ends on the real one a few hundred
 * milliseconds later. Anything that stops `requestAnimationFrame` part way — a
 * backgrounded tab, a headless render, a browser throttling it — would
 * otherwise leave a confidently wrong figure on screen. A timer set past the
 * end of the ramp snaps to 1 whether or not a single frame ever ran.
 *
 * REDUCED MOTION SKIPS STRAIGHT TO 1. There is nothing to show someone who has
 * asked not to be shown it, and the figure is what they came for.
 *
 * @param key  Restarts the ramp when it changes. Pass whatever identifies the
 *             thing being shown; pass a constant to run it once on mount.
 */
export function useCountUp(key: string, ms = 620): number {
  const [progress, setProgress] = useState(1);
  const frame = useRef(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setProgress(1);
      return;
    }
    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / ms);
      /* Ease out: a figure that decelerates into its final value reads as
         settling. Linear reads as a counter, which is a different claim. */
      setProgress(1 - (1 - t) ** 3);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    setProgress(0);
    frame.current = requestAnimationFrame(tick);
    const guarantee = window.setTimeout(() => setProgress(1), ms + 150);
    return () => {
      cancelAnimationFrame(frame.current);
      window.clearTimeout(guarantee);
    };
  }, [key, ms]);

  return progress;
}
