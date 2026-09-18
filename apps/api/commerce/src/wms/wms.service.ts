/**
 * `thb_wms`. No endpoint yet — PLAN.md §4.3's table marks the warehouse
 * "(no MCP endpoint yet) — the pack photos T1 might later need".
 *
 * THE MODULE EXISTS ANYWAY BECAUSE THE RULE IS ONE MODULE PER SOURCE SYSTEM, not
 * one module per endpoint. The estate has five systems, so the API has five
 * pools. What keeps this from being dead code is `GET /health`, which opens all
 * five: a pool nobody has ever seen connect is a pool you are hoping about, and
 * the day the pack photos are needed is not the day to find out the credential
 * was never right.
 */
import { Inject, Injectable } from '@nestjs/common';
import { WMS_CLIENT, type WmsClient } from './wms.client';

@Injectable()
export class WmsService {
  constructor(@Inject(WMS_CLIENT) private readonly db: WmsClient) {}

  /** Cheapest possible proof that this system's credential and pool work. */
  async ping(): Promise<void> {
    await this.db.$queryRaw`select 1`;
  }
}
