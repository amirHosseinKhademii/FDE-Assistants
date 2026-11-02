/**
 * `pnpm check:loop` — does the engine a request gets match what the provider can serve?
 *
 * Offline. It sets LLM_PROVIDER and LOOP, calls resolveLoop, and asserts. It
 * never builds a client or touches a model, so it runs with no credentials.
 *
 * The case that matters is the one the live demo hit: LLM_PROVIDER=hosted with
 * a request that names sdk. That must come back as mastra with fellBackFrom
 * set, not throw. The Foundry cases pin the other half: with azure configured,
 * an explicit sdk stays sdk and nothing falls back.
 */
import { loopOptions, resolveLoop } from './loop.factory';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

function withEnv(provider: string | undefined, loop: string | undefined, fn: () => void): void {
  const saved = { p: process.env.LLM_PROVIDER, l: process.env.LOOP };
  if (provider === undefined) delete process.env.LLM_PROVIDER;
  else process.env.LLM_PROVIDER = provider;
  if (loop === undefined) delete process.env.LOOP;
  else process.env.LOOP = loop;
  try {
    fn();
  } finally {
    if (saved.p === undefined) delete process.env.LLM_PROVIDER;
    else process.env.LLM_PROVIDER = saved.p;
    if (saved.l === undefined) delete process.env.LOOP;
    else process.env.LOOP = saved.l;
  }
}

// Hosted: the live-demo failure. Explicit sdk falls back to the configured LOOP.
withEnv('hosted', 'mastra', () => {
  const r = resolveLoop('sdk');
  check('hosted + requested sdk + LOOP=mastra -> mastra', r.choice === 'mastra', r.choice);
  check('hosted fallback records what was asked for', r.fellBackFrom === 'sdk', String(r.fellBackFrom));
  check('hosted fallback carries a reason', typeof r.reason === 'string' && r.reason.includes('Agents SDK'));
});

withEnv('hosted', undefined, () => {
  const r = resolveLoop('sdk');
  check('hosted + requested sdk + LOOP unset -> mastra (first usable)', r.choice === 'mastra', r.choice);
  const none = resolveLoop(undefined);
  check('hosted + no request + LOOP unset -> mastra, no fallback noted', none.choice === 'mastra' && none.fellBackFrom === 'sdk', `${none.choice}/${none.fellBackFrom}`);
});

withEnv('hosted', 'mastra', () => {
  const r = resolveLoop(undefined);
  check('hosted + no request + LOOP=mastra -> mastra, no fallback', r.choice === 'mastra' && r.fellBackFrom === null);
  const lg = resolveLoop('langgraph');
  check('hosted + requested langgraph -> langgraph (usable)', lg.choice === 'langgraph' && lg.fellBackFrom === null);
  const bogus = resolveLoop('nonsense');
  check('unknown name is not coerced to sdk', bogus.choice === 'mastra' && bogus.fellBackFrom === null);
});

withEnv('hosted', 'sdk', () => {
  const r = resolveLoop(undefined);
  check('hosted + LOOP=sdk + no request -> mastra with the fallback named', r.choice === 'mastra' && r.fellBackFrom === 'sdk');
});

for (const provider of ['bedrock', 'local']) {
  withEnv(provider, 'sdk', () => {
    const r = resolveLoop('sdk');
    check(`${provider} + requested sdk -> mastra`, r.choice === 'mastra' && r.fellBackFrom === 'sdk', r.choice);
  });
}

// Foundry configured: unchanged. Explicit sdk is honoured, no fallback.
for (const provider of [undefined, 'azure']) {
  withEnv(provider, undefined, () => {
    const r = resolveLoop('sdk');
    check(`${provider ?? 'unset'} provider + requested sdk -> sdk, no fallback`, r.choice === 'sdk' && r.fellBackFrom === null);
    const d = resolveLoop(undefined);
    check(`${provider ?? 'unset'} provider + no request + LOOP unset -> sdk`, d.choice === 'sdk' && d.reason === null);
  });
}

withEnv('hosted', 'mastra', () => {
  const opts = loopOptions();
  const sdk = opts.find((o) => o.id === 'sdk');
  check('loopOptions marks sdk unusable on hosted', sdk?.usable === false && typeof sdk?.reason === 'string');
  check('loopOptions keeps mastra usable', opts.find((o) => o.id === 'mastra')?.usable === true);
});

if (failures > 0) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nloop resolution: all checks pass');
