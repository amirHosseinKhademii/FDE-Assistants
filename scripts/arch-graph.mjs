/**
 * Print the repo's real package graph into a generated module.
 *
 *   node scripts/arch-graph.mjs        # write it
 *   node scripts/arch-graph.mjs --check  # fail if what is on disk is stale
 *
 * ── WHY THIS EXISTS RATHER THAN A HAND-WRITTEN LIST ────────────────────────
 *
 * `/learn/architecture` draws which package depends on which. That drawing is
 * worth exactly as much as its agreement with `package.json`, and a hand-kept
 * copy of a dependency graph is the drift lesson on `/learn/drift` written down
 * in advance: true when typed, false after the next `pnpm add`, and nothing to
 * say so.
 *
 * So the graph is a derived artifact — the same pattern as
 * `corpus.generated.ts` and `estate.generated.ts`, for the same reason.
 *
 * WHAT IS NOT IN HERE, DELIBERATELY: what any of it MEANS. Which file handles
 * which stage of a request, what it does in plain words, which excerpt is worth
 * reading — none of that is derivable from a manifest, and generating a
 * plausible-looking sentence about a package would be worse than writing a true
 * one by hand. The page says which half is which.
 *
 * `--check` exists so this can fail a build rather than only being regenerable,
 * which is the difference between a derived artifact and a convention.
 *
 * ── HOW A LINE IS COUNTED, BECAUSE TWO METHODS DISAGREE BY THE FILE COUNT ──
 *
 * Per file: `split('\n').length`. A file not ending in a newline still has a
 * last line, and this counts it. `cat files | wc -l` does not, so it comes out
 * exactly one short PER FILE — `@fde/foundry` is 94 here and 92 there, across
 * two files; `@fde/bedrock` is 571 and 567, across four.
 *
 * Neither is wrong and this one is better, but a reader with `docs/
 * ARCHITECTURE.md` open beside the page sees a contradiction. Written down here
 * so the next person reconciling them has the answer in the file that produces
 * the number rather than having to derive it.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const OUT = join(ROOT, 'apps/web/veresk-app/src/lib/learn/architecture.generated.ts');

/** The globs from `pnpm-workspace.yaml`. The raw fact each package came from. */
const GLOBS = [
  { dir: 'packages', label: 'packages/*', kind: 'shared' },
  { dir: 'packages/providers', label: 'packages/providers/*', kind: 'provider' },
  { dir: 'apps/ai', label: 'apps/ai/*', kind: 'judgement' },
  { dir: 'apps/web', label: 'apps/web/*', kind: 'surface' },
];

/**
 * ── WHERE THE GLOB AND THE LAYER DISAGREE, AND THEY DO TWICE ───────────────
 *
 * Deriving the layer purely from the directory is one line shorter and wrong,
 * and it shipped: it put `@veresk/surface` under a heading reading *"knows
 * nothing about any customer — a second engagement uses it unchanged"*, which
 * is the exact opposite of that package's whole reason for existing. It knows
 * there is a firm with several engagements and it could never be lifted out.
 *
 * `docs/ARCHITECTURE.md` §1 already puts both of these in the SURFACE layer and
 * is right. So the exceptions are listed, with the reason, rather than inferred
 * from a prefix — keying on `@fde/` makes a layering check WEAKER than the
 * document it is checking, and it fails green.
 */
const LAYER_OVERRIDE = {
  '@fde/uikit':
    'domain-neutral, so leak:check polices it — but nothing below the surface may depend on it.',
  '@veresk/surface':
    'this SITE\'s own shared parts. It knows there is a firm with several engagements, so it could never be lifted into a customer\'s repo.',
};

const dirs = (p) => {
  try {
    return readdirSync(p).filter((d) => statSync(join(p, d)).isDirectory());
  } catch {
    return [];
  }
};

/**
 * Lines of `.ts`/`.tsx` under a package's `src/`. A weak measure, labelled as
 * one on the page.
 *
 * ── GENERATED FILES ARE EXCLUDED, AND THE FIRST RUN PROVED WHY ─────────────
 *
 * `--check` failed immediately after a successful write. The output of this
 * script lands in `apps/web/veresk-app/src/lib/learn/`, which is inside a
 * package this script counts — so writing the artifact changed the number the
 * artifact reports, and it could never agree with itself.
 *
 * Excluding `*.generated.ts` fixes the self-reference and is the right answer
 * independently: this figure is meant to be "how much was written", and
 * generated code was not written. `.d.ts` is excluded for the same reason.
 */
