/**
 * `pnpm steering:derived-fetch-check` — do the fetch functions return what they say?
 *
 * Live against `vst_derived`, costs nothing, calls no model. The point is narrow and
 * worth stating: every claim in `derived.ts`'s doc comments is currently just a
 * comment. This turns four of them into assertions.
 *
 * It is deliberately NOT a test of the numbers — whether 722 hours is the right
 * median is `walk-check`'s job, and `derived:reconcile`'s before that. This asks
 * only whether the data layer beneath them behaves as documented.
 */
import { openDerived } from '../utils/handle';
import {
  whereFor, fetchComparableJobs, countPastJobs,
  fetchDisciplineMix, fetchRates, fetchFactSources,
} from './derived';
import { report, type Result } from '../../db/init/assertions';

async function main(): Promise<void> {
  const h = openDerived();
  const r: Result = { ok: [], fail: [] };
  const note = (pass: boolean, label: string, detail: string): void => {
    r[pass ? 'ok' : 'fail'].push({ label, detail });
  };

  // 1 · the filter builder parameterises rather than interpolates
  {
    const w = whereFor({ changeClass: "x' or '1'='1", elementKind: 'gearbox' });
    note(
      !w.sql.includes("or '1'='1") && w.params.length === 2 && w.sql === 'change_class = $1 and element_kind = $2',
      'the filter builds placeholders, never interpolated values',
      `a change class of "x' or '1'='1" becomes $1 and travels as data — sql was: ${w.sql}`,
    );
  }

  // 2 · an empty key matches everything rather than nothing
  {
    const w = whereFor({});
    const all = await fetchComparableJobs(h, {});
    const counted = await countPastJobs(h);
    note(
      w.sql === 'true' && all.length === counted && counted > 0,
      'an unfiltered key returns the whole history, and the count agrees',
      `${counted} past jobs, and a key with no fields returns all of them — a filter that ` +
        `silently narrowed to nothing would make every refusal look like a finding`,
    );
  }

  // 3 · narrowing reduces, and every returned job satisfies the filter
  {
    const jobs = await fetchComparableJobs(h, { changeClass: 'modify_hardware', elementKind: 'gearbox' });
    const honest = jobs.every((j) => j.changeClass === 'modify_hardware' && j.elementKind === 'gearbox');
    const sorted = jobs.every((j, i) => i === 0 || jobs[i - 1].hours <= j.hours);
    note(
      honest && sorted && jobs.length > 0,
      'a narrowed key returns only matching jobs, cheapest first',
      `${jobs.length} gearbox modifications, ${jobs[0]?.hours}–${jobs[jobs.length - 1]?.hours} h, every row matching`,
    );
  }

  // 4 · hours are numbers, not the strings pg hands back for `numeric`
  {
    const jobs = await fetchComparableJobs(h, { changeClass: 'safety_case_only' });
    note(
      jobs.length > 0 && jobs.every((j) => typeof j.hours === 'number' && Number.isFinite(j.hours)),
      'numeric columns arrive as numbers',
      `pg returns numeric as a STRING; "553" + "710" is "553710" and no type checker sees it. ` +
        `${jobs.length} rows checked.`,
    );
  }

  // 5 · every job can be traced to a sentence in a file
  {
    const jobs = await fetchComparableJobs(h, { changeClass: 'modify_hardware', elementKind: 'gearbox' });
    const ids = jobs.map((j) => j.effortId);
    const sources = await fetchFactSources(h, ids);
    const covered = new Set(sources.map((s) => s.effortId));
    const located = sources.filter((s) => s.line !== null && s.sentence).length;
    note(
      ids.every((id) => covered.has(id)) && located === sources.length,
      'every job traces to a file, a line and a sentence',
      `${sources.length} facts behind ${ids.length} jobs, all with a line number we located ourselves`,
    );
  }

  // 6 · the money side is present and priced per discipline
  {
    const jobs = await fetchComparableJobs(h, { changeClass: 'safety_case_only' });
    const mix = await fetchDisciplineMix(h, jobs.map((j) => j.effortId));
    const rates = await fetchRates(h, 2026, 'EU');
    const priced = mix.filter((m) => rates.has(m.discipline));
    note(
      mix.length > 0 && rates.size > 0 && priced.length === mix.length,
      'every discipline in the mix has an approved rate',
      `${mix.length} disciplines, ${rates.size} rates on the 2026 EU card — a discipline with no ` +
        `rate would silently price at zero and shrink the total`,
    );
  }

  note(
    h.reconnects === 0,
    'the handle needed no reconnect',
    `${h.fetches} queries, ${h.reconnects} reconnects — a design signal and an infrastructure one, kept apart`,
  );

  await h.close();
  process.exit(report('derived:fetch-check', r));
}

/**
 * Guarded, so that importing this file does not run it. These self-tests sit
 * inside the directories the answer path is scanned in, and an unguarded one is
 * importable by the very code it checks.
 */
if (require.main === module) {
  main().catch((e: unknown) => {
    console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  });
}
