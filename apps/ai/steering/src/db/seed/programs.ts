/**
 * vst_crm — customers, programmes, RFQs. The first generator, and the one
 * every other generator reads.
 *
 * OWN RANDOM STREAM (`SEEDS.programs`). See `rng.ts` for why that sentence
 * appears at the top of all five files.
 *
 * WHAT A PROGRAMME IS FOR, in one line: it is the unit of reuse. Nearly every
 * "have we done this before" answer is found by locating a programme with the
 * same `eps_architecture` at or above the new `force_class_n`, and then asking
 * what that programme shipped. So the architecture and the force class matter
 * more here than anything else, and the generated spread of them is what
 * decides whether the comparables query has anything to chew on.
 */
import { makeHelpers, SEEDS, on } from './rng';
import { ANCHORS } from './anchors';
import type { Crm } from '../schema/rows';

const ARCHITECTURES = ['C-EPS', 'P-EPS', 'DP-EPS', 'R-EPS'] as const;
const SEGMENTS = ['B', 'C', 'D', 'SUV', 'LCV'] as const;
const REGIONS = ['EU', 'NA', 'CN'] as const;

/** Ten fictional OEMs plus Kestrel. None resembles a real manufacturer. */
const CUSTOMERS: readonly { id: string; name: string; country: string; kind: string }[] = [
  { id: ANCHORS.customer, name: ANCHORS.customerName, country: 'DE', kind: 'OEM' },
  { id: 'CUS-HLX', name: 'Helix Automotive', country: 'DE', kind: 'OEM' },
  { id: 'CUS-ORV', name: 'Orvane Motor Group', country: 'FR', kind: 'OEM' },
  { id: 'CUS-TDR', name: 'Tundra Vehicles', country: 'SE', kind: 'OEM' },
  { id: 'CUS-MRL', name: 'Merilo S.p.A.', country: 'IT', kind: 'OEM' },
  { id: 'CUS-NBX', name: 'Nimbex Motors', country: 'US', kind: 'OEM' },
  { id: 'CUS-KAI', name: 'Kaigan Jidosha', country: 'JP', kind: 'OEM' },
  { id: 'CUS-CHV', name: 'Chenvu Auto', country: 'CN', kind: 'OEM' },
  { id: 'CUS-BRD', name: 'Bradmoor Commercial', country: 'GB', kind: 'OEM' },
  { id: 'CUS-ALT', name: 'Altura Mobility', country: 'ES', kind: 'OEM' },
  { id: 'CUS-VGR', name: 'Voegler Nutzfahrzeuge', country: 'AT', kind: 'OEM' },
];

const MODEL_WORDS = [
  'Aster', 'Borea', 'Calder', 'Dorne', 'Ember', 'Fathom', 'Gale', 'Haldan',
  'Iskra', 'Juno', 'Kestra', 'Lumen', 'Morrow', 'Nyral', 'Oriel', 'Pellon',
  'Quarry', 'Ryde', 'Solen', 'Tarn', 'Ulric', 'Vane', 'Wren', 'Yarrow',
  'Zephyr', 'Arden', 'Brix', 'Cove', 'Delve', 'Eyre', 'Flint', 'Gorse',
  'Hale', 'Ivo', 'Jarl', 'Kite',
];

const MILESTONE_NAMES = ['RFQ due', 'nomination', 'A-sample', 'B-sample', 'C-sample', 'PPAP', 'SOP'] as const;
const ROLES = ['purchasing', 'chassis engineering', 'steering feel', 'functional safety', 'programme management'] as const;
const GIVEN = ['Mara', 'Tomas', 'Elif', 'Rune', 'Sofia', 'Janek', 'Nadia', 'Bram', 'Leena', 'Oscar', 'Ines', 'Kaspar'];
const FAMILY = ['Voss', 'Lindqvist', 'Arnaud', 'Beker', 'Moreau', 'Haas', 'Strand', 'Kovac', 'Renaud', 'Palmer', 'Dietrich', 'Sala'];

