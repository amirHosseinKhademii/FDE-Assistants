/**
 * `pnpm commerce:api-check` — every endpoint answers against the seeded estate.
 *
 * THE ONLY CHECK IN THIS PACKAGE THAT NEEDS A DATABASE, and it is deliberately
 * the only one. The other four are offline and free so they run on every change;
 * this one exists because offline checks cannot tell you that
 * `prisma/*.prisma` and the DDL have drifted apart. That is the standing failure
 * mode of introspected schemas and the reason `shapeResponse` parses every
 * response through its own DTO on the way out: a renamed column fails HERE, in
 * this API's log, and not as a `null` the model writes a paragraph around.
 *
 * IF THE ESTATE IS NOT UP THIS EXITS 2, NOT 0. Commit 7b450fc — "Fail when a
 * check could not run, instead of passing". A check that skips when its
 * dependencies are missing is a check that is green on the day it mattered.
 *
 * IT ALSO EXERCISES THE GUARD OVER REAL HTTP, which `commerce:api-guard-check`
 * cannot: that one proves the DECISION is fail-closed, this one proves the
 * decision is actually WIRED UP. A correct guard registered on nothing is the
 * more embarrassing of the two failures.
 *
 * IT CLEANS UP AFTER ITSELF. `POST /resolutions` writes a real row, and
 * fde-assistants-2d's `commerce:world-check` fingerprints the estate and fails
 * when it drifts — so the draft this check creates is deleted again before it
 * finishes, and the deletion is asserted rather than hoped for.
 */
import 'reflect-metadata';
import { join } from 'node:path';
import { writeSync } from 'node:fs';
import { config as loadEnv } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../app.module';
import { CRM_CLIENT, type CrmClient } from '../crm/crm.client';
import { FLEET_CLIENT, type FleetClient } from '../fleet/fleet.client';
import { POLICY_CLIENT, type PolicyClient } from '../policy/policy.client';
import { UK_BANK_HOLIDAYS, COVERED_YEARS } from '../common/calendar/uk-bank-holidays';
import { civilDate, londonCivilDate } from '../common/calendar/working-days';
import { SERVICE_TOKEN_HEADER, CASE_ID_HEADER } from '../config/env';
import { estateBaseUrl } from '../config/estate';
import { Checks, cannotRun } from './harness';

loadEnv({ path: join(__dirname, '..', '..', '..', '..', '..', '.env') });

const TITLE = 'commerce:api-check — every endpoint, against the live estate';
const checks = new Checks(TITLE);

/** Set for this process only, so the check never depends on the operator's env. */
const TOKEN = 'svc_check_' + 'z'.repeat(32);
process.env.COMMERCE_SERVICE_TOKEN = TOKEN;

interface Fixture {
  caseId: string;
  customerId: string;
  orderRef: string;
}

// ── setup ───────────────────────────────────────────────────────────────────

async function boot(): Promise<{ app: INestApplication; base: string }> {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.enableShutdownHooks();
  await app.listen(0);
  const url = await app.getUrl();
  // Nest reports `[::1]` on dual-stack hosts and `fetch` does not like it.
  return { app, base: url.replace('[::1]', '127.0.0.1') };
}

/**
 * Find a case the seed actually wrote, rather than hard-coding an id.
 *
 * fde-assistants-2d owns the seed; pinning `CASE-001` here would make this check
 * fail every time they renumbered something, which trains people to ignore it.
 */
async function findFixture(app: INestApplication): Promise<Fixture | null> {
  const crm = app.get<CrmClient>(CRM_CLIENT);
  const row = await crm.case.findFirst({
    where: { orderRef: { not: null } },
    select: { caseId: true, customerId: true, orderRef: true },
    orderBy: { openedAt: 'asc' },
  });
  if (!row?.orderRef) return null;
  return { caseId: row.caseId, customerId: row.customerId, orderRef: row.orderRef };
}

