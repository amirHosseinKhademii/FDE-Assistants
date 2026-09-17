/**
 * Where the data comes from, what is done to it, and what leaves.
 *
 * ── THE SECTION THAT IS NEW ON THIS DEPLOYMENT ─────────────────────────────
 *
 * The other two data-flow pages answer a compliance reviewer's questions about
 * a corpus this repo invented. Both are accurate and neither has any teeth:
 * `docs/examples/` and Vantis' 922 documents cannot be leaked, because there is
 * nobody whose data they are.
 *
 * Here there is. Every narrative was typed by a member of the public about
 * their own vehicle, 939 of 956 carry a truncated VIN, and 39 name a family
 * member. So this page carries a section the others do not — what is in the
 * text, who it belongs to, and the fact that it is already public being a
 * reason to be careful rather than a reason not to be.
 *
 * ── AND ONE TURN OF THE WALK IS MARKED NOT BUILT ───────────────────────────
 *
 * Turn 3 is the request that would put those narratives in front of a model.
 * It does not exist yet. It is described because the decision about what it
 * sends is worth taking before it is written, and it is labelled because a page
 * that drew it like the other two would be claiming a capability nobody has.
 */
import { Mono } from '@fde/uikit';
import { Link } from '@tanstack/react-router';
import { Aurora, Journey } from '@veresk/surface';
import { AURORA } from '../lib/aurora';
import { COMPLAINT_FACTS, UNITS } from '../lib/estate.generated';
import { VERESK } from '../lib/links';
import { FLOW_TURNS } from './flow-turns';

export function DataFlow() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Aurora tones={AURORA} muted />

      <nav className="relative z-10 mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-3 px-5 py-5 sm:px-6 sm:py-6">
        <Link to="/" className="font-medium tracking-tight">
          Calder Safety
        </Link>
        <Link to="/desk" className="text-sm text-ui-dim transition-colors hover:text-ui-fg sm:ml-auto">
          Ask it
        </Link>
        <span className="text-sm text-ui-faint">Where the data goes</span>
        <Link to="/steps" className="text-sm text-ui-dim transition-colors hover:text-ui-fg">
          How it would work
        </Link>
        {VERESK ? (
          <a href={VERESK} className="text-sm text-ui-dim transition-colors hover:text-ui-fg">
            Veresk
          </a>
        ) : (
          <span className="text-sm text-ui-faint">Veresk</span>
        )}
      </nav>

      <main className="relative z-10 mx-auto max-w-5xl px-5 pb-24 sm:px-6">
        <Head />
        <Walk />
        <Whose />
        <Kept />
      </main>

      <footer className="relative z-10 mx-auto max-w-5xl border-t border-ui-line px-5 py-10 text-sm text-ui-faint sm:px-6">
        Calder Safety is a fictional customer. The filings are not.
      </footer>
    </div>
  );
}

function Head() {
  return (
    <section className="pt-8 pb-12 md:pt-12">
      <h1 className="lift-in title-spectrum max-w-3xl font-mono text-[1.6rem] leading-[1.1] font-semibold tracking-tighter sm:text-[2.25rem]">
        Where the data goes
      </h1>
      <p
        className="lift-in mt-5 max-w-[60ch] leading-relaxed text-ui-dim"
        style={{ animationDelay: '90ms' }}
      >
        Three turns. Two of them run offline and nothing leaves the machine; the
        third does not exist yet and is the one worth arguing about before it is
        written.
      </p>
    </section>
  );
}

function Walk() {
  return (
    <section className="lift-in pb-16" style={{ animationDelay: '140ms' }}>
      <Journey turns={FLOW_TURNS} />
    </section>
  );
}

/**
 * Whose data this is.
 *
 * EVERY FIGURE IS READ OUT OF `estate.generated.ts`, which `pnpm safety:estate`
 * writes by counting the files themselves. The one exception is named in the
 * copy as the one exception: "39 narratives name a family member" was counted
 * by hand on ONE vehicle and has not been counted across the slice. It is
 * printed as a one-vehicle figure rather than scaled, because a rate inferred
 * from 956 records and quoted over 70,194 is an estimate wearing a measurement's
 * clothes.
 */
