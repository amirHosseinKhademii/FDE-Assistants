/**
 * STAGE 6.1 — the five tools, described to a model.
 *
 * Read `docs/safety/STAGE6.md` §4a first.
 *
 * ── THE DESCRIPTIONS ARE THE INTERFACE, NOT THE DOCUMENTATION ─────────────
 *
 * `@fde/agent`'s own header says it:
 *
 *   A tool parameter's description is the only thing telling the model what to
 *   put there, and a vague one produces a tool that gets called with the wrong
 *   arguments — a failure that looks like a model problem and is a
 *   documentation problem.
 *
 * That matters more here than usual, because stage 4 built five tools that are
 * easy to confuse:
 *
 *   get_recall          I know the campaign number
 *   find_recalls        I know the vehicle — is there a campaign?
 *   search_complaints   I want to READ complaints
 *   count_complaints    I want HOW MANY
 *   complaints_citing   I want complaints that NAME this campaign
 *
 * A model that reaches for `search_complaints` when it wanted
 * `count_complaints` will count the passages it was handed and produce a
 * confident wrong number — REC-001's trap arriving from a new direction. So
 * every description below says what the tool is for AND what it is not for.
 *
 * ── AND EACH TOOL PARSES ITS OWN ARGUMENTS ────────────────────────────────
 *
 * `ToolRegistry.dispatch` does not validate: it looks the tool up and calls
 * `execute`. The Zod schema is what gets SENT to the model, and a model is free
 * to send something else back. So each `execute` parses first, and a bad
 * argument becomes a message the model can read and correct rather than a
 * `TypeError` three layers down.
 */
import { z } from 'zod';
import type { Tool } from '@fde/agent';
import { getRecall } from '../tools/get-recall.tool';
import { findRecalls } from '../tools/find-recalls.tool';
import { searchComplaints } from '../tools/search-complaints.tool';
import { countComplaints } from '../tools/count-complaints.tool';
import { complaintsCiting } from '../tools/complaints-citing.tool';

/** Shared by three tools, so the model learns one vocabulary rather than three. */
const VEHICLE = {
  make: z
    .string()
    .describe('Manufacturer as NHTSA writes it, e.g. "FORD", "HONDA", "TESLA". Case is ignored.'),
  model: z
    .string()
    .describe('Model as NHTSA writes it, e.g. "F-150", "ODYSSEY", "MODEL 3". Case is ignored.'),
  year: z
    .number()
    .int()
    .optional()
    .describe('Model year. Omit for any year — the corpus covers 2019 and 2020 only.'),
  component: z
    .string()
    .optional()
    .describe(
      'A component, or any PARENT of one — matching is by prefix down NHTSA’s colon ' +
        'hierarchy. "FORWARD COLLISION AVOIDANCE" takes every sub-component beneath it; ' +
        '"POWER TRAIN:AUTOMATIC TRANSMISSION" takes only that branch and not the rest of ' +
        'POWER TRAIN. Choose the level the question asks about.',
    ),
};

const FILTERS = {
  ...VEHICLE,
  make: VEHICLE.make.optional().describe(`${VEHICLE.make.description} Optional.`),
  model: VEHICLE.model.optional().describe(`${VEHICLE.model.description} Optional.`),
  filed_after: z
    .string()
    .optional()
    .describe('ISO date, inclusive: complaints filed on or after this. Use the recall notification date to mean "after the recall".'),
  filed_before: z.string().optional().describe('ISO date, inclusive.'),
  crash: z.boolean().optional().describe('Only complaints where a crash was reported.'),
  fire: z.boolean().optional().describe('Only complaints where a fire was reported.'),
  min_deaths: z
    .number()
    .int()
    .optional()
    .describe('At least this many deaths. Use 1 for "involving a death" — this is a FIELD, not a word to search for.'),
  min_injuries: z.number().int().optional().describe('At least this many injuries.'),
};

const CAMPAIGN = z
  .string()
  .describe(
    'An NHTSA campaign number: two digits, a letter, six digits — e.g. "20V197000". ' +
      'If you do not have one, use find_recalls instead.',
  );

/** Parse, and turn a bad argument into something the model can act on. */
function parsed<T>(schema: z.ZodType<T>, args: unknown, tool: string): T {
  const r = schema.safeParse(args);
  if (!r.success) {
    throw new Error(
      `${tool} was called with arguments it cannot use: ` +
        r.error.issues.map((i) => `${i.path.join('.') || '(root)'} — ${i.message}`).join('; '),
    );
  }
  return r.data;
}