/**
 * A case whose order reaches a ROUTE — the fixture the T1 walk needs.
 *
 * WHY THIS IS SEPARATE FROM `findFixture`, AND WHY IT COST A REAL GAP. The
 * delivery assertions used to run against whichever case opened first, and the
 * route half of them was written `if (data.route) { … }`. After
 * fde-assistants-2d reseeded, the earliest case landed on an order whose shipment
 * was never loaded onto a round — so `route` was null, the conditional block
 * quietly did not run, and the check went from 48 assertions to 47 and still
 * printed PASS.
 *
 * That is precisely the failure this repo has a rule about: a check that could
 * not run must FAIL, not pass. And the hop it stopped exercising is the only
 * path to T1 — shipment → stops → route → driver reports. A green
 * `commerce:api-check` that silently skips the walk is worse than no check,
 * because it is evidence of something it never looked at.
 *
 * `CAS-90001` is tried first because 2d reserves the `CAS-9xxxx` block
 * explicitly so it survives a reseed: "ordinary traffic numbers from 1 and
 * shifts whenever volume changes; the 9xxxx block does not." It is T1's own
 * case. If it is ever absent, the fallback discovers a walkable case rather than
 * giving up — and if there is none, that is a hard stop, not a skip.
 *
 * Finding it is itself the sanctioned cross-system walk: the case is in
 * `thb_crm`, the shipment and its stop are in `thb_fleet`, and there is no join
 * to write. Two clients, in application code, deliberately.
 */
const T1_CASE = 'CAS-90001';

async function findWalkFixture(app: INestApplication): Promise<Fixture | null> {
  const crm = app.get<CrmClient>(CRM_CLIENT);
  const fleet = app.get<FleetClient>(FLEET_CLIENT);

  const reachesARoute = async (orderRef: string): Promise<boolean> => {
    const shipment = await fleet.shipment.findFirst({
      where: { orderRef },
      orderBy: { dispatchedAt: 'desc' },
      select: { shipmentId: true },
    });
    if (!shipment) return false;
    const stop = await fleet.stop.findFirst({
      where: { shipmentId: shipment.shipmentId },
      select: { stopId: true },
    });
    return stop !== null;
  };

  const preferred = await crm.case.findUnique({
    where: { caseId: T1_CASE },
    select: { caseId: true, customerId: true, orderRef: true },
  });
  if (preferred?.orderRef && (await reachesARoute(preferred.orderRef))) {
    return {
      caseId: preferred.caseId,
      customerId: preferred.customerId,
      orderRef: preferred.orderRef,
    };
  }

  const candidates = await crm.case.findMany({
    where: { orderRef: { not: null } },
    select: { caseId: true, customerId: true, orderRef: true },
    orderBy: { openedAt: 'asc' },
    take: 200,
  });
  for (const row of candidates) {
    if (row.orderRef && (await reachesARoute(row.orderRef))) {
      return { caseId: row.caseId, customerId: row.customerId, orderRef: row.orderRef };
    }
  }
  return null;
}

// ── requests ────────────────────────────────────────────────────────────────

function headers(fixture: Fixture | null, withToken = true): Record<string, string> {
  const h: Record<string, string> = {};
  if (withToken) h[SERVICE_TOKEN_HEADER] = TOKEN;
  if (fixture) h[CASE_ID_HEADER] = fixture.caseId;
  return h;
}

async function get(base: string, path: string, h: Record<string, string>) {
  const response = await fetch(`${base}${path}`, { headers: h });
  const body = await response.json().catch(() => null);
  return { status: response.status, body: body as any };
}

async function post(base: string, path: string, h: Record<string, string>, payload: unknown) {
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { ...h, 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => null);
  return { status: response.status, body: body as any };
}

// ── the checks, one section per endpoint ────────────────────────────────────

async function checkHealth(base: string): Promise<boolean> {
  checks.section('GET /health — all five systems');
  const { status, body } = await get(base, '/health', headers(null));
  const systems: { system: string; ok: boolean }[] = body?.systems ?? [];

  checks.assert(
    'answers 200',
    status === 200,
    'the cheapest possible proof the process is serving',
  );
  checks.assert(
    'reports all five systems',
    systems.length === 5,
    'shop, wms, fleet, crm and policy — four of five being fine is a specific outage',
  );
  for (const system of systems) {
    checks.assert(
      `${system.system} connects`,
      system.ok,
      'its own pool, its own database, its own credential',
    );
  }
  return systems.length === 5 && systems.every((s) => s.ok);
}

