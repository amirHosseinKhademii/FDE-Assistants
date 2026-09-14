/**
 * Does the loop stop when it should, and does a schema failure cost what it
 * claims? Offline, instant, no model, no credentials, no spend.
 *
 * WHY IT HAD TO BE WRITTEN BEFORE THE EXTRACTION COULD BE TRUSTED. This logic
 * used to be twenty-five lines copied into each of the three engines, and
 * nothing exercised it: `compliance-sdk.ts` drives `runLoopSdk` but only down
 * the happy path, and the Mastra and LangGraph compliance checks build their
 * own agent and never call a `runLoop*` function at all. So the retry budget,
 * the `schema_invalid` stop and the retry sentence had **no** offline coverage
 * on any engine — three copies of untested logic, which is the worst of both.
 *
 * THE ASSERTION THAT IS THE POINT OF THE WHOLE CHANGE is the last one: all
 * three engines put the SAME sentence in front of the model on a retry. When it
 * was written out three times, one could have been reworded and every
 * engine-vs-engine comparison after that would have been partly measuring a
 * prompt difference while reporting it as an engine difference — and
 * `eval:diff` could not catch it, because the engine is part of the setup key
 * and those runs are never compared directly.
 *
 *   pnpm settle:check
 */
import { schemaGate, validatorFor, schemaRetryInstruction } from './settle';
import type { LoopEvent, LoopOptions, TurnRecord, ValidationResult } from './loop.types';

let failed = 0;

