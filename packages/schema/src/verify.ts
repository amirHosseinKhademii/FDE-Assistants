/**
 * PROVE THE VALIDATOR IS REALLY VALIDATING — offline, no model, no cost.
 *
 * `createAnswerValidator` is the narrowest seam in the whole system: every
 * answer the model produces goes through it, and if it silently stops rejecting
 * things, nothing downstream notices. The eval suite will not catch it — the
 * eval suite tests what a real model happens to produce, which is a sample, not
 * a contract. This tests the CONTRACT ITSELF: given a response shaped like X,
 * does the validator do the right thing?
 *
 * WHAT IS GENERIC AND WHAT IS NOT. The runner is here; the CASES are yours. The
 * shape of a good answer is the most domain-specific thing you own, and so is
 * the list of responses that would be dangerous if they slipped through. A
 * package shipping those would be shipping your judgment.
 *
 * WRITE THE CASES BEFORE THE LOOP EXISTS. The contract is what the loop, the
 * prompt, and every future eval check are built against — getting it wrong
 * later means rewriting all three.
 */

export interface ValidatorCase {
  name: string;
  /** `'accept'`, or a substring the rejection message must contain. */
  expect: 'accept' | string;
  /** A string is fed through verbatim — that is how you test unparseable input. */
  body: unknown;
  /** Why this case earns its place. Printed on every run, pass or fail. */
  why: string;
}

export interface VerifyResult {
  passed: boolean;
  lines: string[];
}

/**
 * Run each case through YOUR validator and assert the intended verdict.
 *
 * MATCHING ON A MESSAGE SUBSTRING IS DELIBERATE, not laziness. The message is
 * what gets handed back to the model on retry, so it is part of the contract.
 * Asserting merely "it was rejected" would pass even if the reason had drifted
 * to something the model cannot act on.
 */
export function verifyValidator(opts: {
  cases: ValidatorCase[];
  validate(raw: string): { ok: boolean; errors?: string };
}): VerifyResult {
  const lines: string[] = [];
  let passed = 0;
  let failed = 0;

  for (const c of opts.cases) {
    const raw = typeof c.body === 'string' ? c.body : JSON.stringify(c.body);
    const result = opts.validate(raw);

    const ok =
      c.expect === 'accept' ? result.ok : !result.ok && (result.errors ?? '').includes(c.expect);

    if (ok) {
      passed++;
      lines.push(`  ok    ${c.name}`);
    } else {
      failed++;
      lines.push(`  FAIL  ${c.name}`);
      lines.push(
        `        expected: ${c.expect === 'accept' ? 'accepted' : `rejected containing "${c.expect}"`}`,
      );
      lines.push(`        got     : ${result.ok ? 'accepted' : result.errors}`);
    }
    lines.push(`        why: ${c.why}`);
  }

  lines.push(`\nschema contract: ${passed}/${opts.cases.length} passed`);
  return { passed: failed === 0, lines };
}

// ---------------------------------------------------------------------------
// Description coverage
// ---------------------------------------------------------------------------
//
// WHY THIS EXISTS. Field descriptions in a structured-output schema are PROMPT
// ENGINEERING, not documentation — "Be honest; an empty array is a strong
// statement and will be audited" is doing real work on the model. They travel
// to the provider inside the response format, and a dropped one is a SILENTLY
// WEAKER PROMPT: the schema still validates, the types still infer, the case
// table above still passes, and the model just gets less guidance. Nothing else
// in a normal test suite would catch it.
//
// This bit the project for real when the schema moved from hand-written JSON
// Schema to Zod and every description had to be re-expressed as `.describe()`.

/** Leaf properties with no description, at any depth. Paths are dotted. */
function undescribed(node: any, path = ''): string[] {
  const missing: string[] = [];
  if (!node || typeof node !== 'object') return missing;

  // Unwrap the containers that do not themselves carry a description.
  if (node.type === 'array' && node.items) {
    return undescribed(node.items, `${path}[]`);
  }
  for (const key of ['anyOf', 'oneOf', 'allOf']) {
    if (Array.isArray(node[key])) {
      return node[key].flatMap((n: any) => undescribed(n, path));
    }
  }

  if (node.properties) {
    for (const [name, child] of Object.entries<any>(node.properties)) {
      const here = path ? `${path}.${name}` : name;
      const describedHere =
        typeof child.description === 'string' && child.description.trim().length > 0;
      // A nullable field becomes anyOf/type[]; the description sits on the
      // wrapper, so check the wrapper before descending.
      if (!describedHere) {
        const deeper = undescribed(child, here);
        if (deeper.length === 0 && !child.properties && child.type !== 'array') {
          missing.push(here);
        } else {
          missing.push(...deeper);
        }
      } else if (child.properties || child.type === 'array') {
        missing.push(...undescribed(child, here));
      }
    }
  }
  return missing;
}

/**
 * Require a description on every leaf field of a JSON Schema.
 *
 * Takes the JSON Schema, not a Zod object, so this works whatever you generated
 * it with — `z.toJSONSchema(S, { io: 'output' })` is the usual caller.
 *
 * WHY THE NEGATIVE CONTROL. A check that cannot fail reads like evidence while
 * proving nothing: this project once shipped an orphan count that reported `0`
 * for months without the splitting path ever executing. So this strips a
 * description out of a copy of YOUR OWN schema and asserts the walker notices.
 * If the control ever passes silently, the check above has gone blind — most
 * likely because the schema's shape moved somewhere the walker no longer
 * descends into.
 */
export function verifyDescriptions(jsonSchema: unknown): VerifyResult {
  const lines: string[] = [];
  const missing = undescribed(jsonSchema);
  const ok = missing.length === 0;

  lines.push(
    `\n  ${ok ? 'ok  ' : 'FAIL'}  every field carries a description\n` +
      `        ${
        ok
          ? 'all fields described — the prompt survived intact'
          : `MISSING on: ${missing.join(', ')} — these fields lost their prompt text`
      }`,
  );

  // The control. Blank the first description the walker can see and require a
  // complaint about that exact path.
  const copy = JSON.parse(JSON.stringify(jsonSchema));
  const victim = stripOneDescription(copy);
  const caught = victim ? undescribed(copy).length > missing.length : false;

  lines.push(
    `  ${caught ? 'ok  ' : 'FAIL'}  control: a stripped description IS detected\n` +
      `        ${
        victim
          ? caught
            ? `removing the description on "${victim}" made the walk report it — the check can fail`
            : `removed the description on "${victim}" and the walk still reported nothing — this check is blind`
          : 'no describable field found to strip — control inconclusive, treat the check as unproven'
      }`,
  );

  return { passed: ok && caught, lines };
}

/** Delete one top-level property description in place. Returns its name. */
function stripOneDescription(node: any): string | null {
  if (!node?.properties) return null;
  for (const [name, child] of Object.entries<any>(node.properties)) {
    if (typeof child?.description === 'string' && child.description.trim()) {
      delete child.description;
      // Nested objects/arrays would still be reported via their own leaves, so
      // only a leaf gives a clean one-in-one-out signal.
      if (!child.properties && child.type !== 'array' && !child.items) return name;
      child.description = 'restored';
    }
  }
  return null;
}
