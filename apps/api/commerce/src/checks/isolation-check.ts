/**
 * `pnpm commerce:api-isolation-check` — a cross-system join must not COMPILE.
 *
 * WHY THIS CHECK EXISTS AT ALL. The brief's architectural rule is that a
 * cross-system join be "unexpressible, not merely discouraged", and none of the
 * other four checks tests it. Five pools do not deliver it — you can always type
 * a join into raw SQL text. Five databases deliver it at the storage layer, but
 * only where somebody is actually connected to the right one. The thing that
 * genuinely delivers it is FIVE GENERATED PRISMA CLIENTS: `shopClient` has no
 * `shipment` model, so the join is not a policy violation, it is a type error.
 *
 * That is a claim about the compiler, so the compiler is what is asked. This
 * check writes probe files, runs `tsc --noEmit` over them, and asserts which
 * ones fail.
 *
 * THE POSITIVE CONTROL IS THE IMPORTANT HALF. A probe that fails to compile
 * because of a typo proves nothing, so a same-system `include` is compiled in
 * the same run and must SUCCEED. Without it, this check would still pass if the
 * generated clients were deleted entirely.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { Checks } from './harness';

const checks = new Checks('commerce:api-isolation-check — the join does not compile');

const PROBE_DIR = join(__dirname, '..', '..', '.isolation-probe');

interface Probe {
  name: string;
  /** Does this probe's source belong to a design that should be rejected? */
  mustFail: boolean;
  why: string;
  source: string;
}

const PROBES: Probe[] = [
  {
    name: 'same-system include COMPILES (positive control)',
    mustFail: false,
    why:
      'orders → items is a real foreign key inside thb_shop. If this failed, ' +
      'every "must not compile" result below would be meaningless',
    source: `
      import { createShopHandle } from '../src/shop/shop.client';
      const db = createShopHandle().client;
      export const probe = () =>
        db.order.findMany({ include: { items: true, payments: true, refunds: true } });
    `,
  },
  {
    name: 'shop client has no `shipment` model',
    mustFail: true,
    why:
      'shipments live in thb_fleet. The storefront client cannot name them, ' +
      'which is the guarantee restated in the type system',
    source: `
      import { createShopHandle } from '../src/shop/shop.client';
      const db = createShopHandle().client;
      export const probe = () => db.shipment.findMany();
    `,
  },
  {
    name: 'an order cannot `include` a shipment',
    mustFail: true,
    why: 'THE JOIN, written the way somebody would actually try to write it',
    source: `
      import { createShopHandle } from '../src/shop/shop.client';
      const db = createShopHandle().client;
      export const probe = () =>
        db.order.findMany({ include: { shipment: true } });
    `,
  },
  {
    name: 'the fleet client has no `order` model',
    mustFail: true,
    why: 'the soft key points the other way too, and neither direction is a relation',
    source: `
      import { createFleetHandle } from '../src/fleet/fleet.client';
      const db = createFleetHandle().client;
      export const probe = () => db.order.findMany();
    `,
  },
  {
    name: 'a shipment cannot `include` the order it references',
    mustFail: true,
    why:
      '`shipments.order_ref` is a plain string across a database boundary. If ' +
      'somebody ever "fixes" it with a Prisma @relation, this goes green and ' +
      'the estate has quietly become joinable',
    source: `
      import { createFleetHandle } from '../src/fleet/fleet.client';
      const db = createFleetHandle().client;
      export const probe = () =>
        db.shipment.findMany({ include: { order: true } });
    `,
  },
  {
    name: 'the crm client cannot reach the policy rules',
    mustFail: true,
    why: 'a fifth system is not a special case; the isolation is uniform',
    source: `
      import { createCrmHandle } from '../src/crm/crm.client';
      const db = createCrmHandle().client;
      export const probe = () => db.returnWindow.findMany();
    `,
  },
];

function writeProbe(probe: Probe, index: number): string {
  const file = join(PROBE_DIR, `probe-${index}.ts`);
  writeFileSync(file, probe.source.trim() + '\n');
  return file;
}

/** Compile ONE probe on its own, so one failure cannot mask another. */
function compiles(file: string): boolean {
  const run = spawnSync(
    'npx',
    [
      'tsc',
      '--noEmit',
      '--strict',
      '--skipLibCheck',
      '--module',
      'commonjs',
      '--moduleResolution',
      'node',
      '--target',
      'ES2021',
      '--experimentalDecorators',
      '--emitDecoratorMetadata',
      '--esModuleInterop',
      file,
    ],
    { cwd: join(__dirname, '..', '..'), encoding: 'utf8' },
  );
  return run.status === 0;
}

function main(): void {
  rmSync(PROBE_DIR, { recursive: true, force: true });
  mkdirSync(PROBE_DIR, { recursive: true });

  try {
    checks.section('WHAT THE COMPILER SAYS ABOUT EACH SHAPE');
    PROBES.forEach((probe, index) => {
      const file = writeProbe(probe, index);
      const ok = compiles(file);
      checks.assert(probe.name, probe.mustFail ? !ok : ok, probe.why);
    });

    checks.section('NEGATIVE CONTROL — the plant');
    // If the probe runner were broken — wrong cwd, missing tsc, a typo in the
    // arguments — EVERY probe would fail to compile and every "must not
    // compile" assertion would pass. The positive control above is what rules
    // that out, so it is restated here as the control it actually is.
    const positive = PROBES[0];
    const positiveFile = writeProbe(positive, 0);
    checks.control(
      'a probe that SHOULD compile does',
      compiles(positiveFile),
      'a broken runner makes everything fail to compile, which would turn this ' +
        'whole check green while proving nothing. This is the assertion that ' +
        'distinguishes "the join is impossible" from "tsc did not run"',
    );
  } finally {
    rmSync(PROBE_DIR, { recursive: true, force: true });
  }

  checks.done();
}

main();
