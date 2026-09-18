/**
 * Reads from `thb_crm`, and writes exactly one kind of row to it.
 *
 * THE WRITE IS A DRAFT AND CANNOT BE ANYTHING ELSE. `status` is hard-coded
 * `'proposed'` here, it is absent from `ProposeResolutionBody`, and `decidedAt`
 * / `approvedBy` are left null. The model can always propose; it can never pay.
 * Iris presses the button, and the row that records that decision names a human
 * in `approved_by`.
 *
 * THIS IS NOT THE GUARD — the client-side allowlist in `apps/ai/commerce` is
 * (PLAN.md §7), and `issue_refund` is defined there precisely so the guard has
 * something real to refuse. This is the belt to that pair of braces: even a
 * caller that got past the allowlist cannot reach a state field through this
 * endpoint, because there is no argument that carries one.
 */
import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CRM_CLIENT, type CrmClient } from './crm.client';
import {
  CustomerHistoryResponse,
  ProposeResolutionResponse,
  type ProposeResolutionBody,
} from './crm.dto';
import { shapeResponse } from '../common/zod';
import { assertPence } from '../common/money';
import { succeed, outOfScope, type Outcome } from '../common/outcome';
import { civilDate } from '../common/calendar/working-days';

type CustomerWithHistory = NonNullable<
  Awaited<ReturnType<CrmService['findCustomerWithHistory']>>
>;
type Contact = CustomerWithHistory['contacts'][number];
type CaseRow = CustomerWithHistory['cases'][number];
type ResolutionRow = CaseRow['resolutions'][number];

@Injectable()
export class CrmService {
  constructor(@Inject(CRM_CLIENT) private readonly db: CrmClient) {}

  async getCustomerHistory(customerId: string): Promise<Outcome<CustomerHistoryResponse>> {
    const customer = await this.findCustomerWithHistory(customerId);
    if (!customer) return outOfScope('customer');

    const cases = customer.cases.map(toCaseDto);

    return succeed(
      shapeResponse(
        CustomerHistoryResponse,
        {
          customer: toCustomerDto(customer),
          cases,
          messages: flattenMessages(customer.contacts),
          priorResolutionCount: countResolutions(cases),
        },
        'GET /customers/:id/history',
      ),
    );
  }

  /** Writes a draft. Never money. See the file header. */
  async proposeResolution(
    body: ProposeResolutionBody,
  ): Promise<Outcome<ProposeResolutionResponse>> {
    const theCase = await this.db.case.findUnique({
      where: { caseId: body.caseId },
      select: { caseId: true },
    });
    if (!theCase) return outOfScope('case');

    const row = await this.db.resolution.create({
      data: {
        resolutionId: randomUUID(),
        caseId: body.caseId,
        kind: body.kind,
        amountPence: assertPence(body.amountPence, 'resolution.amountPence'),
        // NOT A PARAMETER, AND THAT IS THE POINT.
        status: 'proposed',
        proposedAt: new Date(),
        proposedBy: body.proposedBy,
        decidedAt: null,
        approvedBy: null,
      },
    });

    return succeed(
      shapeResponse(
        ProposeResolutionResponse,
        { resolution: toResolutionDto(row) },
        'POST /resolutions',
      ),
    );
  }

  private findCustomerWithHistory(customerId: string) {
    return this.db.customer.findUnique({
      where: { customerId },
      include: {
        contacts: { include: { messages: { orderBy: { sentAt: 'asc' } } } },
        cases: {
          orderBy: { openedAt: 'desc' },
          include: { resolutions: { orderBy: { proposedAt: 'asc' } } },
        },
      },
    });
  }
}

// ── row → DTO ───────────────────────────────────────────────────────────────

function toCustomerDto(customer: CustomerWithHistory) {
  return {
    id: customer.customerId,
    displayName: customer.displayName,
    email: customer.email,
    segment: customer.segment,
    since: civilDate(customer.since),
    userRef: customer.userRef,
  };
}

function flattenMessages(contacts: Contact[]) {
  return contacts.flatMap((contact) =>
    contact.messages.map((m) => ({
      id: m.messageId,
      contactId: contact.contactId,
      channel: contact.channel,
      subject: contact.subject,
      direction: m.direction,
      author: m.author,
      body: m.body,
      sentAt: m.sentAt.toISOString(),
      customerAuthored: isCustomerAuthored(m.direction),
    })),
  );
}

/**
 * THE LABEL T5 DEPENDS ON, read off a column rather than inferred.
 *
 * `contact_messages.direction` records which way the message travelled, so
 * "did a stranger write this" is a fact the database already holds. An earlier
 * draft of this guessed from the `author` string against a list of internal
 * names, which would have mislabelled every customer who happened to be called
 * Agent — and mislabelled it in the direction that turns injected text into
 * trusted text.
 */
function isCustomerAuthored(direction: string): boolean {
  return direction.toLowerCase() === 'inbound';
}

function toCaseDto(row: CaseRow) {
  return {
    id: row.caseId,
    orderRef: row.orderRef,
    openedAt: row.openedAt.toISOString(),
    closedAt: row.closedAt?.toISOString() ?? null,
    category: row.category,
    status: row.status,
    owner: row.owner,
    resolutions: row.resolutions.map(toResolutionDto),
  };
}

function toResolutionDto(row: ResolutionRow) {
  return {
    id: row.resolutionId,
    caseId: row.caseId,
    kind: row.kind,
    amountPence: assertPence(row.amountPence, 'resolution.amountPence'),
    status: row.status,
    proposedAt: row.proposedAt.toISOString(),
    proposedBy: row.proposedBy,
    decidedAt: row.decidedAt?.toISOString() ?? null,
    approvedBy: row.approvedBy,
  };
}

function countResolutions(cases: { resolutions: unknown[] }[]): number {
  return cases.reduce((n, c) => n + c.resolutions.length, 0);
}
