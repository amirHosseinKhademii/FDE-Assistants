/**
 * `/data-flow` — what leaves the building, for Vantis Steering.
 *
 * IT IS `docs/steering/DATA-RESIDENCY.md` AS A PAGE, and it is deliberately
 * much shorter than the pharma one. That engagement has an answer contract, two
 * engines and six compliance checks to describe; this one has a parse pipeline
 * that never opens a socket and an extraction step that sends 220 documents to
 * one host. Saying less is the accurate thing to do, not a gap to fill in.
 *
 * THE COLUMN THAT MATTERS IS `strength`. A security reviewer's real question is
 * never "is that true?" — it is "how do you know?", and *we captured the request
 * and asserted on it* and *the vendor's documentation says so* are different
 * answers. A page that prints both in one typeface invites somebody to quote a
 * contract term to their auditor as though an engineer had measured it.
 *
 * IT IS BUILT TO BE UPDATED. The figures below are the ones the doc carries
 * today, and the doc moves as the pipeline does — K3 will add embeddings, which
 * is a second thing that leaves. Every number here is one line in `RESIDENCY`
 * and every claim is one row in `CLAIMS`, so keeping it current is editing two
 * arrays rather than rewriting prose.
 */
import { BoxIcon, EyeIcon, GapIcon, Mono, ServerIcon } from '@fde/uikit';
import { Aurora, type AuroraTone } from '@veresk/surface';
import { Extraction } from '../components/Extraction';
import { Landed } from '../components/Landed';
import { PHARMA, VERESK } from '../lib/links';

const AURORA: AuroraTone[] = [
  { className: 'bg-vst-1/14', size: 'h-[34rem] w-[34rem]', at: { top: '-12rem', left: '-8rem' } },
  {
    className: 'bg-vst-3/12',
    size: 'h-[30rem] w-[30rem]',
    at: { top: '-4rem', right: '-10rem' },
    delay: '-8s',
  },
];

/** The shape of the answer, in three numbers. */
const RESIDENCY = [
  { figure: '220', of: 'of 1,069 files', what: 'ever leave the machine — the closure reports, about 900 bytes each.' },
  { figure: '1', of: 'host contacted', what: 'our own Azure AI Foundry resource, in Sweden. Nothing else is reached during a request.' },
  { figure: '0', of: 'databases sent', what: 'the four systems of record and vst_derived are read by plain code, locally, and go nowhere.' },
];

/**
 * Every claim, and how each one is known.
 *
 * `strength` is the whole point — see the header. The two vendor rows are not
 * padding: leaving them off would make the list look stronger than it is, which
 * is the failure this column exists to prevent.
 */
const CLAIMS: Array<{ strength: 'verified here' | 'vendor statement' | 'must be arranged'; claim: string; detail: string; cmd?: string }> = [
  {
    strength: 'verified here',
    claim: 'Only 220 documents are sent, one per request, with nothing else attached',
    detail:
      'The check captures the real outgoing HTTP body — 5,664 bytes, one system prompt, one document. Not read from the source that builds the request, read from the bytes that leave.',
    cmd: 'pnpm steering:derived-compliance-check',
  },
  {
    strength: 'verified here',
    claim: 'Exactly one host is contacted, and it is our resource',
    detail: 'The same capture, read for its URL: one <resource>.services.ai.azure.com host, inside our own tenant.',
    cmd: 'pnpm steering:derived-compliance-check',
  },
  {
    strength: 'verified here',
    claim: 'The provider is told to retain nothing',
    detail:
      'store: false, asserted on the outgoing bytes rather than on the line of code that sets it. Left unset the provider default is to retain, so this is the difference between a policy and a fact.',
    cmd: 'pnpm steering:derived-compliance-check',
  },
  {
    strength: 'verified here',
    claim: 'No conversation is held on their servers',
    detail: 'No previous_response_id, no conversation field. Each request carries its own context and nothing persists between them.',
    cmd: 'pnpm steering:derived-compliance-check',
  },
  {
    strength: 'verified here',
    claim: 'Authentication is a short-lived Entra token, not a static key',
    detail:
      'Authorization: Bearer, no api-key header, nothing beginning sk-. There is no long-lived model credential in this repository to leak.',
    cmd: 'pnpm steering:derived-compliance-check',
  },
  {
    strength: 'verified here',
    claim: 'The resource is in the EU',
    detail:
      'Read from Azure rather than from a diagram: swedencentral, kind AIServices. This is the one claim here you can check without our code at all.',
    cmd: 'az cognitiveservices account list -o table',
  },
  {
    strength: 'verified here',
    claim: 'Nothing in the ingest can open your databases',
    detail:
      'A build-time guard on the symbol names. When extraction leaves a gap, the cheapest fix available to anyone is one line that reads the right answer out of vst_alm instead — nothing would fail, the grade would go up, and the number would mean nothing. So it is made impossible rather than agreed to.',
    cmd: 'pnpm steering:derived-boundary-check',
  },
  {
    strength: 'vendor statement',
    claim: 'Microsoft does not train on the data',
    detail:
      'Microsoft’s documented position for Azure OpenAI. We can show what our code sends; we cannot show what the provider then does with it. Quote it from a current source with a date on it rather than from an engineer’s memory — that is how a review gets an answer that is right today and wrong at renewal.',
  },
  {
    strength: 'vendor statement',
    claim: 'Data stays in the chosen region',
    detail: 'Also Microsoft’s documented position. The region itself is verified above; what happens to data inside it is theirs to state.',
  },
  {
    strength: 'must be arranged',
    claim: 'Prompts are NOT retained for abuse monitoring',
    detail:
      'Not true by default. Azure OpenAI keeps prompts and completions for up to 30 days for abuse monitoring, readable by authorised Microsoft reviewers on a flagged case, and store: false does not turn it off — different mechanism. Modified Abuse Monitoring has not been applied for. On closure reports that name a car maker’s unannounced programmes, that application belongs before the first real run.',
  },
  {
    strength: 'must be arranged',
    claim: 'The endpoint is not reachable from the internet',
    detail:
      'Public network access is enabled. An Entra token is required so it is not open, but network isolation is a separate control a regulated customer usually wants: Private Endpoint, public access off. A configuration change rather than a code change, and not made here.',
  },
];

