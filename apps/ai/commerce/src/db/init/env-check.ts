/**
 *   pnpm commerce:env-check
 *
 * Is the environment fillable, and does it point at THIS engagement?
 *
 * WHY A URL POINTING SOMEWHERE ELSE IS THE FAILURE WORTH CATCHING. There are
 * five estates in this repo on four Neon projects, and the scripts next to this
 * one create and drop databases. A base URL that has drifted onto another
 * engagement's project is not a connection error — it connects perfectly, and
 * then `db:drop --yes` destroys somebody else's work. `assertOurs` cannot save
 * you there: it checks the NAME, and the name is still `thb_shop`.
 *
 * TWO CHECKS, BECAUSE EITHER ALONE PASSES THE OTHER'S FAILURE:
 *
 *   by NAME  PLAN.md §11's negative control is "point it at `vst_derived`" —
 *            a Vantis database NAME, on any host at all. A host-only check
 *            waves it straight through.
 *   by HOST  a URL that names `thb_shop` on the pharma endpoint would fail
 *            later anyway, but it would fail as "database thb_shop does not
 *            exist", which sends you hunting a missing database instead of a
 *            wrong host.
 *
 * AND BOTH NEGATIVE CONTROLS RUN EVERY TIME. A guard that has only ever been
 * handed good input is indistinguishable from one that returns `undefined`.
 * This repo has the scar: `leak:check` once reported PASS while a live
 * credential sat in the code it was scanning.
 */
import {
  DB_NAMES, FOREIGN_DATABASES, FOREIGN_URL_VARS, SYSTEMS,
  adminUrl, assertNotAnotherEngagement, assertOurs, redact, urlFor,
} from '../../config/connections';

interface Note { ok: boolean; label: string; detail: string }
const notes: Note[] = [];
const note = (ok: boolean, label: string, detail: string): void => { notes.push({ ok, label, detail }); };

/** Did `assertNotAnotherEngagement` refuse this URL? */
function refuses(url: string): string | null {
  try {
    assertNotAnotherEngagement(url);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

function checkBaseUrlIsSet(): void {
  try {
    const url = urlFor('thb_shop');
    note(true, 'ECOMMERCE_DB_URL is set', redact(url));
  } catch (e) {
    note(false, 'ECOMMERCE_DB_URL is set', e instanceof Error ? e.message : String(e));
  }
}

function checkAdminUrlIsDirect(): void {
  try {
    const admin = adminUrl();
    const pooled = new URL(urlFor('thb_shop')).host;
    const isDirect = !new URL(admin).host.includes('-pooler.');
    note(
      isDirect,
      'the admin URL is the NON-POOLED endpoint',
      isDirect
        ? `${new URL(admin).host} (app uses ${pooled})`
        : `${new URL(admin).host} still has -pooler — CREATE DATABASE will fail with a message about transaction blocks`,
    );
  } catch (e) {
    note(false, 'the admin URL is the NON-POOLED endpoint', e instanceof Error ? e.message : String(e));
  }
}

function checkOurUrlIsAccepted(): void {
  const why = refuses(urlFor('thb_shop'));
  note(!why, 'our own URL is accepted', why ?? 'not mistaken for another engagement');
}

/** NEGATIVE CONTROL — PLAN.md §11's, verbatim: point it at `vst_derived`. */
function controlForeignDatabaseName(): void {
  const url = new URL(urlFor('thb_shop'));
  url.pathname = '/vst_derived';
  const why = refuses(url.toString());
  note(
    !!why && why.includes('Vantis'),
    'CONTROL a foreign database NAME is refused',
    why ? why.split('.')[0] : 'ACCEPTED vst_derived — the name check is not running',
  );
}

/** NEGATIVE CONTROL — the same name on another engagement's endpoint. */
function controlForeignHost(): void {
  const other = FOREIGN_URL_VARS.map((v) => process.env[v]).find(Boolean);
  if (!other) {
    note(true, 'CONTROL a foreign HOST is refused', 'skipped — no other engagement URL is set in this environment');
    return;
  }
  const url = new URL(urlFor('thb_shop'));
  url.host = new URL(other).host;
  const why = refuses(url.toString());
  note(
    !!why && why.includes('same endpoint'),
    'CONTROL a foreign HOST is refused',
    why ? why.split('.')[0] : `ACCEPTED ${url.host} — the host check is not running`,
  );
}

function checkEveryDatabaseIsNamed(): void {
  const named = SYSTEMS.map((s) => s.db);
  const same = named.length === DB_NAMES.length && named.every((d) => DB_NAMES.includes(d));
  note(same, 'the five systems and the guard list agree', named.join(', '));
}

function checkForeignListIsPopulated(): void {
  const n = Object.keys(FOREIGN_DATABASES).length;
  note(n > 0, 'the foreign-database list is populated', `${n} names across the other engagements`);
}

/**
 * `assertOurs` IS THE GUARD ON THE ONLY IRREVERSIBLE PATH, and until this was
 * written nothing called it.
 *
 * `dropDatabases` is handed this function and checks EVERY name through it
 * before dropping ANY. It is what stands between an edited `SYSTEMS` constant
 * and another engagement's data, and DROP DATABASE has no undo — so it is worth
 * two lines to know it still refuses.
 */
function controlAssertOursRefusesAForeignName(): void {
  let accepted = true;
  try {
    assertOurs('thb_shop');
  } catch {
    accepted = false;
  }
  note(accepted, 'assertOurs accepts one of ours', 'thb_shop');

  let why = '';
  try {
    assertOurs('vst_derived');
  } catch (e) {
    why = e instanceof Error ? e.message : String(e);
  }
  note(
    why.includes('Vantis'),
    'CONTROL assertOurs refuses a foreign name',
    why ? why.split('.')[0] : 'ACCEPTED vst_derived — the drop guard is not running',
  );
}

function main(): void {
  console.log('\nThornbury environment check\n');

  checkBaseUrlIsSet();
  checkAdminUrlIsDirect();
  checkOurUrlIsAccepted();
  checkEveryDatabaseIsNamed();
  checkForeignListIsPopulated();
  controlForeignDatabaseName();
  controlForeignHost();
  controlAssertOursRefusesAForeignName();

  for (const n of notes) {
    console.log(`  ${n.ok ? 'ok   ' : '\x1b[31mFAIL \x1b[0m'} ${n.label.padEnd(44)} ${n.detail}`);
  }

  const failed = notes.filter((n) => !n.ok).length;
  console.log(failed ? `\nenv-check: ${failed} failed\n` : `\nenv-check: ${notes.length} checks passed\n`);
  process.exit(failed ? 1 : 0);
}

main();
