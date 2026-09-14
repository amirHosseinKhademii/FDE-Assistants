/**
 * Severity, as class names.
 *
 * WHY A TABLE AND NOT A COLOUR PROP. A caller that passes `"red"` is deciding
 * what red means; a caller that passes `"danger"` is stating severity and
 * letting the theme decide how severity looks. Re-point the `--ui-*` tokens and
 * every one of these follows.
 *
 * `ok` exists for "a tool returned something". Think hard before using it to
 * mean "this is fine" — in a product that must never issue a clearance, a
 * reassuring green is a claim the data may not support.
 */
export const TONES = {
  danger: {
    text: 'text-ui-danger',
    border: 'border-ui-danger/40',
    wash: 'bg-ui-danger/5',
    rail: 'border-ui-danger/30',
    dot: 'bg-ui-danger',
  },
  warn: {
    text: 'text-ui-warn',
    border: 'border-ui-warn/40',
    wash: 'bg-ui-warn/5',
    rail: 'border-ui-warn/30',
    dot: 'bg-ui-warn',
  },
  info: {
    text: 'text-ui-info',
    border: 'border-ui-info/40',
    wash: 'bg-ui-info/5',
    rail: 'border-ui-info/30',
    dot: 'bg-ui-info',
  },
  ok: {
    text: 'text-ui-ok',
    border: 'border-ui-ok/40',
    wash: 'bg-ui-ok/5',
    rail: 'border-ui-ok/30',
    dot: 'bg-ui-ok',
  },
  neutral: {
    text: 'text-ui-dim',
    border: 'border-ui-line',
    wash: 'bg-ui-raised/30',
    rail: 'border-ui-line',
    dot: 'bg-ui-dim',
  },
} as const;

export type Tone = keyof typeof TONES;
