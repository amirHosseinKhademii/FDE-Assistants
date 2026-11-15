/**
 * The title of this deployment, set at build time from BRF_DEMO_TITLE in vite.config.ts.
 * DEMO_NAME is the title without its ", frågor och svar" tail, for the bar at the top.
 */
declare const __BRF_DEMO_TITLE__: string;

export const DEMO_TITLE: string = __BRF_DEMO_TITLE__;

export const DEMO_NAME: string = DEMO_TITLE.replace(/, frågor och svar$/, '');

/**
 * Whose documents the page answers from, set at build time from BRF_CORPUS_KIND. Only the
 * wording changes: "fictional" says the documents are made up, "firm" says the answers come
 * from the firm's own public pages.
 */
declare const __BRF_CORPUS_KIND__: 'fictional' | 'firm';

export const IS_FIRM: boolean = __BRF_CORPUS_KIND__ === 'firm';

/** The one-line description in the page head. */
export const PAGE_DESCRIPTION: string = IS_FIRM
  ? 'Demo med svar ur företagets egna webbsidor. Frågor och svar med källa till varje svar.'
  : 'Demo med påhittade dokument. Frågor och svar om en bostadsrättsförening, med källa till varje svar.';

/** The notice above the question form on the landing page. */
export const DEMO_NOTICE: string = IS_FIRM
  ? 'Demo med svar ur företagets egna webbsidor. Skicka inga riktiga personuppgifter.'
  : 'Demo med påhittade dokument. Skicka inga riktiga personuppgifter.';

/** The line under the question form that says where answers come from. */
export const SOURCE_LINE: string = IS_FIRM
  ? 'Svaret bygger bara på företagets egna webbsidor. Om sidorna inte räcker till säger assistenten det och lämnar frågan vidare.'
  : 'Svaret bygger bara på föreningens dokument. Om dokumenten inte räcker till säger assistenten det och lämnar frågan till styrelsen.';
