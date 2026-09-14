/**
 * The supplier list behind the picker.
 *
 * Same shape and same credential handling as `use-lots` — and an empty list is
 * honest here for the same reason: it disables the picker rather than implying
 * the register is empty.
 */
import { useQuery } from '@tanstack/react-query';

export function useSuppliers({
  apiKey,
  onAuthRequired,
}: {
  apiKey: string;
  onAuthRequired: () => void;
}) {
  return useQuery({
    queryKey: ['suppliers', apiKey],
    queryFn: async () => {
      const res = await fetch('/api/suppliers', {
        headers: apiKey ? { 'x-api-key': apiKey } : {},
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 503) onAuthRequired();
        return [] as any[];
      }
      return (await res.json()) as any[];
    },
    staleTime: 5 * 60 * 1000, // the register does not change while you look at it
  });
}
