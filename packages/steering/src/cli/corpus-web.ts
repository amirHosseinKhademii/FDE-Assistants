/**
 * `pnpm steering:corpus-web` — what is actually IN the customer's files, for
 * the page.
 *
 * A DELIBERATE SIBLING OF `estate-web.ts`, NOT A SHARED THING. That one reads
 * databases and this one reads a directory; they emit the same shape of file
 * for the same section of the same page, and every line they have in common is
 * a coincidence of both being small. Factoring them together would couple a
 * `information_schema` walk to a filesystem walk on the theory that both end in
 * `writeFileSync`.
 *
 * WHY THE PAGE NEEDS THIS AT ALL. The estate section can open a database and
 * show its tables, because a database knows its own shape. A directory does
 * not, so the equivalent — "open this pile and see what is inside it" — has to
 * be measured here and handed over. Without it the left-hand side of the page
 * is a number and a list of file extensions, which tells a reader nothing about
 * why reading it is hard.
 *
 * IT PUBLISHES REAL EXCERPTS, AND THAT IS THE POINT. A description of a
 * timesheet export cannot convey that the charge-code format changed twice, or
 * that the year a rate card applies to is in a `#` comment above the header
 * rather than in the data. The first twelve lines of the actual file convey
 * both immediately. This corpus is generated and fictional, so there is nothing
 * to withhold — at a real engagement this generator would be the first thing to
 * grow a redaction pass, and that is worth knowing before it is needed.
 *
 * IT READS AND NEVER WRITES TO THE CORPUS. `pnpm steering:corpus` is what
 * produces those files; this only looks at them.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { REPO_ROOT } from '../config/connections';

const CORPUS = resolve(REPO_ROOT, 'docs/steering/corpus');
const TARGET = resolve(REPO_ROOT, 'apps/steering-app/src/lib/corpus.generated.ts');

/**
 * THE GROUPS ARE HAND-DRAWN AND HAVE TO BE. A directory listing gives
 * `pmo/closure-reports/` and `requirements/PRG-TDR-01/`; which of those is one
 * KIND of source and which is one programme's folder is a judgement about the
 * customer's filing, not a fact the filesystem holds. What is measured is
 * everything else: how many files, how big, and what is in one of them.
 *
 * `produces` NAMES THE `vst_derived` TABLE THIS BECOMES, or nothing at all. An empty
 * string is the honest value for the four groups nothing reads yet, and it is
 * what lets the page draw the gap rather than describe it.
 */
const GROUPS: Array<{
  id: string;
  name: string;
  /** Directories, relative to the corpus root. */
  dirs: string[];
  /** How the customer would describe it. */
  what: string;
  /** The thing that makes it hard to read, in one sentence. */
  catch_: string;
  produces: string;
}> = [
  {
    id: 'timesheets',
    name: 'Timesheets',
    dirs: ['pmo/timesheets'],
    what: 'Quarterly exports from the time-booking system.',
    catch_:
      'Three quarters were never exported. The charge-code format changed twice. One name is quoted with a comma inside it, and twelve people are spelled two ways.',
    produces: 'timesheet_lines',
  },
  {
    id: 'closure-reports',
    name: 'Closure reports',
    dirs: ['pmo/closure-reports'],
    what: 'What a completed piece of work was, written up when it closed.',
    catch_:
      'The head block is regular and parses. Everything a reader actually wants — why the hours were what they were, whether a safety case was involved — is in prose underneath it.',
    produces: 'document_fields',
  },
  {
    id: 'quotes',
    name: 'Quotations',
    dirs: ['pmo/quotes'],
    what: 'What was quoted to a customer, line by line.',
    catch_:
      'The table and the bold total parse exactly. The Assumptions section below is prose. No quotation names the requirement a line priced.',
    produces: 'quote_line_items',
  },
  {
    id: 'estimates',
    name: 'Estimates',
    dirs: ['pmo/estimates'],
    what: 'Bottom-up estimates, by work package and discipline.',
    catch_:
      'Every line carries how it was arrived at — a supplier quote, the last programme, engineering judgement, or a guess. Sixty-six of them are guesses.',
    produces: 'estimate_lines',
  },
  {
    id: 'rate-cards',
    name: 'Rate cards',
    dirs: ['pmo/rate-cards'],
    what: 'What an hour of each discipline costs.',
    catch_:
      'Seven rows of discipline and rate. Which year and which region they apply to is not in the data at all — it is in a comment above the header, and in the filename.',
    produces: 'rate_card_lines',
  },
  {
    id: 'requirements',
    name: 'Requirements',
    dirs: ['requirements'],
    what: 'Customer specifications at each revision, trace matrices, architecture notes, review notes.',
    catch_:
      'Rev A and Rev B of the same spec disagree, on purpose. One requirement is stated twice with different numbers. Forces are written three ways, including one with no space before the unit.',
    produces: '',
  },
  {
    id: 'code',
    name: 'Source repositories',
    dirs: [
      'eps-calibration-tools',
      'eps-core',
      'eps-diagnostics',
      'eps-end-of-line',
      'eps-motor-control',
      'eps-safety-monitor',
      'eps-steer-by-wire',
      'eps-steering-feel',
    ],
    what: 'Eight repositories: sources, headers, tests, MISRA reports, design docs, a git log dump.',
    catch_:
      'The safety level of one module is stated in three places that disagree, and the only explanation is a paragraph in a MISRA deviation. One file in 1,069 names a part number.',
    produces: '',
  },
  {
    id: 'releases',
    name: 'Releases and tickets',
    dirs: ['releases', 'tickets'],
    what: 'Release notes per version, and one export from the ticket system.',
    catch_: 'A ticket export is one CSV with free text in the field that matters.',
    produces: '',
  },
];

