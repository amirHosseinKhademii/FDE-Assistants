/**
 * `pnpm steering:sabotage-check` — do the assertions actually fail?
 *
 * THE QUESTION THIS ANSWERS. `estate-check` reporting 28 green tells you the
 * estate is consistent with 28 assertions. It does NOT tell you the assertions
 * can detect anything — a check that reads the wrong column, or compares a
 * string to a number, is green on every estate including a broken one.
 *
 * So: break one thing at a time, in memory, and require the matching assertion
 * to go red. This is the same control `assertions.ts` already applies to the
 * soft-key walk, promoted to cover the traps as well. It is the difference
 * between "the checks pass" and "the checks work".
 *
 * Nothing here touches the database or the corpus on disk. Each sabotage runs
 * against a deep copy.
 */
import { buildEstate, tablesOf } from '../seed/estate';
import { buildPrograms } from '../seed/programs';
import { buildRequirements } from '../seed/requirements';
import { buildCorpus } from '../seed/corpus';
import { runAssertions, runCorpusAssertions, type Tables } from './assertions';
import { ANCHORS } from '../seed/anchors';
import { OUTLIER_EFFORT_ID } from '../../config/assumptions';

type Rows = Record<string, any>[];
type Index = Map<string, Rows>;

function indexOf(): Index {
  const index: Index = new Map();
  for (const [system, table, rows] of tablesOf(buildEstate())) {
    index.set(`${system}.${table}`, JSON.parse(JSON.stringify(rows)));
  }
  return index;
}

const getter = (index: Index): Tables => (s, t) => index.get(`${s}.${t}`) ?? [];

interface Case {
  name: string;
  /** Which assertion label must go red. Substring match. */
  expects: string;
  break: (index: Index) => void;
}

const DB_CASES: Case[] = [
  {
    name: 'make the superseded revision agree with the current one',
    expects: 'T1',
    break: (i) => {
      const v = i.get('alm.customer_requirement_versions')!
        .find((r) => r.cr_id === ANCHORS.crRackForce && r.spec_revision_id === ANCHORS.revA)!;
      v.value_num = 8000;
    },
  },
  {
    name: 'mark the unqualified gearbox capability as qualified',
    expects: 'T2',
    break: (i) => {
      const c = i.get('plm.part_capabilities')!
        .find((r) => r.part_no === ANCHORS.gearbox && r.attribute === 'max_rack_force_n')!;
      c.qualified = true;
    },
  },
  {
    name: 'strip the safety-case multiplier out of the effort history',
    expects: 'safety-case multiplier',
    break: (i) => {
      for (const e of i.get('pmo.effort_records')!) {
        if (e.safety_case_impact) e.actual_hours = Number(e.actual_hours) / 4.2;
      }
    },
  },
  {
    name: 'claim the open hysteresis budget closes',
    expects: 'known_open',
    break: (i) => {
      i.get('alm.budgets')!.find((b) => b.budget_id === ANCHORS.budHysteresis)!.known_open = false;
    },
  },
  {
    name: 'remove the outlier that breaks a mean',
    expects: 'T5',
    break: (i) => {
      const rows = i.get('pmo.effort_records')!;
      rows.splice(rows.findIndex((e) => e.effort_id === OUTLIER_EFFORT_ID), 1);
    },
  },
  {
    name: 'give one of the untraced requirements a trace link',
    expects: 'T7',
    break: (i) => {
      i.get('alm.trace_cr_sr')!.push({ cr_id: 'CR-K2-0119', sr_id: ANCHORS.srRackForce, coverage: 'full', rationale: null });
    },
  },
  {
    name: 'dangle a soft key',
    expects: 'soft keys resolve',
    break: (i) => {
      i.get('alm.system_requirements')![0].program_ref = 'PRG-NOT-A-PROGRAMME';
    },
  },
  {
    name: 'unbalance one effort record against its disciplines',
    expects: 'sum of its disciplines',
    break: (i) => {
      i.get('pmo.effort_by_discipline')![0].hours = Number(i.get('pmo.effort_by_discipline')![0].hours) + 9;
    },
  },
  {
    name: 'take the rack out of production so nothing ships it',
    expects: 'CR-K2-0102',
    break: (i) => {
      const rows = i.get('plm.part_program_usage')!;
      for (let k = rows.length - 1; k >= 0; k--) if (rows[k].part_no === ANCHORS.rack) rows.splice(k, 1);
    },
  },
];

