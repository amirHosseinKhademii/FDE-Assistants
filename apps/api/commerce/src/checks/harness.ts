/**
 * The three lines every check in this package repeats.
 *
 * A CHECK THAT COULD NOT RUN MUST FAIL, NOT PASS — this repo learned that one
 * the hard way (commit 7b450fc, "Fail when a check could not run, instead of
 * passing"). `cannotRun` exists so "the estate is not up" exits non-zero with a
 * sentence, rather than printing a cheerful summary of zero assertions.
 *
 * EVERY LINE IS WRITTEN WITH `writeSync`, AND THAT IS A BUG FIX RATHER THAN A
 * STYLE. `console.log` to a PIPE is asynchronous, and `process.exit()` does not
 * wait for it to drain — so a check that logged its failure and then exited
 * printed the title, nothing else, and a bare exit code. That is exactly
 * backwards for a file whose entire job is to explain why something failed, and
 * it cost a debugging session here: an api-check that could not boot reported
 * silence. Synchronous writes to fd 1 and 2 cannot be lost.
 */
import { writeSync } from 'node:fs';

function out(line: string): void {
  writeSync(1, `${line}\n`);
}

function err(line: string): void {
  writeSync(2, `${line}\n`);
}

/**
 * A DECLARED FUNCTION AND NOT A METHOD, for a TypeScript reason worth writing
 * down: control-flow analysis narrows on a `never`-returning function
 * declaration, but NOT on a method reached through an object. As a method, every
 * call site below it still had to satisfy the compiler that the value it had
 * just bailed on might be null — which produced the temptation to write `!`, and
 * a `!` is how a check that could not run starts passing again.
 */
export function cannotRun(title: string, reason: string): never {
  err(`\n${title}: CANNOT RUN — ${reason}\n`);
  err(
    'This exits non-zero on purpose. A check that quietly skips when its ' +
      'dependencies are missing is a check that is green on the day it mattered.\n',
  );
  process.exit(2);
}

export class Checks {
  private failed = 0;
  private passed = 0;

  constructor(private readonly title: string) {
    out(`\n${title}\n`);
  }

  section(name: string): void {
    out(`\n${name}`);
  }

  assert(name: string, ok: boolean, why: string): void {
    if (ok) this.passed++;
    else this.failed++;
    out(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}`);
    out(`        why: ${why}`);
  }

  /**
   * A negative control: a deliberately broken variant that the same assertions
   * must REJECT. A check that has only ever passed is indistinguishable from one
   * that cannot fail.
   */
  control(name: string, brokenVariantWasCaught: boolean, why: string): void {
    this.assert(`NEGATIVE CONTROL — ${name}`, brokenVariantWasCaught, why);
  }

  done(): never {
    const ok = this.failed === 0;
    out(
      ok
        ? `\n${this.title}: PASS — ${this.passed} assertions, every negative control caught its plant\n`
        : `\n${this.title}: FAIL — ${this.failed} of ${this.passed + this.failed} assertions\n`,
    );
    process.exit(ok ? 0 : 1);
  }
}
