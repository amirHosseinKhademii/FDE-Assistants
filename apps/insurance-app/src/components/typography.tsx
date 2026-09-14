/** A typed document reference — form ids, citation sources, run figures. */
export function Mono({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`font-mono ${className}`}>{children}</span>;
}

/**
 * A clause, quoted, with the document it came from.
 *
 * The quote is the point: an answer without one is a rumour, and the citation
 * format exists so a person can check it against the original.
 */
export function Quote({ source, text }: { source: string; text?: string }) {
  return (
    <figure className="mt-1.5 border-l border-rule bg-white/60 px-4 py-2.5">
      {text && <blockquote className="leading-relaxed">{text}</blockquote>}
      <figcaption className="mt-1.5 font-mono text-xs break-all text-navy">{source}</figcaption>
    </figure>
  );
}
