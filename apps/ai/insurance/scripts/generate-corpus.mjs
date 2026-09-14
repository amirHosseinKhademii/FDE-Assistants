/**
 * Generate the haystack: 9 more policy wordings and 18 policyholder records.
 *
 * Run once, COMMIT THE OUTPUT. This script is not part of the runtime path.
 *
 * Why generated and not hand-written: the bulk documents have one job, which is
 * to be plausible near-duplicates of each other so retrieval has to actually
 * discriminate. Writing 27 of those by hand is a wasted afternoon that teaches
 * nothing. The three HERO documents in examples/policies/ — the base form, the
 * 2024 endorsement, and the exclusions schedule — are hand-written, because
 * every eval case points at a specific sentence in them and a generated
 * document cannot carry a deliberate flaw.
 *
 * Why the output is committed rather than regenerated at runtime: someone
 * reading this repo in a month needs to see the haystack, and an eval fixture
 * that regenerates differently is worthless. Fully deterministic — no
 * randomness, no timestamps — so re-running produces byte-identical files and
 * a clean `git diff`.
 *
 *   node scripts/generate-corpus.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
// The new document types live in their own modules. Adding five more inline
// templates would take this file past 2,000 lines, and each type has genuinely
// different structure — a bulletin is not a form with different numbers.
import { policyForms } from './corpus/forms.mjs';
import { repoint } from './corpus/form-ids.mjs';
import { bulletins } from './corpus/bulletins.mjs';
import { circulars } from './corpus/circulars.mjs';
import { determinations } from './corpus/determinations.mjs';
import { internalDocuments } from './corpus/internal.mjs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const POLICIES = join(ROOT, 'examples', 'policies');
const HOLDERS = join(ROOT, 'examples', 'policyholders');

const BANNER = (extra) =>
  `> Meridian Mutual Insurance Company. Fictional document, written for an FDE\n` +
  `> practice engagement. Do not use for anything real.\n>\n> ${extra}\n`;

// ---------------------------------------------------------------------------
// 2. Policyholder records — the lookup corpus
// ---------------------------------------------------------------------------

/**
 * These are database rows wearing a markdown costume. They are NOT searched —
 * get_policyholder reads one whole, by id. Putting them in the vector index
 * would be the anti-pattern this split exists to teach: "what is Maria's
 * deductible" has one exact answer, and similarity search is the wrong
 * instrument for a question with one exact answer.
 *
 * The `endorsements` field is load-bearing. The two hero wordings disagree
 * about the rental benefit and neither says which policies it attaches to, so
 * the disagreement is only resolvable HERE. Three cases exist on purpose:
 *   - endorsement attached      -> $50/day, 21 days
 *   - no endorsement            -> $40/day, 30 days
 *   - attached but not in force -> genuinely unresolvable, escalate
 */
