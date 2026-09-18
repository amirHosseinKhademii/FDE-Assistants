/**
 * Thornbury Goods' backend. Five source systems, five modules, five pools.
 *
 * THERE IS NO AI IN THIS PACKAGE AND THERE MUST NOT BE. No model call, no
 * embedding, no prompt, no `@fde/agent`. That is the point of the whole
 * engagement rather than an oversight: this is the API a retailer would already
 * have, and the agent has to work with it rather than around it. If something
 * AI-shaped needs importing here, it belongs in `apps/ai/commerce` or
 * `apps/mcp/commerce` — the signal is reliable, so treat it as one.
 *
 * THE GUARD IS GLOBAL, VIA `APP_GUARD`. Registering it per-controller would make
 * "every request is authenticated" a property of remembering a decorator, and
 * the endpoint that gets forgotten is always the new one.
 */
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ShopModule } from './shop/shop.module';
import { WmsModule } from './wms/wms.module';
import { FleetModule } from './fleet/fleet.module';
import { CrmModule } from './crm/crm.module';
import { PolicyModule } from './policy/policy.module';
import { HealthModule } from './health/health.module';
import { ServiceTokenGuard } from './common/service-token.guard';

@Module({
  imports: [ShopModule, WmsModule, FleetModule, CrmModule, PolicyModule, HealthModule],
  providers: [{ provide: APP_GUARD, useClass: ServiceTokenGuard }],
})
export class AppModule {}