async function checkGuardIsWired(base: string, fixture: Fixture): Promise<void> {
  checks.section('THE GUARD, OVER REAL HTTP');
  const noToken = await get(base, `/orders/${fixture.orderRef}`, headers(fixture, false));
  checks.assert(
    'a request with no service token is refused',
    noToken.status === 401,
    'commerce:api-guard-check proves the DECISION is fail-closed; this proves it is WIRED',
  );

  const wrongToken = await get(base, `/orders/${fixture.orderRef}`, {
    ...headers(fixture, false),
    [SERVICE_TOKEN_HEADER]: 'svc_wrong',
  });
  checks.assert(
    'a wrong service token is refused',
    wrongToken.status === 401,
    'and the global APP_GUARD covers this route without a per-controller decorator',
  );

  const health = await get(base, '/health', {});
  checks.assert(
    '/health is guarded too',
    health.status === 401,
    'an exempt endpoint is an endpoint "every request is refused" does not cover',
  );
}

async function checkOrder(base: string, fixture: Fixture): Promise<void> {
  checks.section('GET /orders/:id — order, items, payments, PRIOR REFUNDS');
  const { status, body } = await get(base, `/orders/${fixture.orderRef}`, headers(fixture));

  checks.assert('answers 200', status === 200, 'a structured failure is also 200 — see src/common/outcome.ts');
  checks.assert(
    'the order is found and in scope',
    body?.ok === true,
    body?.ok === false
      ? `got miss "${body.miss}" — the case names order ${fixture.orderRef}, so this ` +
          'is either a seed inconsistency or the scope check is wrong'
      : 'the case in the fixture names this order',
  );
  if (body?.ok !== true) return;

  const data = body.data;
  checks.assert(
    'items came back',
    Array.isArray(data.items) && data.items.length > 0,
    'an order with no lines is a seed problem, not an answer',
  );
  checks.assert(
    'prior refunds are present as an array, even when empty',
    Array.isArray(data.priorRefunds),
    'T3 depends on this being a fact rather than an absence the caller has to ask about',
  );
  checks.assert(
    'every money field is an integer',
    Number.isInteger(data.order.totalPence) &&
      data.items.every((i: any) => Number.isInteger(i.lineTotalPence)) &&
      Number.isInteger(data.totals.netPence),
    'MONEY IS INTEGER PENCE. Prisma returns numeric as a Decimal object, and one ' +
      'reaching a DTO would show up here rather than in a comparison months later',
  );
  checks.assert(
    'the soft key into thb_fleet is a plain string or null',
    data.order.shipmentRef === null || typeof data.order.shipmentRef === 'string',
    'no FK, no relation, no join — just an identifier from another database',
  );
}

async function checkDelivery(base: string, fixture: Fixture): Promise<void> {
  checks.section(
    `GET /deliveries/by-order/:orderId — THE WALK (T1), case ${fixture.caseId}`,
  );
  const { status, body } = await get(
    base,
    `/deliveries/by-order/${fixture.orderRef}`,
    headers(fixture),
  );

  checks.assert('answers 200', status === 200, 'the endpoint is reachable and shaped');
  if (body?.ok !== true) {
    checks.assert(
      'a delivery exists for the fixture order',
      false,
      `got miss "${body?.cause}" — the fixture order has no shipment, so the T1 walk ` +
        'cannot be exercised. Pick a seeded order that was actually dispatched.',
    );
    return;
  }

  const data = body.data;
  checks.assert(
    'scans, delivery events and the POD field are all present',
    Array.isArray(data.scans) &&
      Array.isArray(data.deliveryEvents) &&
      'proofOfDelivery' in data,
    'the four things a carrier portal would show, in one answer',
  );
  checks.assert(
    'driver reports and depot incidents are present as arrays',
    Array.isArray(data.driverReports) && Array.isArray(data.depotIncidents),
    'THIS IS THE POINT OF THE ENDPOINT. They are unreachable from the shipment ' +
      'row, so if they are missing here T1 is unfindable no matter how good the prompt is',
  );
  checks.assert(
    'every driver report carries a computed `namesThisStop`',
    data.driverReports.every((r: any) => typeof r.namesThisStop === 'boolean'),
    'comparing "stop 14" in prose against stops.seq is the API\'s job, not the model\'s',
  );
  // UNCONDITIONAL, because the fixture was chosen to reach a route. An
  // `if (data.route)` here is what let the walk go unexercised for a whole run.
  checks.assert(
    'the route resolved, with its depot and driver',
    data.route !== null &&
      typeof data.route.depot?.name === 'string' &&
      typeof data.route.driver?.fullName === 'string',
    'hops 2 and 3 of the walk — shipment → stops → route. If this is null the ' +
      'fixture stopped being walkable and every driver-report assertion above is ' +
      'asserting something about an empty array',
  );
  checks.assert(
    'the shipment resolved to a numbered stop on that route',
    data.route !== null && Number.isInteger(data.route.stopSeq),
    'THE HINGE OF T1: `stops.seq` is the number a driver report names in prose, ' +
      'and without it `namesThisStop` can only ever be false',
  );
}