function walk(dir: string): string[] {
  return readdirSync(dir)
    .sort()
    .flatMap((n) => {
      const full = join(dir, n);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
}

/**
 * The first lines of one real file, as they are on disk.
 *
 * TABS AND TRAILING SPACE ARE LEFT ALONE. The point of showing a file is to
 * show what a parser is handed; tidying the excerpt would be the page doing
 * the one thing the parser must not.
 */
function excerpt(path: string, lines: number): string[] {
  return readFileSync(path, 'utf8').split('\n').slice(0, lines);
}

function main() {
  console.log(`reading:  ${CORPUS}`);
  console.log(`writing:  ${TARGET}`);

  const groups = GROUPS.map((g) => {
    const files = g.dirs.flatMap((d) => walk(join(CORPUS, d)));
    const bytes = files.reduce((n, f) => n + statSync(f).size, 0);

    const byExt = new Map<string, number>();
    for (const f of files) {
      const e = extname(f).replace('.', '') || '—';
      byExt.set(e, (byExt.get(e) ?? 0) + 1);
    }

    /* THE EXAMPLE IS THE LARGEST FILE OF THE COMMONEST KIND, chosen rather than
       taken first, because `2019-Q4.csv` sorts first and is the shortest export
       in the set — an excerpt that showed four rows would understate what the
       parser is handed. Deterministic either way: same corpus, same choice. */
    const commonest = [...byExt.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const candidates = files.filter((f) => (extname(f).replace('.', '') || '—') === commonest);
    const example = candidates.sort((a, b) => statSync(b).size - statSync(a).size)[0];

    console.log(
      `  ${g.id.padEnd(16)} ${String(files.length).padStart(4)} files  ${String(Math.round(bytes / 1024)).padStart(5)} KB  → ${g.produces || '(not read yet)'}`,
    );

    return {
      id: g.id,
      name: g.name,
      what: g.what,
      catch_: g.catch_,
      produces: g.produces,
      files: files.length,
      bytes,
      kinds: [...byExt.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([ext, n]) => ({ ext, n })),
      example: {
        path: relative(CORPUS, example),
        lines: excerpt(example, 14),
      },
    };
  });

  const files = groups.reduce((n, g) => n + g.files, 0);
  const bytes = groups.reduce((n, g) => n + g.bytes, 0);

  const body = `/**
 * GENERATED by \`pnpm steering:corpus-web\` — do not edit.
 *
 * What is in the customer's files: how many, how big, and the first fourteen
 * lines of one real file per group. The prose about what each group IS and what
 * makes it hard to read is written by hand in the generator, because that is a
 * judgement; everything numeric here was counted.
 */

export interface CorpusExample {
  path: string;
  lines: string[];
}

export interface CorpusGroup {
  id: string;
  name: string;
  what: string;
  /** The thing that makes it hard to read. */
  snag: string;
  /** The \`vst_derived\` table this becomes, or '' where nothing reads it yet. */
  produces: string;
  files: number;
  bytes: number;
  kinds: Array<{ ext: string; n: number }>;
  example: CorpusExample;
}

/** The day the files were counted. */
export const MEASURED_AT = '${new Date().toISOString().slice(0, 10)}';

/** The command that reproduces every number here. */
export const MEASURED_BY = 'pnpm steering:corpus-web';

export const TOTAL_FILES = ${files};
export const TOTAL_BYTES = ${bytes};

export const CORPUS: CorpusGroup[] = ${JSON.stringify(
    groups.map(({ catch_, ...rest }) => ({ ...rest, snag: catch_ })),
    null,
    2,
  )};
`;

  mkdirSync(dirname(TARGET), { recursive: true });
  writeFileSync(TARGET, body);
  console.log(`\ncorpus: ${groups.length} groups, ${files} files, ${Math.round(bytes / 1024)} KB → written`);
}

/**
 * Guarded so that importing this file — for a constant, a type, anything — does
 * not run it. `index-cli.ts` was imported for one string and re-embedded the
 * whole corpus; `sql:check` now asserts every entry point here does this.
 */
if (require.main === module) {
  main();

}
