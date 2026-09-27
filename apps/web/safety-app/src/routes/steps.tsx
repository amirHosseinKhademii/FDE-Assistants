import { createFileRoute } from '@tanstack/react-router';
import { Steps } from '../pages/Steps';

/**
 * THE FONTS ARE LOADED HERE, NOT IN `__root.tsx`. Only this page was redesigned
 * in Atkinson Hyperlegible (see the "HOW IT WORKS" block in `app.css`); the
 * landing page, the desk and the data-flow page still set Inter and JetBrains
 * Mono, and loading a second family on every page for one of them is a cost
 * the other three would pay for nothing.
 */
export const Route = createFileRoute('/steps')({
  component: Steps,
  head: () => ({
    meta: [{ title: 'How it works · Calder Safety' }],
    links: [
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Atkinson+Hyperlegible+Mono:wght@400;500;600&display=swap',
      },
    ],
  }),
});
