/**
 * `pnpm leak:check` — does any reusable package know what business we are in?
 *
 * THE CLAIM THIS DEFENDS. Seven of the eight packages are meant to be liftable
 * into the next engagement unchanged. That is easy to believe and easy to break:
 * one `tableName = 'policy_chunks'` default, one agent named `'coverage'`, one
 * `result.policy_id` read inside a loop, and the package now carries a customer
 * it has never met. Every one of those was real in this repo, and none of them
 * failed a typecheck.
 *
 * WHY COMMENTS ARE EXEMPT, and this is the whole design of the check. The
 * comments in these packages are where the reasoning lives, and the reasoning is
 * *about* the domain boundary — "a retrieval package that knew how to get an
 * Azure credential would be unusable at a customer on AWS". Failing those would
 * push the explanations out of the code, which is the opposite of what this
 * repo is for. What must be clean is anything that EXECUTES: identifiers,
 * string literals, defaults.
 *
 * THE NEGATIVE CONTROL is not decoration. A scanner with a broken line filter
 * reports zero forever and reads exactly like a passing check. So this injects
 * a banned word into a synthetic source file and requires the scanner to catch
 * it. If the control stops failing, this whole file has gone blind.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Your domain's vocabulary. The only list another engagement must edit.
 *
 * TWO DOMAINS NOW LIVE HERE, so the list covers both. A second domain arriving
 * is exactly when this check goes half-blind without anyone noticing: it would
 * keep passing while `@fde/*` learned an entirely new customer's words.
 *
 * WHY `batch` AND `lot` ARE ABSENT, and this is the interesting part. Both are
 * core pharmaceutical nouns and both are ALSO ordinary engineering words — the
 * embedding client batches its requests, and English contains "a lot of". A
 * scanner that bans them reports 22 leaks in domain-neutral code on its first
 * run, and a check that cries wolf on day one gets deleted, which is the one
 * outcome that leaves the boundary genuinely unprotected. Banned words must be
 * words that CANNOT appear innocently.
 */
const BANNED = [
  // insurance
  'insur', 'policyholder', 'adjuster', 'deductible', 'endorsement',
  'underwrit', 'coverage', 'premium', 'peril', 'policy', 'claims',
  // pharmaceutical manufacturing
  'pharma', 'gmp', 'dissolution', 'excipient', 'monograph', 'potency',
  'qualified person', 'meridian', 'ibuprofen', 'consignee', 'cold chain',
  // steering systems
  //
  // CHOSEN AGAINST THIS FILE'S OWN RULE — "banned words must be words that
  // CANNOT appear innocently" — and matching here is a bare substring test with
  // no word boundary, so three obvious candidates were deliberately LEFT OUT:
  //
  //   'eps'     matches "steps"
  //   'rack'    matches "track", "tracking"
  //   'pinion'  matches "opinion"
  //
  // Each would have gone red on innocent code the first time anyone ran it.
  // 'rack force' is the two-word form, which is safe.
  'torque', 'autosar', 'hysteresis', 'aspice', 'steering', 'rack force', 'vantis',
];

/**
 * Packages allowed to know the domain: anything NOT published under `@fde/`.
 *
 * KEYED ON THE PACKAGE NAME, NOT THE DIRECTORY. The first version listed
 * `['domain']` — the folder name at the time. That quietly made this check a
 * trap, and the trap sprang: the domain package was renamed to
 * `packages/insurance`, and a directory-keyed check would have started scanning
 * the one package that is SUPPOSED to be full of domain words and failed with
 * hundreds of hits. A check whose first act on a new project is to cry wolf
 * gets deleted, and then it protects nothing.
 */
const REUSABLE_PREFIX = '@fde/';

const PACKAGES = 'packages';

/**
 * Strip comments and count what is left.
 *
 * Deliberately line-based rather than a real parser: a parser is a dependency
 * and a maintenance surface, and the failure mode of this heuristic is a FALSE
 * POSITIVE — it flags something harmless and a human looks. The dangerous
 * direction would be silently skipping lines, which the control catches.
 */
function codeLines(src) {
  const out = [];
  let inBlock = false;
  src.split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (inBlock) {
      if (line.includes('*/')) inBlock = false;
      return;
    }
    if (line.startsWith('/*')) {
      if (!line.includes('*/')) inBlock = true;
      return;
    }
    if (line.startsWith('//') || line.startsWith('*') || line === '') return;
    out.push([i + 1, raw]);
  });
  return out;
}

function scanSource(src, file) {
  const hits = [];
  for (const [n, line] of codeLines(src)) {
    // Trailing comments carry reasoning too, so cut them off before matching —
    // but NOT at the `//` in a URL. The first version used /\/\/.*$/ and
    // truncated `postgresql://claims:claims@localhost` to `postgresql:`,
    // silently hiding the one real leak in the repo while reporting PASS. A
    // scanner that drops input is indistinguishable from a clean codebase.
    const code = line.replace(/(^|[^:])\/\/.*$/, '$1');
    for (const word of BANNED) {
      if (new RegExp(word, 'i').test(code)) {
        hits.push({ file, line: n, word, text: line.trim().slice(0, 100) });
        break;
      }
    }
  }
  return hits;
}

function walk(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...walk(full));
    else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) found.push(full);
  }
  return found;
}

const hits = [];
const scanned = [];
for (const pkg of readdirSync(PACKAGES)) {
  let name;
  try {
    name = JSON.parse(readFileSync(join(PACKAGES, pkg, 'package.json'), 'utf8')).name;
  } catch {
    continue;
  }
  if (!name?.startsWith(REUSABLE_PREFIX)) continue;
  scanned.push(name);
  const src = join(PACKAGES, pkg, 'src');
  try {
    if (!statSync(src).isDirectory()) continue;
  } catch {
    continue;
  }
  for (const file of walk(src)) hits.push(...scanSource(readFileSync(file, 'utf8'), file));
}

console.log('\nLeak check — domain vocabulary in reusable packages\n');

if (hits.length === 0) {
  console.log(`  ok    no banned word reaches executable code in ${scanned.length} package(s): ${scanned.sort().join(', ')}`);
  console.log('        comments are exempt on purpose — that is where the reasoning lives');
} else {
  for (const h of hits) console.log(`  FAIL  ${h.file}:${h.line}  "${h.word}"\n        ${h.text}`);
}

// THE NEGATIVE CONTROL.
const control = scanSource(
  ['/**', ' * A comment mentioning policy and insurance must NOT trip this.', ' */',
   'const x = 1; // nor may a trailing comment about a deductible',
   "const tableName = 'policy_chunks';",
   // The URL case. This line is why the control exists at all: the first
   // scanner truncated it at `//` and reported the repo clean.
   "const url = 'postgresql://claims:claims@localhost:5433/claims';"].join('\n'),
  '<control>',
);
const controlOk =
  control.length === 2 &&
  control[0].word === 'policy' && control[0].line === 5 &&
  control[1].word === 'claims' && control[1].line === 6;

console.log(
  `  ${controlOk ? 'ok  ' : 'FAIL'}  control: planted leaks ARE caught, and comments are NOT\n` +
    `        ${
      controlOk
        ? 'caught the planted default AND the credential in a URL, and ignored ' +
          'every comment line — the scan can fail'
        : `expected hits on lines 5 and 6, got ${JSON.stringify(control)} — this check is blind`
    }`,
);

console.log(
  `\nleak: ${hits.length === 0 && controlOk ? 'PASS' : 'FAIL'}` +
    (hits.length ? ` — ${hits.length} leak(s)` : '') + '\n',
);
process.exit(hits.length === 0 && controlOk ? 0 : 1);
