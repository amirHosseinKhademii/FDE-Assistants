import { TONES, type Tone } from '../tokens/tone';

/**
 * A bordered section whose colour states severity, with a heading that carries
 * an icon and a count.
 *
 * The count is in the heading on purpose: "3" beside a title is read before any
 * of the three items are, and a section that might be empty should say how full
 * it is before the reader starts scanning.
 */
export function Panel({
  icon,
  title,
  count,
  tone,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  count?: number;
  tone: Tone;
  children: React.ReactNode;
}) {
  const t = TONES[tone];
  return (
    <section className={`overflow-hidden rounded-lg border ${t.border} ${t.wash}`}>
      <h2 className={`flex items-center gap-2.5 border-b px-5 py-3 font-medium ${t.rail} ${t.text}`}>
        {icon}
        {title}
        {count !== undefined && (
          <span className="ml-auto font-mono text-xs opacity-70">{count}</span>
        )}
      </h2>
      {children}
    </section>
  );
}
