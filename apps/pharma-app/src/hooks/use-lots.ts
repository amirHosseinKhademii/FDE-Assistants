/**
 * The batch list behind the dropdown.
 *
 * Lifted out of the page for one reason: it is the third query-shaped thing in
 * this app with the same credential handling, and a fetch whose 401 branch is
 * written inline three times is a fetch whose 401 branch will eventually differ
 * in one of them.
 */
import { useQuery } from '@tanstack/react-query';

export function useLots({
  apiKey,
  onAuthRequired,
}: {
  apiKey: string;
  onAuthRequired: () => void;
}) {
  return useQuery({
    queryKey: ['lots', apiKey],
    queryFn: async () => {
      const res = await fetch('/api/lots', { headers: apiKey ? { 'x-api-key': apiKey } : {} });
      if (!res.ok) {
        if (res.status === 401 || res.status === 503) onAuthRequired();
        // Unlike the history list, an empty dropdown is honest: it disables the
        // picker rather than implying anything about the estate.
        return [] as any[];
      }
      return (await res.json()) as any[];
    },
    staleTime: 5 * 60 * 1000, // the estate does not change while you look at it
  });
}
