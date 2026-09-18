/** `GET /deliveries/by-order/:orderId`. The endpoint that makes T1 findable. */
import { Controller, Get, Headers, Param } from '@nestjs/common';
import { FleetService } from './fleet.service';
import { ScopeService } from '../scope/scope.service';
import { OrderRefParam, type DeliveryResponse } from './fleet.dto';
import { zodPipe } from '../common/zod';
import { CASE_ID_HEADER } from '../config/env';
import type { Outcome } from '../common/outcome';

@Controller('deliveries')
export class FleetController {
  constructor(
    private readonly fleet: FleetService,
    private readonly scope: ScopeService,
  ) {}

  @Get('by-order/:orderId')
  async byOrder(
    @Param(zodPipe(OrderRefParam)) params: OrderRefParam,
    @Headers(CASE_ID_HEADER) caseId?: string,
  ): Promise<Outcome<DeliveryResponse>> {
    const scope = await this.scope.resolve(caseId);
    if (!scope.ok) return scope;

    // Scoped on the ORDER, not on the shipment. The shipment id is never a
    // parameter here — it is reached through a soft key from an order this case
    // is already entitled to, so there is no id a caller could substitute.
    const outOfScope = this.scope.orderInScope(scope.data, params.orderId);
    if (outOfScope) return outOfScope;

    return this.fleet.getDeliveryByOrder(params.orderId);
  }
}
