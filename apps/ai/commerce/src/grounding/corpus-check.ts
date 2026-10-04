/**
 * `pnpm commerce:corpus-check` — is the index built from exactly this corpus,
 * and is the corpus exactly what it claims to be?
 *
 * CORPUS.md §7 asked for three things: the document count, the chunk count, and
 * **that no file in `corpus/` is a meta-document**. The last is the check that
 * would have caught pharma's 75→80 (docs/README.md, "never put a document inside
 * a corpus directory"): `@fde/grounding`'s loader ingests EVERY `.md` it finds,
 * so a README about the corpus becomes a retrievable "policy" the model can cite.
 *
 * Two more, because the carrier contracts were renamed on 2026-09-27: the index
 * must hold no chunk from a document that is no longer on disk (a stale
 * Northgate passage would still be citable), and the documents table must
 * fingerprint the same as the folder.
 *
 * This is a BUILD-side check: it reads the documents table as the admin role,
 * and the chunk table as the reader (the view the MCP server has).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from 'dotenv';
import { Client } from 'pg';
import { chunkAll, compareDocumentSources, dbDocumentSource, fileDocumentSource, loadDirectory } from '@fde/grounding';
import { REPO_ROOT, urlFor } from '../config/connections';
import { COMMERCE_DOCUMENTS } from '../config/commerce-documents';
import { CORPUS_DIR } from './kb-cli';
import { KB_DB, KB_TABLE } from './kb';

config({ path: join(REPO_ROOT, '.env'), quiet: true });

/** CORPUS.md §2's table. A count is a measurement (§5) — change it only with that table. */
const EXPECTED_DOCUMENTS = 12;

let failed = 0;
function check(name: string, ok: boolean, why: string): void {
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}\n        why: ${why}`);
}

async function main(): Promise<void> {
  console.log(`\ncommerce:corpus-check — ${CORPUS_DIR.replace(REPO_ROOT + '/', '')}\n`);

  const files = readdirSync(CORPUS_DIR).filter((f) => f.endsWith('.md'));
  check(
    `the folder holds ${EXPECTED_DOCUMENTS} documents`,
    files.length === EXPECTED_DOCUMENTS,
    `${files.length} .md file(s). Every one of them is ingested — the loader has no exclusion list`,
  );

  // A corpus document opens `# <id> — <title>`, then a `> Revision Id: …` banner,
  // then the FABRICATED line (CORPUS.md §6). A meta-document does not.
  //
  // ▲ The first version flagged two REAL documents: `note-elec-2022-retired.md`
  // matched a `notes?` filename pattern (NOTE- is a document type here), and
  // REF-LAW-UK-2024 opens `*FABRICATED —`, not `*FABRICATED.`. The check was
  // wrong, not the corpus — so the filename test names only the meta-document
  // names, and the marker test takes the word, not its punctuation.
  const meta = files.filter((f) => {
    const lines = readFileSync(join(CORPUS_DIR, f), 'utf8').split('\n');
    return (
      /^(readme|corpus|index|changelog)\.md$/i.test(f) ||
      !/^# \S/.test(lines[0] ?? '') ||
      !lines.slice(0, 5).some((l) => /^> Revision Id: /.test(l)) ||
      !lines.slice(0, 10).some((l) => /^\*FABRICATED\b/.test(l))
    );
  });
  check(
    'no file in the corpus folder is a meta-document',
    meta.length === 0,
    meta.length ? `NOT CORPUS: ${meta.join(', ')} — it would be ingested and cited as policy` : 'every file carries the corpus header, banner and FABRICATED line',
  );

  const onDisk = chunkAll(await loadDirectory(CORPUS_DIR));
  const revisions = new Set(
    files.map((f) => /^> Revision Id: ([^·]+?)\s*·/m.exec(readFileSync(join(CORPUS_DIR, f), 'utf8'))?.[1] ?? f),
  );

  const reader = process.env.COMMERCE_KB_URL;
  if (!reader) {
    console.error('\ncorpus-check cannot run the index checks: COMMERCE_KB_URL is not set — run `pnpm commerce:kb-provision`.\n');
    process.exit(2);
  }
  const c = new Client({ connectionString: reader });
  await c.connect();
  const indexed = Number((await c.query(`select count(*) as n from ${KB_TABLE}`)).rows[0].n);
  check(
    'the index holds exactly the chunks the folder produces',
    indexed === onDisk.length,
    `folder → ${onDisk.length} chunks, ${KB_TABLE} → ${indexed}. A difference means the index was built from something else — re-ingest`,
  );
  const inIndex = (
    await c.query(`select distinct coalesce(metadata->>'revisionId', metadata->>'docRef') as r from ${KB_TABLE}`)
  ).rows.map((r) => String(r.r));
  const stale = inIndex.filter((r) => !revisions.has(r));
  check(
    'every indexed chunk belongs to a document still on disk',
    stale.length === 0,
    stale.length ? `STALE, still citable: ${stale.join(', ')}` : `${inIndex.length} revision(s) indexed, all present`,
  );
  await c.end();

  const kbAdmin = urlFor(KB_DB);
  const comparison = compareDocumentSources([
    { label: 'folder', docs: await fileDocumentSource(CORPUS_DIR, COMMERCE_DOCUMENTS).list() },
    { label: 'thb_kb documents', docs: await dbDocumentSource({ connectionString: kbAdmin }).list() },
  ]);
  check(
    'the documents table fingerprints the same as the folder',
    comparison.agree && comparison.controlPassed,
    comparison.results.map((r) => `${r.label}=${r.fingerprint.sha}`).join(' · ') +
      (comparison.controlPassed ? '' : ' — and the reorder control did not move, so this check is blind'),
  );

  console.log('\nTHE HARNESS ITSELF');
  const before = failed;
  check('(negative control) a false assertion is reported as FAIL', false, 'expected to fail');
  const caught = failed === before + 1;
  failed = before;
  check('the harness counts a failure when one happens', caught, 'a check that has only ever passed proves nothing');

  console.log(`\n${failed === 0 ? 'all checks passed' : `${failed} FAILED`}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('\ncorpus-check crashed:', (e as Error).message);
  process.exit(1);
});
