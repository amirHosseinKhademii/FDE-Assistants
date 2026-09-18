/**
 * What `GET /orders/:id` promises. Zod, like every other schema in this
 * workspace — see src/common/zod.ts for why this is not `class-validator`.
 *
 * MONEY IS `z.int()` AND THAT IS NOT DECORATION. It is the last place a decimal
 * can be caught before it becomes a model's belief about what a customer is
 * owed. `shapeResponse` parses the assembled object through this schema on the
 * way out, so a column renamed in the DDL fails HERE, in this API's log, rather
 * than arriving as a `null` the model writes a fluent paragraph around.
 *
 * TIMESTAMPS LEAVE AS ISO STRINGS. Prisma hands back `Date`; JSON has no date
 * type; the conversion is made explicit and typed rather than left to the
 * serialiser to do silently and to the reader to assume.
 */
import { z } from 'zod';

export const OrderIdParam = z.strictObject({
  id: z.string().min(1).max(64),
});
export type OrderIdParam = z.infer<typeof OrderIdParam>;

const Money = z.int();
const Instant = z.string();
const CivilDate = z.string();

export const OrderItemDto = z.strictObject({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  variantName: z.string(),
  quantity: z.int(),
  unitPricePence: Money,
  lineTotalPence: Money,
  /**
   * T2 ARRIVES THROUGH THIS FIELD. The category is a row in `categories`, and a
   * "smart desk lamp" filed under homeware reads as electronics to every human
   * who sees it. It is returned verbatim and unreconciled — the row and the
   * published document disagree about the return window, and resolving that
   * disagreement is a human's job, not this API's.
   */
  productCategory: z.string(),
  /**
   * T4 ARRIVES THROUGH THIS ONE. Non-null when the line was sold by a
   * third-party marketplace seller rather than by Thornbury. None of
   * Thornbury's policies address those, so an answer about one has nothing
   * behind it — which is only visible if the API says so rather than leaving
   * the model to assume first-party.
   */
  marketplaceSeller: z.string().nullable(),
});

export const PaymentDto = z.strictObject({
  id: z.string(),
  method: z.string(),
  amountPence: Money,
  capturedAt: Instant,
  pspReference: z.string(),
});

export const RefundDto = z.strictObject({
  id: z.string(),
  orderItemId: z.string().nullable(),
  amountPence: Money,
  kind: z.string(),
  reason: z.string(),
  issuedAt: Instant,
  issuedBy: z.string(),
});

export const OrderResponse = z.strictObject({
  order: z.strictObject({
    id: z.string(),
    status: z.string(),
    channel: z.string(),
    serviceLevel: z.string(),
    placedAt: Instant,
    /** The date the customer was promised, as a civil date. Not a timestamp. */
    promisedBy: CivilDate,
    subtotalPence: Money,
    shippingPence: Money,
    totalPence: Money,
    /** Soft key into thb_fleet. A string, not a join. */
    shipmentRef: z.string().nullable(),
  }),
  customer: z.strictObject({
    userId: z.string(),
    email: z.string(),
    fullName: z.string(),
  }),
  items: z.array(OrderItemDto),
  payments: z.array(PaymentDto),
  /**
   * T3. Returned with the order rather than behind a second call, because
   * "refunding an order that was already refunded" is the error that costs
   * straight cash, and an endpoint that makes the caller REMEMBER to ask is an
   * endpoint that will eventually be called by something that forgets.
   */
  priorRefunds: z.array(RefundDto),
  totals: z.strictObject({
    capturedPence: Money,
    refundedPence: Money,
    /** captured − refunded. What is actually still with Thornbury. */
    netPence: Money,
  }),
});
export type OrderResponse = z.infer<typeof OrderResponse>;