interface CorpusCase { name: string; expects: string; break: (f: { path: string; content: string }[]) => void }

const CORPUS_CASES: CorpusCase[] = [
  {
    name: 'delete the ASIL sentence from the safety assessment',
    expects: 'shipping ASIL is findable',
    break: (f) => {
      const d = f.find((x) => x.path === 'eps-steering-feel/docs/safety-assessment-2021.md')!;
      d.content = d.content.replace(/developed to\s+ASIL B/g, 'classified appropriately');
    },
  },
  {
    name: 'tidy the calibration export until it is clean',
    expects: 'messy in four specific ways',
    break: (f) => {
      const d = f.find((x) => x.path === 'eps-steering-feel/cal/damping_params.csv')!;
      d.content = d.content.replace(/,,/g, ',0,').replace(/damp_rate_lim/g, 'DAMP_RATE_LIM');
    },
  },
  {
    name: 'bring the CHANGELOG up to date so it stops disagreeing',
    expects: 'readable history',
    break: (f) => {
      const d = f.find((x) => x.path === 'eps-steering-feel/CHANGELOG.md')!;
      d.content = d.content.replace(/Maintenance of this file stopped[\s\S]*?\*\*/, '');
    },
  },
  {
    name: 'remove the calibration comment block from the source',
    expects: 'calibration parameters are in the source',
    break: (f) => {
      const d = f.find((x) => x.path === 'eps-steering-feel/src/damping.c')!;
      d.content = d.content.replace('CALIBRATION PARAMETERS', 'see the calibration tool');
    },
  },
];

function main(): void {
  console.log('\nSabotage — one break at a time, and the matching check must go red\n');
  let bad = 0;

  for (const c of DB_CASES) {
    const index = indexOf();
    c.break(index);
    const r = runAssertions(getter(index));
    const caught = r.fail.some((f) => f.label.includes(c.expects));
    if (!caught) bad++;
    console.log(`  ${caught ? 'ok    ' : 'MISSED'}  ${c.name}`);
    if (!caught) console.log(`            nothing matching "${c.expects}" went red — that assertion cannot detect this`);
  }

  const crm = buildPrograms();
  const base = buildCorpus(crm, buildRequirements(crm));
  for (const c of CORPUS_CASES) {
    const files = JSON.parse(JSON.stringify(base));
    c.break(files);
    const r = runCorpusAssertions(files);
    const caught = r.fail.some((f) => f.label.includes(c.expects));
    if (!caught) bad++;
    console.log(`  ${caught ? 'ok    ' : 'MISSED'}  ${c.name}`);
    if (!caught) console.log(`            nothing matching "${c.expects}" went red`);
  }

  // AND THE CONTROL ON THE CONTROL: an UNsabotaged estate must be green, or
  // every "ok" above is just a check that fails on everything.
  const clean = runAssertions(getter(indexOf()));
  const cleanCorpus = runCorpusAssertions(base);
  const green = clean.fail.length === 0 && cleanCorpus.fail.length === 0;
  if (!green) bad++;
  console.log(`  ${green ? 'ok    ' : 'MISSED'}  the unsabotaged estate is still green (checks are not just always-red)`);

  const total = DB_CASES.length + CORPUS_CASES.length + 1;
  console.log(`\nsabotage-check: ${bad === 0 ? 'PASS' : 'FAIL'} — ${total - bad}/${total} breaks detected\n`);
  process.exit(bad === 0 ? 0 : 1);
}

main();
