/**
 * DOMAIN: every noun that is about insurance rather than about retrieval.
 *
 * WHY THIS FILE EXISTS. The architecture claims a new customer means editing a
 * handful of files, not reading all of `src/`. That claim was only true if you
 * already knew which files. These are the values that were scattered across
 * five of them — a corpus path here, a table name there, an id regex in a tool —
 * each individually obvious and collectively impossible to find.
 *
 * Everything here is a NOUN. Nothing here is a rule. The rules that encode what
 * a policy document is — the chunker's table handling, the exact-match filter,
 * the ordered procedure in the prompt — stay in their own files, marked
 * `DOMAIN:`. Run `grep -rn "DOMAIN:" src/` for the full seam list.
 */
import { resolve } from 'node:path';

import { DOCS_ROOT } from './paths';

export const DOMAIN = {
  /** Documents that get SEARCHED. Dense text, no single lookup key. */
  corpusDir: process.env.CORPUS_DIR ?? resolve(DOCS_ROOT, 'examples/policies'),

  /** Records that get LOOKED UP by exact id, and are deliberately NOT indexed. */
  recordsDir: process.env.RECORDS_DIR ?? resolve(DOCS_ROOT, 'examples/policyholders'),

  /** The pgvector table holding the corpus chunks. */
  vectorTable: 'policy_chunks',

  /**
   * The id a caller uses to fetch one record. Anchored on purpose: a loose
   * pattern lets a malformed id through to the filesystem.
   */
  recordIdPattern: /^AUT-\d{4}$/,

  /**
   * The same id, found INSIDE a sentence. A SEPARATE pattern on purpose.
   *
   * `recordIdPattern` is anchored because it gates a filesystem lookup, and a
   * loose pattern there lets a malformed id through to the disk. Unanchoring it
   * to serve extraction would be exactly the widening `form-id.ts` warns about:
   * one regex doing two jobs, made lenient for the harmless one, and dangerous
   * in the other.
   */
  recordIdInText: /\bAUT-\d{4}\b/g,

  /**
   * The identifier a policy form carries in its heading: `PP 00 01 06 24`.
   *
   *   PP     line prefix — personal auto
   *   00 01  form number, as two pairs
   *   06 24  edition, MM YY
   *
   * SEPARATORS ARE OPTIONAL because real corpora are inconsistent about them.
   * The same form appears in the wild as `PP 00 01 09 18`, `PP13 68 01 20`
   * (missing space, in a regulator's own order), `pp-00-01-09-18` and
   * `PP0001 0694`. Tolerating the spelling is not the same as tolerating a
   * loose match — `formIdOf` normalises whatever it finds to the canonical
   * spaced form, and `matchesForm` then compares it EXACTLY.
   *
   * WHY EXACT STILL MATTERS, and it matters more than it used to. The previous
   * scheme's hazard was five state variants sharing a prefix. This scheme's is
   * worse: `PP 00 01 01 15`, `PP 00 01 09 18` and `PP 00 01 06 24` are the same
   * form three editions apart, paying $30, $35 and $40 a day. A prefix match on
   * `PP 00 01` merges all three and the wrong number comes back with a citation
   * attached. See form-id.ts.
   *
   * Guidance documents — bulletins, circulars, determinations — deliberately do
   * NOT match. They are not forms and have no form id.
   */
  documentIdPattern: /\b(PP[\s-]*\d{2}[\s-]*\d{2}[\s-]*\d{2}[\s-]*\d{2})\b/i,

  /** What to call things in messages the model reads. */
  labels: {
    record: 'policyholder record',
    recordId: 'policy id',
    document: 'policy form',
    documentId: 'form id',
  },
} as const;
