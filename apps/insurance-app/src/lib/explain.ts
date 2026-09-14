/**
 * The plain-English half of the trace.
 *
 * WHY IT EXISTS. `search_policy — 5 passages — 1241ms` tells an engineer
 * everything and a claims handler nothing. The working notes are meant to be
 * read by someone who has never heard the phrase "tool call", so every step
 * carries a sentence saying what just happened and, where it matters, why it is
 * done this way rather than the obvious way.
 *
 * The sentences are DERIVED FROM THE ARGUMENTS, not hard-coded per step: a
 * search filtered to an endorsement explains endorsements, one filtered to a
 * base form explains the near-identical forms problem, one with no filter warns
 * that several products will come back at once.
 */
export function explainCall(name: string, args: any): string {
  if (name === 'get_policyholder') {
    return `Reading ${args?.policy_id ?? 'the customer'}'s record. The model cannot open a file, so it asks — and the record is the only thing that says which of the twelve forms applies and which endorsements are attached.`;
  }
  if (name === 'search_policy') {
    const form: string | undefined = args?.policy_form ?? undefined;
    if (form?.includes('END')) {
      return `Checking endorsement ${form}, which the record listed as attached. An attached endorsement replaces the base form's wording where the two disagree.`;
    }
    if (form) {
      return `Searching only ${form}, the form this customer is on. Twelve near-identical forms each contain a section 4.4 with different amounts, so an unfiltered search finds the right clause in the wrong policy.`;
    }
    return 'Searching every form, with no filter — so passages will come back from several different products at once.';
  }
  return 'Calling a tool.';
}

export function explainResult(name: string, data: any): string {
  if (!data.ok) {
    return 'The tool failed. The error goes back to the model as readable text rather than crashing the request, so it can recover or say it could not find out.';
  }
  if (name === 'get_policyholder') {
    return 'Got the record. Everything after this — which form to search, which endorsements matter — comes from what it says.';
  }
  if (name === 'search_policy') {
    return 'Passages ranked by meaning rather than keywords. A high rank does not mean the answer is in there; the model still has to read them and decide.';
  }
  return 'Result returned.';
}

export const RETRY_EXPLANATION =
  'The answer did not fit the required shape, so the error went back to the model and it is trying again. It is never silently repaired — a repair you cannot see is a failure rate you cannot count.';

export function describeArgs(args: any): string {
  if (!args || typeof args !== 'object') return String(args ?? '');
  if (args.policy_id) return `the record for ${args.policy_id}`;
  if (args.query) return `“${args.query}”`;
  return JSON.stringify(args);
}
