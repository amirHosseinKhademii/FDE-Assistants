/**
 * Reads from `thb_shop` and nothing else.
 *
 * ONE QUERY, NOT FOUR. Items, payments and refunds are all real foreign keys
 * INSIDE this database, so Prisma's `include` is a genuine SQL join and exactly
 * the right tool. The rule that a join must be unexpressible is about crossing
 * SYSTEMS; inside one, the FKs are real and PLAN.md §2.1 means them.
 *
 * `getOrder` reads as a list of the steps it orchestrates — fetch, total,
 * assemble — and each row-to-DTO shape is its own named function below.
 */
import { Inject, Injectable } from '@nestjs/common';
import { SHOP_CLIENT, type ShopClient } from './shop.client';
import { OrderResponse } from './shop.dto';
import { shapeResponse } from '../common/zod';
import { assertPence } from '../common/money';
import { succeed, outOfScope, type Outcome } from '../common/outcome';
import { civilDate } from '../common/calendar/working-days';

type OrderWithEverything = NonNullable<Awaited<ReturnType<ShopService['findOrder']>>>;

@Injectable()
export class ShopService {
  constructor(@Inject(SHOP_CLIENT) private readonly db: ShopClient) {}

  async getOrder(orderId: string): Promise<Outcome<OrderResponse>> {
    const order = await this.findOrder(orderId);

    // A missing order is `out_of_scope`, NOT `not_found`, deliberately. See
    // src/common/outcome.ts: telling the two apart is an enumeration oracle over
    // Thornbury's order book.
    if (!order) return outOfScope('order');

    return succeed(
      shapeResponse(
        OrderResponse,
        {
          order: toOrderDto(order),
          customer: toCustomerDto(order),
          items: order.items.map(toItemDto),
          payments: order.payments.map(toPaymentDto),
          priorRefunds: order.refunds.map(toRefundDto),
          totals: totalsFor(order),
        },
        'GET /orders/:id',
      ),
    );
  }

  private findOrder(orderId: string) {
    return this.db.order.findUnique({
      where: { orderId },
      include: {
        user: true,
        payments: { orderBy: { capturedAt: 'asc' } },
        refunds: { orderBy: { issuedAt: 'asc' } },
        items: { include: { product: { include: { categoryRc: true } }, variant: true } },
      },
    });
  }
}

// ── row → DTO ───────────────────────────────────────────────────────────────

function toOrderDto(order: OrderWithEverything) {
  return {
    id: order.orderId,
    status: order.status,
    channel: order.channel,
    serviceLevel: order.serviceLevel,
    placedAt: order.placedAt.toISOString(),
    promisedBy: civilDate(order.promisedBy),
    subtotalPence: assertPence(order.subtotalPence, 'order.subtotalPence'),
    shippingPence: assertPence(order.shippingPence, 'order.shippingPence'),
    totalPence: assertPence(order.totalPence, 'order.totalPence'),
    shipmentRef: order.shipmentRef,
  };
}

function toCustomerDto(order: OrderWithEverything) {
  return { userId: order.user.userId, email: order.user.email, fullName: order.user.fullName };
}

function toItemDto(item: OrderWithEverything['items'][number]) {
  return {
    id: item.orderItemId,
    sku: item.product.sku,
    name: item.product.name,
    variantName: item.variant.variantName,
    quantity: item.qty,
    unitPricePence: assertPence(item.unitPricePence, 'item.unitPricePence'),
    lineTotalPence: assertPence(item.lineTotalPence, 'item.lineTotalPence'),
    // T2 and T4 both arrive here, unreconciled. See shop.dto.ts.
    productCategory: item.product.categoryRc.name,
    marketplaceSeller: item.product.marketplaceSeller,
  };
}

/**
 * `payments` HAS NO STATUS COLUMN, and that is the estate's design rather than
 * an omission: a row exists once money was taken, and `captured_at` is not
 * nullable. So every payment row counts, and there is no "authorised but not
 * captured" state to filter out. If that ever changes in the DDL, `totalsFor`
 * is the function that has to change with it.
 */
function toPaymentDto(payment: OrderWithEverything['payments'][number]) {
  return {
    id: payment.paymentId,
    method: payment.method,
    amountPence: assertPence(payment.amountPence, 'payment.amountPence'),
    capturedAt: payment.capturedAt.toISOString(),
    pspReference: payment.pspReference,
  };
}

/** Likewise `refunds`: a row means money went back, so there is nothing to filter. */
function toRefundDto(refund: OrderWithEverything['refunds'][number]) {
  return {
    id: refund.refundId,
    orderItemId: refund.orderItemId,
    amountPence: assertPence(refund.amountPence, 'refund.amountPence'),
    kind: refund.kind,
    reason: refund.reason,
    issuedAt: refund.issuedAt.toISOString(),
    issuedBy: refund.issuedBy,
  };
}

/** T3's arithmetic, in one place. */
function totalsFor(order: OrderWithEverything) {
  const capturedPence = order.payments.reduce(
    (sum, p) => sum + assertPence(p.amountPence, 'payment.amountPence'),
    0,
  );
  const refundedPence = order.refunds.reduce(
    (sum, r) => sum + assertPence(r.amountPence, 'refund.amountPence'),
    0,
  );
  return { capturedPence, refundedPence, netPence: capturedPence - refundedPence };
}
