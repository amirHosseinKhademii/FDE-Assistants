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

// ── Added 2026-09-27: the three read tools PLAN.md §5.1 lists and the fourteen
// steps never scheduled. Every shape below MIRRORS THE API'S OWN RESPONSE DTO
// (apps/api/commerce/src/*/…dto.ts, which the API enforces on every response via
// `shapeResponse`) — nullability read off the contract, not guessed from one
// sample. They are plain `z.object`, which STRIPS undeclared keys on parse: so
// each schema is also the statement of what LEAVES the tool, and a field left
// out here never reaches the model. Every omission is named where it happens.

const Instant = z.string();
const CivilDate = z.string();

/** `GET /case` — the case → customer → order the API resolves from the header. */
export const CaseScopeSchema = z.object({
  caseId: z.string(),
  customerId: z.string(),
  orderRef: z.string().nullable(),
});

/** `GET /policy/sla` — the working-day arithmetic, T6. */
export const SlaSchema = z.object({
  citation: z.string(),
  carrierRef: z.string(),
  serviceLevel: z.string(),
  workingDays: z.number().int(),
  penaltyRate: z.number(),
  penaltyCapPence: Pence,
  dispatchedOn: CivilDate,
  dueOn: CivilDate,
  deliveredOn: CivilDate.nullable(),
  workingDaysLate: z.number().int().nullable(),
  // OMITTED: `calendarDaysLateIfNaive`. The API computes it to prove its own
  // arithmetic differs from subtraction (sla-check); handed to the model it is
  // the wrong answer printed next to the right one.
  bankHolidaysInWindow: z.array(CivilDate),
});
export type Sla = z.infer<typeof SlaSchema>;

/** `GET /deliveries/by-order/:orderId` — shipment, walk and all, T1. */
export const DeliveryResponseSchema = z.object({
  shipment: z.object({
    id: z.string(),
    orderRef: z.string(),
    packageRef: z.string(),
    trackingNo: z.string(),
    serviceLevel: z.string(),
    status: z.string(),
    dispatchedAt: Instant,
    promisedBy: CivilDate,
  }),
  carrier: z.object({ code: z.string(), name: z.string(), kind: z.string() }),
  scans: z.array(z.object({ id: z.string(), scannedAt: Instant, scanType: z.string(), location: z.string() })),
  deliveryEvents: z.array(
    z.object({
      id: z.string(),
      occurredAt: Instant,
      status: z.string(),
      exceptionCode: z.string().nullable(),
      notes: z.string().nullable(),
    }),
  ),
  // OMITTED: `recipientName` — a person's name no trap needs; the KIND of proof
  // is what POL-DOA-002 weighs.
  proofOfDelivery: z
    .object({ id: z.string(), capturedAt: Instant, kind: z.string(), uri: z.string() })
    .nullable(),
  route: z
    .object({
      id: z.string(),
      routeDate: CivilDate,
      plannedStops: z.number().int(),
      startedAt: Instant,
      finishedAt: Instant.nullable(),
      depot: z.object({ id: z.string(), name: z.string(), metro: z.string() }),
      // OMITTED: the driver's `fullName` and `licenceNo`. An employee's name and
      // driving-licence number, and T1 needs neither — the report is joined to
      // the stop by route and stop number, and the driver by id.
      driver: z.object({ id: z.string() }),
      stopSeq: z.number().int().nullable(),
      stopArrivedAt: Instant.nullable(),
    })
    .nullable(),
  driverReports: z.array(
    z.object({
      id: z.string(),
      reportedAt: Instant,
      driverId: z.string(),
      severity: z.string(),
      body: z.string(),
      mentionsStops: z.array(z.number().int()),
      namesThisStop: z.boolean(),
    }),
  ),
  depotIncidents: z.array(
    z.object({ id: z.string(), occurredOn: CivilDate, kind: z.string(), body: z.string(), reportedBy: z.string() }),
  ),
});
export type DeliveryResponse = z.infer<typeof DeliveryResponseSchema>;

