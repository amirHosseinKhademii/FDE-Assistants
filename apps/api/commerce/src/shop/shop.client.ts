/**
 * The storefront's connection. One pool, one Prisma client, no other system's
 * models in scope.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import type { Pool } from 'pg';
import { PrismaClient } from '../../generated/shop';
import { createSystemPool } from '../common/system-pool';

export const SHOP_CLIENT = 'SHOP_CLIENT';

export type ShopClient = PrismaClient;

export interface ShopHandle {
  client: ShopClient;
  pool: Pool;
}

/**
 * Prisma 7 takes a DRIVER ADAPTER rather than a connection string, which is why
 * `pg` survived the move to Prisma — and is a happy accident for this app: the
 * pool is an object this code holds, so "five pools" is something you can point
 * at rather than something the ORM is doing somewhere.
 */
export function createShopHandle(): ShopHandle {
  const pool = createSystemPool('shop');
  return { pool, client: new PrismaClient({ adapter: new PrismaPg(pool) }) };
}
