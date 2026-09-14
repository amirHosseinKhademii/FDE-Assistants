/**
 * A piece of evidence, quoted, with the source it came from.
 *
 * The quote is the point: a finding without one is a rumour, and the reference
 * line exists so a reader can check it against the original record. That line is
 * allowed to wrap and break anywhere — a composite key must never be truncated
 * into something that looks like a different key.
 */
export function Quote({ source, text }: { source: string; text?: string }) {
  return (
    <figure className="mt-2 overflow-hidden rounded-md border border-ui-line bg-ui-bg/60">
      {text && (
        <blockquote className="border-l-2 border-ui-line-lit px-4 py-2.5 text-[0.9375rem] leading-relaxed text-ui-fg/90">
          {text}
        </blockquote>
      )}
      <figcaption className="border-t border-ui-line bg-ui-raised/40 px-4 py-1.5 font-mono text-[0.6875rem] break-all text-ui-faint">
        {source}
      </figcaption>
    </figure>
  );
}