function Whose() {
  const vinPct = 99;

  return (
    <section
      className="lift-in border-t border-ui-line pt-12 pb-16"
      style={{ animationDelay: '180ms' }}
    >
      <h2 className="font-mono text-lg leading-snug font-medium tracking-tight text-ui-fg md:text-xl">
        This is the first corpus here that is somebody's
      </h2>

      <p className="mt-4 max-w-[64ch] leading-relaxed text-ui-dim">
        The three engagements before this one run on documents written by us to
        contain the traps we wanted to teach. Their residency sections are
        accurate and cost nothing, because there is no person on the other end of
        a fabricated claim file.
      </p>

      <dl className="mt-8 grid gap-6 sm:grid-cols-3">
        <div>
          <dt className="font-mono text-[0.6875rem] tracking-[0.08em] text-ui-faint uppercase">
            carry a partial VIN
          </dt>
          <dd className="mt-1.5 font-mono text-2xl text-ui-fg">{vinPct}%</dd>
          <dd className="mt-1 text-[0.8125rem] leading-relaxed text-ui-dim">
            of {UNITS.complaints.toLocaleString('en-GB')} complaints. NHTSA
            truncates it to <Mono>11</Mono> of 17 characters before publishing —
            enough for a model and a plant, not for a vehicle. That truncation is
            their de-identification and we must not undo it, including by joining
            it to anything.
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[0.6875rem] tracking-[0.08em] text-ui-faint uppercase">
            report a death
          </dt>
          <dd className="mt-1.5 font-mono text-2xl text-ui-fg">{COMPLAINT_FACTS.deaths}</dd>
          <dd className="mt-1 text-[0.8125rem] leading-relaxed text-ui-dim">
            filings, accounting for {COMPLAINT_FACTS.fatalities} people; another{' '}
            {COMPLAINT_FACTS.injured.toLocaleString('en-GB')} report an injury.
            Written by whoever it happened to, in their words.
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[0.6875rem] tracking-[0.08em] text-ui-faint uppercase">
            already public
          </dt>
          <dd className="mt-1.5 font-mono text-2xl text-ui-fg">all of it</dd>
          <dd className="mt-1 text-[0.8125rem] leading-relaxed text-ui-dim">
            Published by a federal agency, free to anyone. A reason to be careful
            about what we do with it, not a reason to stop being careful.
          </dd>
        </div>
      </dl>

      <p className="mt-8 max-w-[64ch] leading-relaxed text-ui-dim">
        The narratives also name family members, towns and dealerships —{' '}
        <Mono>“My daughter will be driving…”</Mono> — written by somebody
        explaining why a fault frightened them. That was counted on one vehicle,
        39 of 956, and has not been counted across the slice; it is here as an
        example of what is in the text, not as a rate.
      </p>

      <p className="mt-4 max-w-[64ch] leading-relaxed text-ui-dim">
        Nothing is redacted before indexing, and that is deliberate: the VIN and
        the surrounding sentence are often what distinguish one fault from
        another with the same symptom. The control is <em>where</em> the text
        goes rather than what is cut out of it — which is why turn 2 embeds on
        this machine and why turn 3 is not written yet.
      </p>
    </section>
  );
}

function Kept() {
  return (
    <section
      className="lift-in border-t border-ui-line pt-12"
      style={{ animationDelay: '220ms' }}
    >
      <h2 className="font-mono text-lg leading-snug font-medium tracking-tight text-ui-fg md:text-xl">
        What is kept, and for how long
      </h2>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <p className="max-w-[54ch] leading-relaxed text-ui-dim">
          A snapshot on disk and an index built from it, both on infrastructure
          Calder controls. A fixed snapshot rather than live calls, because an
          answer key written against moving data rots — and a question answered
          twice should be answerable the same way twice.
        </p>
        <p className="max-w-[54ch] leading-relaxed text-ui-dim">
          Nothing is written back to NHTSA and no record here is amended. This
          reads the public file; it does not correct it, annotate it, or hold an
          opinion about it that a reader could mistake for the regulator's.
        </p>
      </div>

      <p className="mt-10">
        <Link to="/" className="font-mono text-sm text-cal-1 transition-colors hover:text-ui-fg">
          ← back to the question
        </Link>
      </p>
    </section>
  );
}
