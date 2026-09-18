/**
 * The contact centre — and the only module with a write path.
 *
 * Its POOL lives next door in `CrmClientModule`; see that file for the cycle
 * this split exists to break.
 */
import { Module } from '@nestjs/common';
import { CrmClientModule } from './crm-client.module';
import { CrmService } from './crm.service';
import { CrmController } from './crm.controller';
import { ScopeModule } from '../scope/scope.module';

@Module({
  imports: [CrmClientModule, ScopeModule],
  controllers: [CrmController],
  providers: [CrmService],
  // Re-exports CrmClientModule so a consumer that wants the client — `/health`
  // does — gets it by importing this module, without needing to know that the
  // connection lives in a separate one.
  exports: [CrmClientModule, CrmService],
})
export class CrmModule {}
