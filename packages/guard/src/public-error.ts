/**
 * What an exception is allowed to tell the caller. Pillar 6, same file family
 * as the key check for the same reason: both are decisions about what crosses
 * the boundary.
 *
 * THE FAILURE THIS PREVENTS. The obvious catch block is:
 *
 *     catch (e: any) { return json({ error: e?.message ?? String(e) }, 503) }
 *
 * which is fine until the throw comes from the database driver. Then the
 * caller is handed
 *
 *     getaddrinfo ENOTFOUND ep-shy-tree-xxxxxxx-pooler.c-2.eu-central-1.aws.neon.tech
 *
 * and now they know the project id, the pooler, the region and the provider —
 * none of which they asked for and none of which they need. The same block
 * cheerfully forwards absolute build paths, internal hostnames, and the
 * user/host halves of a connection string in an auth error.
 *
 * SO: the exception goes to the LOG, and the caller gets a reference to it.
 * Nothing is lost — `az containerapp logs show` still has the full text, and
 * the ref is what joins the two. That trade is deliberate: an operator reading
 * a screenshot loses one hop, and a caller gains nothing they can use.
 *
 * WHY NOT REDACT AND FORWARD. Scrubbing hostnames and paths out of the message
 * is a denylist, and a denylist over "every string a dependency might throw" is
 * a guess that holds until some driver phrases its error differently. The
 * boundary is easier to defend when nothing crosses it by default.
 *
 * This file is transport-agnostic, like `guard.ts`: no Request, no Response.
 */
import { randomBytes } from 'node:crypto';

export interface PublicError {
  /** Safe to render, safe to put in a screenshot. Never the exception text. */
  error: string;
  /** Short, unique, and printed next to the real error in the server log. */
  ref: string;
}

/** The sink for the real text. Swapped in the self-test; stderr everywhere else. */
export type ErrorSink = (line: string, cause: unknown) => void;

const defaultSink: ErrorSink = (line, cause) => console.error(line, cause);

export interface PublicErrorOptions {
  /**
   * Prefixes the log line so a ref can be traced to a route without grep
   * archaeology — e.g. `'POST /api/assess'`.
   */
  context?: string;
  /** Overrides the message handed to the caller. Must not embed `cause`. */
  message?: string;
  /** Test seam. */
  sink?: ErrorSink;
}

/**
 * Log the real failure, return something safe to send.
 *
 * The returned `error` is a fixed string. It is fixed rather than derived
 * BECAUSE it is derived-from-exception that leaks — there is no version of
 * "just the useful part of `e.message`" that a caller can be trusted with,
 * since the code here cannot know which part that is.
 */
export function publicError(cause: unknown, opts: PublicErrorOptions = {}): PublicError {
  const ref = randomBytes(4).toString('hex');
  const where = opts.context ? `${opts.context} ` : '';
  (opts.sink ?? defaultSink)(`[${ref}] ${where}failed:`, cause);

  return {
    ref,
    error:
      opts.message ??
      `The request could not be completed. Quote reference ${ref} to whoever ` +
        `runs this service — the full error is in the server log under it.`,
  };
}
