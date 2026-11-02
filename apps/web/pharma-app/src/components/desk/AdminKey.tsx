import { useState } from 'react';
import { Field, KeyIcon } from '@fde/uikit';

/**
 * The admin key, collapsed by default. Visitors to the public demo never need
 * it: they are allowed, and metered. The field opens when the server refused a
 * key that was typed, or when a key is already stored in this browser.
 */
export function AdminKey(p: { value: string; onChange: (v: string) => void; open: boolean }) {
  const [shown, setShown] = useState(false);
  const expanded = p.open || shown || Boolean(p.value);

  return (
    <div className="max-w-sm space-y-2">
      {expanded ? (
        <Field label="Admin key (optional)" hint="team only" icon={<KeyIcon />}>
          <input
            type="password"
            value={p.value}
            onChange={(e) => p.onChange(e.target.value)}
            className="ui-control ui-control--icon font-mono text-sm"
          />
        </Field>
      ) : (
        <button
          type="button"
          onClick={() => setShown(true)}
          className="text-xs text-ui-dim underline underline-offset-4 hover:text-ui-fg"
        >
          Admin key (optional)
        </button>
      )}
      <p className="text-xs text-ui-dim">Public demo, limited to a few questions per hour.</p>
    </div>
  );
}
