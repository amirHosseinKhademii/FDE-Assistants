/**
 * Page texts for one BRF annual report PDF.
 *
 * A digital page is read from its text layer in reading order (pdftotext without
 * -layout, which keeps two-column pages in sentence order). A page with
 * fewer than MIN_TEXT_CHARS characters is treated as a scan and OCR'd with
 * tesseract (Swedish model). Tools are run with execFile and argument arrays,
 * never through a shell, because the PDF path is untrusted input.
 *
 * TESSDATA: tesseract reads TESSDATA_PREFIX. If it is not set here, this file
 * falls back to ~/.local/share/tessdata, where the swe model is installed
 * without sudo.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

const run = promisify(execFile);

export const MIN_TEXT_CHARS = 50;
const OCR_DPI = '200';

export interface PagesOptions {
  /** Called once per page that was OCR'd, with the wall time of that page in ms. */
  onOcr?: (page: number, ms: number) => void;
}

function tessEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    TESSDATA_PREFIX: process.env.TESSDATA_PREFIX ?? join(homedir(), '.local/share/tessdata'),
  };
}

/** Number of pages, from pdfinfo. */
export async function pageCount(pdfPath: string): Promise<number> {
  const { stdout } = await run('pdfinfo', [pdfPath]);
  const m = /^Pages:\s+(\d+)/m.exec(stdout);
  if (!m) throw new Error(`pdfinfo did not report a page count for ${pdfPath}`);
  return Number(m[1]);
}

async function digitalText(pdfPath: string, page: number): Promise<string> {
  const { stdout } = await run('pdftotext', ['-f', String(page), '-l', String(page), pdfPath, '-']);
  return stdout;
}

async function ocrPage(pdfPath: string, page: number): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'brf-ocr-'));
  try {
    await run('pdftoppm', ['-r', OCR_DPI, '-gray', '-png', '-f', String(page), '-l', String(page), pdfPath, join(dir, 'pg')]);
    const pngs = (await readdir(dir)).filter((f) => f.endsWith('.png')).sort();
    if (pngs.length !== 1) throw new Error(`pdftoppm wrote ${pngs.length} images for page ${page}`);
    const { stdout } = await run('tesseract', [join(dir, pngs[0]), '-', '-l', 'swe'], {
      env: tessEnv(),
      maxBuffer: 16 * 1024 * 1024,
    });
    return stdout;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Text of every page, index 0 = page 1. */
export async function getPages(pdfPath: string, opts: PagesOptions = {}): Promise<string[]> {
  const n = await pageCount(pdfPath);
  const pages: string[] = [];
  for (let p = 1; p <= n; p++) {
    let text = await digitalText(pdfPath, p);
    if (text.trim().length < MIN_TEXT_CHARS) {
      const t0 = Date.now();
      text = await ocrPage(pdfPath, p);
      opts.onOcr?.(p, Date.now() - t0);
    }
    pages.push(text);
  }
  return pages;
}
