/**
 * Veresk. The front page, in English and Swedish.
 *
 * Who reads it: someone deciding whether an AI assistant is worth it for their
 * company. The page explains what Veresk builds, shows six working demos, and
 * says how the work goes.
 *
 * One layout renders both languages. Every visible string comes from
 * `lib/i18n.ts`, and the `lang` prop picks the block. The copy is written in
 * plain language on purpose. Short sentences, no jargon.
 */
import { Link } from '@tanstack/react-router';
import { Aurora } from '@veresk/surface';
import { AURORA } from '../lib/aurora';
import { BOSTAD, BRF, COMMERCE, PHARMA, SAFETY, STEERING } from '../lib/links';
import { COPY, type DemoId, type Lang } from '../lib/i18n';
import { AppIcon, type AppIconName } from '../components/nav-icons';
import { NeuralHub, type HubSpoke } from '../components/NeuralHub';

const NAV_LINK = 'inline-flex items-center gap-1.5 text-sm text-ui-dim transition-colors hover:text-ui-fg';

/* The six demos. Layout and links here, words in `lib/i18n.ts`. The same
   links the nav uses, so the two never disagree. */
const DEMO_LAYOUT: Array<HubSpoke & { id: DemoId }> = [
  { id: 'pharma', name: 'Pharma', sub: '', icon: 'pharma', href: PHARMA || null, tone: 'var(--color-hop-1)', desk: [18, 24], mobile: [27, 40] },
  { id: 'safety', name: 'Safety', sub: '', icon: 'safety', href: SAFETY || null, tone: 'var(--color-hop-3)', desk: [82, 24], mobile: [73, 40] },
  { id: 'steering', name: 'Steering', sub: '', icon: 'steering', href: STEERING || null, tone: 'var(--color-hop-4)', desk: [18, 76], mobile: [27, 64] },
  { id: 'commerce', name: 'Commerce', sub: '', icon: 'commerce', href: COMMERCE || null, tone: 'var(--color-hop-5)', desk: [82, 76], mobile: [73, 64] },
  { id: 'brf', name: 'BRF', sub: '', icon: 'brf', href: BRF || null, tone: 'var(--color-hop-3)', desk: [50, 12], mobile: [73, 88] },
  { id: 'bostad', name: 'Bostad', sub: '', icon: 'bostad', href: BOSTAD || null, tone: 'var(--color-hop-2)', desk: [50, 88], mobile: [27, 88] },
];

/* Icons for the two step lists. Same order as the copy in `lib/i18n.ts`. */
const STEP_ICONS: AppIconName[] = ['connect', 'ask', 'proof', 'measure'];
const AGENT_ICONS: AppIconName[] = ['prepare', 'check', 'act', 'approve'];

const HEADING = 'font-mono text-2xl leading-snug font-medium tracking-tight text-ui-fg md:text-3xl';

