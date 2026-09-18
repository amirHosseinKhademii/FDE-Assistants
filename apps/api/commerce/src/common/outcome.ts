/**
 * EVERY ENDPOINT RETURNS A STRUCTURED OUTCOME. Not a bare body, not a status
 * code carrying the meaning, not an exception.
 *
 * WHY, MEASURED BY fde-assistants-86 ON 2026-09-18 against the MCP layer over
 * `InMemoryTransport`. They planted three failures with three different owners
 * and got ONE wire shape back:
 *
 *     DOMAIN refusal   isError=true  text="not in scope for this case"
 *     THROWN           isError=true  text="socket is on fire"
 *     BAD ARGS         isError=true  text="Input validation error: … received number"
 *
 * The domain said no, the code broke, and the caller sent the wrong type — and
 * MCP flattens all three to a boolean plus free text. Only the validation case
 * is identifiable, and only by sniffing a message prefix.
 *
 * A CONSUMER DEPENDS ON THIS, BY NAME. The MCP layer's five-way blame
 * discriminator (PLAN.md §6.1) reads `cause` straight into `structuredContent`
 * rather than sniffing prose, and it rests on one property of this API:
 *
 *     A 5xx FROM HERE ALWAYS MEANS PLUMBING.
 *
 * Every domain outcome — no such order, not your order, bad arguments — is an
 * HTTP 200 carrying a `Failure`, or a 400 from the Zod pipe. If a domain
 * outcome ever starts arriving as a 500, the far side's `threw` vs `tool_error`
 * split silently stops working and every eval that blames the model for a dead
 * socket will look correct. That is the failure mode to protect, and it is why
 * `PolicyService.getSla` range-checks a caller's date instead of letting the
 * calendar throw.
 *
 * THE RULE THAT FALLS OUT OF THAT: a boundary that serialises does not preserve
 * what the type system was preserving. Anything the far side needs to know goes
 * in the PAYLOAD — it will not survive as a type, a status code, or an exception
 * class. So `cause` is a field, and PLAN.md §6.1's five-way blame discriminator
 * has something to read.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * THE ONE PLACE THIS DELIBERATELY DIVERGES FROM THE REQUESTED SHAPE, and it is
 * flagged rather than done quietly.
 *
 * 86 asked for two things that cannot both hold:
 *
 *   (a) "'Not found' and 'out of scope' must be different `cause` values."
 *   (b) "An out-of-scope answer must never reveal that the record exists."
 *
 * If a nonexistent order returns `not_found` and a real order belonging to
 * someone else returns `out_of_scope`, then the pair of answers IS the
 * disclosure (b) forbids: a caller varying one path parameter learns exactly
 * which order ids are real, without ever reading a row. That is an enumeration
 * oracle, and it is worth more to an attacker than any single order.
 *
 * SO: for a record the CALLER NAMES inside a case's scope — an order id, a
 * customer id — both states collapse to `out_of_scope`, with identical detail
 * text. The server knows the difference; the caller does not learn it.
 *
 * `not_found` IS STILL USED, and only where there is nothing to enumerate:
 * `thb_policy` rows are Thornbury's own configuration, they name no customer,
 * and "there is no SLA for that carrier and service level" leaks nothing about
 * anybody. Keeping the value alive there is what makes its ABSENCE on the
 * customer-data paths a deliberate choice rather than an oversight.
 * ───────────────────────────────────────────────────────────────────────────
 */

export type FailureCause =
  /** The record does not exist, AND nothing about it is worth concealing. */
  | 'not_found'
  /**
   * Not reachable from this session's case — or not there at all. The two are
   * deliberately indistinguishable. See the header.
   */
  | 'out_of_scope'
  /** The caller's request was unusable: bad shape, no case id, unknown case. */
  | 'invalid_request'
  /** This API could not reach something it depends on. Blame: infrastructure. */
  | 'upstream_unavailable';

export interface Failure {
  ok: false;
  cause: FailureCause;
  /** Safe to show a human. Never names a record the caller may not see. */
  detail: string;
}

export interface Success<T> {
  ok: true;
  data: T;
}

export type Outcome<T> = Success<T> | Failure;

export function succeed<T>(data: T): Success<T> {
  return { ok: true, data };
}

/**
 * The single phrasing for both states it covers, so they cannot drift apart.
 *
 * If someone later gives these two different text, the oracle is back — which is
 * why there is one function and not two.
 */
export function outOfScope(what: string): Failure {
  return {
    ok: false,
    cause: 'out_of_scope',
    detail:
      `The ${what} requested is not part of this case. Either it does not ` +
      `exist or it belongs to another customer — this API deliberately does ` +
      `not say which.`,
  };
}

/** Only for records that are not a customer's. See the header. */
export function notFound(what: string): Failure {
  return { ok: false, cause: 'not_found', detail: `No ${what} matches that request.` };
}

export function invalidRequest(detail: string): Failure {
  return { ok: false, cause: 'invalid_request', detail };
}

export function noCasePresented(): Failure {
  return invalidRequest(
    'No case id was presented. Scope comes from the session, so every read of ' +
      "a customer's data needs one; this is a wiring problem, not a permission one.",
  );
}

export function unknownCase(): Failure {
  return invalidRequest(
    'The case id presented does not name a case in the contact centre. The case ' +
      'id comes from the session rather than from the model, so naming this ' +
      'plainly tells an operator where to look and gives a caller nothing to probe with.',
  );
}
