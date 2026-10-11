/**
 * One extraction run over one BRF annual report. Page texts go to the
 * env-selected model (LLM_PROVIDER, hosted Gemini or Azure) with the BRF
 * schema as a strict json_schema. The reply is parsed, then checked for
 * coherence against the same page texts.
 *
 * No loop and no retry here: a failed run is reported, and a rerun is the
 * retry, so the token spend stays visible to the person running it.
 */
import { z } from 'zod';
import { chatClient, chatModelName } from '@fde/agent';
import { env, openaiClient } from '../foundry/client';
import { BrfFiguresSchema, coherenceErrors, type BrfFigures } from './schema';
import { getPages, type PagesOptions } from './pages';

const jsonSchema = z.toJSONSchema(BrfFiguresSchema, { io: 'output' });

export const BRF_SYSTEM_PROMPT = `You extract figures from a Swedish BRF (bostadsrättsförening) annual report.

The report text follows, one block per page, each block starting with "=== page N ===". Use only this text.

For each figure:
- Find the statement in the report. Give its value exactly as written, with the unit.
- Give the page number from the block where the statement appears.
- Give a quote: the words from that page that state the value, copied exactly. The quote must appear on that page, so do not paraphrase or join text from two places.
- If the report does not state the figure, set value, page and quote to null. Do not estimate, compute from other numbers, or use knowledge of other reports.

Reply with JSON only, matching the schema.`;

export interface BrfExtractUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  ms: number;
}

export interface BrfExtractResult {
  /** Null when the reply was not valid against the schema. */
  figures: BrfFigures | null;
  /** Coherence errors for a valid reply, or the schema error when there is none. */
  errors: string[];
  pageCount: number;
  ocrPages: { page: number; ms: number }[];
  usage: BrfExtractUsage;
  raw: string;
}

/** The user turn: every page, marked so the model can cite a page number. */
export function buildBrfPrompt(pages: string[]): string {
  return pages.map((t, i) => `=== page ${i + 1} ===\n${t.trimEnd()}`).join('\n\n');
}

export async function extractBrf(pdfPath: string): Promise<BrfExtractResult> {
  const started = Date.now();
  const ocrPages: { page: number; ms: number }[] = [];
  const onOcr: PagesOptions['onOcr'] = (page, ms) => ocrPages.push({ page, ms });
  const pages = await getPages(pdfPath, { onOcr });

  const client = chatClient(() => openaiClient());
  const model = chatModelName(env.chatDeployment());
  const res = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: BRF_SYSTEM_PROMPT },
      { role: 'user', content: buildBrfPrompt(pages) },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'brf_figures', strict: true, schema: jsonSchema as Record<string, unknown> },
    },
  });

  const raw = res.choices[0]?.message?.content ?? '';
  const usage: BrfExtractUsage = {
    model,
    inputTokens: res.usage?.prompt_tokens ?? 0,
    outputTokens: res.usage?.completion_tokens ?? 0,
    ms: Date.now() - started,
  };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { figures: null, errors: ['reply is not JSON'], pageCount: pages.length, ocrPages, usage, raw };
  }
  const v = BrfFiguresSchema.safeParse(parsed);
  if (!v.success) {
    const errors = v.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
    return { figures: null, errors, pageCount: pages.length, ocrPages, usage, raw };
  }
  return {
    figures: v.data,
    errors: coherenceErrors(v.data, pages),
    pageCount: pages.length,
    ocrPages,
    usage,
    raw,
  };
}
