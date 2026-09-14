/**
 * The plain-English half of the trace.
 *
 * WHY IT EXISTS. `assess_release — 14 fetches — 4102ms` tells an engineer
 * everything and a QA reviewer nothing. The working notes are meant to be read
 * by someone who has never heard the phrase "tool call", so every step carries a
 * sentence saying what just happened and, where it matters, why it is done this
 * way rather than the obvious way.
 *
 * THIS FILE IS DOMAIN. Its sibling in `apps/insurance-app` explains searches and
 * policyholder lookups; this one explains a six-database walk and an as-of
 * procedure lookup. Nothing here is shared with it, and nothing should be — the
 * sentences ARE the domain knowledge, which is exactly the part that does not
 * transfer to the next customer.
 */
export function explainCall(name: string, args: any): string {
  if (name === 'assess_release') {
    const lot = args?.lot_id ?? 'the lot';
    const market = args?.market;
    return (
      `Walking every system for ${lot}${market ? `, against ${market} rules` : ''}. ` +
      `The six systems are separate databases, so no single query can join them — ` +
      `the manufacturing record, the test results, the people, the procedures and ` +
      `the shipment are followed one hop at a time, in code.`
    );
  }
  if (name === 'search_procedures') {
    const asOf = args?.as_of;
    return asOf
      ? `Looking up the written procedure as it stood on ${asOf} — not as it stands today. ` +
          `The revision that governs an act is the one in force when the act happened, and ` +
          `answering from the current revision is the single easiest way to be confidently wrong.`
      : `Looking up the written procedure behind the finding, so the answer can quote the ` +
          `clause rather than assert it.`;
  }
  return 'Calling a tool.';
}

export function explainResult(name: string, data: any): string {
  if (!data.ok) {
    return 'The tool failed. The error goes back to the model as readable text rather than crashing the request, so it can recover or say it could not find out.';
  }
  if (name === 'assess_release') {
    return 'The walk is finished. Everything it found is a fact from the systems, decided in code — the model reads the findings, it does not invent them.';
  }
  if (name === 'search_procedures') {
    return 'Passages ranked by meaning rather than keywords. A high rank does not mean the clause says what you hoped; the model still has to read it and decide.';
  }
  return 'Result returned.';
}

export const RETRY_EXPLANATION =
  'The answer did not fit the required shape, so the error went back to the model and it is trying again. It is never silently repaired — a repair you cannot see is a failure rate you cannot count.';

export function describeArgs(args: any): string {
  if (!args || typeof args !== 'object') return String(args ?? '');
  if (args.lot_id) return `${args.lot_id}${args.market ? ` → ${args.market}` : ''}`;
  if (args.query) return `“${args.query}”${args.as_of ? ` as of ${args.as_of}` : ''}`;
  return JSON.stringify(args);
}
