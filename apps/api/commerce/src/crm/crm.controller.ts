/** `GET /case`, `GET /customers/:id/history` and `POST /resolutions`. */
import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { CrmService } from './crm.service';
import { ScopeService } from '../scope/scope.service';
import {
  CaseScopeResponse,
  CustomerIdParam,
  ProposeResolutionBody,
  type CustomerHistoryResponse,
  type ProposeResolutionResponse,
} from './crm.dto';
import { shapeResponse, zodPipe } from '../common/zod';
import { CASE_ID_HEADER } from '../config/env';
import { outOfScope, succeed, type Outcome } from '../common/outcome';

@Controller()
export class CrmController {
  constructor(
    private readonly crm: CrmService,
    private readonly scope: ScopeService,
  ) {}

  /**
   * The case this request is scoped to — its customer and its order — read
   * back from the `x-case-id` header. See `CaseScopeResponse` for why it exists.
   * No parameter: the header IS the question, so there is nothing to enumerate.
   */
  @Get('case')
  async currentCase(@Headers(CASE_ID_HEADER) caseId?: string): Promise<Outcome<CaseScopeResponse>> {
    const scope = await this.scope.resolve(caseId);
    if (!scope.ok) return scope;
    return succeed(shapeResponse(CaseScopeResponse, scope.data, 'GET /case'));
  }

  @Get('customers/:id/history')
  async history(
    @Param(zodPipe(CustomerIdParam)) params: CustomerIdParam,
    @Headers(CASE_ID_HEADER) caseId?: string,
  ): Promise<Outcome<CustomerHistoryResponse>> {
    const scope = await this.scope.resolve(caseId);
    if (!scope.ok) return scope;

    const outOfScope = this.scope.customerInScope(scope.data, params.id);
    if (outOfScope) return outOfScope;

    return this.crm.getCustomerHistory(params.id);
  }

  /**
   * THE WRITE, AND IT IS SCOPED LIKE EVERY READ.
   *
   * `caseId` is in the body because a proposal is ABOUT a case, and it is
   * checked against the session's case anyway. A caller that could write a draft
   * onto someone else's case would be able to put words in front of a different
   * customer's adjuster — which is a smaller blast radius than reading their
   * order and a worse one to explain.
   */
  @Post('resolutions')
  async propose(
    @Body(zodPipe(ProposeResolutionBody)) body: ProposeResolutionBody,
    @Headers(CASE_ID_HEADER) caseId?: string,
  ): Promise<Outcome<ProposeResolutionResponse>> {
    const scope = await this.scope.resolve(caseId);
    if (!scope.ok) return scope;

    if (scope.data.caseId !== body.caseId) return outOfScope('case');

    return this.crm.proposeResolution(body);
  }
}
