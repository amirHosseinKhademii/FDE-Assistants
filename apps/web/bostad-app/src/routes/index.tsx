/**
 * `/` — look up one Gothenburg address and see its property profile as cards.
 * Calls `/api/profile`; each section shows its own status, so one failing
 * source never hides the others.
 */
import { createFileRoute } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { Failure, Field, SubmitButton } from '@fde/uikit';
import type { Profile } from '@bostad/property';
import { SectionCard } from '../components/SectionCard';
import { ADDRESS_MAX_LENGTH } from '../lib/address';

const SECTIONS: Array<{ key: keyof Pick<Profile, 'location' | 'landslide' | 'transit' | 'brf' | 'energy'>; title: string }> = [
  { key: 'location', title: 'Location' },
  { key: 'landslide', title: 'Landslide risk' },
  { key: 'transit', title: 'Public transport' },
  { key: 'brf', title: 'BRF finances' },
  { key: 'energy', title: 'Energy rating' },
];

export const Route = createFileRoute('/')({
  head: () => ({ meta: [{ title: 'Bostad — property profile (Göteborg)' }] }),
  component: Lookup,
});

function Lookup() {
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = address.trim();
    if (!trimmed) {
      setError('Type an address first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/profile?address=${encodeURIComponent(trimmed)}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProfile(null);
        setError(typeof body.error === 'string' ? body.error : `Request failed (${res.status}).`);
        return;
      }
      setProfile(body as Profile);
    } catch {
      setProfile(null);
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-4 py-10">
      <header className="grid gap-2">
        <h1 className="text-2xl font-semibold">Bostad — property profile (Göteborg)</h1>
        <p className="text-ui-dim">
          Enter a Gothenburg address. Each section comes from a free public source and reports its own status.
        </p>
      </header>

      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
        <Field label="Address">
          <input
            className="ui-control w-full"
            name="address"
            type="text"
            autoComplete="off"
            placeholder="Djurgårdsgatan 23 A, Göteborg"
            maxLength={ADDRESS_MAX_LENGTH}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </Field>
        <SubmitButton busy={busy} disabled={busy} busyLabel="Looking up…">
          Look up
        </SubmitButton>
      </form>

      {error && <Failure title="Lookup failed" message={error} />}

      {profile && (
        <section className="grid gap-4" aria-label="Property profile">
          {SECTIONS.map(({ key, title }) => (
            <SectionCard key={key} id={key} title={title} section={profile[key]} />
          ))}
        </section>
      )}
    </main>
  );
}