export function VereskLanding({ lang }: { lang: Lang }) {
  const t = COPY[lang];
  const demos: HubSpoke[] = DEMO_LAYOUT.map((d) => ({ ...d, sub: t.demos[d.id].sub }));

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Aurora tones={AURORA} />

      <nav className="relative z-10 mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-5 py-5 sm:px-6 sm:py-6">
        <img src="/veresk-logo.svg" alt="" width={28} height={28} className="h-7 w-7 rounded-lg" />
        <span className="font-medium tracking-tight">Veresk</span>
        <Link to="/learn" className={NAV_LINK}>
          <AppIcon name="learn" />
          {t.nav.learn}
        </Link>
        {PHARMA && (
          <a href={PHARMA} className={`${NAV_LINK} sm:ml-auto`}>
            <AppIcon name="pharma" />
            {t.nav.pharma}
          </a>
        )}
        {SAFETY && (
          <a href={SAFETY} className={NAV_LINK}>
            <AppIcon name="safety" />
            {t.nav.safety}
          </a>
        )}
        {STEERING && (
          <a href={STEERING} className={NAV_LINK}>
            <AppIcon name="steering" />
            {t.nav.steering}
          </a>
        )}
        {COMMERCE && (
          <a href={COMMERCE} className={NAV_LINK}>
            <AppIcon name="commerce" />
            {t.nav.commerce}
          </a>
        )}
        {BOSTAD && (
          <a href={BOSTAD} className={NAV_LINK}>
            <AppIcon name="bostad" />
            {t.nav.bostad}
          </a>
        )}
        {BRF && (
          <a href={BRF} className={NAV_LINK}>
            <AppIcon name="brf" />
            {t.nav.brf}
          </a>
        )}
        <span className="ml-auto flex items-center gap-2 font-mono text-sm sm:ml-0" role="group" aria-label={t.nav.languageLabel}>
          <Link to="/sv" className={lang === 'sv' ? 'text-ui-fg' : NAV_LINK} aria-current={lang === 'sv' ? 'true' : undefined} hrefLang="sv">
            SV
          </Link>
          <span className="text-ui-faint" aria-hidden>
            /
          </span>
          <Link to="/" className={lang === 'en' ? 'text-ui-fg' : NAV_LINK} aria-current={lang === 'en' ? 'true' : undefined} hrefLang="en">
            EN
          </Link>
        </span>
      </nav>

      <main className="relative z-10 mx-auto max-w-6xl px-5 sm:px-6">
        <section className="pt-10 pb-12 sm:pt-16 md:pt-20">
          <h1
            className="lift-in title-spectrum max-w-4xl font-mono text-[1.75rem] leading-[1.1] font-semibold tracking-tighter break-words sm:text-5xl md:text-6xl"
            style={{ animationDelay: '60ms' }}
          >
            {t.hero.heading}
          </h1>

          <p
            className="lift-in mt-6 max-w-[56ch] leading-relaxed text-ui-dim sm:text-lg md:mt-8 md:text-xl"
            style={{ animationDelay: '200ms' }}
          >
            {t.hero.lead}
          </p>

          <p
            className="lift-in mt-10 font-mono text-sm text-ui-faint"
            style={{ animationDelay: '320ms' }}
          >
            {t.hero.demosIntro}
          </p>

          <div className="lift-in mt-4" style={{ animationDelay: '380ms' }}>
            <NeuralHub spokes={demos} groupLabel={t.hub.groupLabel} notOpenLabel={t.hub.notOpen} />
          </div>
        </section>

        <section className="border-t border-ui-line py-16">
          <h2 className={HEADING}>{t.howTitle}</h2>
          <ol className="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {t.steps.map((step, i) => (
              <li key={step.title} className="method-step">
                <span className="method-step-n">{i + 1}</span>
                <span className="flex items-center gap-2 text-ui-accent">
                  <AppIcon name={STEP_ICONS[i]} size={18} />
                </span>
                <h3 className="mt-3 font-mono text-base font-medium text-ui-fg">{step.title}</h3>
                <p className="mt-2 max-w-[36ch] text-sm leading-relaxed text-ui-dim">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-t border-ui-line py-16">
          <h2 className={HEADING}>{t.agentsTitle}</h2>
          <p className="mt-4 max-w-[60ch] leading-relaxed text-ui-dim">{t.agentsLead}</p>
          <ol className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {t.agentSteps.map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span className="mt-0.5 shrink-0 text-ui-accent">
                  <AppIcon name={AGENT_ICONS[i]} size={18} />
                </span>
                <span>
                  <span className="block font-mono text-base font-medium text-ui-fg">{step.title}</span>
                  <span className="mt-2 block max-w-[34ch] text-sm leading-relaxed text-ui-dim">{step.body}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-10 text-ui-fg">{t.agentsClose}</p>
        </section>

        <section className="border-t border-ui-line py-16">
          <h2 className={HEADING}>{t.demosTitle}</h2>
          <p className="mt-4 max-w-[58ch] leading-relaxed text-ui-dim">{t.demosLead}</p>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {demos.map((d) => {
              const copy = t.demos[d.id as DemoId];
              const inside = (
                <>
                  <p className="text-[0.9375rem] leading-relaxed text-ui-dim">
                    <span className="font-medium text-ui-fg">{copy.label}</span> {copy.text}
                  </p>
                  {copy.agent && (
                    <p className="mt-3 text-sm leading-relaxed text-ui-dim">
                      <span className="text-ui-accent">Agent:</span> {copy.agent}
                    </p>
                  )}
                  <p className="mt-5 flex items-center gap-2 font-mono text-sm text-ui-faint">
                    <span style={{ color: d.tone }}>
                      <AppIcon name={d.icon} size={16} />
                    </span>
                    {copy.sub}
                  </p>
                </>
              );
              if (d.href) {
                return (
                  <a key={d.id} href={d.href} className="case-card group">
                    {inside}
                    <p className="mt-4 text-sm text-ui-accent">{t.openDemo}</p>
                  </a>
                );
              }
              return (
                <div key={d.id} className="case-card case-card--elsewhere">
                  {inside}
                  <p className="mt-4 text-sm text-ui-faint">{t.notOpenHere}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="border-t border-ui-line py-16">
          <h2 className={HEADING}>{t.buildTitle}</h2>
          <p className="mt-4 max-w-[58ch] leading-relaxed text-ui-dim">{t.buildLead}</p>
          <p className="mt-6">
            <Link to="/learn" className="text-sm text-ui-accent transition-opacity hover:opacity-80">
              {t.buildLink}
            </Link>
          </p>
        </section>

        <footer className="border-t border-ui-line py-10 text-sm text-ui-faint">{t.footer}</footer>
      </main>
    </div>
  );
}
