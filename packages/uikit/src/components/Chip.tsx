import { TONES, type Tone } from '../tokens/tone';

/** A small label carrying severity. */
export function Chip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const t = TONES[tone];
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 font-mono text-xs ${t.border} ${t.wash} ${t.text}`}
    >
      {children}
    </span>
  );
}
