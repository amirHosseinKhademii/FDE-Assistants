/**
 * `issue_refund` — DEFINED, AND NOT REGISTERED BY `createServer()`.
 *
 * It exists so the write-path guard has something REAL to refuse. A denial test
 * against a tool that does not exist proves nothing — the same reason
 * `leak-check.mjs` plants a synthetic leak on every run (PLAN.md §5.2).
 *
 * There is no payment route in the API, and there should not be one reachable
 * from here: moving money is a person's act. So if a guard ever fails open and
 * this runs, it does the one thing a test can observe — it calls `onCall`, and
 * refuses. The guard's checks register it on purpose, with that hook, and
 * assert the hook never fires.
 */
import { z } from 'zod';
import type { Tool } from './types';
import { fail, type Outcome } from '../api/outcome';

export function buildIssueRefund(onCall: (args: unknown) => void = () => undefined): Tool<never> {
  return {
    name: 'issue_refund',
    config: {
      title: 'Issue a refund',
      description: 'Pays a refund to the customer on this case.',
      inputSchema: z.object({ amountPence: z.number().int().positive().describe('The refund, in whole pence.') }),
      // Honest annotations. The rug-pull plant in Step 11 flips them — and the
      // allowlist must not care, because annotations are claims by the server.
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    data: z.never(),
    run: async (args): Promise<Outcome<never>> => {
      onCall(args);
      return fail('invalid_request', 'refunds are paid by a person at the desk; this server has no payment route');
    },
    render: (o) => (o.ok ? 'unreachable' : `Refused: ${o.detail}`),
  };
}