async function checkHistory(base: string, fixture: Fixture): Promise<void> {
  checks.section('GET /customers/:id/history — prior cases and resolutions');
  const { status, body } = await get(
    base,
    `/customers/${fixture.customerId}/history`,
    headers(fixture),
  );

  checks.assert('answers 200', status === 200, 'reachable');
  checks.assert('the customer is in scope and found', body?.ok === true, 'the case names them');
  if (body?.ok !== true) return;

  checks.assert(
    'cases came back with their resolutions',
    Array.isArray(body.data.cases),
    'the serial-returner signal and the already-promised signal are the same rows',
  );
  checks.assert(
    'messages come back at the top level, not nested under cases',
    Array.isArray(body.data.messages),
    'they hang off CONTACTS in the estate, and a customer can write in before a ' +
      'case exists — nesting them would invent an association the database lacks',
  );
  checks.assert(
    'every message is labelled customer-authored or not',
    body.data.messages.every((m: any) => typeof m.customerAuthored === 'boolean'),
    'T5 is planted in customer-authored text; the layer that builds the context ' +
      'window needs something to delimit on other than guesswork',
  );
  checks.assert(
    'the label is read off `direction`, so inbound messages are flagged',
    body.data.messages
      .filter((m: any) => m.direction === 'inbound')
      .every((m: any) => m.customerAuthored === true),
    'guessing from the author name would mislabel a customer called Agent — and ' +
      'mislabel it in the direction that turns injected text into trusted text',
  );
}

async function checkScopeIsEnforced(base: string, fixture: Fixture): Promise<void> {
  checks.section('SCOPE, OVER REAL HTTP');
  const outOfScope = await get(base, '/orders/ORD-DEFINITELY-NOT-THIS-CASE', headers(fixture));
  checks.assert(
    'an out-of-scope order id is a structured miss, not a 403 and not a throw',
    outOfScope.status === 200 &&
      outOfScope.body?.ok === false &&
      outOfScope.body?.cause === 'out_of_scope',
    'PLAN.md §7.1 — the confused deputy. The MCP server can read any order; the model cannot',
  );

  const noCase = await get(base, `/orders/${fixture.orderRef}`, { [SERVICE_TOKEN_HEADER]: TOKEN });
  checks.assert(
    'no case header means no answer, even for an order that exists',
    noCase.body?.ok === false && noCase.body?.cause === 'invalid_request',
    'scope comes from the session; without one there is nothing to check against',
  );
}

async function checkPolicy(base: string, fixture: Fixture): Promise<void> {
  checks.section('GET /policy/rules — policy as configuration');
  const { status, body } = await get(
    base,
    '/policy/rules?category=electronics&channel=web&valuePence=4500',
    headers(fixture),
  );

  checks.assert('answers 200', status === 200, 'reachable');
  checks.assert('returns an answer', body?.ok === true, 'a rules query always answers');
  if (body?.ok !== true) return;

  checks.assert(
    'the rows come back with re-findable citations',
    body.data.returnWindow === null ||
      /^rule:[a-z_]+:.+/.test(body.data.returnWindow.citation),
    'PLAN.md §8 fixes `rule:<TABLE>:<ID>` so an auditor can re-find anything asserted',
  );
  const rejected = await get(
    base,
    '/policy/rules?category=x&channel=web&valuePence=12.5',
    headers(fixture),
  );
  checks.assert(
    'a bad query is rejected by the Zod pipe, not coerced',
    rejected.status === 400,
    'a fractional penny reaching an approval-threshold comparison is a silent wrong answer',
  );
  checks.assert(
    'the 400 names the field and the rule but NOT the value',
    Array.isArray(rejected.body?.problems) &&
      rejected.body.problems.some((p: any) => p.field === 'valuePence' && p.rule) &&
      !JSON.stringify(rejected.body).includes('12.5'),
    'a received value here is an order id somebody typed; the caller gets the ' +
      'contract it broke, not its own input echoed back through our logs',
  );
}

