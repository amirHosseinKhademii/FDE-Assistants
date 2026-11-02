/**
 * Veresk. The front page.
 *
 * Who reads it: someone deciding whether an AI assistant is worth it for their
 * company. The page explains what Veresk builds, shows five working demos, and
 * says how the work goes.
 *
 * The copy is written in plain English on purpose. Short sentences, no jargon.
 */
import { Link } from '@tanstack/react-router';
import { Aurora } from '@veresk/surface';
import { AURORA } from '../lib/aurora';
import { BOSTAD, COMMERCE, PHARMA, SAFETY, STEERING } from '../lib/links';
import { AppIcon, type AppIconName } from '../components/nav-icons';
import { NeuralHub, type HubSpoke } from '../components/NeuralHub';

const NAV_LINK = 'inline-flex items-center gap-1.5 text-sm text-ui-dim transition-colors hover:text-ui-fg';

/* The five demos. The same links the nav uses, so the two never disagree. */
const DEMOS: Array<HubSpoke & { label: string; text: string; agent?: string }> = [
  {
    id: 'pharma',
    name: 'Pharma',
    sub: 'Meridian Pharma',
    icon: 'pharma',
    href: PHARMA || null,
    tone: 'var(--color-hop-1)',
    desk: [18, 24],
    mobile: [27, 40],
    label: 'Batch release.',
    text: 'Checks whether a medicine batch can ship, using the lab records and procedures, and names what would stop it.',
    agent: 'An agent checks the batch record against the procedures and flags any gap.',
  },
  {
    id: 'safety',
    name: 'Safety',
    sub: 'Calder Safety',
    icon: 'safety',
    href: SAFETY || null,
    tone: 'var(--color-hop-3)',
    desk: [82, 24],
    mobile: [73, 40],
    label: 'Vehicle safety and recalls.',
    text: 'Answers recall and safety questions from public NHTSA complaint filings. It says so when the filings do not settle the question.',
  },
  {
    id: 'steering',
    name: 'Steering',
    sub: 'Vantis Steering',
    icon: 'steering',
    href: STEERING || null,
    tone: 'var(--color-hop-4)',
    desk: [18, 76],
    mobile: [27, 64],
    label: 'Engineering requirements.',
    text: 'Reads a customer’s requirements and says, for each one, whether we have built it before, need to change it, or must build it new.',
  },
  {
    id: 'commerce',
    name: 'Commerce',
    sub: 'Thornbury Goods',
    icon: 'commerce',
    href: COMMERCE || null,
    tone: 'var(--color-hop-5)',
    desk: [82, 76],
    mobile: [73, 64],
    label: 'Customer service.',
    text: 'Handles a return or refund case, checks it against the store’s policy, and asks a person before any money moves.',
    agent: 'An agent drafts the refund and waits for a person to approve it.',
  },
  {
    id: 'bostad',
    name: 'Bostad',
    sub: 'Göteborg housing',
    icon: 'bostad',
    href: BOSTAD || null,
    tone: 'var(--color-hop-2)',
    desk: [50, 88],
    mobile: [50, 88],
    label: 'Housing in Gothenburg.',
    text: 'Search any address or housing association and get an area profile, the association’s financial health and answers about the area, with sources.',
  },
];

const STEPS: Array<{ icon: AppIconName; title: string; body: string }> = [
  {
    icon: 'connect',
    title: 'Connect',
    body: 'We load your documents, manuals and databases. Nothing leaves your control.',
  },
  {
    icon: 'ask',
    title: 'Ask',
    body: 'Your team asks a question the way they would ask a colleague.',
  },
  {
    icon: 'proof',
    title: 'Answer with proof',
    body: 'The assistant answers and links to the exact page, row or record it used.',
  },
  {
    icon: 'measure',
    title: 'Measure',
    body: 'A test suite checks the answers, so you know it works before you rely on it.',
  },
];

const AGENT_STEPS: Array<{ icon: AppIconName; title: string; body: string }> = [
  {
    icon: 'prepare',
    title: 'Prepare the paperwork',
    body: 'Drafts reports, checklists and replies from your own data, ready for a person to approve.',
  },
  {
    icon: 'check',
    title: 'Check before it goes out',
    body: 'Compares every case against your rules and flags what is missing or wrong.',
  },
  {
    icon: 'act',
    title: 'Act in your systems',
    body: 'Creates the ticket, updates the record or starts the refund, and logs what it did.',
  },
  {
    icon: 'approve',
    title: 'Ask a person when it matters',
    body: 'Stops and asks for approval before money moves or a risky decision is made.',
  },
];

