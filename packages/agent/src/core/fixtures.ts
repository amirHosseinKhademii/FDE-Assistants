/**
 * Freeze every tool response, keyed by a hash of its arguments; replay it
 * afterwards.
 *
 * WHAT THIS DOES AND DOES NOT BUY YOU — worth being precise, because it is easy
 * to oversell.
 *
 * It does NOT make eval runs free or fast. The model call dominates both cost
 * and latency here (one observed run: 52k input tokens, 60 seconds), and that
 * call is still live on every eval run. Tool calls in this app are a local file
 * read and an embedding lookup — cheap already.
 *
 * What it buys is ATTRIBUTION. Retrieval returns byte-identical passages on
 * every run, so when the scorecard moves from 1/2 to 2/2 you know it was your
 * prompt change. Without it, the index could be rebuilt, embeddings could shift
 * under a model update, and the number would move for reasons you did not
 * cause and cannot see. "We went from 61% to 84%" is only a meaningful sentence
 * if everything except your change was held still.
 *
 * The second thing it buys, later: a fixture is a durable record of exactly
 * what the model was shown when it made a given decision. For a claims system
 * that is audit material, not a test convenience.
 *
 * Retrofitting this is expensive — it means re-recording everything and
 * re-running every historical number — which is why it goes in before the eval
 * set grows rather than after.
 *
 * SCOPE, narrowed 2026-09-05: this is applied to `get_policyholder` only.
 *
 * A fixture is filed under a hash of the exact arguments, which works when the
 * caller passes a stable key and fails when it does not. `get_policyholder`
 * takes a policy id: six ids in the case set, six files, reused every run.
 * `search_policy` takes a query string the MODEL writes, and it rewrites that
 * string every time — five runs of one case produced five different queries all
 * asking the same thing, so five hashes and five files. Across the 2026-09-05
 * baseline, ~59 searches produced 58 new files: a hit rate of about zero, an
 * unbounded directory, and none of the attribution this layer exists for.
 *
 * So search is no longer fixtured. Not because caching search is a bad idea —
 * because caching it ON THE ARGUMENTS cannot work when the arguments are
 * free text. Keying on (case id, call index) would work and is the open option;
 * see evals/README.md.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { Tool } from './tool.types';

/** Flat repo: fixtures live at the project root, not two levels up. */
/**
 * Where fixtures live. Set by the application — a package that picked a path
 * would write files into somebody else's repo layout.
 */
let ROOT = '';
export function configureFixtures(dir: string): void {
  ROOT = dir;
}

export type FixtureMode = 'record' | 'replay' | 'off';

/**
 * Default is 'off': ordinary `pnpm ask` runs make real calls and write nothing.
 * Recording is opt-in, because silently writing a fixture file for every ad-hoc
 * question fills the directory with junk that later looks authoritative.
 *
 *   FIXTURE_MODE=record pnpm eval    record what is missing, use live otherwise
 *   FIXTURE_MODE=replay pnpm eval    replay only; a miss is a hard error
 */
export const fixtureMode = (): FixtureMode =>
  (process.env.FIXTURE_MODE as FixtureMode) ?? 'off';

const keyOf = (args: unknown) =>
  createHash('sha256').update(JSON.stringify(args)).digest('hex').slice(0, 16);

/**
 * Wrap a live call.
 *
 * In `replay`, a missing fixture is a HARD ERROR rather than a silent live
 * call. A test that quietly hits the network when you thought it was replaying
 * is worse than one that fails — it passes, and you trust a number that was
 * measured against something you did not control.
 */
export async function throughFixture<T>(
  tool: string,
  args: unknown,
  live: () => Promise<T>,
): Promise<{ value: T; source: 'live' | 'fixture' }> {
  const mode = fixtureMode();
  if (mode === 'off') return { value: await live(), source: 'live' };

  if (!ROOT) {
    throw new Error(
      'FIXTURE_MODE is set but configureFixtures() was never called. @fde/agent ' +
        'picks no path — tell it where fixtures live.',
    );
  }
  const path = join(ROOT, tool, `${keyOf(args)}.json`);

  try {
    const raw = await readFile(path, 'utf8');
    return { value: JSON.parse(raw).response as T, source: 'fixture' };
  } catch (err: any) {
    if (err?.code !== 'ENOENT') throw err;
    if (mode === 'replay') {
      throw new Error(
        `No fixture for ${tool} ${JSON.stringify(args)}.\n` +
          `Record it first:  FIXTURE_MODE=record pnpm eval`,
      );
    }
  }

  const value = await live();
  await mkdir(dirname(path), { recursive: true });
  // The args are stored alongside the response purely so a human can read the
  // directory. A hash-named file whose contents don't say what produced it is
  // unreviewable, and these are meant to be reviewed.
  await writeFile(path, JSON.stringify({ tool, args, response: value }, null, 2));
  return { value, source: 'live' };
}

/**
 * Wrap a tool so its results route through the fixture store.
 *
 * Applied at the TOOL boundary rather than around the embedding call, so the
 * frozen thing is the complete retrieval result — ranking included. If it were
 * applied lower down, re-running ingest with a different chunk size would
 * silently change what the model sees while every fixture still "hit."
 */
export function fixtured<A, R>(tool: Tool<A, R>): Tool<A, R> {
  return {
    ...tool,
    async execute(args: A): Promise<R> {
      const { value, source } = await throughFixture(tool.schema.name, args, () =>
        tool.execute(args),
      );
      lastSource.set(tool.schema.name, source);
      return value;
    },
  };
}

/** Where the most recent call for each tool came from. Read by the registry so
 *  a run record can say whether it touched the network. */
export const lastSource = new Map<string, 'live' | 'fixture'>();