const getRecallArgs = z.object({ campaign_number: CAMPAIGN });
const findRecallsArgs = z.object(VEHICLE);
const searchArgs = z.object({
  ...FILTERS,
  query: z
    .string()
    .describe(
      'What the complaints should be ABOUT, in the owner’s words: "will not go into park, ' +
        'rolls away". Do NOT put the vehicle or component here — those are filters above, and ' +
        'putting them here matches them as prose against 70,194 documents.',
    ),
});
const countArgs = z.object({
  ...FILTERS,
  matching: z
    .string()
    .optional()
    .describe(
      'Optional phrase to narrow the count from a COMPONENT to a DEFECT. Google syntax: SPACES ' +
        'MEAN AND, so join alternatives with "or" — "park or prndl or rollaway". Omit it and you ' +
        'are counting everything filed against the component, which is a different question.',
    ),
});
const citingArgs = z.object({ campaign_number: CAMPAIGN });

export const GET_RECALL_TOOL: Tool = {
  hasUpstream: true,
  schema: {
    type: 'function',
    name: 'get_recall',
    description:
      'Look up ONE recall campaign by its number and return everything about it: the vehicles ' +
      'covered, units affected, component, defect, consequence, remedy, who initiated it and ' +
      'when owners were notified. Use this whenever the question names a campaign. Do NOT ' +
      'search for a campaign number — searching returns documents that merely resemble one.',
    parameters: getRecallArgs,
  },
  execute: async (args) => getRecall(parsed(getRecallArgs, args, 'get_recall').campaign_number),
};

export const FIND_RECALLS_TOOL: Tool = {
  hasUpstream: true,
  schema: {
    type: 'function',
    name: 'find_recalls',
    description:
      'Ask whether any recall covers a vehicle, optionally for one component. USE THIS TO ' +
      'ANSWER "is there a recall for X" — AN EMPTY RESULT IS A REAL ANSWER, and it comes back ' +
      'with the other components that ARE recalled on that vehicle, so you can say the absence ' +
      'was looked for. If it returns nothing, do not cite a different campaign instead.',
    parameters: findRecallsArgs,
  },
  execute: async (args) => findRecalls(parsed(findRecallsArgs, args, 'find_recalls')),
};

export const SEARCH_COMPLAINTS_TOOL: Tool = {
  hasUpstream: true,
  schema: {
    type: 'function',
    name: 'search_complaints',
    description:
      'Read complaints matching a filter. Filters first, then searches INSIDE what is left — ' +
      'which is why the vehicle and component belong in the filter fields and not in `query`. ' +
      'Returns up to 6 complaints to quote. It does NOT tell you how many exist: for that use ' +
      'count_complaints, and never count the results this returns.',
    parameters: searchArgs,
  },
  execute: async (args) => {
    const { query, ...filter } = parsed(searchArgs, args, 'search_complaints');
    return searchComplaints(filter, query);
  },
};

export const COUNT_COMPLAINTS_TOOL: Tool = {
  hasUpstream: true,
  schema: {
    type: 'function',
    name: 'count_complaints',
    description:
      'How MANY complaints match a filter. Returns a number and the filter that produced it, ' +
      'and no complaints at all. USE THIS FOR EVERY NUMBER YOU REPORT — counting the results of ' +
      'search_complaints gives you at most 6 and is wrong. Call it twice to separate a component ' +
      'from a defect: once without `matching`, once with.',
    parameters: countArgs,
  },
  execute: async (args) => {
    const { matching, ...filter } = parsed(countArgs, args, 'count_complaints');
    return countComplaints(filter, matching);
  },
};

export const COMPLAINTS_CITING_TOOL: Tool = {
  hasUpstream: true,
  schema: {
    type: 'function',
    name: 'complaints_citing',
    description:
      'Complaints whose narrative NAMES a campaign number — owners who had the recall in front ' +
      'of them. Stronger evidence than sharing a component, and the right tool for "is the fix ' +
      'holding". Still allegations: it is never evidence that a remedy failed. Most owners never ' +
      'quote a number, so an empty result means little.',
    parameters: citingArgs,
  },
  execute: async (args) =>
    complaintsCiting(parsed(citingArgs, args, 'complaints_citing').campaign_number),
};

/** All five, in the order stage 4 built them. */
export const SAFETY_TOOLS: Tool[] = [
  GET_RECALL_TOOL,
  FIND_RECALLS_TOOL,
  SEARCH_COMPLAINTS_TOOL,
  COUNT_COMPLAINTS_TOOL,
  COMPLAINTS_CITING_TOOL,
];