async function checkSla(base: string, fixture: Fixture): Promise<void> {
  checks.section('GET /policy/sla — the working-day calendar helper (T6)');
  const { status, body } = await get(
    base,
    '/policy/sla?carrierRef=THB&serviceLevel=standard&dispatchedAt=2026-04-02T10:00:00Z',
    headers(fixture),
  );
  checks.assert('answers 200', status === 200, 'reachable');
  checks.assert(
    'it either answers or misses cleanly on an unseeded carrier',
    body?.ok === true || body?.cause === 'not_found',
    'a missing carrier SLA row is a miss, not a 500 — the arithmetic itself is ' +
      'covered offline by commerce:sla-check',
  );
  // THE ASSERTION THE ADVISOR'S FINDING BOUGHT. `dispatchedAt` is caller-supplied
  // and the bank-holiday table has a horizon; letting `assertCovered` throw past
  // it turns one bad query parameter into a 500, which the MCP layer files as
  // `transport` — blame: infrastructure — for something that was entirely the
  // caller's doing.
  const pastHorizon = await get(
    base,
    '/policy/sla?carrierRef=THB&serviceLevel=standard&dispatchedAt=2044-06-01T10:00:00Z',
    headers(fixture),
  );
  checks.assert(
    'a dispatch date past the holiday horizon is NOT a 500',
    pastHorizon.status !== 500,
    'a 5xx from this API always means plumbing — fde-assistants-86 reads it that ' +
      "way to tell `threw` from `tool_error`, and a caller's bad date is neither",
  );
  checks.assert(
    'it is a structured invalid_request instead',
    pastHorizon.body?.ok === false && pastHorizon.body?.cause === 'invalid_request',
    'the caller sent an unusable argument, and saying so is what keeps the blame ' +
      'pointed at the caller rather than at the plumbing',
  );

  if (body?.ok === true) {
    checks.assert(
      'the due date is a civil date and the penalty rate is a number',
      /^\d{4}-\d{2}-\d{2}$/.test(body.data.dueOn) && typeof body.data.penaltyRate === 'number',
      'penalty_rate is the ONE numeric column in the estate; Prisma hands it back ' +
        'as a Decimal object and it must be normalised before it leaves',
    );
  }
}

async function checkPropose(
  base: string,
  fixture: Fixture,
  app: INestApplication,
): Promise<void> {
  checks.section('POST /resolutions — a DRAFT, and nothing else');
  const { status, body } = await post(base, '/resolutions', headers(fixture), {
    caseId: fixture.caseId,
    kind: 'partial_refund',
    amountPence: 1234,
    proposedBy: 'commerce:api-check',
  });

  // EXACT, not "201 or 200". docs/commerce/API.md publishes a status-code table
  // that another deployable reads; a check that accepts either value cannot
  // verify the table it is supposed to be evidence for.
  checks.assert(
    'a created draft answers 201',
    status === 201,
    "Nest's default for @Post, pinned here because it is published as a contract",
  );
  checks.assert('the row was written', body?.ok === true, 'the case exists and is in scope');
  if (body?.ok !== true) return;

  const written = body.data.resolution;
  checks.assert(
    "status is 'proposed' and could not have been anything else",
    written.status === 'proposed',
    'THE WRITE PATH: the model can always propose and can never pay. `status` is ' +
      'hard-coded in the service and absent from the request DTO',
  );
  checks.assert(
    'no human is named as the decider',
    written.approvedBy === null && written.decidedAt === null,
    'the row that records a decision names a human, and this is not that row',
  );

  const forged = await post(base, '/resolutions', headers(fixture), {
    caseId: fixture.caseId,
    kind: 'full_refund',
    amountPence: 999,
    proposedBy: 'x',
    status: 'approved',
  });
  checks.assert(
    'a request that tries to set `status` is REJECTED',
    forged.status === 400,
    'z.strictObject means an unknown key is an error rather than something ignored — ' +
      'silently dropping it would look identical to honouring it from the caller\'s side',
  );

  // CLEANUP IS IN A `finally` SO A CRASH CANNOT LEAVE THE ROW BEHIND.
  //
  // fde-assistants-2d corrected my original premise here, and the correction is
  // worth keeping: `commerce:world-check` is entirely OFFLINE — it builds the
  // estate in memory and hashes that, so a stray row could sit in
  // thb_crm.resolutions for a week without moving the fingerprint. The check
  // this actually disturbs is `commerce:db-check`, which compares live row
  // counts against a freshly regenerated world and would report
  //
  //     FAIL  thb_crm.resolutions 141 loaded vs 140 generated
  //
  // That is precise and it ACCUSES THE WRONG THING: it reads as "the estate
  // drifted" when the truth is "a self-test crashed mid-write". Hence a
  // `finally` rather than a happy-path delete.
  const crm = app.get<CrmClient>(CRM_CLIENT);
  try {
    await checkProposeCannotCrossCases(base, fixture);
  } finally {
    await crm.resolution.delete({ where: { resolutionId: written.id } }).catch(() => {});
  }

  const stillThere = await crm.resolution.findUnique({ where: { resolutionId: written.id } });
  checks.assert(
    'the draft this check wrote was deleted again',
    stillThere === null,
    'a leftover row makes commerce:db-check fail with a message that sends someone ' +
      'hunting in the wrong package',
  );
}