export function VereskLanding() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Aurora tones={AURORA} />

      <nav className="relative z-10 mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-5 py-5 sm:px-6 sm:py-6">
        <img src="/veresk-logo.svg" alt="" width={28} height={28} className="h-7 w-7 rounded-lg" />
        <span className="font-medium tracking-tight">Veresk</span>
        <Link to="/learn" className={NAV_LINK}>
          <AppIcon name="learn" />
          Learn
        </Link>
        {PHARMA && (
          <a href={PHARMA} className={`${NAV_LINK} sm:ml-auto`}>
            <AppIcon name="pharma" />
            Meridian Pharma
          </a>
        )}
        {SAFETY && (
          <a href={SAFETY} className={NAV_LINK}>
            <AppIcon name="safety" />
            Calder Safety
          </a>
        )}
        {STEERING && (
          <a href={STEERING} className={NAV_LINK}>
            <AppIcon name="steering" />
            Vantis Steering
          </a>
        )}
        {COMMERCE && (
          <a href={COMMERCE} className={NAV_LINK}>
            <AppIcon name="commerce" />
            Thornbury Goods
          </a>
        )}
        {BOSTAD && (
          <a href={BOSTAD} className={NAV_LINK}>
            <AppIcon name="bostad" />
            Bostad
          </a>
        )}
      </nav>

      <main className="relative z-10 mx-auto max-w-6xl px-5 sm:px-6">
        <section className="pt-10 pb-12 sm:pt-16 md:pt-20">
          <h1
            className="lift-in title-spectrum max-w-4xl font-mono text-[1.75rem] leading-[1.1] font-semibold tracking-tighter break-words sm:text-5xl md:text-6xl"
            style={{ animationDelay: '60ms' }}
          >
            AI assistants that answer from your own documents, with sources.
          </h1>

          <p
            className="lift-in mt-6 max-w-[56ch] leading-relaxed text-ui-dim sm:text-lg md:mt-8 md:text-xl"
            style={{ animationDelay: '200ms' }}
          >
            Veresk builds AI assistants for companies. They read your documents and systems, answer
            questions in plain language, and show exactly where each answer comes from. When the
            answer is not in your data, they say so. On top of that, we build AI agents that do the
            work for you, not just answer questions.
          </p>

          <p
            className="lift-in mt-10 font-mono text-sm text-ui-faint"
            style={{ animationDelay: '320ms' }}
          >
            Five working demos. Click one to try it.
          </p>

          <div className="lift-in mt-4" style={{ animationDelay: '380ms' }}>
            <NeuralHub spokes={DEMOS} />
          </div>
        </section>

        <section className="border-t border-ui-line py-16">
          <h2 className="font-mono text-2xl leading-snug font-medium tracking-tight text-ui-fg md:text-3xl">
            How it works
          </h2>
          <ol className="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="method-step">
                <span className="method-step-n">{i + 1}</span>
                <span className="flex items-center gap-2 text-ui-accent">
                  <AppIcon name={step.icon} size={18} />
                </span>
                <h3 className="mt-3 font-mono text-base font-medium text-ui-fg">{step.title}</h3>
                <p className="mt-2 max-w-[36ch] text-sm leading-relaxed text-ui-dim">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-t border-ui-line py-16">
          <h2 className="font-mono text-2xl leading-snug font-medium tracking-tight text-ui-fg md:text-3xl">
            Agents that do the work
          </h2>
          <p className="mt-4 max-w-[60ch] leading-relaxed text-ui-dim">
            An assistant answers. An agent acts. We connect agents to the systems you already use, so
            routine work gets done and people only step in where judgement is needed.
          </p>
          <ol className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {AGENT_STEPS.map((step) => (
              <li key={step.title} className="flex gap-3">
                <span className="mt-0.5 shrink-0 text-ui-accent">
                  <AppIcon name={step.icon} size={18} />
                </span>
                <span>
                  <span className="block font-mono text-base font-medium text-ui-fg">{step.title}</span>
                  <span className="mt-2 block max-w-[34ch] text-sm leading-relaxed text-ui-dim">{step.body}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-10 text-ui-fg">You stay in control. Every step is logged and every answer points to its source.</p>
        </section>

        <section className="border-t border-ui-line py-16">
          <h2 className="font-mono text-2xl leading-snug font-medium tracking-tight text-ui-fg md:text-3xl">
            Try the five demos
          </h2>
          <p className="mt-4 max-w-[58ch] leading-relaxed text-ui-dim">
            Each demo is a working app for one kind of company. The names are made up.
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {DEMOS.map((d) => {
              const inside = (
                <>
                  <p className="text-[0.9375rem] leading-relaxed text-ui-dim">
                    <span className="font-medium text-ui-fg">{d.label}</span> {d.text}
                  </p>
                  {d.agent && (
                    <p className="mt-3 text-sm leading-relaxed text-ui-dim">
                      <span className="text-ui-accent">Agent:</span> {d.agent}
                    </p>
                  )}
                  <p className="mt-5 flex items-center gap-2 font-mono text-sm text-ui-faint">
                    <span style={{ color: d.tone }}>
                      <AppIcon name={d.icon} size={16} />
                    </span>
                    {d.sub}
                  </p>
                </>
              );
              if (d.href) {
                return (
                  <a key={d.id} href={d.href} className="case-card group">
                    {inside}
                    <p className="mt-4 text-sm text-ui-accent">Open the demo →</p>
                  </a>
                );
              }
              return (
                <div key={d.id} className="case-card case-card--elsewhere">
                  {inside}
                  <p className="mt-4 text-sm text-ui-faint">Not open from here yet.</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="border-t border-ui-line py-16">
          <h2 className="font-mono text-2xl leading-snug font-medium tracking-tight text-ui-fg md:text-3xl">
            Want to see how it is built?
          </h2>
          <p className="mt-4 max-w-[58ch] leading-relaxed text-ui-dim">
            Short lessons explain how these assistants are made and how they are tested.
          </p>
          <p className="mt-6">
            <Link to="/learn" className="text-sm text-ui-accent transition-opacity hover:opacity-80">
              Start the lessons →
            </Link>
          </p>
        </section>

        <footer className="border-t border-ui-line py-10 text-sm text-ui-faint">
          Veresk. All companies, people and documents on these pages are made up for demos.
        </footer>
      </main>
    </div>
  );
}