const Resolution = z.object({
  id: z.string(),
  caseId: z.string(),
  kind: z.string(),
  amountPence: Pence,
  status: z.string(),
  proposedAt: Instant,
  proposedBy: z.string(),
  decidedAt: Instant.nullable(),
  approvedBy: z.string().nullable(),
});

/** `GET /customers/:id/history` — prior cases, resolutions and every message, T3 and T5. */
export const HistoryResponseSchema = z.object({
  /**
   * ⚠ CONTAINS PII — `displayName` and `email`, kept on the same terms as
   * get_order's `customer`: parsed so the contract is honest, NOT rendered into
   * the prose. Whether they should cross at all is NEXT.md §6's open PII row,
   * and this tool does not pre-empt it in either direction.
   */
  customer: z.object({
    id: z.string(),
    displayName: z.string(),
    email: z.string(),
    segment: z.string(),
    since: CivilDate,
    userRef: z.string(),
  }),
  cases: z.array(
    z.object({
      id: z.string(),
      orderRef: z.string().nullable(),
      openedAt: Instant,
      closedAt: Instant.nullable(),
      category: z.string(),
      status: z.string(),
      owner: z.string(),
      resolutions: z.array(Resolution),
    }),
  ),
  messages: z.array(
    z.object({
      id: z.string(),
      contactId: z.string(),
      channel: z.string(),
      subject: z.string(),
      direction: z.string(),
      author: z.string(),
      body: z.string(),
      sentAt: Instant,
      /** Read off `direction` by the API, not guessed from the author's name. */
      customerAuthored: z.boolean(),
    }),
  ),
  priorResolutionCount: z.number().int(),
});
export type HistoryResponse = z.infer<typeof HistoryResponseSchema>;

/** `GET /policy/rules` — policy as CONFIGURATION, T2's row half and T3's RR-005. */
export const PolicyRulesSchema = z.object({
  asked: z.object({
    category: z.string(),
    channel: z.string(),
    valuePence: Pence,
    tier: z.string().nullable(),
    action: z.string().nullable(),
  }),
  returnWindow: z
    .object({
      citation: z.string(),
      category: z.string(),
      channel: z.string(),
      windowDays: z.number().int(),
      effectiveFrom: CivilDate,
      effectiveTo: CivilDate.nullable(),
    })
    .nullable(),
  refundRules: z.array(
    z.object({
      citation: z.string(),
      code: z.string(),
      appliesTo: z.string(),
      condition: z.string(),
      outcome: z.string(),
      requiresApproval: z.boolean(),
      effectiveFrom: CivilDate,
    }),
  ),
  goodwillLimits: z.array(
    z.object({
      citation: z.string(),
      tier: z.string(),
      maxPence: Pence,
      requiresApprovalAbovePence: Pence,
      effectiveFrom: CivilDate,
    }),
  ),
  approvalThresholds: z.array(
    z.object({
      citation: z.string(),
      action: z.string(),
      maxPence: Pence,
      approverRole: z.string(),
      effectiveFrom: CivilDate,
    }),
  ),
  categoryOverrides: z.array(
    z.object({
      citation: z.string(),
      overrideKind: z.string(),
      valueText: z.string(),
      note: z.string(),
      effectiveFrom: CivilDate,
    }),
  ),
  // OMITTED: `exceedsApprovalThreshold`. The API compares against the FIRST
  // threshold for the action, and `refund` has two (AT-REFUND £75 adviser,
  // AT-REFUND-MGR £250 manager) in no guaranteed order — so the verdict can be
  // wrong. The thresholds themselves are above; a possibly-wrong conclusion
  // printed beside them is the `calendarDaysLateIfNaive` mistake again.
});
export type PolicyRules = z.infer<typeof PolicyRulesSchema>;

/** `POST /resolutions` — the draft as written, `status: 'proposed'`. */
export const ProposedResolutionSchema = z.object({ resolution: Resolution });
export type ProposedResolution = z.infer<typeof ProposedResolutionSchema>;
