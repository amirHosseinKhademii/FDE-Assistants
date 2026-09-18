/**
 * FIVE POOLS. One per source system, created here, owned by the module that
 * asked for it, closed on shutdown.
 *
 * THIS IS THE APPLICATION-LAYER HALF OF A GUARANTEE THE STORAGE LAYER ALREADY
 * MAKES. The estate is five separate databases, so a SQL join between systems is
 * impossible at the server. This file restates it in the app, and the five
 * generated Prisma clients restate it a third time in the type system — where it
 * is the strongest of the three, because a pool cannot stop you typing a join
 * into raw SQL text and a generated client can: `shopClient` has no `shipment`
 * model to reach for. `commerce:api-isolation-check` asserts that against the
 * compiler rather than trusting the sentence.
 *
 * WHAT A CROSS-SYSTEM QUESTION LOOKS LIKE INSTEAD: application code, calling two
 * services in sequence, on purpose and in public. `src/scope/scope.service.ts`
 * is the canonical one — case → order_ref lives in the contact centre, the order
 * lives in the storefront, and getting from one to the other is a second
 * request, not a JOIN. `apps/ai/pharma/src/tools/departments/erp.ts` says why:
 * "Neither is a foreign key and neither can be — different database — so this
 * module is where the walk gets its footing."
 */
import { Pool } from 'pg';
import { systemUrl, DATABASE_NAME, type SystemName } from '../config/estate';

/**
 * Small on purpose. Five pools against one Neon project, each defaulting to
 * `pg`'s ten connections, is fifty — which is a lot of a metered resource for an
 * API whose callers number one. The pooled endpoint is doing the real
 * multiplexing; this number only has to cover in-flight requests.
 */
const MAX_CONNECTIONS_PER_SYSTEM = 4;

export function createSystemPool(system: SystemName): Pool {
  return new Pool({
    connectionString: systemUrl(system),
    max: MAX_CONNECTIONS_PER_SYSTEM,
    // A hung connect must fail rather than hold a request open forever; the
    // caller is a tool call inside a model turn, and a model turn has a budget.
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    application_name: `thornbury-commerce-api/${DATABASE_NAME[system]}`,
  });
}
