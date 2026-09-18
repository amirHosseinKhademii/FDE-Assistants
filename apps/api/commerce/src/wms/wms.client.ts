/** The wms system's connection. See src/shop/shop.client.ts for the pattern and why. */
import { PrismaPg } from '@prisma/adapter-pg';
import type { Pool } from 'pg';
import { PrismaClient } from '../../generated/wms';
import { createSystemPool } from '../common/system-pool';

export const WMS_CLIENT = 'WMS_CLIENT';

export type WmsClient = PrismaClient;

export interface WmsHandle {
  client: WmsClient;
  pool: Pool;
}

export function createWmsHandle(): WmsHandle {
  const pool = createSystemPool('wms');
  return { pool, client: new PrismaClient({ adapter: new PrismaPg(pool) }) };
}