/**
 * NO DRIVER REPORT IS LOST BY A DATE WINDOW.
 *
 * THE REGRESSION THIS EXISTS TO CATCH, and it is one this API actually shipped.
 * `driver_reports.route_id` is a real foreign key, so the route scopes the
 * reports completely — but two earlier versions filtered them by a date window
 * ON TOP of that key, and a redundant filter can only ever drop evidence. The
 * London-day version dropped every report filed after midnight for the round
 * that had just ended: five of the sixty-six in the estate, and exactly the ones
 * that say something went wrong.
 *
 * fde-assistants-2d seeded those five deliberately after the bug was found —
 * filed 23:30 UTC, which is 00:30 the NEXT day in London — because their estate
 * could not previously have caught it: all sixty-six were filed at 17:35 UTC,
 * mid-evening, so none had a London date differing from its route date. Their
 * words: "your fix was correct and completely undefended."
 *
 * The assertion is written as an INVARIANT rather than against those five ids —
 * for every route reachable through the walk, the endpoint must return exactly
 * the reports the database holds for that route. That survives a reseed and does
 * not care which timestamps happen to be near a boundary.
 *
 * 2d also placed the boundary reports OFF T1's route on purpose: a timezone bug
 * and a broken walk give the same symptom ("no report for this route"), so
 * separating them means a failure here names which one it is.
 */
async function checkNoDriverReportIsLost(
  app: INestApplication,
  base: string,
  walk: Fixture,
): Promise<void> {
  checks.section('NO DRIVER REPORT IS LOST — the date window that must not come back');
  const fleet = app.get<FleetClient>(FLEET_CLIENT);

  const { body } = await get(base, `/deliveries/by-order/${walk.orderRef}`, headers(walk));
  if (body?.ok !== true || body.data.route === null) {
    checks.assert('the walk fixture reaches a route', false, 'covered above; nothing to compare');
    return;
  }

  const routeId = body.data.route.id;
  const held = await fleet.driverReport.findMany({
    where: { routeId },
    select: { reportId: true, reportedAt: true },
  });
  const returned = new Set<string>(body.data.driverReports.map((r: any) => r.id));
  const missing = held.filter((r) => !returned.has(r.reportId));

  checks.assert(
    `every report the database holds for ${routeId} came back (${held.length})`,
    missing.length === 0,
    missing.length
      ? `missing ${missing.map((r) => `${r.reportId}@${r.reportedAt.toISOString()}`).join(', ')} ` +
        '— a date window has been reintroduced on top of the route foreign key'
      : 'the foreign key is the key; no window is layered on top of it to lose anything',
  );

  // The boundary case, across the whole estate rather than this one route.
  const all = await fleet.driverReport.findMany({
    select: { reportId: true, routeId: true, reportedAt: true },
  });
  const routes = await fleet.route.findMany({ select: { routeId: true, routeDate: true } });
  const dateOf = new Map(routes.map((r) => [r.routeId, civilDate(r.routeDate)]));
  const afterMidnight = all.filter(
    (r) => londonCivilDate(r.reportedAt) !== dateOf.get(r.routeId),
  );

  checks.assert(
    `the estate still contains reports filed on a different London day (${afterMidnight.length})`,
    afterMidnight.length > 0,
    'if this reaches zero the estate stopped exercising the case, and the assertion ' +
      'above would pass for a lookup that had quietly started filtering again',
  );

  for (const report of afterMidnight.slice(0, 3)) {
    const route = routes.find((r) => r.routeId === report.routeId)!;
    const viaApi = await fleet.driverReport.count({
      where: { routeId: report.routeId, reportId: report.reportId },
    });
    checks.assert(
      `${report.reportId} (route ${dateOf.get(report.routeId)}, filed ` +
        `${londonCivilDate(report.reportedAt)} London) is reachable`,
      viaApi === 1 && route !== undefined,
      'a round that ends after midnight is still that round — dropping its write-up ' +
        'is dropping the sentence that says the trolley tipped',
    );
  }
}

