/**
 * `pnpm --filter @veresk/learn path:check` — the path covers every lesson and
 * every wrap step exactly once. Fails by throwing, so the exit code is non-zero.
 */
import { LESSONS } from './lessons';
import { pathCoverageErrors, pathOrder, PATH } from './path';

const errors = pathCoverageErrors();
if (errors.length > 0) {
  throw new Error(`path coverage failed:\n  ${errors.join('\n  ')}`);
}

const stops = pathOrder();
const lessons = stops.filter((s) => s.kind === 'lesson').length;
const builds = stops.filter((s) => s.kind === 'build').length;
const gaps = stops.filter((s) => s.kind === 'gap').length;
console.log(
  `path ok: ${lessons}/${LESSONS.length} lessons exactly once, ${builds} builds, ${gaps} planned, ${PATH.length} phases`,
);
