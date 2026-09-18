/** The policy system's connection. See src/shop/shop.client.ts for the pattern and why. */
import { PrismaPg } from '@prisma/adapter-pg';
import type { Pool } from 'pg';
import { PrismaClient } from '../../generated/policy';
import { createSystemPool } from '../common/system-pool';

export const POLICY_CLIENT = 'POLICY_CLIENT';

export type PolicyClient = PrismaClient;

export interface PolicyHandle {
  client: PolicyClient;
  pool: Pool;
}

export function createPolicyHandle(): PolicyHandle {
  const pool = createSystemPool('policy');
  return { pool, client: new PrismaClient({ adapter: new PrismaPg(pool) }) };
}
