/**
 * Which lessons the reader has opened. Kept in this browser only. Every read
 * and write is wrapped, because storage can be blocked, full, or missing.
 */
const KEY = 'course-visited';
const EVENT = 'course-progress';

/** The ids of the lessons opened so far, as "module/lesson". */
export function readVisited(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Record that a lesson was opened. Without storage the page still works, with no ticks. */
export function markVisited(id: string): void {
  try {
    const list = readVisited();
    if (list.includes(id)) return;
    list.push(id);
    window.localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Storage is unavailable. Nothing else depends on this write.
  }
}

/** Call onChange when the visited list changes. Returns the unsubscribe function. */
export function subscribeVisited(onChange: () => void): () => void {
  try {
    window.addEventListener(EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  } catch {
    return () => {};
  }
}
