/** What the contact centre promises. See src/shop/shop.dto.ts for the conventions. */
import { z } from 'zod';

const Money = z.int();
const Instant = z.string();
const CivilDate = z.string();

export const CustomerIdParam = z.strictObject({
  id: z.string().min(1).max(64),
});
export type CustomerIdParam = z.infer<typeof CustomerIdParam>;

export const ResolutionDto = z.strictObject({
  id: z.string(),
  caseId: z.string(),
  kind: z.string(),
  amountPence: Money,
  status: z.string(),
  proposedAt: Instant,
  proposedBy: z.string(),
  decidedAt: Instant.nullable(),
  /** The HUMAN who approved it. Null on everything this API writes. */
  approvedBy: z.string().nullable(),
});

export const CaseHistoryDto = z.strictObject({
  id: z.string(),
  orderRef: z.string().nullable(),
  openedAt: Instant,
  closedAt: Instant.nullable(),
  category: z.string(),
  status: z.string(),
  owner: z.string(),
  resolutions: z.array(ResolutionDto),
});

export const CustomerHistoryResponse = z.strictObject({
  customer: z.strictObject({
    id: z.string(),
    displayName: z.string(),
    email: z.string(),
    segment: z.string(),
    since: CivilDate,
    /** Soft key into thb_shop.users. */
    userRef: z.string(),
  }),
  /**
   * The serial-returner signal and the already-promised signal, which are the
   * same rows read two ways.
   */
  cases: z.array(CaseHistoryDto),
  /**
   * CUSTOMER-AUTHORED TEXT, AND LABELLED AS SUCH.
   *
   * This is the only text in the whole estate a STRANGER typed, and T5 is
   * planted in it. It is returned VERBATIM — sanitising it here would destroy
   * both the evidence a human needs and the test itself — but each message
   * carries `customerAuthored`, computed from the `direction` column rather than
   * guessed, so the layer that assembles the model's context has something
   * reliable to delimit on.
   *
   * Messages hang off CONTACTS, not off cases: a customer can write in before
   * anyone opens a case, so they are listed per customer. Attaching them to a
   * case would invent an association the database does not have.
   */
  messages: z.array(
    z.strictObject({
      id: z.string(),
      contactId: z.string(),
      channel: z.string(),
      subject: z.string(),
      direction: z.string(),
      author: z.string(),
      body: z.string(),
      sentAt: Instant,
      customerAuthored: z.boolean(),
    }),
  ),
  priorResolutionCount: z.int(),
});
export type CustomerHistoryResponse = z.infer<typeof CustomerHistoryResponse>;

/**
 * THE ONLY THING THIS API ACCEPTS AS A WRITE.
 *
 * `status` IS NOT A FIELD. A caller cannot ask for `status: 'approved'`, because
 * the status this endpoint writes is `proposed` and there is no argument that
 * changes it. Neither is `approvedBy`. That is the difference between a draft
 * and a payment, expressed in the type rather than in a code review — see
 * src/crm/crm.service.ts.
 */
export const ProposeResolutionBody = z.strictObject({
  caseId: z.string().min(1).max(64),
  kind: z.enum([
    'full_refund',
    'partial_refund',
    'replacement',
    'collection_and_refund',
    'goodwill_only',
    'not_entitled',
  ]),
  /**
   * Integer pence, and NOT nullable, because `resolutions.amount_pence` is a
   * non-null integer column. Zero is how "no money" is said — a `replacement`
   * or a `not_entitled` is a resolution with an amount of nothing, which is a
   * different statement from "amount unknown" and the column cannot hold the
   * second one anyway.
   */
  amountPence: Money.nonnegative(),
  /** Who or what proposed it. The model names itself; it never names a human. */
  proposedBy: z.string().min(1).max(120),
});
export type ProposeResolutionBody = z.infer<typeof ProposeResolutionBody>;

export const ProposeResolutionResponse = z.strictObject({
  resolution: ResolutionDto,
});
export type ProposeResolutionResponse = z.infer<typeof ProposeResolutionResponse>;