const HOLDER_ROWS = [
  ['AUT-4471', 'Maria Santos',      'PA-2023-01',    'Illinois',   '2024-06-01', '2025-06-01', '2019 Honda CR-V EX',        '$1,000', '$500',   'yes', ['PA-END-2024-03'], 'none in the last five years'],
  ['AUT-4472', 'Daniel Okafor',     'PA-2023-01',    'Illinois',   '2024-02-15', '2025-02-15', '2021 Toyota Camry SE',      '$500',   '$500',   'no',  [], 'one comprehensive claim (hail), 2023-05'],
  // Priya is the ADJUSTER persona (ROADMAP §4) — deliberately not a
  // policyholder name, so "Priya" in a question is never ambiguous.
  ['AUT-4473', 'Naomi Ferreira',    'PA-2023-01',    'Ohio',       '2024-09-01', '2025-09-01', '2018 Subaru Outback',       '$1,000', '$500',   'yes', [], 'none in the last five years'],
  ['AUT-4474', 'James Whitfield',   'PA-2023-01',    'Ohio',       '2023-11-01', '2024-11-01', '2016 Ford F-150 XLT',       '$1,000', '$500',   'yes', ['PA-END-2023-11'], 'one glass claim, 2024-03'],
  ['AUT-4475', 'Aisha Bello',       'PA-2023-01-TX', 'Texas',      '2024-04-01', '2025-04-01', '2022 Hyundai Tucson',       '$1,000', '$500',   'yes', ['PA-END-2024-03'], 'none in the last five years'],
  ['AUT-4476', 'Robert Kaminski',   'PA-2023-01-TX', 'Texas',      '2024-01-10', '2025-01-10', '2015 Chevrolet Silverado',  '$1,000', '$500',   'no',  [], 'two collision claims, 2021-08 and 2022-12'],
  ['AUT-4477', 'Elena Vasquez',     'PA-2023-01-CA', 'California', '2024-07-01', '2025-07-01', '2020 Tesla Model 3',        '$1,000', '$500',   'yes', ['PA-END-2023-11', 'PA-END-2024-03'], 'one comprehensive claim (theft of catalytic converter), 2024-02'],
  ['AUT-4478', 'Marcus Lee',        'PA-2023-01-CA', 'California', '2023-12-01', '2024-12-01', '2017 Mazda CX-5',           '$1,000', '$500',   'yes', [], 'none in the last five years'],
  ['AUT-4479', 'Fatima Haddad',     'PA-2023-01-NY', 'New York',   '2024-05-15', '2025-05-15', '2021 Nissan Rogue',         '$1,000', '$500',   'yes', ['PA-END-2024-03'], 'none in the last five years'],
  ['AUT-4480', 'Thomas Brennan',    'PA-2023-01-NY', 'New York',   '2024-03-01', '2025-03-01', '2014 Honda Civic LX',       '$1,000', '$500',   'no',  [], 'one collision claim, 2022-06'],
  ['AUT-4481', 'Grace Adeyemi',     'PA-2023-01-FL', 'Florida',    '2024-08-01', '2025-08-01', '2019 Kia Sorento',          '$1,000', '$500',   'yes', [], 'one comprehensive claim (hurricane), 2023-09'],
  ['AUT-4482', 'Victor Petrov',     'PA-2023-01-FL', 'Florida',    '2024-10-01', '2025-10-01', '2023 Ford Bronco Sport',    '$1,000', '$500',   'yes', ['PA-END-2024-03'], 'none in the last five years'],
  ['AUT-4483', 'Sandra Michalak',   'PP-2023-01',    'Illinois',   '2024-06-15', '2025-06-15', '2023 Lexus RX 350',         '$500',   '$250',   'yes', [], 'none in the last ten years'],
  ['AUT-4484', 'Kenji Nakamura',    'PP-2023-01',    'Washington', '2024-02-01', '2025-02-01', '2022 Audi Q5 Premium',      '$500',   '$250',   'yes', ['PA-END-2023-11'], 'none in the last ten years'],
  ['AUT-4485', 'Deborah Ruiz',      'PE-2023-01',    'Ohio',       '2024-09-15', '2025-09-15', '2012 Toyota Corolla LE',    '$1,500', '$1,000', 'no',  [], 'one collision claim, 2023-01'],
  ['AUT-4486', 'Andre Thibodeaux',  'PE-2023-01',    'Louisiana',  '2024-11-01', '2025-11-01', '2013 Dodge Grand Caravan',  '$1,500', '$1,000', 'yes', [], 'none in the last five years'],
  ['AUT-4487', 'Linh Tran',         'PA-2022-04',    'Illinois',   '2022-11-01', '2023-11-01', '2015 Volkswagen Jetta',     '$1,000', '$500',   'yes', [], 'one collision claim, 2023-04 (open at expiry)'],
  ['AUT-4488', 'Charles Boateng',   'PA-2021-07',    'Michigan',   '2021-09-01', '2022-09-01', '2011 Buick LaCrosse',       '$1,000', '$500',   'no',  [], 'none'],
];

/** Occupation notes. AUT-4473 is the rideshare case — the corpus never says
 *  whether rideshare is covered, so a claim on this policy must escalate. */
