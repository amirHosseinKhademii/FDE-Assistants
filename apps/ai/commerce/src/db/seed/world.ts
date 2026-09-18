/**
 * The whole estate, in memory, off one seed. No database, no model, no cost.
 *
 * FIVE BUILDERS, FIVE STREAMS, ONE ORDER OF ASSEMBLY. The order is not
 * cosmetic. `thb_policy` points at nothing, so it is first and the SLA rows it
 * holds are available to compute every order's promised date. `thb_shop` mints
 * the orders. The warehouse packs them, the fleet carries them, and the contact
 * centre is last because it can only talk about deliveries that have happened.
 * Write a system before the one it points at and every soft key out of it is a
 * guess.
 *
 * WHY THIS IS A PURE FUNCTION. `world-fingerprint.ts` runs it to hash what the
 * seed WOULD write, offline and free, in the same breath as a typecheck. The
 * moment anything here reads the clock or the network, that check becomes a
 * test of the network.
 */
import { buildContacts } from './contact';
import { buildFleet } from './fleet';
import { buildPolicy } from './policy';
import { buildShop } from './shop';
import { buildWarehouse } from './warehouse';
import type { Estate, Fleet, Shop } from '../schema/rows';

export { SEED } from './rng';
export { ANCHORS } from './anchors';

/**
 * THE SOFT KEY GETS ITS VALUE FROM THE SYSTEM THAT OWNS THE IDENTIFIER, ONCE.
 *
 * `orders.shipment_ref` holds a thb_fleet identifier, and thb_fleet is what
 * mints it. Constructing the same string in `shop.ts` as well would work right
 * up until one of the two formats changed, and then the two databases would
 * disagree with no foreign key to notice — which is the exact failure the soft
 * key is a standing lesson about. So the column is written NULL when the order
 * is built and filled here, from the shipment rows themselves.
 */
function linkShipments(shop: Shop, fleet: Fleet): void {
  const shipmentFor = new Map(fleet.shipments.map((s) => [s.order_ref, s.shipment_id]));
  for (const order of shop.orders) {
    order.shipment_ref = shipmentFor.get(order.order_id) ?? null;
  }
}

export function buildWorld(): Estate {
  const policy = buildPolicy();
  const { shop, plans } = buildShop(policy);
  const wms = buildWarehouse(shop, plans);
  const fleet = buildFleet(plans, wms);
  linkShipments(shop, fleet);
  const crm = buildContacts(shop, plans);

  return { shop, wms, fleet, crm, policy };
}
