/**
 * `GET /orders/:id`.
 *
 * THE SCOPE CHECK RUNS BEFORE THE READ, EVERY TIME, and it is three lines that
 * carry PLAN.md §7.1. The caller names an order; this API does not take its word
 * for it. The case id comes from the session header, the case names an order,
 * and if the two disagree the answer is a structured miss and the row is never
 * fetched. Never trust the caller to only ask for what it should.
 */
import { Controller, Get, Headers, Param } from '@nestjs/common';
import { ShopService } from './shop.service';
import { ScopeService } from '../scope/scope.service';
import { OrderIdParam, type OrderResponse } from './shop.dto';
import { zodPipe } from '../common/zod';
import { CASE_ID_HEADER } from '../config/env';
import type { Outcome } from '../common/outcome';

@Controller('orders')
export class ShopController {
  constructor(
    private readonly shop: ShopService,
    private readonly scope: ScopeService,
  ) {}

  @Get(':id')
  async getOrder(
    @Param(zodPipe(OrderIdParam)) params: OrderIdParam,
    @Headers(CASE_ID_HEADER) caseId?: string,
  ): Promise<Outcome<OrderResponse>> {
    const scope = await this.scope.resolve(caseId);
    if (!scope.ok) return scope;

    const outOfScope = this.scope.orderInScope(scope.data, params.id);
    if (outOfScope) return outOfScope;

    return this.shop.getOrder(params.id);
  }
}
