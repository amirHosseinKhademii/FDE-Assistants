/**
 * Where the lessons are mounted.
 *
 * WHY A CONTEXT AND NOT A PROP ON EVERY PAGE. Each lesson links to other
 * lessons, and there are ~30 pages with ~9 such links between them. Threading a
 * `basePath` prop through every page would make each one carry a fact about
 * the host app that has nothing to do with its argument. The host sets it once,
 * at the layout that renders the lessons, and the pages read it where they link.
 *
 * THE DEFAULT IS `/learn`, which is where Veresk mounts them, so a host that
 * mounts there needs no provider at all. A host that mounts elsewhere wraps its
 * layout in `<LearnProvider basePath="/teaching">` and every internal link
 * follows.
 *
 * NOTHING HERE READS `import.meta.env`. The lessons contain no external
 * engagement URLs (`grep` for them finds none), so there is nothing else for a
 * host to inject. If one is ever needed, it comes in through this file, as a
 * prop of the provider, and not through a build-time variable in the package.
 */
import { createContext, useContext, type ReactNode } from 'react';

interface LearnConfig {
  basePath: string;
}

const LearnContext = createContext<LearnConfig>({ basePath: '/learn' });

export function LearnProvider({ basePath = '/learn', children }: { basePath?: string; children: ReactNode }) {
  // A trailing slash would make every link `/learn//loop`, which the router
  // would treat as a different path. Strip it once, here.
  const value: LearnConfig = { basePath: basePath.replace(/\/+$/, '') };
  return <LearnContext.Provider value={value}>{children}</LearnContext.Provider>;
}

/** The path the lessons are mounted at, e.g. `/learn`. */
export function useLearnBase(): string {
  return useContext(LearnContext).basePath;
}
