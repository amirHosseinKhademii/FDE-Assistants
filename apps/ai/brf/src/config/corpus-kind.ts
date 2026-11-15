/**
 * Whose documents the engine is answering from. The fictional BRF demo answers from a
 * cooperative's own documents, so the refusal names the cooperative. A firm deployment
 * answers from a property firm's public pages, and the same refusal names the firm.
 *
 * BRF_CORPUS_KIND is "fictional" (the default, the wording the demo has always had) or
 * "firm". It is read at call time, so the prompt, the refusal check and the API route
 * always agree on the same sentence.
 */
import './env';

export type CorpusKind = 'fictional' | 'firm';

export function corpusKind(): CorpusKind {
  const raw = (process.env.BRF_CORPUS_KIND ?? '').trim().toLowerCase() || 'fictional';
  if (raw === 'fictional' || raw === 'firm') return raw;
  throw new Error(`BRF_CORPUS_KIND must be "fictional" (the default) or "firm", got "${raw}".`);
}

/** The fixed sentence for "the documents do not say". The UI shows it verbatim. */
export function refusalSentence(): string {
  return corpusKind() === 'firm'
    ? 'Det framgår inte av företagets dokument.'
    : 'Det framgår inte av föreningens dokument.';
}

/** The refusal sentence with the contact line that follows it. */
export function refusalText(): string {
  return `${refusalSentence()} Kontakta styrelsen eller förvaltaren.`;
}
