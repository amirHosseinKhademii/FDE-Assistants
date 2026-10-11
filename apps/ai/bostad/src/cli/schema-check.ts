/**
 * Offline self-test for the address answer contract. No model, no network.
 *
 * It builds three fake answers against a fake profile and asserts what
 * coherenceErrors says about each. It also checks that the golden set parses.
 * Exits 1 on any failure.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { AddressAnswerSchema, SECTION_NAMES, coherenceErrors, type AddressAnswer, type ProfileStatuses } from '../schema/address-answer';

const ok = { status: 'ok' as const };
const unavailable = { status: 'unavailable' as const };

const profile: ProfileStatuses = {
  address: 'Testgatan 12, Göteborg',
  location: ok,
  landslide: ok,
  transit: ok,
  noise: ok,
  district: ok,
  income: ok,
  places: ok,
  area: ok,
  price: ok,
  safety: ok,
  brf: unavailable,
  energy: unavailable,
};

const valid: AddressAnswer = {
  answer: 'The road noise level at Testgatan 12 is 55 dB. The BRF debt is not in the data.',
  address: 'Testgatan 12, Göteborg',
  facts: [{ claim: 'Road noise level at the address', section: 'noise', value: '55 dB' }],
  not_in_data: ['BRF debt per apartment'],
  escalate: false,
};

const citesUnavailable: AddressAnswer = {
  answer: 'The energy class of the building is C.',
  address: 'Testgatan 12, Göteborg',
  facts: [{ claim: 'Energy class of the building', section: 'energy', value: 'C' }],
  not_in_data: [],
  escalate: false,
};

const inventedNumber: AddressAnswer = {
  answer: 'The median net income in the area is 412 kSEK.',
  address: 'Testgatan 12, Göteborg',
  facts: [{ claim: 'Median net income in the area', section: 'income', value: '389 kSEK' }],
  not_in_data: [],
  escalate: false,
};

let failures = 0;

function check(name: string, errors: string[], expectClean: boolean): void {
  const clean = errors.length === 0;
  const pass = clean === expectClean;
  if (!pass) failures += 1;
  const detail = clean ? '[]' : errors.join(' | ');
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}: ${detail}`);
}

check('valid answer is coherent', coherenceErrors(valid, profile), true);
check('citing an unavailable section is rejected', coherenceErrors(citesUnavailable, profile), false);
check('invented number is rejected', coherenceErrors(inventedNumber, profile), false);

// The shape check must accept the valid fixture too, or the schema drifted.
const shape = AddressAnswerSchema.safeParse(valid);
if (!shape.success) {
  failures += 1;
  console.log('FAIL valid fixture does not match AddressAnswerSchema');
} else {
  console.log('PASS valid fixture matches AddressAnswerSchema');
}

// Golden set: every line parses, ids are unique, sections are real names.
const goldenPath = join(__dirname, '..', 'evals', 'golden.jsonl');
const lines = readFileSync(goldenPath, 'utf8').split('\n').filter((l) => l.trim().length > 0);
const ids = new Set<string>();
let goldenOk = lines.length === 12;
for (const line of lines) {
  try {
    const c = JSON.parse(line) as {
      id: string;
      address: string;
      question: string;
      expect: { sections_cited: string[]; not_in_data: boolean };
    };
    if (ids.has(c.id) || !c.address || !c.question) goldenOk = false;
    ids.add(c.id);
    for (const s of c.expect.sections_cited) {
      if (!(SECTION_NAMES as readonly string[]).includes(s)) goldenOk = false;
    }
    if (typeof c.expect.not_in_data !== 'boolean') goldenOk = false;
  } catch {
    goldenOk = false;
  }
}
if (!goldenOk) failures += 1;
console.log(`${goldenOk ? 'PASS' : 'FAIL'} golden set: ${lines.length} cases`);

if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nall schema checks passed');
