/**
 * `GET /policy/rules` and `GET /policy/sla`.
 *
 * NO SCOPE CHECK HERE, AND THAT IS A DECISION RATHER THAN AN OMISSION. Policy is
 * Thornbury's own configuration: it names no customer, no order and no address,
 * and the same rows govern every case. Scoping it to a case would be ceremony
 * that implies a protection it does not provide, and it would break the tool
 * that has to ask "what is the window for electronics" before any order is
 * identified. The service token is the control that applies to these two.
 */
import { Controller, Get, Query } from '@nestjs/common';
import { PolicyService } from './policy.service';
import {
  PolicyRulesQuery,
  SlaQuery,
  type PolicyRulesResponse,
  type SlaResponse,
} from './policy.dto';
import { zodPipe } from '../common/zod';
import type { Outcome } from '../common/outcome';

@Controller('policy')
export class PolicyController {
  constructor(private readonly policy: PolicyService) {}

  @Get('rules')
  async rules(
    @Query(zodPipe(PolicyRulesQuery)) query: PolicyRulesQuery,
  ): Promise<Outcome<PolicyRulesResponse>> {
    return this.policy.getRules(query);
  }

  @Get('sla')
  async sla(@Query(zodPipe(SlaQuery)) query: SlaQuery): Promise<Outcome<SlaResponse>> {
    return this.policy.getSla(query);
  }
}