function check(ok: boolean, name: string, detail: string): void {
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}`);
  console.log(`        ${detail}`);
}

/** A schema that always passes, and one that never does. */
const PASSES = (): ValidationResult => ({ ok: true, value: { parsed: true } });
const FAILS = (): ValidationResult => ({ ok: false, errors: 'field "answer" is required' });

/** Two turns, enough for `turn:` on the retry event to be a real number. */
const TURNS: TurnRecord[] = [
  { turn: 1, ms: 0, inputTokens: 1, outputTokens: 1, toolCalls: [] },
  { turn: 2, ms: 0, inputTokens: 1, outputTokens: 1, toolCalls: [] },
];

/** `responseFormat` only has to be present; nothing here reads its contents. */
const CONTRACTED: LoopOptions = { responseFormat: {} as never };

function control(): void {
  const before = failed;
  const log = console.log;
  console.log = () => {};
  check(false, 'planted', 'planted');
  console.log = log;
  const noticed = failed === before + 1;
  failed = before;
  check(
    noticed,
    'control: a false assertion IS caught',
    noticed
      ? 'a deliberately false assertion moved the counter — the checks above can fail'
      : 'a deliberately false assertion did NOT move the counter — every ok above is meaningless',
  );
}

export function runSettleCheck(): number {
  console.log('\nSettle — when the loop stops, and what a schema failure costs\n');
  console.log('STOPPING — the three ways a run can end');

  const plain = schemaGate<unknown>({}).settle('just text', TURNS);
  check(
    plain.kind === 'done' &&
      plain.result.stoppedBecause === 'model_finished' &&
      plain.result.text === 'just text' &&
      plain.result.structured === undefined,
    'no contract asked for → any text IS the answer, unparsed',
    plain.kind === 'done'
      ? `stoppedBecause=${plain.result.stoppedBecause}, structured=${plain.result.structured}`
      : 'it asked for a retry with no schema in play',
  );

  const good = schemaGate<unknown>({ ...CONTRACTED, validate: PASSES }).settle('{}', TURNS);
  check(
    good.kind === 'done' &&
      good.result.stoppedBecause === 'model_finished' &&
      JSON.stringify(good.result.structured) === '{"parsed":true}',
    'a valid answer finishes, carrying the PARSED value not the raw text',
    good.kind === 'done' ? `structured=${JSON.stringify(good.result.structured)}` : 'it retried',
  );

  const spent = schemaGate<unknown>({
    ...CONTRACTED,
    validate: FAILS,
    structuredRetries: 0,
  }).settle('{}', TURNS);
  check(
    spent.kind === 'done' && spent.result.stoppedBecause === 'schema_invalid',
    'with no retries left it FAILS LOUDLY rather than repairing quietly',
    spent.kind === 'done'
      ? `stoppedBecause=${spent.result.stoppedBecause} — silent repair would hide the failure rate`
      : 'it retried on a zero budget',
  );

  console.log('\nTHE RETRY BUDGET — it must be spent exactly once per failure');

  const gate = schemaGate<unknown>({ ...CONTRACTED, validate: FAILS, structuredRetries: 2 });
  const outcomes = [
    gate.settle('{}', TURNS),
    gate.settle('{}', TURNS),
    gate.settle('{}', TURNS),
  ].map((o) => (o.kind === 'retry' ? 'retry' : o.result.stoppedBecause));
  check(
    outcomes.join(',') === 'retry,retry,schema_invalid',
    'structuredRetries: 2 buys exactly two retries, then stops',
    `got ${outcomes.join(' → ')}`,
  );
  check(
    gate.errors.length === 3 && gate.errors.every((e) => e.includes('answer')),
    'every failure is recorded, including the one that ended the run',
    `${gate.errors.length} error(s) kept — the engines read this same array by reference`,
  );

  const events: LoopEvent[] = [];
  const watched = schemaGate<unknown>({
    ...CONTRACTED,
    validate: FAILS,
    onEvent: (e) => events.push(e),
  });
  watched.settle('{}', TURNS);
  const ev = events[0] as { type: string; turn: number; error: string } | undefined;
  check(
    ev?.type === 'schema_retry' && ev.turn === TURNS.length,
    'a retry is announced, at the turn it happened on',
    ev ? `${ev.type} at turn ${ev.turn}` : 'no event emitted — a retry would be invisible to telemetry',
  );

  console.log('\nTHE VALIDATOR — a contract without one is a mistake, not a shortcut');

  let threw: Error | undefined;
  try {
    validatorFor(CONTRACTED);
  } catch (e) {
    threw = e as Error;
  }
  check(
    threw !== undefined && threw.message.includes('@fde/schema'),
    'responseFormat WITHOUT a validator throws, and says where to get one',
    threw
      ? `"${threw.message.slice(0, 72)}…"`
      : 'it returned a validator — raw text would pass as if checked, and it would typecheck',
  );

  const passthrough = validatorFor({})('anything at all');
  check(
    passthrough.ok && passthrough.value === 'anything at all',
    'no responseFormat and no validator → the raw text passes through',
    `ok=${passthrough.ok}, value=${JSON.stringify(passthrough.value)}`,
  );

  console.log('\nONE SENTENCE — the reason this logic is shared rather than copied');

  const retry = schemaGate<unknown>({ ...CONTRACTED, validate: FAILS }).settle('{}', TURNS);
  const expected = schemaRetryInstruction('field "answer" is required');
  check(
    retry.kind === 'retry' && retry.instruction === expected,
    'the retry instruction comes from ONE function, not three string literals',
    retry.kind === 'retry'
      ? `"${retry.instruction}"`
      : 'it finished instead of retrying, so no sentence was produced',
  );
  check(
    retry.kind === 'retry' && retry.instruction.includes('field "answer" is required'),
    'and it tells the model what was actually wrong',
    'a retry that does not name the failure is a re-roll, not a correction',
  );

  console.log('\nNEGATIVE CONTROL — the checks above must be capable of failing');
  control();

  console.log(
    failed === 0
      ? '\nsettle: PASS — three stops, a budget that is spent once per failure, and one retry sentence for all three engines\n'
      : `\nsettle: FAIL — ${failed} problem(s)\n`,
  );
  return failed;
}

if (require.main === module) process.exit(runSettleCheck() === 0 ? 0 : 1);