export function buildPrograms(): Crm {
  const h = makeHelpers(SEEDS.programs);
  const crm: Crm = { customers: [], programs: [], rfqs: [], rfq_specs: [], milestones: [], contacts: [] };

  for (const c of CUSTOMERS) {
    crm.customers.push({
      customer_id: c.id,
      name: c.name,
      country: c.country,
      kind: c.kind,
      relationship_since: h.dayBetween(-11_000, -2_500),
    });
  }

  // ── the two anchored programmes ──────────────────────────────────────────
  //
  // K2 is the live bid the whole acceptance test is about. H1 is where the
  // carryover comes from — an R-EPS in production since 2023, which is what
  // lets `BUD-ONCTR-TRQ`'s 2.4 N·m allocation legitimately say `measured`
  // rather than `estimated`. A carryover figure with no programme behind it is
  // an estimate wearing a better word.

  crm.programs.push({
    program_id: ANCHORS.program,
    customer_id: ANCHORS.customer,
    model: 'K2',
    segment: 'SUV',
    eps_architecture: 'R-EPS',
    force_class_n: 8000,
    region: 'EU',
    sop_on: on(2028, 9, 1),
    volume_per_year: 140_000,
    status: 'bid',
  });

  crm.programs.push({
    program_id: ANCHORS.carryoverProgram,
    customer_id: 'CUS-HLX',
    model: 'H1',
    segment: 'D',
    eps_architecture: 'R-EPS',
    force_class_n: 7600,
    region: 'EU',
    sop_on: on(2023, 4, 17),
    volume_per_year: 96_000,
    status: 'production',
  });

  // ── the other 36 ─────────────────────────────────────────────────────────
  //
  // Spread across all four architectures and a wide force range ON PURPOSE. A
  // comparables query that filters to R-EPS at or above 8000 N must be left
  // with a usable handful — not with everything, which would make the filter
  // pointless, and not with nothing, which would make it untestable.
  //
  // The index is in the id rather than only the model name, because two
  // customers can perfectly well name a programme the same thing and a
  // primary-key collision inside a generator is a silent row loss.

  const models = h.shuffle(MODEL_WORDS);
  const others = CUSTOMERS.filter((c) => c.id !== ANCHORS.customer);

  for (let i = 0; i < 36; i++) {
    const customer = h.pick(others);
    const arch = h.pick(ARCHITECTURES);
    const force =
      arch === 'C-EPS' ? h.int(45, 62) * 100
        : arch === 'P-EPS' ? h.int(60, 78) * 100
          : h.int(72, 112) * 100;
    const sopDays = h.int(-2_400, 900);
    const status =
      sopDays < -60 ? (h.chance(0.25) ? 'ended' : 'production')
        : sopDays < 400 ? 'in-development'
          : h.chance(0.4) ? 'awarded' : 'bid';
    const model = models[i];

    crm.programs.push({
      program_id: `PRG-${customer.id.slice(4)}-${String(i + 1).padStart(2, '0')}`,
      customer_id: customer.id,
      model,
      segment: h.pick(SEGMENTS),
      eps_architecture: arch,
      force_class_n: force,
      region: h.pick(REGIONS),
      sop_on: status === 'bid' ? null : h.day(sopDays),
      volume_per_year: status === 'bid' ? null : h.int(15, 260) * 1000,
      status,
    });
  }

  // ── RFQs ─────────────────────────────────────────────────────────────────
  //
  // The anchored one first and by hand: issued 2026-08-14, due 2026-09-25,
  // still open as of EPOCH (2026-09-13). Dario has twelve days, which is the
  // entire reason this project exists.

  crm.rfqs.push({
    rfq_id: ANCHORS.rfq,
    customer_id: ANCHORS.customer,
    program_id: ANCHORS.program,
    issued_on: on(2026, 8, 14),
    due_on: on(2026, 9, 25),
    status: 'open',
    decided_on: null,
    lost_reason: null,
  });

  // It arrived with Rev B attached. Rev A exists in vst_alm and is superseded —
  // which is trap T1, and it only bites because THIS row names the revision
  // exactly. A prefix match on `CRS-KST-K2-001` merges two documents that
  // disagree by 500 N.
  crm.rfq_specs.push({
    rfq_id: ANCHORS.rfq,
    spec_ref: ANCHORS.spec,
    spec_revision: 'Rev B',
    attached_on: on(2026, 8, 14),
  });

  const LOST_REASONS = ['price', 'timing', 'capacity', 'incumbent retained', 'technical'];
  const biddable = crm.programs.filter((p) => p.program_id !== ANCHORS.program);

  for (let i = 0; i < 51; i++) {
    const p = h.pick(biddable);
    const issued = h.int(-2_600, -200);
    const due = issued + h.int(28, 70);
    const decided = due + h.int(10, 120);
    const outcome = h.chance(0.42) ? 'won' : h.chance(0.75) ? 'lost' : 'withdrawn';
    crm.rfqs.push({
      rfq_id: `RFQ-${2019 + Math.floor((2600 + issued) / 365)}-${String(i + 1).padStart(4, '0')}`,
      customer_id: p.customer_id,
      program_id: p.program_id,
      issued_on: h.day(issued),
      due_on: h.day(due),
      status: outcome,
      decided_on: h.day(decided),
      lost_reason: outcome === 'lost' ? h.pick(LOST_REASONS) : null,
    });
  }

  // ── milestones ───────────────────────────────────────────────────────────

  let mid = 0;
  for (const p of crm.programs) {
    // A bid has no schedule past nomination — there is nothing to schedule yet.
    const names = p.status === 'bid' ? MILESTONE_NAMES.slice(0, 2) : MILESTONE_NAMES;
    const sopOffset = p.sop_on ? daysFromEpoch(String(p.sop_on)) : 700;
    const spacing = [-1400, -1200, -900, -640, -380, -120, 0];
    names.forEach((name, k) => {
      const planned = sopOffset + spacing[k];
      const slip = h.chance(0.3) ? h.int(3, 60) : 0;
      const past = planned < 0;
      crm.milestones.push({
        milestone_id: `MS-${String(++mid).padStart(4, '0')}`,
        program_id: p.program_id,
        name,
        planned_on: h.day(planned),
        actual_on: past ? h.day(planned + slip) : null,
        status: !past ? 'planned' : slip === 0 ? 'met' : slip > 30 ? 'missed' : 'late',
      });
    });
  }

  // ── contacts ─────────────────────────────────────────────────────────────

  let cid = 0;
  for (const c of CUSTOMERS) {
    const n = h.int(4, 8);
    for (let i = 0; i < n; i++) {
      const given = h.pick(GIVEN);
      const family = h.pick(FAMILY);
      crm.contacts.push({
        contact_id: `CON-${String(++cid).padStart(4, '0')}`,
        customer_id: c.id,
        full_name: `${given} ${family}`,
        role: h.pick(ROLES),
        email: `${given}.${family}@${c.name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '')}.example`,
      });
    }
  }

  return crm;
}

/**
 * Days between EPOCH and an ISO day. Used only to hang milestones off a SOP
 * that was itself computed from EPOCH, so no clock is consulted.
 */
function daysFromEpoch(isoDay: string): number {
  const t = Date.parse(`${isoDay.slice(0, 10)}T00:00:00Z`);
  return Math.round((t - Date.UTC(2026, 8, 13)) / 86_400_000);
}