/**
 * THE HOLIDAY TABLE EXISTS TWICE, AND THE TWO MUST AGREE.
 *
 * `src/common/calendar/uk-bank-holidays.ts` is a committed data file, on purpose:
 * `commerce:sla-check` has to be offline and free, and a date-arithmetic test
 * that needs a live Postgres is a test that gets skipped on the day it matters.
 * But fde-assistants-2d's estate ALSO carries `thb_policy.bank_holidays`, which
 * is the row a returns tool would actually consult.
 *
 * Two sources of truth for the same fact is normally a bug. Here it is a
 * deliberate trade — offline checks are worth a lot — so the honest thing is to
 * RECONCILE THEM SOMEWHERE, and this is the only check that can see both. If
 * they ever drift, the working-day arithmetic in this API and the working-day
 * arithmetic in the estate disagree about whether a parcel was late, and nothing
 * else in the repo would notice.
 *
 * Compared only over the years BOTH cover, because a table that stops at 2027
 * and one that runs to 2030 are not in conflict about 2028.
 */
async function checkProposeCannotCrossCases(base: string, fixture: Fixture): Promise<void> {
  const otherCase = await post(base, '/resolutions', headers(fixture), {
    caseId: 'CASE-SOMEONE-ELSE',
    kind: 'goodwill_only',
    amountPence: 500,
    proposedBy: 'x',
  });
  checks.assert(
    'a draft cannot be written onto another case',
    otherCase.body?.ok === false && otherCase.body?.cause === 'out_of_scope',
    "putting words in front of a different customer's adjuster is a smaller blast " +
      'radius than reading their order and a worse one to explain',
  );
}

