/** A typed reference — identifiers, sources, figures. */
export function Mono({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={`font-mono text-[0.9em] tracking-tight ${className}`}>{children}</span>;
}
