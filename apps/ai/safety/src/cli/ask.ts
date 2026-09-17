/**
 * `pnpm safety:ask ["a question"]` — stage 6.2. THE FIRST MODEL CALL.
 *
 * With no arguments it runs REC-002 and checks it, which is stage 6.2's gate.
 *
 * ── THE CHECK IS A NEGATIVE, AND THAT IS THE POINT ────────────────────────
 *
 * REC-002 asks "what does recall 20V197000 cover?" and `WALKTHROUGH.md` says
 * the checks are `calls_get_recall_first` AND NO `search_complaints` CALL AT
 * ALL.
 *
 * A model that searches for a campaign number has misunderstood the whole tool
 * layer, and it would still produce a plausible answer — stage 3.5 measured
 * that search returns the right campaign at position 4, so the text would often
 * be right and the method wrong. The tool-call record is the only place that
 * distinction is visible.
 *
 * ── AND NOTHING BEFORE THIS POINT COULD FAIL THIS WAY ─────────────────────
 *
 * Every stage until now was deterministic. From here the same question can
 * produce two different answers and neither is a bug, so a single green run is
 * a smoke test and not a scorecard — the repeat runs are stage 7's.
 */
import { ToolRegistry, chatClient, chatModelName, runLoop, loopChoice, engineLabel } from '@fde/agent';
import { openaiClient } from '@fde/foundry';
import { SAFETY_TOOLS } from '../agent/tools';
import { SAFETY_SYSTEM_PROMPT } from '../agent/prompt';
import { SafetyAnswerSchema, validateSafetyAnswer, type SafetyAnswer } from '../schema/safety-answer';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YEL = '\x1b[33m';
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

const REC002 = 'What does recall 20V197000 cover?';

function client() {
  // The azure branch is a THUNK so it is never constructed on another provider
  // — see chat-client.ts. Under LLM_PROVIDER=hosted this never runs.
  return chatClient(() => openaiClient());
}

function printAnswer(a: SafetyAnswer): void {
  console.log(`\n  ${a.answer ?? `${YEL}(no answer)${OFF}`}\n`);
  if (a.campaigns.length) console.log(`  campaigns   ${a.campaigns.join(', ')}`);
  for (const c of a.counts) console.log(`  count       ${c.value} — ${c.label}`);
  for (const c of a.citations) console.log(`  cite        ${c.source}  ${DIM}${c.claim}${OFF}`);
  for (const u of a.unverified_claims) console.log(`  ${YEL}unverified${OFF}  ${u}`);
  for (const c of a.conflicts) console.log(`  ${YEL}conflict${OFF}    ${c.topic}`);
  if (a.escalate) console.log(`  ${YEL}escalate${OFF}    ${a.escalate.reason} → ${a.escalate.suggested_owner}`);
  console.log();
}

async function ask(question: string) {
  const choice = loopChoice(process.env.LOOP);
  const model = chatModelName(process.env.FOUNDRY_CHAT_DEPLOYMENT ?? '');
  console.log(`\n  ${DIM}engine ${engineLabel(choice)} · model ${model}${OFF}`);
  console.log(`  ${DIM}"${question}"${OFF}\n`);

  const registry = new ToolRegistry(SAFETY_TOOLS);
  const started = Date.now();

  const result = await runLoop<SafetyAnswer>(choice, client(), model, registry, question, {
    system: SAFETY_SYSTEM_PROMPT,
    responseFormat: SafetyAnswerSchema,
    validate: validateSafetyAnswer,
    agentName: 'calder-safety',
    onEvent: (e: any) => {
      if (e.type === 'tool_call') console.log(`  ${DIM}→ ${e.name}(${JSON.stringify(e.args)})${OFF}`);
    },
  });

  return { result, ms: Date.now() - started, model, choice };
}

async function main(): Promise<number> {
  const asked = process.argv.slice(2).filter((a) => !a.startsWith('-')).join(' ');

  if (asked) {
    const { result } = await ask(asked);
    if (result.structured) printAnswer(result.structured);
    else console.log(`\n  ${RED}no valid answer${OFF}\n  ${result.schemaErrors.join('\n  ')}\n`);
    return 0;
  }

  console.log('\nstage 6.2 · one question, end to end');
  const { result, ms, model } = await ask(REC002);

  let failed = 0;
  const check = (ok: boolean, name: string, detail: string) => {
    if (!ok) failed++;
    console.log(`  ${ok ? `${GREEN}ok  ${OFF}` : `${RED}FAIL${OFF}`}  ${name}`);
    console.log(`        ${detail}`);
  };

  const calls = result.turns.flatMap((t) => t.toolCalls);
  const names = calls.map((c) => c.name);

  console.log();
  check(
    names.includes('get_recall'),
    'REC-002 · the lookup ran',
    names.length ? `tools called: ${names.join(', ')}` : 'no tool was called at all',
  );

  // THE NEGATIVE. A model that searched would still answer plausibly.
  check(
    !names.includes('search_complaints'),
    'REC-002 · and the search did NOT run',
    names.includes('search_complaints')
      ? 'search_complaints was called — a campaign number was treated as a search'
      : 'no search_complaints call, which is what the key requires',
  );

  check(
    calls.every((c) => c.ok),
    'every tool call succeeded',
    calls.map((c) => `${c.name} ${c.ok ? 'ok' : `FAILED: ${c.error}`}`).join(' · ') || 'none',
  );

  check(
    !!result.structured,
    'the answer parsed, matched the schema and tripped no coherence rule',
    result.structured ? 'valid' : `schemaErrors: ${result.schemaErrors.join(' | ')}`,
  );

  const a = result.structured;
  check(
    !!a && a.campaigns.includes('20V197000'),
    'the answer cites the campaign it was asked about',
    a ? `campaigns: [${a.campaigns.join(', ')}]` : 'no structured answer',
  );

  check(
    !!a && a.escalate === null,
    'REC-002 · does not escalate — the documents settle this one',
    a ? (a.escalate ? `escalated: ${a.escalate.reason}` : 'no escalation') : 'no structured answer',
  );

  if (a) printAnswer(a);
  console.log(`  ${DIM}${result.turns.length} turn(s), ${(ms / 1000).toFixed(1)}s, model ${model}`);
  console.log(`  a single green run is a smoke test, not a scorecard — repeats are stage 7${OFF}`);

  console.log(
    failed === 0
      ? `\n  ask: ${GREEN}PASS${OFF} — stage 6.3 may begin\n`
      : `\n  ask: ${RED}FAIL${OFF} — ${failed} check(s).\n`,
  );
  return failed;
}

main().then((f) => process.exit(f === 0 ? 0 : 1));
