import { useEffect, useRef, useState } from 'react';

/**
 * One engine as the server reports it: which loops can run against the
 * configured provider. A picker greys out `usable: false` rather than hiding it,
 * so a visitor can see the option exists and why it is not offered.
 */
export interface LoopEngine {
  id: string;
  label: string;
  usable: boolean;
  reason?: string | null;
}

/**
 * What a picker shows before the server has answered. Every engine is offered,
 * because until the server says otherwise nothing is known to be unusable.
 */
export const LOOP_ENGINES_FALLBACK: LoopEngine[] = [
  { id: 'sdk', label: 'Agents SDK', usable: true },
  { id: 'mastra', label: 'Mastra', usable: true },
  { id: 'langgraph', label: 'LangGraph', usable: true },
];

/**
 * The engines this server can run, and the one it runs by default.
 *
 * THE SERVER IS THE REAL FIX. A visitor may have `sdk` saved in localStorage
 * from an earlier visit, and the server falls back to its configured engine for
 * a request that names an unusable one. This hook makes the picker agree with
 * that: once the list arrives, a saved value that cannot run here is replaced by
 * the configured engine. A saved value that can run is kept.
 *
 * `url` is the app's `/api/engines`. Reading it failed or was absent leaves the
 * fallback list in place, so a picker still works offline or on an old server.
 */
export function useLoopEngines(
  loop: string,
  setLoop: (v: string) => void,
  url = '/api/engines',
): LoopEngine[] {
  const [engines, setEngines] = useState<LoopEngine[]>(LOOP_ENGINES_FALLBACK);
  // Read through a ref so the mount-only fetch sees the value the visitor has
  // now, not the one the page started with.
  const loopRef = useRef(loop);
  loopRef.current = loop;

  useEffect(() => {
    let live = true;
    fetch(url, { headers: { accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { engines?: LoopEngine[]; configured?: string } | null) => {
        if (!live || !d || !Array.isArray(d.engines)) return;
        setEngines(d.engines);
        const current = loopRef.current;
        const usable = d.engines.some((e) => e.id === current && e.usable);
        if (!usable && d.configured) setLoop(d.configured);
      })
      .catch(() => {
        /* keep the fallback list */
      });
    return () => {
      live = false;
    };
    // Mount only: the server's answer does not change while the page is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return engines;
}
