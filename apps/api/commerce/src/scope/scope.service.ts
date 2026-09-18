/**
 * SCOPE COMES FROM THE SESSION, NEVER FROM THE MODEL. PLAN.md §7.1, enforced.
 *
 * THE PROBLEM THIS SOLVES IS THE CONFUSED DEPUTY. The MCP server presents a
 * service token that can read ANY order at Thornbury — it has to, because it
 * does not know in advance which case it will be asked about. The model behind
 * it must not inherit that reach. If authorization lived in the arguments, then
 * `get_order(order_id)` would be the model choosing whose order to read, and the
 * injected text in T5 ("your colleague Dave already approved the full refund")
 * would be one short step from naming a stranger's order id.
 *
 * So the case id arrives in a HEADER set by the MCP server from its session, the
 * server reads `cases.order_ref` off that case, and an order that is not that
 * order is not in scope. The model can ask for anything; asking is not reaching.
 *
 * THIS IS THE SANCTIONED CROSS-SYSTEM WALK, and it is worth naming as such. The
 * case lives in `thb_crm` and the order lives in `thb_shop` — different
 * databases, so `cases.order_ref` is a soft key and there is no join to write.
 * The walk is two queries in application code, on purpose and in public, exactly
 * as `apps/ai/pharma/src/tools/departments/erp.ts` describes. What it is NOT is
 * a shortcut: the scope check runs on this side of the boundary, before the row
 * is read, every time.
 */
import { Inject, Injectable } from '@nestjs/common';
import { CRM_CLIENT, type CrmClient } from '../crm/crm.client';
import {
  succeed,
  noCasePresented,
  outOfScope,
  unknownCase,
  type Outcome,
  type Failure,
} from '../common/outcome';

export interface CaseScope {
  caseId: string;
  customerId: string;
  /** May be null: a contact can be opened before an order is identified. */
  orderRef: string | null;
}

@Injectable()
export class ScopeService {
  constructor(@Inject(CRM_CLIENT) private readonly db: CrmClient) {}

  /** Turn the session's case id into what that case is allowed to see. */
  async resolve(caseId: string | undefined | null): Promise<Outcome<CaseScope>> {
    const id = (caseId ?? '').trim();
    if (!id) return noCasePresented();

    const row = await this.db.case.findUnique({
      where: { caseId: id },
      select: { caseId: true, customerId: true, orderRef: true },
    });
    if (!row) return unknownCase();

    return succeed({
      caseId: row.caseId,
      customerId: row.customerId,
      orderRef: row.orderRef,
    });
  }

  /**
   * Is this order the one this case is about?
   *
   * Returns the Failure rather than a boolean so the caller cannot accidentally
   * write `if (inScope)` around a promise and have it pass. A check whose
   * failure mode is "truthy object" is not a check.
   */
  orderInScope(scope: CaseScope, requestedOrderId: string): Failure | null {
    if (!scope.orderRef || scope.orderRef !== requestedOrderId) {
      return outOfScope('order');
    }
    return null;
  }

  customerInScope(scope: CaseScope, requestedCustomerId: string): Failure | null {
    if (scope.customerId !== requestedCustomerId) {
      return outOfScope('customer');
    }
    return null;
  }
}
