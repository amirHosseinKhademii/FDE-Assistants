/**
 * Remembered locally, so nobody retypes the same thing all day.
 *
 * WHY THIS IS IN A PRESENTATION PACKAGE AND THE SSE CLIENT IS NOT. This
 * package's header excludes transport and request state, on the grounds that a
 * package with two jobs ends up with two unrelated things sharing one name.
 * This is neither: it is where a control's last value lives between visits,
 * which is a property of the surface and of nothing else.
 *
 * EXTRACTED ON THE SECOND OCCURRENCE, NOT THE FIRST. Both apps held a
 * byte-identical copy whose only difference was the key prefix — `claims.`
 * against `pharma.` — and that difference is exactly what says what the
 * parameter should be. Nothing here was designed; it was measured.
 *
 * NAMESPACED BECAUSE THE TWO SURFACES SHARE AN ORIGIN IN DEVELOPMENT. Both dev
 * servers are `localhost`, so an unprefixed `question` key would have one
 * product reading the other's last question back out of storage.
 *
 * IT NEVER THROWS. `localStorage` raises on a full quota and in some private
 * browsing modes, and a control that cannot remember its last value must not be
 * a control that breaks the page.
 */
export interface Store {
  load(key: string, fallback: string): string;
  save(key: string, value: string): void;
}

export function createStore(namespace: string): Store {
  const at = (key: string) => `${namespace}.${key}`;

  return {
    load(key, fallback) {
      // This runs on the server first, where there is no localStorage.
      if (typeof window === 'undefined') return fallback;
      try {
        return window.localStorage.getItem(at(key)) ?? fallback;
      } catch {
        return fallback;
      }
    },

    save(key, value) {
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.setItem(at(key), value);
      } catch {
        // Deliberately silent. See the header.
      }
    },
  };
}
