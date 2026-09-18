/**
 * THE SESSION — who this conversation is about, decided before the model runs.
 *
 * THIS FILE IS THE WHOLE SECURITY ARGUMENT OF THE ENGAGEMENT, in twenty lines.
 *
 * A tool that took an order id as an argument would let anything that can
 * influence the model reach any order the service token can reach — and the
 * things that can influence the model include text a customer typed into a
 * contact form (planted flaw T5). So the model gets no say: the case is
 * established when the session opens, the server resolves the case to its
 * order, and `get_order` takes no arguments at all.
 *
 * The API enforces this independently — it checks the `x-case-id` header
 * against the record asked for and answers `out_of_scope` otherwise — which is
 * the right place for it, because a check on THIS side of the wire is a check
 * an attacker is already past. Ours is defence in depth, not the defence.
 *
 * See docs/commerce/PLAN.md §7.1.
 */
export interface Session {
  /** Established when the desk opens a case. Never model-supplied. */
  readonly caseId: string;
  /** The order this case is about. Resolved from the case, not chosen. */
  readonly orderId: string;
}

/**
 * The default is T1's case, and the ids are hardcodable ON PURPOSE.
 *
 * `CAS-90001` sits in a RESERVED BLOCK (`CAS-9xxxx`) that the estate's
 * ordinary-traffic loop skips, so it survives a change in traffic volume.
 * Before that block existed, four of the six planted traps had no case at all —
 * perfectly seeded, fully walkable by hand, and unreachable through the product,
 * because these tools take no order argument and the session carries the case.
 * Forty-six estate checks were green throughout: every one asked about the
 * ORDER, none about the way in. See docs/commerce/CORPUS.md §4.
 *
 * CAS-90001 → ORD-101414: the delivery record is spotless and the driver's
 * report for the route says the trolley tipped at stop 14. Reachable only by
 * walking stops → routes → driver_reports. The customer's own message names no
 * trolley, no route and no stop, so the walk is forced by the data rather than
 * hinted at by the complaint.
 */
export function sessionFromEnv(): Session {
  const caseId = process.env.COMMERCE_CASE_ID ?? 'CAS-90001';
  const orderId = process.env.COMMERCE_ORDER_ID ?? 'ORD-101414';
  return { caseId, orderId };
}
