/**
 * WHAT THE API ACTUALLY RETURNS, as a schema rather than as a hope.
 *
 * STEP 4b IS THE REASON THIS FILE EXISTS. `getJson<Order>` was a cast. A cast
 * is not a check — it tells the compiler what to believe, and the compiler has
 * no way to disagree. So the live call returned `ok: true` with an order whose
 * id, status, total and every line quantity were `undefined`, and every layer
 * reported success: the envelope, the tool, `isError`. The only symptom was the
 * word "undefined" in prose a human happened to read.
 *
 * That is the worst available failure. A 500 is loud; a refusal is labelled; a
 * silently wrong success is neither, and it is what an unvalidated boundary
 * produces by default.
 *
 * So the boundary parses. A payload that does not match is `malformed_response`
 * — a named, countable outcome — rather than `undefined` spreading inward.
 *
 * The shapes below were read off the running API on 2026-09-18, not guessed:
 *   curl -H 'x-service-token: …' -H 'x-case-id: CAS-90001' :3610/orders/ORD-101414
 */
import { z } from 'zod';

/** Money is INTEGER PENCE everywhere. pg returns numeric as a string; nothing here is numeric. */
const Pence = z.number().int();

export const OrderLineSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  variantName: z.string().nullable().optional(),
  quantity: z.number().int(),
  unitPricePence: Pence,
  lineTotalPence: Pence,
  /** T2 lives here: a "smart desk lamp" whose category reads one way and sells another. */
  productCategory: z.string().nullable().optional(),
  /** T4 lives here: the item is third-party sold and no policy addresses that. */
  marketplaceSeller: z.string().nullable().optional(),
});

export const OrderResponseSchema = z.object({
  // NESTED, which the stub did not know. The stub was flat and it was lying.
  order: z.object({
    id: z.string(),
    placedAt: z.string(),
    status: z.string(),
    channel: z.string(),
    serviceLevel: z.string().nullable().optional(),
    shipmentRef: z.string().nullable().optional(),
    promisedBy: z.string().nullable().optional(),
    subtotalPence: Pence,
    shippingPence: Pence,
    totalPence: Pence,
  }),
  /**
   * READ OFF THE WIRE, NOT GUESSED — and this field is where I guessed twice.
   * It was `id`, then the live call said `userId`. Both times the compiler was
   * content, because a cast cannot disagree and a schema can.
   *
   * ⚠ CONTAINS PII. `email` and `fullName` are a named customer's, and every
   * field in `structuredContent` goes into the model's context. Parsed here so
   * the contract is honest about what arrives; deliberately NOT rendered into
   * the prose the model reads — see `summarise()` in get-order.ts. Whether it
   * should cross the boundary at all is a data-residency decision, not a
   * formatting one, and docs/steering/DATA-RESIDENCY.md is the precedent for
   * writing such things down rather than defaulting them.
   */
  customer: z.object({
    userId: z.string(),
    email: z.string().optional(),
    fullName: z.string().optional(),
  }).loose(),
  items: z.array(OrderLineSchema),
  payments: z.array(
    z.object({ id: z.string(), method: z.string(), amountPence: Pence }).loose(),
  ),
  /** THE FIELD T3 TURNS ON — a prior refund the order total still hides. */
  priorRefunds: z.array(
    z.object({ id: z.string(), amountPence: Pence }).loose(),
  ),
  totals: z.object({
    capturedPence: Pence,
    refundedPence: Pence,
    netPence: Pence,
  }),
});

export type OrderResponse = z.infer<typeof OrderResponseSchema>;