function countLines(dir) {
  let n = 0;
  const walk = (d) => {
    for (const e of dirs(d)) walk(join(d, e));
    let files = [];
    try {
      files = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const f of files) {
      if (!f.isFile() || !/\.tsx?$/.test(f.name)) continue;
      if (f.name.endsWith('.d.ts') || f.name.includes('.generated.')) continue;
      n += readFileSync(join(d, f.name), 'utf8').split('\n').length;
    }
  };
  walk(join(dir, 'src'));
  return n;
}

const pkgs = [];
for (const g of GLOBS) {
  for (const d of dirs(join(ROOT, g.dir))) {
    const dir = join(ROOT, g.dir, d);
    let json;
    try {
      json = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    } catch {
      continue;
    }
    // `packages/providers` is nested inside `packages`, so the outer glob sees
    // it as a directory with no package.json — which is why the try/catch above
    // is a filter and not error handling.
    pkgs.push({
      name: json.name,
      dir: relative(ROOT, dir),
      glob: g.label,
      // The glob is the fact; the layer is the fact plus two documented
      // exceptions. Both are emitted, so a reader can see where they differ.
      kind: json.name in LAYER_OVERRIDE ? 'surface' : g.kind,
      layerNote: LAYER_OVERRIDE[json.name] ?? null,
      lines: countLines(dir),
      deps: Object.keys(json.dependencies ?? {}).filter((x) => x.startsWith('@fde/') || x.startsWith('@veresk/') || x.startsWith('@vantis/') || x.startsWith('@claims/') || x.startsWith('@meridian/')),
      external: Object.keys(json.dependencies ?? {}).filter((x) => !x.startsWith('@fde/') && !x.startsWith('@veresk/') && !x.startsWith('@vantis/') && !x.startsWith('@claims/') && !x.startsWith('@meridian/')).length,
    });
  }
}
pkgs.sort((a, b) => a.name.localeCompare(b.name));

const body = `/**
 * GENERATED by \`node scripts/arch-graph.mjs\` — do not edit.
 *
 * The repo's real package graph, read from every \`package.json\` and the three
 * globs in \`pnpm-workspace.yaml\`. Regenerate with \`pnpm arch:graph\`; assert it
 * is current with \`pnpm arch:check\`.
 *
 * WHAT THIS FILE DOES NOT CONTAIN is what any of it means — which file handles
 * which stage of a request, and why. That is written by hand in
 * \`pages/learn/Architecture.tsx\`, because it is not derivable from a manifest
 * and a generated sentence about a package would be a plausible one rather than
 * a true one.
 */
export interface ArchPackage {
  name: string;
  /** Path from the repo root. */
  dir: string;
  /** Which workspace glob it came from — the layer it lives in. */
  glob: string;
  /**
   * The LAYER, which is the glob plus two documented exceptions — see
   * \`scripts/arch-graph.mjs\`. Where it differs from \`glob\`, \`layerNote\` says why.
   */
  kind: 'shared' | 'provider' | 'judgement' | 'surface';
  /** Set only where the layer differs from the directory it lives in. */
  layerNote: string | null;
  /** Lines of .ts/.tsx under src/. A weak measure; the page says so. */
  lines: number;
  /** Workspace dependencies only — the edges of the graph. */
  deps: string[];
  /** How many third-party dependencies. Counted, not listed. */
  external: number;
}

export const GENERATED_AT = ${JSON.stringify(new Date().toISOString().slice(0, 10))};

export const PACKAGES: ArchPackage[] = ${JSON.stringify(pkgs, null, 2)};
`;

if (process.argv.includes('--check')) {
  let current = '';
  try {
    current = readFileSync(OUT, 'utf8');
  } catch {
    /* missing counts as stale */
  }
  // The date line moves every day and says nothing about the graph, so it is
  // excluded from the comparison — otherwise this check fails every midnight
  // and gets turned off, which is the failure mode `/learn/drift` is about.
  const strip = (s) => s.replace(/export const GENERATED_AT = "[^"]*";/, '');
  if (strip(current) !== strip(body)) {
    console.error('arch: STALE — the package graph on disk disagrees with package.json.');
    console.error('      run `pnpm arch:graph` and commit the result.');
    process.exit(1);
  }
  console.log(`arch: current — ${pkgs.length} packages, ${pkgs.reduce((n, p) => n + p.deps.length, 0)} workspace edges.`);
} else {
  writeFileSync(OUT, body);
  console.log(`arch: wrote ${relative(ROOT, OUT)} — ${pkgs.length} packages, ${pkgs.reduce((n, p) => n + p.deps.length, 0)} workspace edges.`);
}