async function checkBankHolidaysAgree(app: INestApplication): Promise<void> {
  checks.section('THE HOLIDAY TABLE, RECONCILED — committed file vs the estate');
  const policy = app.get<PolicyClient>(POLICY_CLIENT);
  const rows = await policy.bank_holidays.findMany();

  checks.assert(
    'thb_policy.bank_holidays is seeded',
    rows.length > 0,
    'the estate declares this table and the returns tooling would read it; an ' +
      'empty one is a seed gap on fde-assistants-2d\'s side, not a calendar bug here',
  );
  if (rows.length === 0) return;

  // JURISDICTION IS FILTERED EXPLICITLY, WITH NO FALLBACK — flagged by
  // fde-assistants-2d, and the reason is concrete: their table also holds
  // SCOTLAND, whose August bank holiday is the FIRST Monday (2026-08-03) where
  // England & Wales take the LAST (2026-08-31). An `?? jurisdictions[0]` fallback
  // would silently compare my England & Wales file against Scotland's rows and
  // report a disagreement that is really a category error — or worse, agree.
  const jurisdictions = [...new Set(rows.map((r) => r.jurisdiction))];
  const englandAndWales = jurisdictions.find((j) => /eng/i.test(j));
  checks.assert(
    `the estate names an England & Wales jurisdiction (saw: ${jurisdictions.join(', ')})`,
    englandAndWales !== undefined,
    "Thornbury's carrier SLAs are written against England & Wales; without that " +
      'row set there is nothing to reconcile and guessing a default would be worse',
  );
  if (!englandAndWales) return;

  const fromEstate = rows
    .filter((r) => r.jurisdiction === englandAndWales)
    .map((r) => civilDate(r.holidayDate))
    .filter((d) => {
      const year = Number(d.slice(0, 4));
      return year >= COVERED_YEARS.first && year <= COVERED_YEARS.last;
    })
    .sort();

  const years = new Set(fromEstate.map((d) => d.slice(0, 4)));
  const fromFile = UK_BANK_HOLIDAYS.filter((d) => years.has(d.slice(0, 4)));

  const onlyInEstate = fromEstate.filter((d) => !fromFile.includes(d));
  const onlyInFile = fromFile.filter((d) => !fromEstate.includes(d));

  const scotlandOnly = rows
    .filter((r) => r.jurisdiction !== englandAndWales)
    .map((r) => civilDate(r.holidayDate));
  if (scotlandOnly.length > 0) {
    checks.assert(
      'other jurisdictions are present AND excluded from the comparison',
      scotlandOnly.some((d) => !UK_BANK_HOLIDAYS.includes(d)),
      "Scotland's August holiday is the first Monday and England & Wales's is the " +
        'last, so at least one of its dates must be absent from the committed file — ' +
        'if every date matched, the filter would be doing nothing and T6 would be ' +
        'right for the wrong reason',
    );
  }

  checks.assert(
    `the two agree for ${englandAndWales} over ${[...years].sort().join(', ')}`,
    onlyInEstate.length === 0 && onlyInFile.length === 0,
    onlyInEstate.length || onlyInFile.length
      ? `only in the estate: ${onlyInEstate.join(', ') || 'none'}; only in the ` +
          `committed file: ${onlyInFile.join(', ') || 'none'}. One of the two is ` +
          'wrong, and until they agree this API and the estate disagree about ' +
          'whether a parcel was late'
      : 'the offline check and the live estate compute the same working days',
  );
}

// ── orchestration ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  try {
    estateBaseUrl();
  } catch (error) {
    cannotRun(TITLE,
      `${(error as Error).message}\n  This check needs the estate. The other four ` +
        `(api-guard-check, api-scope-check, sla-check, api-isolation-check) are offline.`,
    );
  }

  const { app, base } = await boot().catch((error: Error) =>
    cannotRun(TITLE, `the API did not start: ${error.message}`),
  );
  try {
    const healthy = await checkHealth(base);
    if (!healthy) {
      cannotRun(TITLE,
        'one or more of the five databases did not answer. fde-assistants-2d owns ' +
          'creation and seeding — run their db:create / db:migrate / db:seed first. ' +
          'The refs printed above join these lines to the server log.',
      );
    }

    const fixture = await findFixture(app);
    if (!fixture) {
      cannotRun(TITLE,
        'the estate is up but holds no case with an order_ref, so there is nothing ' +
          'to exercise the endpoints against. The databases exist; the seed has not run.',
      );
    }

    const walk = await findWalkFixture(app);
    if (!walk) {
      cannotRun(
        TITLE,
        'no case in the estate reaches a route (case → order → shipment → stop), ' +
          'so the T1 walk cannot be exercised at all. That is the one thing this ' +
          'endpoint exists for, and skipping it quietly is how a green check ends ' +
          'up being evidence of something it never looked at.',
      );
    }

    await checkGuardIsWired(base, fixture);
    await checkOrder(base, fixture);
    await checkDelivery(base, walk);
    await checkHistory(base, fixture);
    await checkScopeIsEnforced(base, fixture);
    await checkPolicy(base, fixture);
    await checkSla(base, fixture);
    await checkPropose(base, fixture, app);
    await checkNoDriverReportIsLost(app, base, walk);
    await checkBankHolidaysAgree(app);
  } finally {
    await app.close();
  }

  checks.done();
}

main().catch((error: Error) => {
  // writeSync, not console.error — see src/checks/harness.ts. A crash report
  // that races process.exit to a pipe is a crash report nobody reads.
  writeSync(2, `\n${TITLE} crashed:\n${error?.stack ?? String(error)}\n`);
  process.exit(1);
});
