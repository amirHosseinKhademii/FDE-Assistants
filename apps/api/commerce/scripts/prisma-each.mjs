/**
 * Run one Prisma CLI command against all five systems, in order.
 *
 * FIVE INVOCATIONS AND NOT ONE, because Prisma takes one schema at a time and
 * because that is the shape of the guarantee: five schemas, five clients, five
 * output directories, no way for a model in one to reference a model in another.
 *
 * `generate` is offline and safe. `db pull` reads the live estate — it is the
 * reconciliation step for fde-assistants-2d's hand-written DDL, which this
 * package consumes and never overwrites. THERE IS DELIBERATELY NO `push` TARGET:
 * `prisma db push` from here would drop 2d's comments (which are a deliverable,
 * naming which columns are soft keys and why they cannot be FKs) and rewrite
 * column types they chose on purpose. If you find yourself wanting one, the
 * change belongs in their .sql, not in this package's schema files.
 */
import { spawnSync } from 'node:child_process';

const SYSTEMS = ['shop', 'wms', 'fleet', 'crm', 'policy'];
const ALLOWED = new Set(['generate', 'db pull', 'validate', 'format']);

const command = process.argv.slice(2);
const joined = command.join(' ');

if (!ALLOWED.has(joined)) {
  console.error(
    `refusing to run \`prisma ${joined}\` across the estate.\n` +
      `allowed: ${[...ALLOWED].map((c) => `\`prisma ${c}\``).join(', ')}.\n` +
      `in particular there is no \`db push\` here on purpose — the DDL is owned ` +
      `elsewhere and this package introspects it.`,
  );
  process.exit(2);
}

let failed = 0;
for (const system of SYSTEMS) {
  process.stdout.write(`\n── ${system} ${'─'.repeat(40 - system.length)}\n`);
  const run = spawnSync('prisma', command, {
    stdio: 'inherit',
    env: { ...process.env, PRISMA_SYSTEM: system, CHECKPOINT_DISABLE: '1' },
    shell: false,
  });
  if (run.status !== 0) {
    failed += 1;
    console.error(`  ${system}: prisma ${joined} exited ${run.status}`);
  }
}

if (failed > 0) {
  console.error(`\nprisma ${joined}: ${failed} of ${SYSTEMS.length} systems failed\n`);
  process.exit(1);
}
console.log(`\nprisma ${joined}: all ${SYSTEMS.length} systems ok\n`);
