import { DEMO_NAME } from '../demo-title';

/**
 * The bar at the top. The Veresk mark links to the firm's site. The app name sits beside
 * it. The six-hue rule underneath is the same divider the Veresk demos use.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-ui-line bg-ui-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3 sm:px-6 sm:py-4">
        <a
          href="https://veresk.se"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Veresk, till veresk.se"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-ui-accent/15 ring-1 ring-ui-accent/30 transition-all hover:scale-105 hover:bg-ui-accent/25"
        >
          <img src="/veresk-logo.svg" alt="" width={20} height={20} />
        </a>
        <div className="flex flex-col leading-tight">
          <span className="font-mono text-[0.6875rem] tracking-widest text-ui-faint uppercase">Veresk</span>
          <span className="text-[1.0625rem] font-semibold tracking-tight">{DEMO_NAME}</span>
        </div>
        <span className="ml-auto hidden font-mono text-xs text-ui-faint sm:inline">frågor och svar</span>
      </div>

      <div
        aria-hidden
        className="desk-rule relative h-px overflow-hidden opacity-60"
        style={{
          backgroundImage:
            'linear-gradient(90deg, var(--color-hop-1), var(--color-hop-2), var(--color-hop-3), var(--color-hop-4), var(--color-hop-5), var(--color-hop-6))',
        }}
      />
    </header>
  );
}