const OCCUPATION = {
  'AUT-4473': 'Drives for a rideshare platform part-time, evenings and weekends. Disclosed at application; no commercial endorsement was offered or issued.',
  'AUT-4476': 'Self-employed contractor. Vehicle used to carry personal tools to job sites.',
  'AUT-4481': 'Delivers restaurant orders through a delivery app on weekends.',
  'AUT-4484': 'Commutes 4 days a week; vehicle garaged in a private garage overnight.',
};

/** The unresolvable case: the endorsement is on the record but not in force. */
const ENDORSEMENT_NOTE = {
  'AUT-4482':
    'PA-END-2024-03 was filed with the state on 2024-09-12 and appears on this ' +
    'record, but the countersigned copy has not been returned by the agent. ' +
    'Whether the endorsement is in force on this policy is unconfirmed.',
};

const holderDoc = (r) => {
  const [id, name, form, state, eff, exp, vehicle, colDed, compDed, rental, endorsements, history] = r;
  const occupation = OCCUPATION[id];
  const note = ENDORSEMENT_NOTE[id];

  return `# Policyholder Record ${id} — ${name}

${BANNER(`Record type: policyholder · Policy ID: ${id} · Form: ${form}`)}
## Declarations

| Field                  | Value |
|------------------------|-------|
| Policy ID              | ${id} |
| Named insured          | ${name} |
| Policy form            | ${form} |
| Rated state            | ${state} |
| Effective date         | ${eff} |
| Expiration date        | ${exp} |
| Covered vehicle        | ${vehicle} |

## Coverages In Force

| Coverage             | Selected | Deductible |
|----------------------|----------|------------|
| Collision            | yes      | ${colDed} |
| Comprehensive        | yes      | ${compDed} |
| Rental Reimbursement | ${rental.padEnd(8)} | none |

## Endorsements Attached

${
  endorsements.length
    ? endorsements.map((e) => `- ${e}`).join('\n')
    : '- none'
}
${note ? `\n${note}\n` : ''}
## Claim History

${history}
${occupation ? `\n## Notes\n\n${occupation}\n` : ''}`;
};

// ---------------------------------------------------------------------------

async function write(dir, file, body) {
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, file), body, 'utf8');
  return file;
}

async function main() {
  const written = [];

  // Policy wordings. These are the only documents that state what a policy
  // PAYS, and they carry the deliberate traps: crossing rental numbers, four
  // near-identical state variants, and silence on rideshare.
  for (const f of policyForms()) {
    written.push(`policies/${await write(POLICIES, f.file, f.body)}`);
  }

  // Records are repointed at the new form ids by the same map the guidance
  // documents use, so a record and a form can never drift apart.
  for (const r of HOLDER_ROWS) {
    written.push(`policyholders/${await write(HOLDERS, `${r[0]}.md`, repoint(holderDoc(r)))}`);
  }

  // ---- Guidance and history: bulletins, circulars, determinations, internal ---
  //
  // Every one of these references the policy forms by id, and every reference
  // runs through `repoint()` — the single map in form-ids.mjs. A form id
  // appears in exactly one place in this codebase, so a form and the documents
  // that cite it cannot drift apart.
  const newTypes = [
    ...bulletins(),
    ...circulars(),
    ...determinations(),
    ...internalDocuments(),
  ];
  for (const d of newTypes) {
    written.push(`policies/${await write(POLICIES, d.file, repoint(d.body))}`);
  }

  const counts = newTypes.reduce((acc, d) => {
    const kind = d.file.split('-')[0];
    acc[kind] = (acc[kind] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`generated ${written.length} files`);
  console.log(`  policy forms  : ${policyForms().length}`);
  console.log(`  policyholders : ${HOLDER_ROWS.length}`);
  console.log(`  new types     : ${newTypes.length}`);
  for (const [k, v] of Object.entries(counts).sort()) {
    console.log(`    ${k.padEnd(14)}: ${v}`);
  }
  console.log('\nOutput is meant to be committed. Re-running is byte-identical.');
}

main().catch((e) => {
  console.error('FAILED:', e?.message ?? e);
  process.exit(1);
});
