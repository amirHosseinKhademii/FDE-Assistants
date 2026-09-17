/**
 * `pnpm safety:tools` — stage 6.1. No model, no network beyond Postgres.
 *
 * Proves the five tools are reachable THE WAY A MODEL WILL REACH THEM: by name,
 * through `ToolRegistry.dispatch`, with arguments that arrive as untyped JSON.
 *
 * ── WHY THIS IS A STEP OF ITS OWN ─────────────────────────────────────────
 *
 * Every tool already has its own passing check from stage 4. Those called the
 * functions directly, with TypeScript guaranteeing the arguments. A model
 * guarantees nothing — it sends a name and a blob, and both can be wrong.
 *
 * So this step tests the seam rather than the tools: dispatch by string,
 * validation of a blob, and the two failure shapes a model must be able to
 * recover from — a tool that does not exist, and arguments that do not fit.
 */
import { ToolRegistry } from '@fde/agent';
import { SAFETY_TOOLS } from '../agent/tools';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

async function main(): Promise<number> {
  let failed = 0;
  const check = (ok: boolean, name: string, detail: string) => {
    if (!ok) failed++;
    console.log(`  ${ok ? `${GREEN}ok  ${OFF}` : `${RED}FAIL${OFF}`}  ${name}`);
    console.log(`        ${detail}`);
  };

  console.log('\nstage 6.1 · the five tools, registered\n');

  const registry = new ToolRegistry(SAFETY_TOOLS);
  const schemas = registry.schemas();

  check(
    schemas.length === 5,
    'all five tools are registered under the names the model will use',
    schemas.map((s) => s.name).join(', '),
  );

  // EVERY PARAMETER DESCRIBED. The same rule as stage 5's schema, for the same
  // reason: this text is the only thing telling the model what to put there.
  const undescribed: string[] = [];
  for (const s of schemas) {
    const shape = (s.parameters as any).shape ?? {};
    for (const [key, field] of Object.entries<any>(shape)) {
      const d = field?.description ?? field?._def?.description;
      if (!d) undescribed.push(`${s.name}.${key}`);
    }
    if (!s.description) undescribed.push(`${s.name} (the tool itself)`);
  }
  check(
    undescribed.length === 0,
    'every tool and every parameter carries a description',
    undescribed.length ? `MISSING: ${undescribed.join(', ')}` : `${schemas.length} tools, all described`,
  );

  // DISPATCH BY STRING, as a model does.
  const got = await registry.dispatch('get_recall', { campaign_number: '20V197000' });
  check(
    got.ok && (got.result as any)?.campaign_number === '20V197000',
    'dispatch by name reaches the tool and returns its result',
    got.ok ? `get_recall -> ${(got.result as any).campaign_number}, ${got.ms}ms` : String(got.error),
  );

  // THE FILTER TOOLS, through the same seam.
  const found = await registry.dispatch('find_recalls', {
    make: 'HONDA',
    model: 'ODYSSEY',
    component: 'FORWARD COLLISION AVOIDANCE',
  });
  check(
    found.ok && (found.result as any)?.matches?.length === 0,
    'find_recalls returns its empty answer through dispatch, not an error',
    found.ok ? `matches: ${(found.result as any).matches.length}` : String(found.error),
  );

  const counted = await registry.dispatch('count_complaints', {
    make: 'TESLA',
    model: 'MODEL 3',
    min_deaths: 1,
  });
  check(
    counted.ok && (counted.result as any)?.count === 5,
    'count_complaints returns a number through dispatch',
    counted.ok ? `count: ${(counted.result as any).count}, key says 5` : String(counted.error),
  );

  // ── THE TWO FAILURES A MODEL MUST BE ABLE TO READ ────────────────────────

  // 1. A tool that does not exist. The registry answers rather than throwing,
  //    and NAMES what is available so the model can correct itself.
  const invented = await registry.dispatch('search_recalls', { q: 'ford' });
  check(
    !invented.ok && invented.cause === 'unknown_tool' && /Available:/.test(String(invented.error)),
    'an invented tool name is reported back, with the real names listed',
    String(invented.error).slice(0, 96),
  );

  // 2. Arguments that do not fit. `dispatch` does NOT validate — it looks the
  //    tool up and calls execute — so the tool parses its own input and the
  //    failure arrives as a message rather than a TypeError three layers down.
  const badArgs = await registry.dispatch('get_recall', { campaign: '20V197000' });
  check(
    !badArgs.ok && /cannot use/.test(String(badArgs.error)),
    'wrong arguments come back as a message the model can correct, not a crash',
    String(badArgs.error).slice(0, 96),
  );

  // 3. And the one a model will actually do: the right idea, the wrong field.
  const wrongType = await registry.dispatch('count_complaints', {
    make: 'TESLA',
    model: 'MODEL 3',
    min_deaths: 'one',
  });
  check(
    !wrongType.ok && /min_deaths/.test(String(wrongType.error)),
    'a value of the wrong type names the field that was wrong',
    String(wrongType.error).slice(0, 96),
  );

  console.log(`\n  ${DIM}every result above came through dispatch(name, blob) — the model's path${OFF}`);
  console.log(
    failed === 0
      ? `\n  tools: ${GREEN}PASS${OFF} — stage 6.2 may begin\n`
      : `\n  tools: ${RED}FAIL${OFF} — ${failed} check(s).\n`,
  );
  return failed;
}

main().then((f) => process.exit(f === 0 ? 0 : 1));