export function DataFlow() {
  return (
    <div className="relative min-h-screen">
      <Aurora tones={AURORA} muted />

      <header className="sticky top-0 z-20 border-b border-ui-line bg-ui-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 sm:px-6 sm:py-4">
          {VERESK ? (
            <a
              href={VERESK}
              aria-label="Back to the front page"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-ui-accent/15 text-ui-accent ring-1 ring-ui-accent/30 transition-all hover:scale-105"
            >
              <BoxIcon />
            </a>
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ui-accent/15 text-ui-accent ring-1 ring-ui-accent/30">
              <BoxIcon />
            </span>
          )}
          <h1 className="text-[1.0625rem] font-semibold tracking-tight">Where your data goes</h1>
          <a
            href="/"
            className="rounded-lg border border-ui-line bg-ui-raised/60 px-4 py-2 text-sm text-ui-dim transition-colors hover:border-ui-accent/50 hover:text-ui-fg sm:ml-auto"
          >
            Back to Vantis Steering
          </a>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-5 pb-24 sm:px-6">
        <section className="lift-in pt-10 pb-10 md:pt-12">
          <h2 className="max-w-[24ch] font-mono text-[1.75rem] leading-[1.12] font-semibold tracking-tighter sm:text-5xl">
            Almost none of it leaves.
          </h2>
          <p className="mt-6 max-w-[60ch] leading-relaxed text-ui-dim sm:text-lg">
            The timesheets, rate cards, quotations, estimates, source code and all four databases
            are read by plain code on the machine doing the reading. Nothing about them is sent
            anywhere. Only the documents that genuinely need reading comprehension are, and only the
            part of them that does.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {RESIDENCY.map((r) => (
              <div key={r.of} className="rounded-2xl border border-ui-line px-5 py-4">
                <p className="font-mono text-2xl font-medium tracking-tight text-ui-fg sm:text-3xl">
                  {r.figure}
                </p>
                <p className="mt-1 font-mono text-[0.6875rem] text-ui-faint">{r.of}</p>
                <p className="mt-3 text-sm leading-relaxed text-ui-dim">{r.what}</p>
              </div>
            ))}
          </div>
        </section>

        <Split />
        <Extraction />
        <Landed />
        <Claims />
        <Kept />
      </main>
    </div>
  );
}

/**
 * Why so little leaves, which is a design consequence rather than a policy.
 *
 * The three pipelines were separated for cost and quality. The data-protection
 * result is the useful one, and it is what makes "nothing may leave our tenant"
 * a configuration question instead of a blocker.
 */
