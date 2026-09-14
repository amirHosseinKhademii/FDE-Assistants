/**
 * INDEX A DOCUMENT CORPUS BY THE IDENTIFIER IN ITS HEADING — so a citation can
 * be checked against something real.
 *
 * A grounded system's most valuable check is "does this cited source name a
 * document that exists", and it is free: the corpus is right there. This builds
 * the index that makes it free.
 *
 * THE RULE THAT MAKES IT WORK, and the one that keeps being got wrong:
 * **lenient about formatting, strict about identity.** A model punctuates
 * citations however it likes — with a `#`, with an em dash, with the whole
 * heading trail appended, in the wrong case. Every one of those is a real
 * citation of a real document, and rejecting it reports honest work as
 * fabrication. That happened three separate times in one day on this corpus,
 * and each time it poisoned the metric being steered by.
 *
 * What must NOT be lenient is which document. Two ids that normalise
 * differently are two different documents, and merging them returns the wrong
 * content with a citation attached.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface IndexedDocument {
  file: string;
  /** What a citation names — the document's own identifier. */
  ref: string;
}

export interface CorpusIndex {
  /** The document a citation source names, or null. */
  resolve(source: string): IndexedDocument | null;
  /** Every indexed document. */
  all(): IndexedDocument[];
}

/**
 * The leading identifier of a markdown H1.
 *
 *   "# PP 00 01 06 24 — Personal Auto Policy"      -> "PP 00 01 06 24"
 *   "# BUL-2024-07 — Rental Reimbursement: …"      -> "BUL-2024-07"
 *
 * Requires the `<id> — <description>` shape. Falling back to the WHOLE heading
 * would let a descriptive title masquerade as an identifier, which is how a
 * fabricated citation starts resolving.
 */
export function refFromHeading(heading: string): string {
  const m = /^#\s*([A-Z][A-Z0-9]*(?:[\s.-][A-Z0-9]+)*)\s+[—-]/.exec(heading.trim());
  return m ? m[1].trim() : '';
}

/** The document part of a citation. Everything after it is free prose. */
export function bareName(raw: string): string {
  // Cut at the first separator of ANY kind. The model writes '#' when it
  // remembers and nothing at all when it does not — and with no '#', the whole
  // heading trail became the name and matched nothing.
  return raw.split(/#| — | – | > /)[0].trim().replace(/\.md$/i, '');
}

/** Separators and case carry no identity. */
const loose = (v: string): string => v.replace(/[\s_-]+/g, '').toUpperCase();

/**
 * Index every markdown document in a directory, read once.
 *
 * READS FILES, not a database, and that is deliberate: an eval suite must be
 * runnable offline and for free. Requiring a database to tell you whether a
 * citation names something real would make the cheapest check the most
 * expensive one.
 */
export function createCorpusIndex(dir: string): CorpusIndex {
  let index: IndexedDocument[] | null = null;

  const build = (): IndexedDocument[] => {
    if (index) return index;
    index = readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .map((file) => {
        const heading = readFileSync(resolve(dir, file), 'utf8').split('\n', 1)[0] ?? '';
        return { file, ref: refFromHeading(heading) };
      });
    return index;
  };

  return {
    all: build,
    resolve(source: string): IndexedDocument | null {
      const name = bareName(source);
      if (!name) return null;
      const want = loose(name);
      const docs = build();
      return (
        docs.find((d) => d.ref && loose(d.ref) === want) ??
        docs.find((d) => loose(d.file.replace(/\.md$/i, '')) === want) ??
        null
      );
    },
  };
}
