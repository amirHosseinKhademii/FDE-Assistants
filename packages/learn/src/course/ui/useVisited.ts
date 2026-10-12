import { useEffect, useState } from 'react';
import { readVisited, subscribeVisited } from '../progress';

/** The visited lesson ids, kept in sync across the page. Empty until mounted, so the first paint matches the server shape. */
export function useVisited(): string[] {
  const [visited, setVisited] = useState<string[]>([]);
  useEffect(() => {
    const sync = () => setVisited(readVisited());
    sync();
    return subscribeVisited(sync);
  }, []);
  return visited;
}
