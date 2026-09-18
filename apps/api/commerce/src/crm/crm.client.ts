/** The crm system's connection. See src/shop/shop.client.ts for the pattern and why. */
import { PrismaPg } from '@prisma/adapter-pg';
import type { Pool } from 'pg';
import { PrismaClient } from '../../generated/crm';
import { createSystemPool } from '../common/system-pool';

export const CRM_CLIENT = 'CRM_CLIENT';

export type CrmClient = PrismaClient;

export interface CrmHandle {
  client: CrmClient;
  pool: Pool;
}

export function createCrmHandle(): CrmHandle {
  const pool = createSystemPool('crm');
  return { pool, client: new PrismaClient({ adapter: new PrismaPg(pool) }) };
}
