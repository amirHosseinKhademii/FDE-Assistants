/**
 * WHERE RECORDS COME FROM — the second seam, and NOT the same one as documents.
 *
 * `document-source.ts` moved documents out of a folder and into a document
 * store, because that is where a customer keeps them. Records are a different
 * system and must stay one:
 *
 *   DOCUMENTS   a document management system — FileNet, SharePoint, a CMS.
 *               SEARCHED BY MEANING. No single lookup key.
 *   RECORDS     a system of record — a policy admin system, a CRM, an ERP, a
 *               mainframe, a SQL database. FETCHED BY EXACT KEY. One right
 *               answer per question.
 *
 * THE TEMPTATION THIS EXISTS TO RESIST: now that there is a `documents` table
 * sitting right there, putting records in it would be one afternoon's work and
 * would quietly undo the thing the whole design rests on. A customer's
 * deductible is $1,000 — full stop, not "the five most customer-shaped chunks".
 * A record fetched from a vector-searched table is a search waiting to happen,
 * and a search returns what is similar, not what is true.
 *
 * So: same SHAPE as the document seam — one interface, a file implementation
 * here, an API implementation at a customer — pointed somewhere else entirely.
 *
 *   fileRecordSource()      the committed fixture, in git
 *   <customer>RecordSource  their system of record — one new implementation
 *
 */
import { readFile, readdir } from 'node:fs/promises';
import { basename } from 'node:path';
import { join } from 'node:path';

export interface EntityRecord {
  id: string;
  /** The record verbatim. Handed to the model whole — never summarised. */
  content: string;
}

export interface RecordSource {
  readonly name: string;
  /** Every id this source can serve. Drives the informative-miss message. */
  ids(): Promise<string[]>;
  /** One record by exact id, or null. NEVER a fuzzy match. */
  get(id: string): Promise<EntityRecord | null>;
}

/**
 * The committed records as a source.
 *
 * `ids()` is a directory listing here. At a customer it is whatever their
 * system offers — and if it offers nothing, the informative-miss message
 * degrades to "no such record" rather than listing what exists. That is a
 * deliberate trade: the list is a convenience for a small demo corpus, and no
 * real system of record will enumerate its whole book for a support bot.
 */
export function fileRecordSource(dir: string): RecordSource {
  return {
    name: `files:${dir}`,
    async ids(): Promise<string[]> {
      const files = await readdir(dir);
      return files
        .filter((f) => f.endsWith('.md'))
        .map((f) => basename(f, '.md'))
        .sort();
    },
    async get(id: string): Promise<EntityRecord | null> {
      try {
        return { id, content: await readFile(join(dir, `${id}.md`), 'utf8') };
      } catch (e: any) {
        if (e?.code === 'ENOENT') return null;
        throw e;
      }
    },
  };
}
