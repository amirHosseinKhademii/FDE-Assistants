/**
 * THE CONTRACT BETWEEN GENERIC GROUNDING AND A SPECIFIC DOMAIN.
 *
 * Everything in `grounding/` is machinery: read documents, chunk them, embed
 * them, store them, search them. None of it should know what an insurance
 * policy is — and before this file existed, most of it did. `DocType` was a
 * union of ten insurance nouns, the document table had a `jurisdiction` column,
 * and `classify()` knew that a heading starting "SCHEDULE OF EXCLUSIONS" meant
 * something. A second customer would have had to edit all of it.
 *
 * So the domain is now a VALUE the machinery is handed, not types it is
 * compiled against.
 *
 *   grounding/*          generic. Knows about documents, types, statuses,
 *                        relations and facets — never what any of them mean.
 *   config/<domain>.ts   one object per customer. This is the 10%.
 *
 * WHAT IS DELIBERATELY STILL GENERIC, because it is true of every corpus worth
 * grounding on:
 *
 *   - a document has an identity, a type, and a lifecycle status
 *   - some statuses mean "retired; do not rely on this"
 *   - documents act on each other, and the VERB matters (superseding is not
 *     the same as supplementing)
 *   - precedence metadata is nullable, and a missing value is never a
 *     permissive one
 *
 * Those are not insurance facts. They are true of regulations, contracts,
 * clinical guidelines, standards and engineering specs alike.
 */

/** Parsed key/value metadata from a document's header, lower-cased keys. */
export type DocumentFields = Map<string, string>;

/**
 * One customer's document vocabulary and rules.
 *
 * Written as functions rather than data wherever classification is involved,
 * because "which type is this" is a judgment and judgments do not compress into
 * a lookup table. The repo's whole premise is that the judgment is the
 * deliverable; this is where it lives.
 */
export interface DocumentDomain {
  /** For logs and provenance. e.g. "insurance-personal-auto". */
  readonly name: string;

  /**
   * Header keys that may carry a document's own identifier, in priority order.
   * e.g. ['form id', 'bulletin id', 'circular id'].
   */
  readonly idFields: readonly string[];

  /**
   * Which kind of document this is. Returns a domain-defined string — the
   * machinery never interprets it, it only groups and filters by it.
   */
  classify(id: string, title: string, fields: DocumentFields): string;

  /**
   * Statuses meaning "retired, do not rely on this document".
   *
   * Generic code excludes these by default. `unknown` must NOT be in here: a
   * document whose status cannot be determined is not thereby dead, and
   * treating it as dead silently hides real content.
   */
  readonly retiredStatuses: readonly string[];

  /**
   * Header keys that declare a relation, mapped to the verb recorded.
   * e.g. { 'supersedes': 'supersedes', 'amends and supplements': 'amends' }.
   */
  readonly relationFields: Readonly<Record<string, string>>;

  /**
   * Domain metadata that is not part of the generic core — jurisdiction, a
   * parent form id, a policy number, whatever precedence turns on here.
   *
   * Returned as a flat object, stored in one `facets` jsonb column, and spread
   * into chunk metadata so search filters can use it. **This is what stops a
   * new customer needing a schema migration.**
   */
  facets(fields: DocumentFields, ctx: { id: string; title: string }): Record<string, unknown>;

  /**
   * Which facet keys, if absent, make a document's precedence incomplete.
   * Reported by `corpus:load`, never repaired. Optional.
   */
  readonly requiredFacets?: readonly string[];

  /** Types exempt from `requiredFacets` — a base document has no parent. */
  readonly rootTypes?: readonly string[];
}