function Split() {
  return (
    <section className="lift-in border-t border-ui-line pt-12 pb-16" style={{ animationDelay: '120ms' }}>
      <h2 className="font-mono text-2xl font-medium tracking-tight md:text-3xl">
        Why so little of it has to.
      </h2>
      <p className="mt-4 max-w-[64ch] leading-relaxed text-ui-dim">
        The reading is three separate jobs, split for cost and for quality. That the
        data-protection answer falls out of it is the useful accident.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-ui-accent/30 bg-linear-to-b from-ui-accent/8 to-transparent px-5 py-5">
          <h3 className="flex items-center gap-2.5 font-medium text-ui-accent">
            <ServerIcon />
            Stays on the machine
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-ui-dim">
            The whole parse pipeline — 9,931 timesheet lines, 1,933 document fields, 168 rates, 293
            quoted lines, 298 estimates. Plain code, no model, four seconds, no network call. That
            is the overwhelming majority of the volume and there is nothing in it to review.
          </p>
        </div>

        <div className="rounded-xl border border-ui-line bg-ui-surface/70 px-5 py-5">
          <h3 className="flex items-center gap-2.5 font-medium text-ui-fg">
            <EyeIcon />
            Leaves, one document at a time
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-ui-dim">
            220 closure reports, about 900 bytes each, sent singly with one system prompt and no
            other context. Only prose that needs reading comprehension goes, and only the part that
            does.
          </p>
        </div>
      </div>

      <p className="mt-6 max-w-[68ch] text-sm leading-relaxed text-ui-dim">
        So <span className="text-ui-fg">“nothing may leave our tenant”</span> is not a blocker here.
        The parse pipeline is unaffected either way, and the extraction points at a model deployment
        inside your own subscription — one environment variable. Nothing in the design assumes a
        public API, which is why it is built on Foundry with Entra rather than on a key and a URL.
      </p>
    </section>
  );
}

function Claims() {
  return (
    <section className="lift-in pb-16" style={{ animationDelay: '180ms' }}>
      <h2 className="font-mono text-2xl font-medium tracking-tight md:text-3xl">
        Every claim, and how it is known.
      </h2>
      <p className="mt-4 max-w-[66ch] leading-relaxed text-ui-dim">
        The question a security review actually asks is not whether something is true — it is how
        you know. <span className="text-ui-fg">We captured the request and asserted on it</span> and{' '}
        <span className="text-ui-fg">the vendor’s documentation says so</span> are different
        answers, so every row says which one it is. The two commands take a second and make no
        network call; run them in front of somebody if they push.
      </p>

      <ul className="mt-9 grid gap-3">
        {CLAIMS.map((c) => (
          <li
            key={c.claim}
            className={`rounded-xl border px-5 py-4 transition-colors ${
              c.strength === 'must be arranged'
                ? 'border-ui-warn/35 bg-ui-warn/5'
                : 'border-ui-line bg-ui-surface/70 hover:border-ui-line-lit'
            }`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <h3 className="text-[0.9375rem] font-medium text-ui-fg">{c.claim}</h3>
              {c.cmd && <Mono className="text-xs text-ui-accent">{c.cmd}</Mono>}
            </div>
            <p
              className={`mt-1 font-mono text-[0.6875rem] tracking-wide uppercase ${
                c.strength === 'must be arranged'
                  ? 'text-ui-warn'
                  : c.strength === 'vendor statement'
                    ? 'text-ui-dim'
                    : 'text-ui-faint'
              }`}
            >
              {c.strength}
            </p>
            <p className="mt-2 max-w-[72ch] text-sm leading-relaxed text-ui-dim">{c.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** What is kept, and by whom — the question people conflate with the one above. */
function Kept() {
  return (
    <section className="lift-in pb-16" style={{ animationDelay: '240ms' }}>
      <h2 className="font-mono text-2xl font-medium tracking-tight md:text-3xl">
        What is kept, and by whom.
      </h2>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-ui-line bg-ui-surface/70 px-5 py-5">
          <h3 className="flex items-center gap-2.5 font-medium text-ui-fg">
            <ServerIcon />
            You keep everything derived
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-ui-dim">
            <Mono className="text-ui-fg">vst_derived</Mono> is yours, in your subscription, and every row
            in it carries the file and line it was read from. Nothing derived is held anywhere else.
          </p>
        </div>

        <div className="rounded-xl border border-ui-warn/30 bg-linear-to-b from-ui-warn/8 to-transparent px-5 py-5">
          <h3 className="flex items-center gap-2.5 font-medium text-ui-warn">
            <GapIcon />
            The provider keeps one thing we have not turned off
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-ui-dim">
            Abuse-monitoring retention, up to 30 days. It is a separate mechanism from{' '}
            <Mono className="text-ui-fg">store: false</Mono> and it is on by default. Named here
            rather than in a footnote, because it is the first thing a reviewer of this corpus will
            ask about.
          </p>
        </div>
      </div>

      <p className="mt-6 max-w-[68ch] text-sm leading-relaxed text-ui-faint">
        This page describes the pipeline as it stands. Chunking and embedding are not built yet, and
        when they are there will be a second thing that leaves — the passages themselves. It will be
        added here, with the same column saying how it is known.{' '}
        {PHARMA && (
          <>
            Meridian Pharma’s equivalent is <a href={`${PHARMA}/data-flow`} className="text-ui-dim underline underline-offset-2 hover:text-ui-fg">here</a>.
          </>
        )}
      </p>
    </section>
  );
}
