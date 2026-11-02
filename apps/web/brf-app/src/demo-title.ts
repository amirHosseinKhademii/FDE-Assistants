/**
 * The title of this deployment, set at build time from BRF_DEMO_TITLE in vite.config.ts.
 * DEMO_NAME is the title without its ", frågor och svar" tail, for the bar at the top.
 */
declare const __BRF_DEMO_TITLE__: string;

export const DEMO_TITLE: string = __BRF_DEMO_TITLE__;

export const DEMO_NAME: string = DEMO_TITLE.replace(/, frågor och svar$/, '');
