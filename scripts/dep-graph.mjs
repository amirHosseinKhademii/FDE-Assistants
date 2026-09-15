/**
 * The workspace's real dependency graph, read from package.json and nothing else.
 *
 * WHY THIS EXISTS. `docs/ARCHITECTURE.md` §2 draws the graph by hand, and a
 * drawing of a graph is a claim about a graph. This prints the graph, so the two
 * can be compared — and so a page that renders it can be generated rather than
 * transcribed. It is the same argument as `corpus.generated.ts`: the number in
 * the artefact should be produced by the thing it describes.
 *
 * FREE, OFFLINE, NO INSTALL. It reads manifests off disk. No `pnpm ls`, because
 * that resolves the store and is slow enough that nobody would run it twice.
 *
 * ONLY WORKSPACE-INTERNAL EDGES ARE KEPT. `react` and `zod` are not
 * architecture; who may import `@fde/grounding` is. An edge is recorded when the
 * dependency's name resolves to another package in this workspace, whatever the
 * version specifier says — `workspace:*`, a range, or a file link all count.
 *
 *   node scripts/dep-graph.mjs            a readable report
 *   node scripts/dep-graph.mjs --json     the same as data, for a generator
 *   node scripts/dep-graph.mjs --check    exit 1 if a layering rule is broken
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The three globs from pnpm-workspace.yaml, kept in the order that file uses. */
const GLOBS = ['apps/web', 'apps/ai', 'packages', 'packages/providers'];

function manifests() {
  const out = [];
  for (const g of GLOBS) {
    const dir = join(ROOT, g);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const p = join(dir, entry.name, 'package.json');
      if (!existsSync(p)) continue;
      const json = JSON.parse(readFileSync(p, 'utf8'));
      if (!json.name) continue;
      out.push({ name: json.name, dir: `${g}/${entry.name}`, glob: g, json });
    }
  }
  return out;
}

/**
 * Which layer a package sits in.
 *
 * Derived from its NAME, not its directory, for the same reason `leak:check`
 * keys on the `@fde/` prefix: the engagements moved out of `packages/` once
 * already, and a rule keyed on a path would have silently stopped applying.
 */
function layerOf(name) {
  // `@fde/uikit` carries the @fde/ prefix and is NOT transport.
  // `docs/ARCHITECTURE.md` §1 puts it in SURFACE, with the four apps and
  // `@veresk/surface`, and that is right: it is domain-neutral, so `leak:check`
  // should police it, but nothing below the surface layer may depend on it.
  // Keying purely on the prefix would classify it as transport and quietly make
  // the layering check below weaker than the document it is checking.
  if (name === '@fde/uikit' || name === '@veresk/surface') return 'surface-shared';
  if (name.startsWith('@fde/')) return 'transport';
  if (/-app$/.test(name) || name === '@veresk/app') return 'app';
  return 'judgment';
}

const pkgs = manifests();
const names = new Set(pkgs.map((p) => p.name));

const nodes = pkgs.map((p) => ({ name: p.name, dir: p.dir, layer: layerOf(p.name) }));
const edges = [];
for (const p of pkgs) {
  const deps = { ...(p.json.dependencies ?? {}), ...(p.json.devDependencies ?? {}) };
  for (const d of Object.keys(deps)) {
    if (names.has(d)) edges.push({ from: p.name, to: d });
  }
}

/**
 * THE LAYERING RULE, from `docs/ARCHITECTURE.md` §1: dependencies point one way.
 * A reusable package may never depend on an engagement, an app or the site's
 * shared parts — that is what makes "lift it into a customer's repo" true rather
 * than aspirational.
 */
const RANK = { transport: 0, judgment: 1, 'surface-shared': 2, app: 3 };
const VIOLATIONS = edges.filter((e) => {
  // Dependencies point DOWN only. An edge from a lower rank to a higher one is
  // transport reaching up into judgment, or judgment reaching up into a surface.
  // `surface-shared → transport` is allowed and is why uikit is not rank 0.
  if (layerOf(e.from) === 'surface-shared') return layerOf(e.to) === 'app';
  return RANK[layerOf(e.from)] < RANK[layerOf(e.to)];
});

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ nodes, edges, violations: VIOLATIONS }, null, 2));
} else {
  const byLayer = (l) => nodes.filter((n) => n.layer === l);
  console.log(`\n  ${nodes.length} packages, ${edges.length} workspace-internal edges\n`);
  for (const l of ['transport', 'judgment', 'surface-shared', 'app']) {
    const ns = byLayer(l);
    if (!ns.length) continue;
    console.log(`  ${l.toUpperCase()}`);
    for (const n of ns) {
      const out = edges.filter((e) => e.from === n.name).map((e) => e.to);
      const inn = edges.filter((e) => e.to === n.name).length;
      console.log(
        `    ${n.name.padEnd(22)} ${String(inn).padStart(2)} in   ${out.length ? '→ ' + out.join(', ') : '→ (nothing)'}`,
      );
    }
    console.log('');
  }
  const fanIn = nodes
    .map((n) => ({ n: n.name, c: edges.filter((e) => e.to === n.name).length }))
    .sort((a, b) => b.c - a.c)
    .slice(0, 5);
  console.log('  MOST DEPENDED ON');
  for (const f of fanIn) console.log(`    ${f.n.padEnd(22)} ${f.c}`);
  console.log(
    VIOLATIONS.length
      ? `\n  ${VIOLATIONS.length} LAYERING VIOLATION(S):\n` +
          VIOLATIONS.map((v) => `    ${v.from} → ${v.to}`).join('\n') +
          '\n'
      : '\n  No layering violations: dependencies point down only.\n',
  );
}

if (process.argv.includes('--check') && VIOLATIONS.length) process.exit(1);
