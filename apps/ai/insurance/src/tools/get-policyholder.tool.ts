/**
 * get_policyholder — exact lookup, by id, no search.
 *
 * THIS TOOL EXISTS TO NOT BE A SEARCH. That is the whole point of it.
 *
 * A policyholder record has one exact answer to every question you can ask of
 * it: Maria Santos's collision deductible is $1,000, full stop. Routing that
 * through similarity search would return the five most Maria-shaped chunks in
 * the corpus and hope one of them is hers — which fails silently and
 * plausibly, the worst failure shape there is. With eighteen records that all
 * look alike, "most similar" and "correct" are different questions.
 *
 * The rule this encodes, worth carrying to any engagement:
 *   IF THE QUESTION HAS ONE EXACT ANSWER, IT IS A LOOKUP, NOT A SEARCH.
 *
 * The second job this tool does: it is the ONLY thing that can resolve the
 * contradiction planted in the policy wordings. PA-2023-01 §4.4 says rental
 * reimbursement is $40/day for 30 days; endorsement PA-END-2024-03 says
 * $50/day for 21 days; neither document states which policies it attaches to.
 * The `endorsements` field on the record is what decides it — and where that
 * field is itself unconfirmed (see AUT-4482), the honest answer is to escalate. *
 * DOMAIN: the exact-lookup tool. Swap the record shape and id pattern; keep the
 * "a lookup is not a search" split and the informative-miss behaviour.
 */
import { z } from 'zod';
import { fileRecordSource, type RecordSource } from '@fde/grounding';
import type { Tool } from '@fde/agent';
import { DOMAIN } from '../config/domain';

export const GET_POLICYHOLDER = 'get_policyholder';

export const DEFAULT_POLICYHOLDER_DIR = DOMAIN.recordsDir;

interface Args {
  policy_id: string;
}

export interface PolicyholderResult {
  policy_id: string;
  /** The full record text. Records are short by design — no chunking, no
   *  ranking, no truncation. The model reads the whole thing. */
  record: string;
  source: string;
}

export interface PolicyholderMiss {
  policy_id: string;
  found: false;
  /** Deliberately lists what DOES exist. A model that asked for a malformed id
   *  can correct itself; a model that asked for a genuinely absent policyholder
   *  learns the record is absent rather than inventing one. */
  known_policy_ids: string[];
  note: string;
}

const ID_PATTERN = DOMAIN.recordIdPattern;

/**
 * TAKES A SOURCE, NOT A DIRECTORY. It used to take `dir: string`, which encoded
 * an assumption no customer satisfies: that policyholder records are files in a
 * folder. They are rows in a policy administration system, reached by key.
 * `RecordSource` is the seam — see record-source.ts, and note that it points at
 * a DIFFERENT system from the document seam, deliberately.
 *
 * The default keeps every existing caller working and keeps this tool offline.
 */
export function getPolicyholderTool(
  source: RecordSource = fileRecordSource(DEFAULT_POLICYHOLDER_DIR),
): Tool<Args, PolicyholderResult | PolicyholderMiss> {
  return {
    // Local files, no network. Nothing to freeze into a fixture: the corpus is
    // committed, so this tool is already deterministic.
    hasUpstream: false,

    schema: {
      type: 'function',
      name: GET_POLICYHOLDER,
      description:
        'Look up ONE policyholder record by its exact policy id (format ' +
        'AUT-0000) and return it in full. Use this — never the policy search — ' +
        'for anything specific to a customer: their deductible, their coverage ' +
        'selections, which policy form they are on, which endorsements are ' +
        'attached to their policy, and their claim history. Which endorsements ' +
        'are attached is often what decides a coverage question, because the ' +
        'policy wordings themselves do not say which policies they apply to. ' +
        'If you do not know the policy id, ask for it. Do not guess an id.',
      parameters: z.strictObject({
        policy_id: z
          .string()
          .describe('Exact policy id, e.g. "AUT-4471". Case sensitive.'),
      }),
    },

    async execute({ policy_id }) {
      const known = await source.ids();
      const id = (policy_id ?? '').trim();

      if (!ID_PATTERN.test(id)) {
        return {
          policy_id: id,
          found: false,
          known_policy_ids: known,
          note:
            `"${id}" is not a valid policy id. The format is AUT- followed by ` +
            `four digits. Ask the adjuster for the correct id rather than ` +
            `guessing one from the list.`,
        };
      }

      if (!known.includes(id)) {
        return {
          policy_id: id,
          found: false,
          known_policy_ids: known,
          note:
            `No policyholder record exists for ${id}. Do not infer this ` +
            `customer's coverage from another record or from the policy ` +
            `wordings — say the record was not found and escalate.`,
        };
      }

      const found = await source.get(id);
      if (!found) {
        // `ids()` said it existed and `get()` disagrees. Never fall back to a
        // near match: this tool's whole contract is exact lookup, and a
        // plausible wrong record is the worst possible answer.
        return {
          policy_id: id,
          found: false,
          known_policy_ids: known,
          note:
            `Record ${id} was listed but could not be read. Treat it as ` +
            `unavailable and escalate — do not substitute another record.`,
        };
      }

      return {
        policy_id: id,
        record: found.content,
        source: `record:${id}`,
      };
    },
  };
}
