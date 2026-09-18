/**
 * `GET /health` — and it opens ALL FIVE databases, not one.
 *
 * A HEALTH CHECK THAT TOUCHES ONE POOL IS A HEALTH CHECK FOR ONE POOL. This API
 * is five connections to five databases; four of them being fine is not
 * "healthy", it is a specific outage that will present as a tool returning an
 * empty walk. So each system is pinged separately and reported separately, and
 * the endpoint is only `ok` when every one of them answered.
 *
 * IT IS BEHIND THE SERVICE-TOKEN GUARD LIKE EVERYTHING ELSE. That costs a
 * liveness probe one header, and it buys the literal truth of
 * `commerce:api-guard-check`: unset token → EVERY request refused. An exempt
 * endpoint is an endpoint the check does not cover, and the exemption is always
 * the one that gets widened later.
 *
 * IT NEVER PUBLISHES WHY A SYSTEM IS DOWN. The failure goes to the log through
 * `publicError`; the caller gets `ok: false` and a reference. `@fde/guard`'s
 * `public-error.ts` is the argument: a database outage must not publish where
 * the database is, and `getaddrinfo ENOTFOUND ep-…-pooler.…aws.neon.tech` names
 * the project, the pooler, the region and the provider.
 */
import { Controller, Get, Inject } from '@nestjs/common';
import { publicError } from '@fde/guard';
import { SHOP_CLIENT, type ShopClient } from '../shop/shop.client';
import { FLEET_CLIENT, type FleetClient } from '../fleet/fleet.client';
import { CRM_CLIENT, type CrmClient } from '../crm/crm.client';
import { POLICY_CLIENT, type PolicyClient } from '../policy/policy.client';
import { WmsService } from '../wms/wms.service';
import { SYSTEMS, STANDS_FOR, DATABASE_NAME, type SystemName } from '../config/estate';

interface SystemHealth {
  system: SystemName;
  database: string;
  standsFor: string;
  ok: boolean;
  ms: number;
  /** Present only when `ok` is false. Joins this line to the server log. */
  ref?: string;
}

@Controller('health')
export class HealthController {
  constructor(
    @Inject(SHOP_CLIENT) private readonly shop: ShopClient,
    @Inject(FLEET_CLIENT) private readonly fleet: FleetClient,
    @Inject(CRM_CLIENT) private readonly crm: CrmClient,
    @Inject(POLICY_CLIENT) private readonly policy: PolicyClient,
    private readonly wms: WmsService,
  ) {}

  @Get()
  async health(): Promise<{ ok: boolean; systems: SystemHealth[] }> {
    const pings: Record<SystemName, () => Promise<unknown>> = {
      shop: () => this.shop.$queryRaw`select 1`,
      wms: () => this.wms.ping(),
      fleet: () => this.fleet.$queryRaw`select 1`,
      crm: () => this.crm.$queryRaw`select 1`,
      policy: () => this.policy.$queryRaw`select 1`,
    };

    const systems = await Promise.all(
      SYSTEMS.map(async (system): Promise<SystemHealth> => {
        const started = Date.now();
        try {
          await pings[system]();
          return {
            system,
            database: DATABASE_NAME[system],
            standsFor: STANDS_FOR[system],
            ok: true,
            ms: Date.now() - started,
          };
        } catch (cause) {
          const { ref } = publicError(cause, { context: `GET /health ${system}` });
          return {
            system,
            database: DATABASE_NAME[system],
            standsFor: STANDS_FOR[system],
            ok: false,
            ms: Date.now() - started,
            ref,
          };
        }
      }),
    );

    return { ok: systems.every((s) => s.ok), systems };
  }
}
