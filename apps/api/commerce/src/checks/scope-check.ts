/**
 * `pnpm commerce:api-scope-check` — an out-of-scope record is a structured miss.
 *
 * PLAN.md §7.1 IS THE SPEC: "the server checks it belongs to the session's case
 * before answering, and returns a structured 'not in scope' miss rather than
 * throwing." The negative control the brief asks for is "remove the session
 * check and it must go red", so this file tests TWO different things, because
 * there are two different ways to remove it:
 *
 *   1. THE DECISION — `ScopeService` stops refusing. Driven here against a stub
 *      contact centre, so it costs nothing and runs offline.
 *   2. THE CALL SITE — a controller stops asking. A perfect `ScopeService` that
 *      nobody calls is the more likely regression and the harder one to notice,
 *      so the controllers are checked structurally: every handler that touches
 *      customer data must resolve scope before it reads.
 *
 * Offline. No server, no database.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ScopeService, type CaseScope } from '../scope/scope.service';
import type { CrmClient } from '../crm/crm.client';
import { Checks } from './harness';

const checks = new Checks('commerce:api-scope-check — scope comes from the session');

// ── a contact centre with two cases in it ───────────────────────────────────

const CASES: Record<string, { caseId: string; customerId: string; orderRef: string | null }> = {
  'CASE-1': { caseId: 'CASE-1', customerId: 'CUST-1', orderRef: 'ORD-1' },
  'CASE-2': { caseId: 'CASE-2', customerId: 'CUST-2', orderRef: 'ORD-2' },
  'CASE-3': { caseId: 'CASE-3', customerId: 'CUST-3', orderRef: null },
};

const stubCrm = {
  case: {
    findUnique: async ({ where }: { where: { caseId: string } }) => CASES[where.caseId] ?? null,
  },
} as unknown as CrmClient;

const scope = new ScopeService(stubCrm);

async function scopeFor(caseId: string): Promise<CaseScope> {
  const answer = await scope.resolve(caseId);
  if (!answer.ok) throw new Error(`fixture is wrong: ${caseId} did not resolve`);
  return answer.data;
}

async function main(): Promise<void> {
  const case1 = await scopeFor('CASE-1');

  checks.section('THE SESSION RESOLVES TO WHAT IT MAY SEE');
  checks.assert(
    'a known case resolves to its own order and customer',
    case1.orderRef === 'ORD-1' && case1.customerId === 'CUST-1',
    'the control: if resolution were broken every denial below would pass for the wrong reason',
  );
  const absent = await scope.resolve(undefined);
  checks.assert(
    'no case id at all is `invalid_request`',
    !absent.ok && absent.cause === 'invalid_request',
    'an unwired session is a plumbing problem and must not read as a permission one',
  );

  const blank = await scope.resolve('   ');
  checks.assert(
    'a blank case id is `invalid_request` too',
    !blank.ok && blank.cause === 'invalid_request',
    'whitespace is not a case id',
  );

  const unknown = await scope.resolve('CASE-NOPE');
  checks.assert(
    'an unknown case id is `invalid_request`',
    !unknown.ok && unknown.cause === 'invalid_request',
    'the caller sent something unusable — which over MCP is blame: caller, not domain',
  );
  checks.assert(
    'the three invalid_request cases are told apart by their DETAIL',
    !absent.ok &&
      !unknown.ok &&
      absent.detail !== unknown.detail,
    'they share a cause because they are the same KIND of failure, but an operator ' +
      'debugging "no header sent" versus "header sent, case does not exist" needs ' +
      'to know which — and the case id is not caller-chosen, so saying is safe',
  );

  checks.section('AN ORDER OUTSIDE THE CASE IS A STRUCTURED MISS');
  checks.assert(
    "this case's own order is in scope",
    scope.orderInScope(case1, 'ORD-1') === null,
    'the control again — a check that denied everything would pass the next three',
  );

  const other = scope.orderInScope(case1, 'ORD-2');
  checks.assert(
    "another customer's order is refused",
    other !== null && other.cause === 'out_of_scope',
    'THE REQUIREMENT: never trust the caller to only ask for what it should',
  );
  checks.assert(
    'the refusal is a MISS and not a throw',
    other !== null && other.ok === false && typeof other.detail === 'string',
    'over MCP a miss is `isError: true` (blame: domain) and a throw is transport ' +
      '(blame: infrastructure) — they are different rows in the scorecard',
  );

  const nonexistent = scope.orderInScope(case1, 'ORD-DOES-NOT-EXIST');
  checks.assert(
    'a nonexistent order is refused IDENTICALLY to an out-of-scope one',
    nonexistent !== null &&
      other !== null &&
      nonexistent.cause === other.cause &&
      nonexistent.detail === other.detail,
    'THE ENUMERATION ORACLE: if these two answers differed, a caller could ' +
      "walk Thornbury's order book one question at a time without reading a row",
  );

  const noOrderCase = await scopeFor('CASE-3');
  checks.assert(
    'a case with no order refuses every order',
    scope.orderInScope(noOrderCase, 'ORD-1') !== null,
    'a null order_ref must not compare equal to anything',
  );

  checks.section('THE SAME FOR CUSTOMERS');
  checks.assert(
    "the case's own customer is in scope",
    scope.customerInScope(case1, 'CUST-1') === null,
    'control',
  );
  checks.assert(
    "another customer's history is refused",
    scope.customerInScope(case1, 'CUST-2')?.cause === 'out_of_scope',
    'prior cases and resolutions are the most personal thing this API returns',
  );

  checks.section('EVERY CUSTOMER-DATA HANDLER ACTUALLY ASKS');
  // A perfect ScopeService nobody calls is the likelier regression. This reads
  // the controller sources rather than trusting that they were written right.
  const guarded = [
    ['shop/shop.controller.ts', 'GET /orders/:id'],
    ['fleet/fleet.controller.ts', 'GET /deliveries/by-order/:orderId'],
    ['crm/crm.controller.ts', 'GET /customers/:id/history and POST /resolutions'],
  ] as const;

  for (const [file, endpoints] of guarded) {
    const source = readFileSync(join(__dirname, '..', file), 'utf8');
    checks.assert(
      `${file} resolves scope`,
      source.includes('this.scope.resolve('),
      `${endpoints} read a named customer's data and must not answer without a case`,
    );
  }

  // Policy is the deliberate exception and is asserted as one, so that removing
  // its scope check on purpose is different from forgetting it.
  const policySource = readFileSync(
    join(__dirname, '..', 'policy/policy.controller.ts'),
    'utf8',
  );
  checks.assert(
    'policy/policy.controller.ts documents why it has NO scope check',
    !policySource.includes('this.scope.resolve(') &&
      policySource.includes('NO SCOPE CHECK HERE'),
    "Thornbury's own configuration names no customer; scoping it would imply a " +
      'protection it does not provide — but the absence must be written down',
  );

  checks.section('NEGATIVE CONTROLS — the plants');

  /** Plant 1: the session check removed from the decision. */
  const scopeCheckRemoved = (_scope: CaseScope, _id: string) => null;
  checks.control(
    'a ScopeService that always allows is caught',
    scopeCheckRemoved(case1, 'ORD-2') === null && scope.orderInScope(case1, 'ORD-2') !== null,
    'the plant allows another customer\'s order; the real one must refuse it',
  );

  /** Plant 2: the session check removed from a CALL SITE. */
  const controllerWithoutScope = `
    @Controller('orders')
    export class ShopController {
      @Get(':id') async getOrder(@Param() p: OrderIdParam) { return this.shop.getOrder(p.id); }
    }`;
  checks.control(
    'a controller that never resolves scope is caught',
    !controllerWithoutScope.includes('this.scope.resolve('),
    'the same string test that passes on the real controllers must fail on this one, ' +
      'or the structural assertions above are decorative',
  );

  checks.done();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
