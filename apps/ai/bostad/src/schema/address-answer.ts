/**
 * The "Ask about this address" answer contract, in Zod.
 *
 * THE RULE THIS FILE ENCODES: the model answers only from the address profile
 * returned by @bostad/property, cites the profile section for every fact, and
 * lists what the profile does not hold. There is no free-text field that can
 * hold a fact with no section behind it, because `answer` is only prose
 * written around the `facts` list, and every number in it must reappear in a
 * fact value. The checks that Zod cannot express live in coherenceErrors().
 *
 * THE DESCRIPTIONS BELOW ARE PROMPT GUIDANCE, NOT DOCUMENTATION. If you edit
 * one, you are editing the prompt. Re-run the eval before believing it helped.
 *
 * DOMAIN: the section names are the bostad profile sections. The pattern
 * (structured facts with a citation each, a not_in_data list, and coherence
 * rules) is the same one apps/ai/insurance uses.
 */
import { z } from 'zod';
import { createAnswerValidator, type ValidationResult } from '@fde/schema';
import type { Profile, SectionStatus } from '@bostad/property';

/**
 * Every section of the address profile. The compile-time check below fails if
 * a section is added to Profile and not listed here, so the model can never be
 * offered a name the profile does not have, nor be denied one it does.
 */
export const SECTION_NAMES = [
  'location',
  'landslide',
  'transit',
  'noise',
  'district',
  'income',
  'places',
  'area',
  'price',
  'safety',
  'brf',
  'energy',
] as const;

export type SectionName = (typeof SECTION_NAMES)[number];

type MissingFromList = Exclude<keyof Profile, SectionName | 'address'>;
type ExtraInList = Exclude<SectionName, keyof Profile>;
const _sectionsMatchProfile: [MissingFromList, ExtraInList] extends [never, never]
  ? true
  : never = true;
void _sectionsMatchProfile;

/** The part of a profile the coherence rules read. A real Profile satisfies it. */
export type ProfileStatuses = { address: string } & {
  [K in SectionName]: { status: SectionStatus };
};

const Fact = z.strictObject({
  claim: z
    .string()
    .describe(
      'One specific statement of fact, in plain words, e.g. "Nearest tram stop ' +
        'is about 240 m away". One claim per entry. Do not merge two facts.',
    ),
  section: z
    .enum(SECTION_NAMES)
    .describe(
      'The profile section the value came from. Must be exactly one of the ' +
        'listed names. Use "price" only for Göteborg-wide figures, and say in ' +
        'the claim that the figure is city-wide and not this address.',
    ),
  value: z
    .string()
    .describe(
      'The value as it appears in that section, with its unit, e.g. "55 dB" or ' +
        '"389 kSEK". Copy digits exactly. The answer text may only state numbers ' +
        'that appear here.',
    ),
});

export const AddressAnswerSchema = z.strictObject({
  answer: z
    .string()
    .describe(
      'The answer to the question, in plain prose, in the language of the ' +
        'question. Built only from the facts list. If the profile does not hold ' +
        'the answer, say so in one plain sentence and point to not_in_data. Every ' +
        'number written here must also appear in a fact value.',
    ),

  address: z
    .string()
    .describe(
      'The address the answer is about, exactly as the profile states it. Do not ' +
        'correct or expand it.',
    ),

  facts: z
    .array(Fact)
    .describe(
      'One entry per fact the answer relies on. Each must name the profile section ' +
        'it came from. Never cite a section whose status is not "ok". Empty is ' +
        'allowed only when nothing in the profile answers the question, and then ' +
        'not_in_data must not be empty.',
    ),

  not_in_data: z
    .array(z.string())
    .describe(
      'Each thing the question asked about that the profile does not hold, named ' +
        'plainly, e.g. "BRF debt per apartment (Bolagsverket not connected)". Empty ' +
        'only when every part of the question is answered by a fact.',
    ),

  escalate: z
    .boolean()
    .describe(
      'True when a person must check or decide: the question needs a figure that ' +
        'is not in the profile, a section the question depends on is in error, or ' +
        'the question is about a specific transaction or document. False for a ' +
        'complete answer. Escalating is cheap and visible. A confident wrong answer ' +
        'is not.',
    ),
});

// ---------------------------------------------------------------------------

/** Inferred, never hand-written. */
export type AddressAnswer = z.infer<typeof AddressAnswerSchema>;
export type Fact = z.infer<typeof Fact>;
export type { ValidationResult };

/**
 * Digit runs in a text. Separators between digits (space, no-break space, dot,
 * comma) are removed first, so "1 200", "1,200" and "1200" all read as "1200",
 * and "4.5" and "4,5" read the same way.
 */
function digitRuns(text: string): string[] {
  const joined = text.replace(/(?<=\d)[\s .,](?=\d)/g, '');
  return joined.match(/\d+/g) ?? [];
}

/**
 * Rules Zod cannot express. Each message is written for the MODEL to act on,
 * because it is handed straight back on retry.
 */
export function coherenceErrors(answer: AddressAnswer, profile: ProfileStatuses): string[] {
  const errs: string[] = [];

  for (const f of answer.facts) {
    const status = profile[f.section].status;
    if (status !== 'ok') {
      errs.push(
        `fact "${f.claim}" cites section "${f.section}", whose status is ` +
          `"${status}", not "ok". Remove that fact and list the topic in not_in_data.`,
      );
    }
  }

  if (answer.facts.length === 0 && answer.not_in_data.length === 0) {
    errs.push(
      'no facts and no not_in_data. Either cite the section that answers the ' +
        'question, or list what the profile does not hold in not_in_data.',
    );
  }

  // Basic invented-number check. The answer may only state numbers that come from
  // a fact value, or from the address itself (a street number is not a claim).
  const allowed = new Set<string>([
    ...digitRuns(profile.address),
    ...answer.facts.flatMap((f) => digitRuns(f.value)),
  ]);
  const invented = [...new Set(digitRuns(answer.answer).filter((n) => !allowed.has(n)))];
  if (invented.length > 0) {
    errs.push(
      `answer states ${invented.join(', ')}, which appears in no fact value. ` +
        `State only numbers copied from a fact value.`,
    );
  }

  return errs;
}

/** Parse, shape-check, then coherence against the profile the answer was built from. */
export function validateAddressAnswer(raw: string, profile: ProfileStatuses): ValidationResult<AddressAnswer> {
  const validate = createAnswerValidator<AddressAnswer>({
    schema: AddressAnswerSchema,
    coherence: [(v) => coherenceErrors(v, profile)],
  });
  return validate(raw);
}
