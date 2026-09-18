/** Imports all five systems, because a health check for four of them is a lie. */
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { ShopModule } from '../shop/shop.module';
import { WmsModule } from '../wms/wms.module';
import { FleetModule } from '../fleet/fleet.module';
import { CrmModule } from '../crm/crm.module';
import { PolicyModule } from '../policy/policy.module';

@Module({
  imports: [ShopModule, WmsModule, FleetModule, CrmModule, PolicyModule],
  controllers: [HealthController],
})
export class HealthModule {}
