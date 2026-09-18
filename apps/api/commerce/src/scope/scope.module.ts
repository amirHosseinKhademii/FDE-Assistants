/**
 * Scope resolution, shared by every module that reads a customer's data.
 *
 * It imports the CRM CLIENT rather than the CRM MODULE — the difference is what
 * keeps this from being a cycle, and `src/crm/crm-client.module.ts` is where
 * that is written down. It exports only the SERVICE, so a controller that wanted
 * to widen its own scope would have to change this file rather than reach past
 * it.
 */
import { Module } from '@nestjs/common';
import { ScopeService } from './scope.service';
import { CrmClientModule } from '../crm/crm-client.module';

@Module({
  imports: [CrmClientModule],
  providers: [ScopeService],
  exports: [ScopeService],
})
export class ScopeModule {}
