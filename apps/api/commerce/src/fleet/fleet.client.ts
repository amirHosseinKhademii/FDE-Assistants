/** The fleet system's connection. See src/shop/shop.client.ts for the pattern and why. */
import { PrismaPg } from '@prisma/adapter-pg';
import type { Pool } from 'pg';
import { PrismaClient } from '../../generated/fleet';
import { createSystemPool } from '../common/system-pool';

export const FLEET_CLIENT = 'FLEET_CLIENT';

export type FleetClient = PrismaClient;

export interface FleetHandle {
  client: FleetClient;
  pool: Pool;
}

export function createFleetHandle(): FleetHandle {
  const pool = createSystemPool('fleet');
  return { pool, client: new PrismaClient({ adapter: new PrismaPg(pool) }) };
}
