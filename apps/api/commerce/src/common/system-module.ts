/**
 * The provider pair every system module repeats: a HANDLE (pool + client) that
 * the module owns and closes, and a CLIENT token that everything else injects.
 *
 * TWO TOKENS AND NOT ONE, because a service should be given the narrowest thing
 * that does its job. A service holding the handle could reach `handle.pool` and
 * issue raw SQL against a system it was only meant to read through the model
 * layer — which is how the unexpressible join gets expressed after all.
 */
import type { Pool } from 'pg';

export interface SystemHandle<TClient> {
  client: TClient;
  pool: Pool;
}

/** Closing order matters: the client first, then the pool it was borrowing from. */
export async function closeHandle(handle: SystemHandle<{ $disconnect(): Promise<void> }>) {
  await handle.client.$disconnect();
  await handle.pool.end();
}
