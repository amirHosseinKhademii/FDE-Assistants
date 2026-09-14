/**
 * DOMAIN: the list of policyholders, for a HUMAN to choose from.
 *
 * WHY THIS IS NOT A SEARCH TOOL. `get-policyholder.tool.ts` exists to NOT be a
 * search: a deductible has one right answer, and "the five most Maria-shaped
 * records" is a catastrophic way to answer it. That rule is about answering
 * coverage questions, and it stands.
 *
 * This is a different job — identity resolution — and the difference is who
 * decides. This function returns candidates to a PERSON, who picks one, and the
 * pick becomes the `policy` parameter. The model never sees this list and never
 * chooses from it, so there is no path by which a near-match becomes an answer.
 * If that ever changes, the rule above is broken and the eval suite will not
 * catch it, because no case asserts something the model was never given.
 *
 * WHAT THIS STANDS IN FOR. In a real deployment the adjuster does not pick a
 * customer from a dropdown — she is already looking at a claim in the insurer's
 * claims system, which supplies the policy id as context. This exists because
 * the demo app has no host system to be embedded in. At eighteen records a list
 * is honest; at eighteen thousand it becomes a typeahead against their system,
 * not against ours.
 */
import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { DOMAIN } from './config/domain';

export interface PolicyholderSummary {
  policyId: string;
  /** The named insured, read from the record's title line. */
  name: string;
  /** Which of the near-identical forms they are on — the thing that decides answers. */
  form: string;
}

/** Title line: `# Policyholder Record AUT-4471 — Maria Santos` */
const TITLE = /^#\s*Policyholder Record\s+(\S+)\s+[—-]\s+(.+)$/m;
/** Header line: `… Policy ID: AUT-4471 · Form: PA-2023-01` */
const FORM = /Form:\s*([A-Z0-9-]+)/;

export async function listPolicyholders(): Promise<PolicyholderSummary[]> {
  const files = (await readdir(DOMAIN.recordsDir)).filter((f) => f.endsWith('.md'));

  const rows = await Promise.all(
    files.map(async (file) => {
      const id = basename(file, '.md');
      const text = await readFile(join(DOMAIN.recordsDir, file), 'utf8');
      return {
        policyId: id,
        // A record whose title does not parse still appears, by id. Dropping it
        // silently would hide a corpus problem behind an empty dropdown.
        name: TITLE.exec(text)?.[2]?.trim() ?? '(name not in record)',
        form: FORM.exec(text)?.[1] ?? '(form not in record)',
      };
    }),
  );

  return rows.sort((a, b) => a.policyId.localeCompare(b.policyId));
}
